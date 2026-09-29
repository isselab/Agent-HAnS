import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as http from "http";
import * as crypto from "crypto";
import open from "open";
import getPort from "get-port";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { execSync } from "child_process"; // &line[GitDiff]

let PORT = 5252;

// &begin[SummaryStore]
/** In-memory store for summary payloads, keyed by unique ID. */
const summaryStore = new Map<string, string>();

/** Generate a unique ID and store a JSON payload. Returns the ID. */
function storeSummary(jsonString: string): string {
  const id = crypto.randomUUID();
  summaryStore.set(id, jsonString);
  return id;
}
// &end[SummaryStore]

const fmSchema = z.object({
  name: z.string().describe("The name of the feature."),
  get subfeatures(): z.ZodArray<typeof fmSchema> {
    return z.array(fmSchema).describe("The subfeatures of the feature.");
  },
});

type FeatureModel = z.infer<typeof fmSchema>;

// &begin[GetFeatureModel]
/**
 * Parse a .feature-model text file (tab- or space-indented) into a JSON tree.
 * Auto-detects whether indentation uses tabs or spaces, and for spaces,
 * detects the number of spaces per indent level.
 */
function parseFeatureModel(content: string): FeatureModel | null {
  const lines = content.split("\n").filter((l) => l.trim());
  if (lines.length === 0) return null;

  // Detect indentation style from the first indented line
  let indentUnit = "\t";
  for (const line of lines) {
    const leadingWhitespace = line.match(/^(\s+)/);
    if (leadingWhitespace) {
      if (leadingWhitespace[1].includes("\t")) {
        indentUnit = "\t";
      } else {
        // Use the first indented line's whitespace as one indent level
        indentUnit = leadingWhitespace[1];
      }
      break;
    }
  }

  function getLevel(line: string): number {
    let count = 0;
    let pos = 0;
    while (pos < line.length && line.startsWith(indentUnit, pos)) {
      count++;
      pos += indentUnit.length;
    }
    return count;
  }

  // Build tree using a stack: each entry is { node, level }
  const root: FeatureModel = { name: lines[0].trim(), subfeatures: [] };
  const stack: { node: FeatureModel; level: number }[] = [
    { node: root, level: 0 },
  ];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const level = getLevel(line);
    const name = line.trim();
    const node: FeatureModel = { name, subfeatures: [] };

    // Pop stack until we find the parent (level - 1)
    while (stack.length > 1 && stack[stack.length - 1].level >= level) {
      stack.pop();
    }

    stack[stack.length - 1].node.subfeatures.push(node);
    stack.push({ node, level });
  }

  return root;
}
/**
 * Locate and read the .feature-model file for a project.
 * Checks projectPath root first, then one directory down.
 * Returns the parsed FeatureModel or null if not found / unparseable.
 */
