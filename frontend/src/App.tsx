import { useEffect, useMemo, useState } from "react";
import { GhostNode } from "./components/FeatureTree"; // &line[FeatureTree]
import { Sidebar } from "./components/Sidebar"; // &line[Frontend]
import { DiffViewer, FileDiffStat } from "./components/DiffViewer"; // &line[Frontend]
import { FileTree } from "./components/FileTree"; // &line[FileTree]
import { PatchViewer } from "./components/PatchViewer"; // &line[PatchViewer]

import { InputSummary } from "../../src/index";

interface SummaryData {
  title: string;
  description: string;
  featureModel: InputSummary["featureModel"];
  featureChanges: InputSummary["featureChanges"];
  fileDiffs?: FileDiffStat[]; // &line[GitDiff]
  featureFileMap?: Record<string, string[]>; // &line[FeatureLocator]
  projectFiles?: string[]; // &line[FileTree]
}

// &begin[DataFetching]
/** Extract the summary ID from the URL query parameters. */
function getSummaryIdFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

/** Fetch summary data from the server API by ID. */
async function fetchSummaryById(id: string): Promise<SummaryData | null> {
  try {
    const response = await fetch(`/api/summary/${encodeURIComponent(id)}`);
    if (!response.ok) return null;
    return (await response.json()) as SummaryData;
  } catch {
    return null;
  }
}
// &end[DataFetching]

/** Build lookup maps for changes placed on the feature tree. */
// &begin[FeatureTree]
function buildChangeMaps(data: SummaryData) {
  // Build a set of existing paths in the feature model
  const pathSet = new Set<string>();
  function walk(node: any, curPath: string[]) {
    const key = curPath.concat(node.name).join("/");
    pathSet.add(key);
    for (const ch of node.subfeatures ?? []) {
      walk(ch, curPath.concat(node.name));
    }
  }
  walk(data.featureModel, []);

  const changesMap: Record<string, InputSummary["featureChanges"][number]> = {};
  const ghostMap: Record<string, GhostNode[]> = {};
  const orphans: InputSummary["featureChanges"] = [];

  // Helper: find or create a ghost node by name in a GhostNode[] array
  function findOrCreateGhost(siblings: GhostNode[], name: string): GhostNode {
    let existing = siblings.find((g) => g.name === name);
    if (!existing) {
      existing = { name, children: [] };
      siblings.push(existing);
    }
    return existing;
  }

  for (const ch of data.featureChanges) {
    const p = (ch as any).featurePath;
    if (Array.isArray(p) && p.length > 0) {
      const key = p.join("/");
      if (pathSet.has(key)) {
        changesMap[key] = ch as InputSummary["featureChanges"][number];
        continue;
      }

      // Find the longest existing ancestor
      let ancestorLen = p.length - 1;
      let placed = false;
      while (ancestorLen > 0) {
        const aKey = p.slice(0, ancestorLen).join("/");
        if (pathSet.has(aKey)) {
          const missingSegments = p.slice(ancestorLen);
          if (!ghostMap[aKey]) ghostMap[aKey] = [];

          let currentSiblings = ghostMap[aKey];
          for (let i = 0; i < missingSegments.length; i++) {
            const ghostNode = findOrCreateGhost(currentSiblings, missingSegments[i]);
            if (i === missingSegments.length - 1) {
              ghostNode.change = ch as InputSummary["featureChanges"][number];
            }
            currentSiblings = ghostNode.children;
          }

          placed = true;
          break;
        }
        ancestorLen--;
      }
      if (!placed) {
        orphans.push(ch as InputSummary["featureChanges"][number]);
      }
    } else {
      orphans.push(ch as InputSummary["featureChanges"][number]);
    }
  }

  return { changesMap, ghostMap, orphans };
}
// &end[FeatureTree]

export default function App() {
  // &begin[DataFetching]
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = getSummaryIdFromUrl();
    if (!id) {
      setLoading(false);
      return;
    }
    fetchSummaryById(id).then((result) => {
      setData(result);
      setLoading(false);
    });
  }, []);
  // &end[DataFetching]

  const { changesMap, ghostMap } = useMemo(
    () => (data ? buildChangeMaps(data) : { changesMap: {}, ghostMap: {}, orphans: [] }),
    [data],
  ); // &line[FeatureTree]

  // &begin[Summary]
  useEffect(() => {
    document.title = data ? `FM | ${data.title}` : "FM | Feature Model Summary";
  }, [data]);
  // &end[Summary]

  // &begin[FeatureFilesPanel]
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);

  function handleFeatureSelect(featureName: string) {
    // Toggle: clicking the same feature again closes the panel
    setSelectedFeature((prev) => (prev === featureName ? null : featureName));
  }
  // &end[FeatureFilesPanel]

  // &begin[PatchViewer]
  const summaryId = getSummaryIdFromUrl() ?? "";
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  function handleFileSelect(file: string) {
    setSelectedFile((prev) => (prev === file ? null : file));
  }
  // &end[PatchViewer]

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-8"> {/* &line[LightMode] */}
        <div className="text-center max-w-md">
          <p className="text-gray-400 text-sm">Loading summary...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-8"> {/* &line[LightMode] */}
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">
            <svg
              className="w-16 h-16 mx-auto text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-800 mb-2">
            No Summary Data
          </h1>
          <p className="text-gray-400 text-sm">
            This page is opened by the MCP server with summary data encoded in
            the URL. No valid data was found in the current URL.
          </p>
        </div>
      </div>
    );
  }

  const featureFiles = selectedFeature && data.featureFileMap
    ? data.featureFileMap[selectedFeature] ?? []
    : [];

  return (
    // &begin[Layout]
    <div className="h-screen flex flex-col bg-white text-gray-900"> {/* &line[LightMode] &line[Theme] */}
      {/* Multi-panel body */}
      <div className="flex flex-1 overflow-hidden">
        {/* &line[Sidebar] &line[FeatureTree] */}
        <Sidebar
          featureModel={data.featureModel}
          featureChanges={data.featureChanges}
          changesMap={changesMap}
          ghostMap={ghostMap}
          selectedFeature={selectedFeature}
          onFeatureSelect={handleFeatureSelect}
        />

        {/* &begin[FileTree] */}
        <FileTree
          projectFiles={data.projectFiles ?? []}
          featureFileMap={data.featureFileMap ?? {}}
          selectedFeature={selectedFeature}
          fileDiffs={data.fileDiffs ?? []}
          featureFiles={featureFiles}
          onFileSelect={handleFileSelect}
        />
        {/* &end[FileTree] */}

        {/* &begin[MainPanel] */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Summary description */}
          <section>
            <p className="text-gray-500 leading-relaxed">{data.description}</p>
          </section>

          {/* File content / diff viewer (PatchViewer) or stats table (DiffViewer) */}
          {selectedFile ? ( // &line[PatchViewer]
            <PatchViewer // &line[PatchViewer]
              file={selectedFile}
              summaryId={summaryId}
              onClose={() => setSelectedFile(null)}
            />
          ) : (
            <DiffViewer fileDiffs={data.fileDiffs ?? []} onFileSelect={handleFileSelect} /> // &line[DiffViewer] &line[PatchViewer]
          )}
        </main>
        {/* &end[MainPanel] */}
      </div>
    </div>
    // &end[Layout]
  );
}
