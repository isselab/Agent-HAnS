import { useMemo, useState, useEffect } from "react";
import { TabBar } from "./TabBar";
import { FileDiffStat } from "./DiffViewer";

// &begin[FileTree]

/** A node in the file tree (either a directory or a file). */
interface TreeNode {
  name: string;
  /** Full relative path from project root (e.g. "src/components/Tile.tsx"). */
  path: string;
  children: TreeNode[];
  isDirectory: boolean;
}

interface FileTreeProps {
  projectFiles: string[];
  featureFileMap: Record<string, string[]>;
  selectedFeature: string | null;
  fileDiffs: FileDiffStat[];
  featureFiles: string[];
  onFileSelect?: (file: string) => void; // &line[PatchViewer]
}

/** Build a hierarchical tree from a flat list of file paths. */
function buildTree(files: string[]): TreeNode[] {
  const root: TreeNode = { name: "", path: "", children: [], isDirectory: true };

  for (const filePath of files) {
    // Normalize to forward slashes
    const parts = filePath.replace(/\\/g, "/").split("/");
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      const partialPath = parts.slice(0, i + 1).join("/");

      let child = current.children.find((c) => c.name === part);
      if (!child) {
        child = {
          name: part,
          path: partialPath,
          children: [],
          isDirectory: !isLast,
        };
        current.children.push(child);
      }
      current = child;
    }
  }

  // Sort: directories first, then alphabetical
  function sortTree(nodes: TreeNode[]) {
    nodes.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    for (const node of nodes) {
      if (node.children.length > 0) sortTree(node.children);
    }
  }
  sortTree(root.children);

  return root.children;
}

/** Check if a tree node (or any descendant) contains a highlighted file. */
function hasHighlightedDescendant(
  node: TreeNode,
  highlightedFiles: Set<string>,
): boolean {
  if (!node.isDirectory) return highlightedFiles.has(node.path);
  return node.children.some((child) =>
    hasHighlightedDescendant(child, highlightedFiles),
  );
}

/** Collect all directory paths that contain highlighted descendants (for auto-expand). */
function collectExpandedDirs(
  nodes: TreeNode[],
  highlightedFiles: Set<string>,
): Set<string> {
  const expanded = new Set<string>();

  function walk(node: TreeNode): boolean {
    if (!node.isDirectory) return highlightedFiles.has(node.path);
    let anyChild = false;
    for (const child of node.children) {
      if (walk(child)) anyChild = true;
    }
    if (anyChild) expanded.add(node.path);
    return anyChild;
  }

  for (const node of nodes) walk(node);
  return expanded;
}