function readFeatureModelFile(projectPath: string): FeatureModel | null {
  const fileName = ".feature-model";

  // Check project root
  const rootPath = path.join(projectPath, fileName);
  if (fs.existsSync(rootPath)) {
    try {
      const content = fs.readFileSync(rootPath, "utf-8");
      return parseFeatureModel(content);
    } catch {
      return null;
    }
  }

  // Check one directory down
  try {
    const subdirs = fs
      .readdirSync(projectPath, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    for (const subdir of subdirs) {
      const subPath = path.join(projectPath, subdir, fileName);
      if (fs.existsSync(subPath)) {
        try {
          const content = fs.readFileSync(subPath, "utf-8");
          return parseFeatureModel(content);
        } catch {
          continue;
        }
      }
    }
  } catch {
    // Directory read failed
  }

  return null;
}
// &end[GetFeatureModel]

const schema = z.object({
  title: z
    .string()
    .describe(
      "Title of the summary to be displayed in the GUI. Must follow the format: '<project title> - <action taken>', e.g. 'FM Workflow - Add login feature'.",
    ),
  description: z
    .string()
    .describe("Description of the summary to be displayed in the GUI."),
  featureChanges: z
    .array(
      z.object({
        featureName: z.string().describe("The name of the changed feature."),
        changeType: z
          .enum(["added", "removed", "modified"])
          .describe("The type of change that occurred to the feature."),
        changeDescription: z
          .string()
          .describe(
            "A description of the change that occurred to the feature.",
          ),
        featurePath: z
          .array(z.string())
          .describe(
            "Path from the root to changed feature, represented as an array of feature names. The first feature in the feature path is always the root feature. The frontend uses this to place change annotations at the correct location in the tree.",
          ),
      }),
    )
    .describe(
      "A list of unique feature changes. Each feature should appear at most once. For new features, use 'added'; for existing features that were updated, use 'modified'; for features removed from the model, use 'removed'.",
    ),
  projectPath: z
    .string()
    .describe(
      "Absolute path to the project root. The server reads the .feature-model file from this path and runs git diff to include file change stats in the summary.",
    ),
  changedFiles: z
    .array(z.string())
    .optional()
    .describe(
      "List of file paths (relative to projectPath) that were changed or added. If provided, git diff is scoped to only these files instead of the entire working tree.",
    ),
});

/** Full payload type sent to the frontend (input + computed fields). */
export type InputSummary = z.infer<typeof schema> & {
  featureModel: FeatureModel;
};

// &begin[GitDiff]
export interface FileDiffStat {
  file: string;
  added: number;
  removed: number;
}

/** Run `git diff HEAD --numstat` and parse into per-file +/- line counts.
 *  Also detects untracked files and synthesizes diff stats for them
 *  (added = line count, removed = 0) so new files appear in summaries. */
function getGitDiffStats(
  projectPath: string,
  changedFiles?: string[],
): FileDiffStat[] {
  try {
    // If changedFiles is provided, scope the diff to only those files
    const fileArgs =
      changedFiles && changedFiles.length > 0
        ? " -- " + changedFiles.map((f) => `"${f}"`).join(" ")
        : "";
    const raw = execSync(`git diff HEAD --numstat --relative${fileArgs}`, {
      cwd: projectPath,
      encoding: "utf-8",
      timeout: 10_000,
    }).trim();

    const trackedDiffs: FileDiffStat[] = raw
      ? raw
          .split("\n")
          .filter((line) => line.trim())
          .map((line) => {
            const [addedStr, removedStr, ...fileParts] = line.split("\t");
            // Binary files show as "-" for both counts
            const added = addedStr === "-" ? 0 : parseInt(addedStr, 10);
            const removed = removedStr === "-" ? 0 : parseInt(removedStr, 10);
            return { file: fileParts.join("\t"), added, removed };
          })
      : [];

    // Detect untracked files and synthesize diff stats for them
    const untrackedDiffs = getUntrackedFileDiffs(projectPath, changedFiles);

    // Merge, avoiding duplicates (tracked diffs take priority)
    const trackedFiles = new Set(trackedDiffs.map((d) => d.file));
    const merged = [
      ...trackedDiffs,
      ...untrackedDiffs.filter((d) => !trackedFiles.has(d.file)),
    ];

    return merged;
  } catch {
    // git diff HEAD fails when there's no HEAD (fresh repo, no commits).
    // Fall back to showing untracked files as new additions.
    return getUntrackedFileDiffs(projectPath, changedFiles);
  }
}

/** Find untracked files and count their lines to produce synthetic diff stats. */
function getUntrackedFileDiffs(
  projectPath: string,
  changedFiles?: string[],
): FileDiffStat[] {
  try {
    const raw = execSync(
      "git ls-files --others --exclude-standard",
      { cwd: projectPath, encoding: "utf-8", timeout: 10_000 },
    ).trim();

    if (!raw) return [];

    let untrackedFiles = raw.split("\n").filter((f) => f.trim());

    // If changedFiles is provided, only include untracked files that match
    if (changedFiles && changedFiles.length > 0) {
      const changedSet = new Set(
        changedFiles.map((f) => f.replace(/\\/g, "/")),
      );
      untrackedFiles = untrackedFiles.filter((f) =>
        changedSet.has(f.replace(/\\/g, "/")),
      );
    }

    return untrackedFiles.map((file) => {
      let lineCount = 0;
      try {
        const fullPath = path.join(projectPath, file);
        const content = fs.readFileSync(fullPath, "utf-8");
        // Count non-empty lines; if file is empty, count as 0
        lineCount = content ? content.split("\n").length : 0;
        // If the file ends with a newline, the last split element is empty
        if (content.endsWith("\n")) lineCount--;
      } catch {
        // Binary file or read error -- show as 0/0
      }
      return { file, added: lineCount, removed: 0 };
    });
  } catch {
    return [];
  }
}
// &end[GitDiff]

// &begin[FileTree]
/**
 * Get all git-tracked files in a project (respects .gitignore).
 * Returns a sorted array of relative file paths.
 */
function getProjectFiles(projectPath: string): string[] {
  try {
    const raw = execSync("git ls-files --cached --others --exclude-standard", {
      cwd: projectPath,
      encoding: "utf-8",
      timeout: 15_000,
    }).trim();

    if (!raw) return [];
    return raw
      .split("\n")
      .filter((f) => f.trim())
      .sort();
  } catch {
    return [];
  }
}
// &end[FileTree]

// &begin[FeatureLocator]
/** Binary file extensions to skip when scanning for annotations. */
const BINARY_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".bmp",
  ".ico",
  ".svg",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".otf",
  ".zip",
  ".tar",
  ".gz",
  ".rar",
  ".pdf",
  ".doc",
  ".docx",
  ".mp3",
  ".mp4",
  ".wav",
  ".avi",
  ".exe",
  ".dll",
  ".so",
  ".dylib",
  ".lock",
  ".map",
]);

