import { useEditorStore } from '@/store';
import type { GraphData } from '@/types';

export function GraphMetaForm() {
  const { currentFile, updateMetadata } = useEditorStore();

  if (!currentFile || currentFile.type !== 'graph') return null;

  const metadata = currentFile.metadata as GraphData;

  return (
    <div className="space-y-4">
      {/* 名称 */}
      <div>
        <label className="block text-xs text-[var(--color-text-muted)] mb-1">图谱名称</label>
        <input
          type="text"
          value={metadata.name}
          onChange={(e) => updateMetadata({ name: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-[var(--color-border)] rounded-md focus:outline-none focus:border-[var(--color-primary)]"
        />
      </div>

      {/* 描述 */}
      <div>
        <label className="block text-xs text-[var(--color-text-muted)] mb-1">描述</label>
        <textarea
          value={metadata.description}
          onChange={(e) => updateMetadata({ description: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 text-sm border border-[var(--color-border)] rounded-md focus:outline-none focus:border-[var(--color-primary)] resize-none"
        />
      </div>

      {/* 统计信息 */}
      <div className="pt-4 border-t border-[var(--color-border)]">
        <h4 className="text-xs text-[var(--color-text-muted)] mb-2">统计信息</h4>
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2 bg-white rounded border border-[var(--color-border)]">
            <div className="text-lg font-medium text-[var(--color-text)]">{metadata.nodes.length}</div>
            <div className="text-xs text-[var(--color-text-muted)]">节点数</div>
          </div>
          <div className="p-2 bg-white rounded border border-[var(--color-border)]">
            <div className="text-lg font-medium text-[var(--color-text)]">{metadata.edges.length}</div>
            <div className="text-xs text-[var(--color-text-muted)]">边数</div>
          </div>
        </div>
      </div>

      {/* 提示 */}
      <div className="text-xs text-[var(--color-text-subtle)] bg-[var(--color-surface-dark)] p-2 rounded">
        提示：可以使用 GraphAndTable 工具创建图谱，然后导出 JSON 文件到 graphs 目录。
      </div>
    </div>
  );
}
