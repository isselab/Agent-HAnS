import { FileDiffStat } from "./DiffViewer";

interface FeatureFilesPanelProps {
  featureName: string;
  files: string[];
  fileDiffs: FileDiffStat[];
  onClose: () => void;
}

export function FeatureFilesPanel({
  featureName,
  files,
  fileDiffs,
  onClose,
}: FeatureFilesPanelProps) {
  // Build a lookup from file path to diff stats
  const diffLookup = new Map<string, FileDiffStat>();
  for (const diff of fileDiffs) {
    diffLookup.set(diff.file, diff);
  }

  // Sort files: files with diffs first, then alphabetical
  const sortedFiles = [...files].sort((a, b) => {
    const aDiff = diffLookup.has(a) ? 0 : 1;
    const bDiff = diffLookup.has(b) ? 0 : 1;
    if (aDiff !== bDiff) return aDiff - bDiff;
    return a.localeCompare(b);
  });

  return (
    <div className="w-[300px] flex-shrink-0 border-r border-gray-200 flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="min-w-0">
          <div className="text-xs text-gray-400 uppercase tracking-wide">Feature</div>
          <div className="text-sm font-semibold text-gray-800 truncate">{featureName}</div>
        </div>
        <button
          onClick={onClose}
          className="ml-2 flex-shrink-0 text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-200"
          aria-label="Close panel"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
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
                  className={`px-4 py-2 text-sm border-b border-gray-100 ${
                    diff ? "bg-amber-50" : ""
                  }`}
                >
                  <div className="text-gray-700 font-mono text-xs break-all">{file}</div>
                  {diff && (
                    <div className="flex items-center gap-2 mt-1">
                      {/* &begin[ColorPalette] */}
                      {diff.added > 0 && (
                        <span className="text-xs text-emerald-600 font-medium">+{diff.added}</span>
                      )}
                      {diff.removed > 0 && (
                        <span className="text-xs text-rose-600 font-medium">-{diff.removed}</span>
                      )}
                      {/* &end[ColorPalette] */}
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
        {diffLookup.size > 0 && (
          <span>
            {" "}&middot; {sortedFiles.filter((f) => diffLookup.has(f)).length} with changes
          </span>
        )}
      </div>
    </div>
  );
}
