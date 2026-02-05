import { useEditorStore } from '@/store';
import type { RoadmapMetadata } from '@/types';

const STATUS_OPTIONS: { value: NonNullable<RoadmapMetadata['status']>; label: string }[] = [
  { value: 'active', label: '进行中' },
  { value: 'completed', label: '已完成' },
  { value: 'paused', label: '暂停' },
];

export function RoadmapMetaForm() {
  const { currentFile, updateMetadata } = useEditorStore();

  if (!currentFile || currentFile.type !== 'roadmap') return null;

  const metadata = currentFile.metadata as RoadmapMetadata;

  return (
    <div className="space-y-4">
      {/* 标题 */}
      <div>
        <label className="block text-xs text-[var(--color-text-muted)] mb-1">规划名称</label>
        <input
          type="text"
          value={metadata.title}
          onChange={(e) => updateMetadata({ title: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-[var(--color-border)] rounded-md focus:outline-none focus:border-[var(--color-primary)] bg-[var(--color-paper)] text-[var(--color-text)]"
        />
      </div>

      {/* 描述 */}
      <div>
        <label className="block text-xs text-[var(--color-text-muted)] mb-1">描述</label>
        <textarea
          value={metadata.description}
          onChange={(e) => updateMetadata({ description: e.target.value })}
          rows={2}
          className="w-full px-3 py-2 text-sm border border-[var(--color-border)] rounded-md focus:outline-none focus:border-[var(--color-primary)] resize-none bg-[var(--color-paper)] text-[var(--color-text)]"
        />
      </div>

      {/* 日期 */}
      <div>
        <label className="block text-xs text-[var(--color-text-muted)] mb-1">日期</label>
        <input
          type="date"
          value={metadata.date || ''}
          onChange={(e) => updateMetadata({ date: e.target.value || undefined })}
          className="w-full px-3 py-2 text-sm border border-[var(--color-border)] rounded-md focus:outline-none focus:border-[var(--color-primary)] bg-[var(--color-paper)] text-[var(--color-text)]"
        />
      </div>

      {/* 状态 */}
      <div>
        <label className="block text-xs text-[var(--color-text-muted)] mb-1">状态</label>
        <select
          value={metadata.status || 'active'}
          onChange={(e) => updateMetadata({ status: e.target.value as RoadmapMetadata['status'] })}
          className="w-full px-3 py-2 text-sm border border-[var(--color-border)] rounded-md focus:outline-none focus:border-[var(--color-primary)] bg-[var(--color-paper)] text-[var(--color-text)]"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