const ANNOTATION_REGEX = /&(?:begin|end|line)\[(\w+)\]/g;

/**
 * Scan all tracked files in a project for embedded feature annotations
 * (&begin[X], &end[X], &line[X]), .feature-to-file mappings,
 * and .feature-to-folder mappings.
 * Returns a map from feature name to list of relative file paths.
 */
function scanFeatureAnnotations(projectPath: string): Record<string, string[]> {
  const featureMap: Record<string, Set<string>> = {};

  function addMapping(feature: string, file: string) {
    if (!featureMap[feature]) featureMap[feature] = new Set();
    featureMap[feature].add(file);
  }

  try {
    // Use git ls-files to get tracked files (respects .gitignore)
    const raw = execSync("git ls-files --cached --others --exclude-standard", {
      cwd: projectPath,
      encoding: "utf-8",
      timeout: 15_000,
    }).trim();

    if (!raw) return {};

    const files = raw.split("\n").map((f) => f.trim()).filter(Boolean);

    for (const relFile of files) {
      const ext = path.extname(relFile).toLowerCase();

      // Parse file and folder mapping files
      const mappingType = path.basename(relFile);
      if (mappingType === ".feature-to-file" || mappingType === ".feature-to-folder") {
        try {
          const content = fs.readFileSync(
            path.join(projectPath, relFile),
            "utf-8",
          );
          const lines = content
            .split("\n")
            .map((l) => l.trim())
            .filter((l) => l);
          // Format: pairs of lines — file/folder name, then feature name
          for (let i = 0; i + 1 < lines.length; i += 2) {
            const targetName = lines[i];
            const featureName = lines[i + 1];
            if (targetName && featureName) {
              // Resolve the target relative to the mapping file's directory
              const dir = path.dirname(relFile);
              const target = path.posix.normalize(
                dir === "." ? targetName : path.posix.join(dir, targetName),
              );
              if (mappingType === ".feature-to-file") {
                addMapping(featureName, target);
              } else {
                const prefix = target === "." ? "" : `${target.replace(/\/$/, "")}/`;
                for (const file of files) {
                  const name = path.posix.basename(file);
                  if (file.startsWith(prefix) &&
                      name !== ".feature-to-file" &&
                      name !== ".feature-to-folder") {
                    addMapping(featureName, file);
                  }
                }
              }
            }
          }
        } catch {
          // Skip unreadable mapping files
        }
        continue;
      }

      // Skip binary files
      if (BINARY_EXTENSIONS.has(ext)) continue;

      // Scan text files for annotation patterns
      try {
        const content = fs.readFileSync(
          path.join(projectPath, relFile),
          "utf-8",
        );
        let match: RegExpExecArray | null;
        ANNOTATION_REGEX.lastIndex = 0;
        while ((match = ANNOTATION_REGEX.exec(content)) !== null) {
          addMapping(match[1], relFile);
        }
      } catch {
        // Skip unreadable files
      }
    }
  } catch {
    // git ls-files failed — return empty map
    return {};
  }

  // Convert Sets to sorted arrays
  const result: Record<string, string[]> = {};
  for (const [feature, fileSet] of Object.entries(featureMap)) {
    result[feature] = Array.from(fileSet).sort();
  }
  return result;
}
// &end[FeatureLocator]

