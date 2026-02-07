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
}

export default function GraphViewer({ data }: GraphViewerProps) {
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showMinimap, setShowMinimap] = useState(true);

  return (
    <div className="flex gap-4 h-[600px]">
      {/* 图谱画布区域 - 自适应宽度 */}
      <div className="flex-1 relative rounded-lg overflow-hidden border border-[var(--color-border)]">
        <GraphCanvas
          data={data}
          selectedNode={selectedNode}
          onNodeSelect={setSelectedNode}
          showMinimap={showMinimap}
        />

        {/* 左上角信息区域 */}
        <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
          {/* 统计信息 */}
          <div className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 text-sm border border-[var(--color-border)] shadow-sm">
            <span className="text-[var(--color-gray)]">
              {data.nodes.length} 个节点 · {data.edges.length} 条连接
            </span>
          </div>

          {/* 提示信息 */}
          {!selectedNode && (
            <div className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 text-sm border border-[var(--color-border)] shadow-sm">
              <span className="text-[var(--color-gray)]">
                点击节点查看详情
              </span>
            </div>
          )}
        </div>

        {/* 小地图切换按钮 */}
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

      {/* 详情面板 - 固定宽度 */}
      {selectedNode && (
        <div className="w-[320px] flex-shrink-0 rounded-lg overflow-hidden border border-[var(--color-border)]">
          <NodeDetailPanel
            node={selectedNode}
            onClose={() => setSelectedNode(null)}
          />
        </div>
      )}
    </div>
  );
}
