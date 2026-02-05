import { useEditorStore } from '@/store';
import type { GraphMetadata } from '@/types';
import { extractGraphFromContent } from '@/services/contentParser';

export function GraphMetaForm() {
  const { currentFile, updateMetadata } = useEditorStore();

  if (!currentFile || currentFile.type !== 'graph') return null;

  const metadata = currentFile.metadata as GraphMetadata;
  // 从正文内容实时提取图谱数据用于统计
  const { graphData } = extractGraphFromContent(currentFile.content);

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

      {/* 日期 */}
      <div>
        <label className="block text-xs text-[var(--color-text-muted)] mb-1">日期</label>
        <input
          type="date"
          value={metadata.date || ''}
          onChange={(e) => updateMetadata({ date: e.target.value || undefined })}
          className="w-full px-3 py-2 text-sm border border-[var(--color-border)] rounded-md focus:outline-none focus:border-[var(--color-primary)]"
        />
      </div>

      {/* 统计信息 */}
      <div className="pt-4 border-t border-[var(--color-border)]">
        <h4 className="text-xs text-[var(--color-text-muted)] mb-2">统计信息</h4>
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2 bg-[var(--color-paper)] rounded border border-[var(--color-border)]">
            <div className="text-lg font-medium text-[var(--color-text)]">{graphData.nodes.length}</div>
            <div className="text-xs text-[var(--color-text-muted)]">节点数</div>
          </div>
          <div className="p-2 bg-[var(--color-paper)] rounded border border-[var(--color-border)]">
            <div className="text-lg font-medium text-[var(--color-text)]">{graphData.edges.length}</div>
            <div className="text-xs text-[var(--color-text-muted)]">边数</div>
          </div>
        </div>
      </div>
    </div>
  );
}
