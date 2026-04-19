/**
 * 知识图谱查看器（与 JasBlog 保持一致）
 */

import { useState } from "react";
import { type Node } from "@xyflow/react";
import GraphCanvas from "./GraphCanvas";
import NodeDetailPanel from "./NodeDetailPanel";
import { type GraphData } from "@/types";

interface GraphViewerProps {
  data: GraphData;
  heightClassName?: string;
  panelWidthClassName?: string;
}

export default function GraphViewer({
  data,
  heightClassName = "h-[600px]",
  panelWidthClassName = "xl:w-[320px]",
}: GraphViewerProps) {
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showMinimap, setShowMinimap] = useState(true);
  const panelClassName = `w-full xl:w-[320px] flex-shrink-0 rounded-lg overflow-hidden border border-[var(--color-border)] ${panelWidthClassName}`.replace(
    "xl:w-[320px] xl:w-[320px]",
    "xl:w-[320px]"
  );

  return (
    <div className="flex flex-col gap-4 xl:flex-row">
      <div
        className={`relative min-h-[320px] flex-1 rounded-lg overflow-hidden border border-[var(--color-border)] ${heightClassName}`}
      >
        <GraphCanvas
          data={data}
          selectedNode={selectedNode}
          onNodeSelect={setSelectedNode}
          showMinimap={showMinimap}
        />

        <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
          <div className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 text-sm border border-[var(--color-border)] shadow-sm">
            <span className="text-[var(--color-gray)]">
              {data.nodes.length} 个节点 · {data.edges.length} 条连接
            </span>
          </div>

          {!selectedNode && (
            <div className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 text-sm border border-[var(--color-border)] shadow-sm">
              <span className="text-[var(--color-gray)]">
                点击节点查看详情
              </span>
            </div>
          )}
        </div>

        <button
          onClick={() => setShowMinimap(!showMinimap)}
          className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 text-sm border border-[var(--color-border)] shadow-sm z-10 hover:bg-white transition-colors"
          title={showMinimap ? "隐藏小地图" : "显示小地图"}
        >
          <span className="text-[var(--color-gray)]">
            {showMinimap ? "隐藏地图" : "显示地图"}
          </span>
        </button>
      </div>

      {selectedNode && (
        <div className={panelClassName}>
          <NodeDetailPanel
            node={selectedNode}
            onClose={() => setSelectedNode(null)}
          />
        </div>
      )}
    </div>
  );
}
