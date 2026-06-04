import { useState } from "react";
import { TabBar } from "./TabBar";
import { FeatureTree, GhostNode } from "./FeatureTree";
import { ChangesPanel } from "./ChangesPanel";
import { InputSummary } from "../../../src/index";

type FeatureNode = InputSummary["featureModel"];
type FeatureChange = InputSummary["featureChanges"][number];

interface SidebarProps {
  featureModel: FeatureNode;
  featureChanges: FeatureChange[];
  changesMap: Record<string, FeatureChange>;
  ghostMap: Record<string, GhostNode[]>;
  selectedFeature?: string | null;
  onFeatureSelect?: (featureName: string) => void;
}

const TABS = [
  { id: "feature-model", label: "Feature Model" },
  { id: "changes", label: "Changes" },
];

export function Sidebar({
  featureModel,
  featureChanges,
  changesMap,
  ghostMap,
  selectedFeature,
  onFeatureSelect,
}: SidebarProps) {
  const [activeTab, setActiveTab] = useState("feature-model");

  return (
    <aside className="w-[360px] flex-shrink-0 border-r border-gray-200 flex flex-col bg-gray-50 overflow-hidden">
      <TabBar tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="flex-1 overflow-y-auto">
        {activeTab === "feature-model" && (
          <div className="p-3">
            <div className="bg-white border border-gray-200 rounded-lg p-3 overflow-x-auto">
              <FeatureTree
                data={featureModel}
                changesMap={changesMap}
                ghostMap={ghostMap}
                onFeatureSelect={onFeatureSelect}
                selectedFeature={selectedFeature}
              />
            </div>
          </div>
        )}
        {activeTab === "changes" && (
          <ChangesPanel
            featureChanges={featureChanges}
            selectedFeature={selectedFeature}
            onFeatureSelect={onFeatureSelect}
          />
        )}
      </div>
    </aside>
  );
}
