import { useEffect, useState } from "react";

// &begin[PatchViewer]

interface FileDiffResponse {
  type: "diff" | "new";
  patch?: string;
  content?: string;
}

interface PatchViewerProps {
  file: string;
  summaryId: string;
  onClose: () => void;
}

/** Render a unified diff line with appropriate color based on its prefix. */
function DiffLine({ line, index }: { line: string; index: number }) {
  if (line.startsWith("+++") || line.startsWith("---")) {
    return (
      <div key={index} className="px-4 py-0 text-gray-400 select-text">
        <span className="font-mono text-xs whitespace-pre">{line}</span>
      </div>
    );
  }
  if (line.startsWith("@@")) {
    return (
      <div key={index} className="px-4 py-0.5 bg-sky-50 text-sky-500 select-text">
        <span className="font-mono text-xs whitespace-pre">{line}</span>
      </div>
    );
  }
  if (line.startsWith("+")) {
    return (
      <div key={index} className="px-4 py-0 bg-emerald-50 text-emerald-700 select-text">
        <span className="font-mono text-xs whitespace-pre">{line}</span>
      </div>
    );
  }
  if (line.startsWith("-")) {
    return (
      <div key={index} className="px-4 py-0 bg-rose-50 text-rose-700 select-text">
        <span className="font-mono text-xs whitespace-pre">{line}</span>
      </div>
    );
  }
  return (
    <div key={index} className="px-4 py-0 text-gray-700 select-text">
      <span className="font-mono text-xs whitespace-pre">{line}</span>
    </div>
  );
}

export function PatchViewer({ file, summaryId, onClose }: PatchViewerProps) {
  const [data, setData] = useState<FileDiffResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setData(null);
    fetch(`/api/file-diff?id=${encodeURIComponent(summaryId)}&file=${encodeURIComponent(file)}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error((body as any).error ?? `HTTP ${res.status}`);
        }
        return res.json() as Promise<FileDiffResponse>;
      })
      .then((result) => {
        setData(result);
        setLoading(false);
      })
      .catch((err) => {
        setError(String(err));
        setLoading(false);
      });
  }, [file, summaryId]);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onClose}
            className="flex-shrink-0 p-0.5 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
            title="Back to file changes"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          {data && (
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0 ${
              data.type === "new"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-700"
            }`}>
              {data.type === "new" ? "NEW" : "MODIFIED"}
            </span>
          )}
          <h3 className="text-sm font-semibold text-gray-700 font-mono truncate">{file}</h3>
        </div>
      </div>

      {/* Body */}
      <div className="overflow-y-auto flex-1 leading-5">
        {loading && (
          <div className="p-6 text-sm text-gray-400 text-center">Loading...</div>
        )}
        {error && (
          <div className="p-6 text-sm text-rose-500">{error}</div>
        )}
        {!loading && !error && data?.type === "diff" && (
          (() => {
            const patch = data.patch ?? "";
            if (!patch.trim()) {
              return (
                <div className="p-6 text-sm text-gray-400 text-center">
                  No diff available (file may not have uncommitted changes).
                </div>
              );
            }
            // Skip the diff --git header line(s) before the first ---/+++ hunk
            const lines = patch.split("\n");
            return (
              <div className="py-1">
                {lines.map((line, i) => (
                  <DiffLine key={i} line={line} index={i} />
                ))}
              </div>
            );
          })()
        )}
        {!loading && !error && data?.type === "new" && (
          (() => {
            const lines = (data.content ?? "").split("\n");
            return (
              <div className="py-1">
                {lines.map((line, i) => (
                  <div key={i} className="flex px-4 py-0 bg-emerald-50 select-text">
                    <span className="text-xs text-gray-400 font-mono mr-4 select-none flex-shrink-0 w-8 text-right">
                      {i + 1}
                    </span>
                    <span className="font-mono text-xs text-emerald-700 whitespace-pre">{line}</span>
                  </div>
                ))}
              </div>
            );
          })()
        )}
      </div>
    </div>
  );
}

// &end[PatchViewer]