// Create server instance
const server = new McpServer({
  name: "agent-hans",
  version: "1.0.0",
});

// &begin[Summary]
server.registerTool(
  "summary-gui",
  {
    description: "Displays a summary to the user",
    inputSchema: schema,
  },
  async (input) => {
    // &begin[GetFeatureModel]
    const featureModel = readFeatureModelFile(input.projectPath);
    if (!featureModel) {
      // Show error in frontend
      const errorPayload = {
        ...input,
        featureModel: { name: "Error", subfeatures: [] },
        featureChanges: [
          {
            featureName: "Error",
            changeType: "modified" as const,
            changeDescription:
              "No .feature-model file found in the project. Please create a .feature-model file in the project root.",
            featurePath: ["Error"],
          },
        ],
        fileDiffs: [],
        featureFileMap: {},
        projectFiles: [],
      };
      // &begin[SummaryStore]
      const errorId = storeSummary(JSON.stringify(errorPayload));
      open(`http://localhost:${PORT}/?id=${encodeURIComponent(errorId)}`);
      // &end[SummaryStore]
      return {
        content: [
          {
            type: "text",
            text: `Error: No .feature-model file found at or under "${input.projectPath}".`,
          },
        ],
      };
    }
    // &end[GetFeatureModel]

    // Build the payload for the frontend
    // &begin[GitDiff]
    const fileDiffs: FileDiffStat[] = getGitDiffStats(
      input.projectPath,
      input.changedFiles,
    );
    // &end[GitDiff]

    // &begin[FeatureLocator]
    const featureFileMap: Record<string, string[]> = scanFeatureAnnotations(
      input.projectPath,
    );
    // &end[FeatureLocator]

    // &begin[FileTree]
    const projectFiles: string[] = getProjectFiles(input.projectPath);
    // &end[FileTree]

    const payload = { ...input, featureModel, fileDiffs, featureFileMap, projectFiles };
    const jsonString = JSON.stringify(payload);

    // &begin[SummaryStore]
    const summaryId = storeSummary(jsonString);
    const fullUrl = `http://localhost:${PORT}/?id=${encodeURIComponent(summaryId)}`;
    console.error(`[agent-hans] Payload size: ${jsonString.length} bytes (JSON), stored with ID: ${summaryId}`);
    // &end[SummaryStore]

    open(fullUrl);

    return {
      content: [
        {
          type: "text",
          text: `Ok`,
        },
      ],
    };
  },
);
// &end[Summary]

server.registerTool(
  "get-feature-model",
  {
    description: "Get the features of a project.",
    inputSchema: z.object({
      projectPath: z
        .string()
        .describe("Absolute path to the root of a project"),
    }),
  },
  async ({ projectPath }) => {
    const featureModelFileName = ".feature-model";

    // Try to read from the root directory
    const rootPath = path.join(projectPath, featureModelFileName);
    if (fs.existsSync(rootPath)) {
      try {
        const content = fs.readFileSync(rootPath, "utf-8");
        return {
          content: [
            {
              type: "text",
              text: content,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error reading feature model: ${error}`,
            },
          ],
        };
      }
    }

    // Look one directory down
    try {
      const subdirs = fs
        .readdirSync(projectPath, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name);

      for (const subdir of subdirs) {
        const subdirPath = path.join(projectPath, subdir, featureModelFileName);
        if (fs.existsSync(subdirPath)) {
          try {
            const content = fs.readFileSync(subdirPath, "utf-8");
            return {
              content: [
                {
                  type: "text",
                  text: content,
                },
              ],
            };
          } catch (error) {
            return {
              content: [
                {
                  type: "text",
                  text: `Error reading feature model: ${error}`,
                },
              ],
            };
          }
        }
      }
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error scanning directories: ${error}`,
          },
        ],
      };
    }

    // No feature model found
    return {
      content: [
        {
          type: "text",
          text: "No feature model found",
        },
      ],
    };
  },
);

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json",
};

