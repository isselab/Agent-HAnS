import { useState } from "react";
import { InputSummary } from "../../../src/index";

type FeatureNode = InputSummary["featureModel"];
type Change = InputSummary["featureChanges"][number];

export interface GhostNode {
  name: string;
  change?: Change;        // the removal change, if this node was explicitly removed
  children: GhostNode[];  // nested ghost children (also removed)
}

interface FeatureTreeProps {
  data: FeatureNode;
  depth?: number;
  // path from root to this node (array of names)
  path?: string[];
  // map from slash-joined path to change
  changesMap?: Record<string, Change>;
  // hierarchical ghost map: removed subtrees placed on nearest existing ancestor
  ghostMap?: Record<string, GhostNode[]>;
  // callback when a feature is clicked (for showing its files)
  onFeatureSelect?: (featureName: string) => void;
  // currently selected feature name (for highlight)
  selectedFeature?: string | null;
}

function getPathKey(path: string[]) {
  return path.join("/");
}

/** Recursively renders a ghost (removed) subtree that no longer exists in the feature model. */
function GhostNodeView({ ghost }: { ghost: GhostNode }) {
  const [showDesc, setShowDesc] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const hasChildren = ghost.children.length > 0;

  return (
    <div className="ml-6 mt-2">
      <div className="flex items-center gap-2">
        {hasChildren ? (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-gray-400 text-xs w-5 inline-flex items-center justify-center rounded hover:bg-gray-200"
          >
            <span>{collapsed ? "+" : "\u2212"}</span>
          </button>
        ) : (
          <div className="w-5" />
        )}
        <button
          onClick={() => ghost.change && setShowDesc(!showDesc)}
          className="text-left font-medium"
        >
          {/* &begin[ColorPalette] */}
          <span className="line-through text-rose-500">{ghost.name}</span>
          {ghost.change && (
            <span className="text-xs ml-2 px-1 py-0.5 rounded border border-rose-300 text-rose-700 bg-rose-50">
              removed
            </span>
          )}
          {/* &end[ColorPalette] */}
        </button>
      </div>
      {showDesc && ghost.change && (
        <div className="ml-6 mt-1 text-sm text-gray-600 p-2 bg-gray-50 border border-rose-300 rounded">
          <div>{ghost.change.changeDescription}</div>
        </div>
      )}
      {!collapsed && hasChildren && (
        <div className="border-l border-gray-200 ml-2 mt-1">
          {ghost.children.map((child, i) => (
            <GhostNodeView key={`ghost-child-${i}`} ghost={child} />
          ))}
        </div>
      )}
    </div>
  );
}

export function FeatureTree({ data, depth = 0, path = [], changesMap = {}, ghostMap = {}, onFeatureSelect, selectedFeature }: FeatureTreeProps) {
  // default: expanded
  const [collapsed, setCollapsed] = useState(false);
  const [showDesc, setShowDesc] = useState(false);

  const paddingLeft = depth > 0 ? 20 : 0;

  const node = data;
  const children = node.subfeatures ?? [];

  const myPath = [...path, node.name];
  const key = getPathKey(myPath);
  const change = changesMap[key];
  const isSelected = selectedFeature === node.name;

  // &begin[ColorPalette]
  const colorClass = change
    ? change.changeType === "added"
      ? "text-emerald-700"
      : change.changeType === "removed"
      ? "text-rose-700"
      : "text-blue-700"
    : "text-gray-800";
  // &end[ColorPalette]

  return (
    <div style={{ paddingLeft }}>
      <div className="flex items-center gap-2">
        {children.length > 0 ? (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-gray-400 text-xs w-5 inline-flex items-center justify-center rounded hover:bg-gray-200"
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Expand feature" : "Collapse feature"}
          >
            <span>{collapsed ? "+" : "−"}</span>
          </button>
        ) : (
          <span className="w-5" />
        )}

        {/* &begin[FeatureFilesPanel] */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onFeatureSelect?.(node.name)}
            className={`text-left ${colorClass} font-medium px-1.5 py-0.5 rounded transition-colors ${
              isSelected
                ? "bg-blue-100 ring-1 ring-blue-300"
                : "hover:bg-gray-100"
            }`}
          >
            {node.name}
          </button>
          {/* show 'new' badge for added features; clicking it toggles the change description */}
          {change?.changeType === "added" && (
            // &line[ColorPalette]
            <button onClick={() => setShowDesc(!showDesc)} className="text-xs px-1 py-0.5 rounded border border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors">new</button>
          )}
          {change && change.changeType !== "added" && (
            <button onClick={() => setShowDesc(!showDesc)} className="text-gray-400 hover:text-gray-600 transition-colors" aria-label="Toggle change description">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
              </svg>
            </button>
          )}
        </div>
        {/* &end[FeatureFilesPanel] */}
      </div>

      {showDesc && change && (
        <div className="ml-6 mt-1 text-sm text-gray-600 p-2 bg-gray-50 border border-gray-200 rounded">
          <div>{change.changeDescription}</div>
        </div>
      )}

      {/* render ghost (removed) subtrees attached to this node */}
      {ghostMap[getPathKey(myPath)]?.map((ghost, i) => (
        <GhostNodeView key={`ghost-${i}`} ghost={ghost} />
      ))}

      {!collapsed && children.length > 0 && (
        <div className="border-l border-gray-200 ml-2 mt-1">
          {children.map((child, i) => (
            <FeatureTree
              key={`${node.name}-${i}`}
              data={child}
              depth={depth + 1}
              path={myPath}
              changesMap={changesMap}
              ghostMap={ghostMap}
              onFeatureSelect={onFeatureSelect}
              selectedFeature={selectedFeature}
            />
          ))}
        </div>
      )}
    </div>
  );
}
