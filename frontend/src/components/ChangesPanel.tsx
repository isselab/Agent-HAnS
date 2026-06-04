import { InputSummary } from "../../../src/index";

type FeatureChange = InputSummary["featureChanges"][number];

interface ChangesPanelProps {
  featureChanges: FeatureChange[];
  selectedFeature?: string | null;
  onFeatureSelect?: (featureName: string) => void;
}

export function ChangesPanel({ featureChanges, selectedFeature, onFeatureSelect }: ChangesPanelProps) {
  const hasAdded = featureChanges.some((c) => c.changeType === "added");
  const hasModified = featureChanges.some((c) => c.changeType === "modified");
  const hasRemoved = featureChanges.some((c) => c.changeType === "removed");

  if (!hasAdded && !hasModified && !hasRemoved) {
    return (
      <div className="p-4 text-sm text-gray-400">No feature changes.</div>
    );
  }

  function renderChangeItem(c: FeatureChange, i: number, colorClass: string) {
    const isSelected = selectedFeature === c.featureName;
    return (
      <button
        key={`${c.featureName}-${i}`}
        onClick={() => onFeatureSelect?.(c.featureName)}
        className={`w-full text-left py-2 px-2 rounded-md transition-colors ${
          isSelected
            ? "bg-gray-200 ring-1 ring-gray-300"
            : "bg-gray-50 hover:bg-gray-100"
        }`}
      >
        <div className={`font-medium ${colorClass}`}>{c.featureName}</div>
        <div className="text-xs text-gray-400">
          {(c as any).featurePath?.length > 0
            ? (c as any).featurePath.join(" / ")
            : "position: unknown"}
        </div>
        <div className="text-xs text-gray-400 mt-1">{c.changeDescription}</div>
      </button>
    );
  }

  return (
    <div className="p-3 space-y-3 overflow-y-auto">
      {/* &begin[ColorPalette] */}
      {hasAdded && (
        <div className="bg-white border border-emerald-300 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 bg-emerald-50 border-b border-emerald-200">
            <div className="text-sm text-emerald-700 font-semibold">Added features</div>
            <div className="text-xs text-emerald-600 font-medium">
              {featureChanges.filter((c) => c.changeType === "added").length}
            </div>
          </div>
          <div className="p-3 space-y-2 text-sm text-gray-600">
            {featureChanges
              .filter((c) => c.changeType === "added")
              .map((c, i) => renderChangeItem(c, i, "text-emerald-700"))}
          </div>
        </div>
      )}

      {hasModified && (
        <div className="bg-white border border-blue-300 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 bg-blue-50 border-b border-blue-200">
            <div className="text-sm text-blue-700 font-semibold">Modified features</div>
            <div className="text-xs text-blue-600 font-medium">
              {featureChanges.filter((c) => c.changeType === "modified").length}
            </div>
          </div>
          <div className="p-3 space-y-2 text-sm text-gray-600">
            {featureChanges
              .filter((c) => c.changeType === "modified")
              .map((c, i) => renderChangeItem(c, i, "text-blue-700"))}
          </div>
        </div>
      )}

      {hasRemoved && (
        <div className="bg-white border border-rose-300 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 bg-rose-50 border-b border-rose-200">
            <div className="text-sm text-rose-700 font-semibold">Removed features</div>
            <div className="text-xs text-rose-600 font-medium">
              {featureChanges.filter((c) => c.changeType === "removed").length}
            </div>
          </div>
          <div className="p-3 space-y-2 text-sm text-gray-600">
            {featureChanges
              .filter((c) => c.changeType === "removed")
              .map((c, i) => renderChangeItem(c, i, "text-rose-700"))}
          </div>
        </div>
      )}
      {/* &end[ColorPalette] */}
    </div>
  );
}