// Simple HTTP server to serve static files (SPA with fallback to index.html)
// and the summary API endpoint
function startWebServer() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const staticDir = path.join(__dirname, "static");

  const httpServer = http.createServer((req, res) => {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);
    const pathname = decodeURIComponent(url.pathname);

    // &begin[SummaryApi]
    // API endpoint: GET /api/summary/<id>
    const apiMatch = pathname.match(/^\/api\/summary\/(.+)$/);
    if (apiMatch) {
      const id = apiMatch[1];
      const data = summaryStore.get(id);
      if (data) {
        res.writeHead(200, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(data);
      } else {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Summary not found" }));
      }
      return;
    }
    // &end[SummaryApi]

    // &begin[FileDiffApi]
    // API endpoint: GET /api/file-diff?id=<summaryId>&file=<relativePath>
    if (pathname === "/api/file-diff") {
      const summaryId = url.searchParams.get("id");
      const file = url.searchParams.get("file");
      if (!summaryId || !file) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Missing id or file parameter" }));
        return;
      }
      const rawSummary = summaryStore.get(summaryId);
      if (!rawSummary) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Summary not found" }));
        return;
      }
      let projectPath: string;
      try {
        projectPath = (JSON.parse(rawSummary) as { projectPath: string }).projectPath;
      } catch {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid summary data" }));
        return;
      }
      const fullFilePath = path.join(projectPath, file);
      // Safety: ensure the resolved path is within the project
      if (!fullFilePath.startsWith(projectPath)) {
        res.writeHead(403, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Forbidden" }));
        return;
      }
      // Check if the file is tracked by git (modified) or untracked (new)
      try {
        const isTracked = (() => {
          try {
            execSync(`git ls-files --error-unmatch "${file}"`, {
              cwd: projectPath,
              encoding: "utf-8",
              timeout: 5_000,
              stdio: ["ignore", "pipe", "ignore"],
            });
            return true;
          } catch {
            return false;
          }
        })();
        if (isTracked) {
          // Modified tracked file: return unified diff
          let patch = "";
          try {
            patch = execSync(`git diff HEAD -- "${file}"`, {
              cwd: projectPath,
              encoding: "utf-8",
              timeout: 10_000,
            });
          } catch {
            patch = "";
          }
          res.writeHead(200, {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          });
          res.end(JSON.stringify({ type: "diff", patch }));
        } else {
          // New untracked file: return full file content
          const content = fs.readFileSync(fullFilePath, "utf-8");
          res.writeHead(200, {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          });
          res.end(JSON.stringify({ type: "new", content }));
        }
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: String(err) }));
      }
      return;
    }
    // &end[FileDiffApi]

    // Resolve requested path within static directory
    let filePath = path.join(staticDir, pathname);

    // Prevent directory traversal
    if (!filePath.startsWith(staticDir)) {
      res.writeHead(403, { "Content-Type": "text/plain" });
      res.end("Forbidden");
      return;
    }

    // Try to serve the requested file; fall back to index.html for SPA routing
    fs.stat(filePath, (err, stats) => {
      if (!err && stats.isFile()) {
        serveFile(filePath, res);
      } else {
        // SPA fallback: serve index.html for any non-file route
        serveFile(path.join(staticDir, "index.html"), res);
      }
    });
  });

  httpServer.listen(PORT, () => {
    console.error(`Web server is running at http://localhost:${PORT}`);
  });
}

function serveFile(filePath: string, res: http.ServerResponse) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end(err.message);
      return;
    }
    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  });
}

async function main() {
  PORT = await getPort({ port: PORT });

  // Start web server
  console.error("Starting web server...");
  startWebServer();

  // Start MCP server
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("FM MCP server is running...");
}
main().catch((err) => {
  console.error("Error starting FM MCP server:", err);
  process.exit(1);
});
