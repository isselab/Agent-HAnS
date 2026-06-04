export interface FileDiffStat {
  file: string;
  added: number;
  removed: number;
}

interface DiffViewerProps {
  fileDiffs: FileDiffStat[];
  onFileSelect?: (file: string) => void; // &line[PatchViewer]
}

export function DiffViewer({ fileDiffs, onFileSelect }: DiffViewerProps) {
  if (!fileDiffs || fileDiffs.length === 0) {
    return (
      <div className="text-sm text-gray-400 p-4">
        No file changes detected (working tree is clean or no project path was provided).
      </div>
    );
  }

  const totalAdded = fileDiffs.reduce((sum, f) => sum + f.added, 0);
  const totalRemoved = fileDiffs.reduce((sum, f) => sum + f.removed, 0);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700">
          File Changes
          <span className="ml-2 text-xs font-normal text-gray-400">
            {fileDiffs.length} file{fileDiffs.length !== 1 ? "s" : ""}
          </span>
        </h3>
      </div>
      <div className="font-mono text-sm">
        {fileDiffs.map((diff, i) => (
          /* &begin[PatchViewer] */
          <button
            key={diff.file}
            onClick={() => onFileSelect?.(diff.file)}
            className={`flex items-center justify-between w-full text-left px-4 py-2 ${
              i % 2 === 0 ? "bg-white" : "bg-gray-50"
            } ${onFileSelect ? "hover:bg-blue-50 cursor-pointer" : ""}`}
          >
            <span className="text-gray-700 truncate mr-4">{diff.file}</span>
            <div className="flex items-center gap-3 flex-shrink-0">
              {/* &begin[ColorPalette] */}
              {diff.added > 0 && (
                <span className="text-emerald-600">+{diff.added}</span>
              )}
              {diff.removed > 0 && (
                <span className="text-rose-600">-{diff.removed}</span>
              )}
              {diff.added === 0 && diff.removed === 0 && (
                <span className="text-gray-400">binary</span>
              )}
              {/* &end[ColorPalette] */}
            </div>
          </button>
          /* &end[PatchViewer] */
        ))}
        {/* Totals row */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 bg-gray-100 font-medium">
          <span className="text-gray-600">Total</span>
          <div className="flex items-center gap-3">
            {/* &begin[ColorPalette] */}
            <span className="text-emerald-600">+{totalAdded}</span>
            <span className="text-rose-600">-{totalRemoved}</span>
            {/* &end[ColorPalette] */}
          </div>
        </div>
      </div>
    </div>
  );
}