function TreeNodeView({
  node,
  highlightedFiles,
  expandedDirs,
  toggleDir,
  depth,
  diffLookup,
  onFileSelect,
}: {
  node: TreeNode;
  highlightedFiles: Set<string>;
  expandedDirs: Set<string>;
  toggleDir: (path: string) => void;
  depth: number;
  diffLookup: Map<string, FileDiffStat>;
  onFileSelect?: (file: string) => void; // &line[PatchViewer]
}) {
  const isHighlighted = node.isDirectory
    ? hasHighlightedDescendant(node, highlightedFiles)
    : highlightedFiles.has(node.path);

  const isExpanded = expandedDirs.has(node.path);

  const textColor = isHighlighted ? "text-gray-900" : "text-gray-300";

  if (node.isDirectory) {
    return (
      <div>
        <button
          onClick={() => toggleDir(node.path)}
          className={`flex items-center w-full text-left py-0.5 hover:bg-gray-50 ${textColor}`}
          style={{ paddingLeft: depth * 16 + 4 }}
        >
          {/* Expand/collapse chevron */}
          <svg
            className={`w-3 h-3 mr-1 flex-shrink-0 transition-transform ${
              isExpanded ? "rotate-90" : ""
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5l7 7-7 7"
            />
          </svg>
          {/* Folder icon */}
          <svg
            className="w-4 h-4 mr-1.5 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z"
            />
          </svg>
          <span className="text-xs font-mono truncate">{node.name}/</span>
        </button>
        {isExpanded &&
          node.children.map((child) => (
            <TreeNodeView
              key={child.path}
              node={child}
              highlightedFiles={highlightedFiles}
              expandedDirs={expandedDirs}
              toggleDir={toggleDir}
              depth={depth + 1}
              diffLookup={diffLookup}
              onFileSelect={onFileSelect}
            />
          ))}
      </div>
    );
  }

  // File node -- only show diff stats for highlighted files
  const diff = isHighlighted ? diffLookup.get(node.path) : undefined;

  // &begin[PatchViewer]
  return (
    <div
      role={onFileSelect ? "button" : undefined}
      tabIndex={onFileSelect ? 0 : undefined}
      onClick={() => onFileSelect?.(node.path)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onFileSelect?.(node.path); }}
      className={`flex items-center py-0.5 pr-3 ${textColor} ${onFileSelect ? "hover:bg-blue-50 cursor-pointer" : ""}`}
      style={{ paddingLeft: depth * 16 + 4 }}
    >      {/* Spacer for alignment with chevron */}
      <span className="w-3 mr-1 flex-shrink-0" />
      {/* File icon */}
      <svg
        className="w-4 h-4 mr-1.5 flex-shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
        />
      </svg>
      <span className="text-xs font-mono truncate flex-1">{node.name}</span>
      {diff && (
        <span className="flex items-center gap-1.5 ml-3 flex-shrink-0">
          {diff.added > 0 && (
            <span className="text-[10px] font-medium text-emerald-600">+{diff.added}</span>
          )}
          {diff.removed > 0 && (
            <span className="text-[10px] font-medium text-rose-600">-{diff.removed}</span>
          )}
        </span>
      )}
    </div>
  );
  // &end[PatchViewer]
}

/** Feature Files tab content: flat list of files for the selected feature with diff stats. */
function FeatureFilesTab({
  featureName,
  files,
  diffLookup,
  onFileSelect,
}: {
  featureName: string;
  files: string[];
  diffLookup: Map<string, FileDiffStat>;
  onFileSelect?: (file: string) => void; // &line[PatchViewer]
}) {
  // Sort files: files with diffs first, then alphabetical
  const sortedFiles = useMemo(() => {
    return [...files].sort((a, b) => {
      const aDiff = diffLookup.has(a) ? 0 : 1;
      const bDiff = diffLookup.has(b) ? 0 : 1;
      if (aDiff !== bDiff) return aDiff - bDiff;
      return a.localeCompare(b);
    });
  }, [files, diffLookup]);

  const changedCount = sortedFiles.filter((f) => diffLookup.has(f)).length;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Feature name header */}
      <div className="px-4 py-2 border-b border-gray-200 bg-gray-50">
        <div className="text-xs text-gray-400 uppercase tracking-wide">Feature</div>
        <div className="text-sm font-semibold text-gray-800 truncate">{featureName}</div>
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto">
        {sortedFiles.length === 0 ? (
          <div className="p-4 text-sm text-gray-400">
            No files found for this feature.
          </div>
        ) : (
          <div className="py-1">
            {sortedFiles.map((file) => {
              const diff = diffLookup.get(file);
              return (
                <div
                  key={file}
                  role={onFileSelect ? "button" : undefined} // &line[PatchViewer]
                  tabIndex={onFileSelect ? 0 : undefined} // &line[PatchViewer]
                  onClick={() => onFileSelect?.(file)} // &line[PatchViewer]
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onFileSelect?.(file); }} // &line[PatchViewer]
                  className={`px-4 py-2 text-sm border-b border-gray-100 ${
                    diff ? "bg-amber-50" : ""
                  } ${onFileSelect ? "hover:bg-blue-50 cursor-pointer" : ""}`} // &line[PatchViewer]
                >
                  <div className="text-gray-700 font-mono text-xs break-all">{file}</div>
                  {diff && (
                    <div className="flex items-center gap-2 mt-1">
                      {diff.added > 0 && (
                        <span className="text-xs text-emerald-600 font-medium">+{diff.added}</span>
                      )}
                      {diff.removed > 0 && (
                        <span className="text-xs text-rose-600 font-medium">-{diff.removed}</span>
                      )}
                      <span className="text-xs text-amber-600">changed</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer summary */}
      <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-400">
        {sortedFiles.length} file{sortedFiles.length !== 1 ? "s" : ""}
        {changedCount > 0 && (
          <span>
            {" "}&middot; {changedCount} with changes
          </span>
        )}
      </div>
    </div>
  );
}

const FILE_TABS = [
  { id: "project-files", label: "Project Files" },
  { id: "feature-files", label: "Feature Files" },
];

export function FileTree({
  projectFiles,
  featureFileMap,
  selectedFeature,
  fileDiffs,
  featureFiles,
  onFileSelect,
}: FileTreeProps) {
  const tree = useMemo(() => buildTree(projectFiles), [projectFiles]);

  // Build diff lookup for inline stats
  const diffLookup = useMemo(() => {
    const map = new Map<string, FileDiffStat>();
    for (const diff of fileDiffs) {
      map.set(diff.file, diff);
    }
    return map;
  }, [fileDiffs]);

  // Compute which files are highlighted for the selected feature
  const highlightedFiles = useMemo(() => {
    if (!selectedFeature || !featureFileMap[selectedFeature]) {
      return new Set<string>();
    }
    // Normalize paths to forward slashes
    return new Set(
      featureFileMap[selectedFeature].map((f) => f.replace(/\\/g, "/")),
    );
  }, [selectedFeature, featureFileMap]);

  // Compute auto-expanded directories based on highlighted files
  const autoExpanded = useMemo(
    () => collectExpandedDirs(tree, highlightedFiles),
    [tree, highlightedFiles],
  );

  // Track manually toggled directories
  const [manualExpanded, setManualExpanded] = useState<Set<string>>(new Set());

  // Tab state
  const [activeTab, setActiveTab] = useState("project-files");

  // When the selected feature changes, reset manual toggles and use auto-expand
  useEffect(() => {
    setManualExpanded(new Set());
  }, [selectedFeature]);

  // Merged: auto-expanded + manual toggles
  const expandedDirs = useMemo(() => {
    const merged = new Set(autoExpanded);
    for (const dir of manualExpanded) {
      if (merged.has(dir)) {
        merged.delete(dir); // manual toggle closes an auto-expanded dir
      } else {
        merged.add(dir); // manual toggle opens a collapsed dir
      }
    }
    return merged;
  }, [autoExpanded, manualExpanded]);

  function toggleDir(dirPath: string) {
    setManualExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(dirPath)) {
        next.delete(dirPath);
      } else {
        next.add(dirPath);
      }
      return next;
    });
  }

  return (
    <div className="w-[300px] flex-shrink-0 border-r border-gray-200 flex flex-col bg-white overflow-hidden">
      {/* Tab bar */}
      <TabBar tabs={FILE_TABS} activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === "project-files" && (
        <>
          {/* Tree header */}
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-700">Project Files</h3>
            {selectedFeature ? (
              <p className="text-xs text-gray-400 mt-0.5">
                Highlighting: <span className="text-gray-600 font-medium">{selectedFeature}</span>
              </p>
            ) : (
              <p className="text-xs text-gray-400 mt-0.5">
                Select a feature to highlight its files
              </p>
            )}
          </div>

          {/* Tree */}
          <div className="flex-1 overflow-y-auto py-1">
            {tree.length === 0 ? (
              <div className="p-4 text-sm text-gray-400">
                No project files found.
              </div>
            ) : (
              tree.map((node) => (
                <TreeNodeView
                  key={node.path}
                  node={node}
                  highlightedFiles={highlightedFiles}
                  expandedDirs={expandedDirs}
                  toggleDir={toggleDir}
                  depth={0}
                  diffLookup={diffLookup}
                  onFileSelect={onFileSelect}
                />
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-400">
            {projectFiles.length} file{projectFiles.length !== 1 ? "s" : ""}
            {highlightedFiles.size > 0 && (
              <span>
                {" "}&middot; {highlightedFiles.size} in feature
              </span>
            )}
          </div>
        </>
      )}

      {activeTab === "feature-files" && (
        <>
          {selectedFeature ? (
            <FeatureFilesTab
              featureName={selectedFeature}
              files={featureFiles}
              diffLookup={diffLookup}
              onFileSelect={onFileSelect}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center p-4">
              <p className="text-sm text-gray-400 text-center">
                Select a feature from the sidebar to see its files
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// &end[FileTree]
