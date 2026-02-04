import { useEditorStore } from '@/store';
import type { RoadmapMetadata, RoadmapItem } from '@/types';

export function RoadmapMetaForm() {
  const { currentFile, updateMetadata } = useEditorStore();

  if (!currentFile || currentFile.type !== 'roadmap') return null;

  const metadata = currentFile.metadata as RoadmapMetadata;

  const updateItem = (index: number, updates: Partial<RoadmapItem>) => {
    const newItems = [...metadata.items];
    newItems[index] = { ...newItems[index], ...updates };
    updateMetadata({ items: newItems });
  };

  const addItem = () => {
    updateMetadata({
      items: [...metadata.items, { title: '', status: 'planned', description: '' }],
    });
  };

  const removeItem = (index: number) => {
    updateMetadata({
      items: metadata.items.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-4">
      {/* 标题 */}
      <div>
        <label className="block text-xs text-[var(--color-text-muted)] mb-1">规划名称</label>
        <input
          type="text"
          value={metadata.title}
          onChange={(e) => updateMetadata({ title: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-[var(--color-border)] rounded-md focus:outline-none focus:border-[var(--color-primary)]"
        />
      </div>

      {/* 描述 */}
      <div>
        <label className="block text-xs text-[var(--color-text-muted)] mb-1">描述</label>
        <textarea
          value={metadata.description}
          onChange={(e) => updateMetadata({ description: e.target.value })}
          rows={2}
          className="w-full px-3 py-2 text-sm border border-[var(--color-border)] rounded-md focus:outline-none focus:border-[var(--color-primary)] resize-none"
        />
      </div>

      {/* 任务列表 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-[var(--color-text-muted)]">任务列表</label>
          <button
            onClick={addItem}
            className="text-xs text-[var(--color-primary)] hover:underline"
          >
            + 添加任务
          </button>
        </div>

        <div className="space-y-2">
          {metadata.items.map((item, index) => (
            <div key={index} className="p-2 border border-[var(--color-border)] rounded-md bg-white">
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={item.title}
                  onChange={(e) => updateItem(index, { title: e.target.value })}
                  placeholder="任务标题"
                  className="flex-1 px-2 py-1 text-sm border border-[var(--color-border)] rounded focus:outline-none focus:border-[var(--color-primary)]"
                />
                <button
                  onClick={() => removeItem(index)}
                  className="text-[var(--color-text-muted)] hover:text-red-500"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={item.status}
                  onChange={(e) => updateItem(index, { status: e.target.value as RoadmapItem['status'] })}
                  className="px-2 py-1 text-xs border border-[var(--color-border)] rounded focus:outline-none focus:border-[var(--color-primary)]"
                >
                  <option value="planned">计划中</option>
                  <option value="in-progress">进行中</option>
                  <option value="completed">已完成</option>
                </select>
              </div>

              <textarea
                value={item.description || ''}
                onChange={(e) => updateItem(index, { description: e.target.value })}
                placeholder="任务描述（可选）"
                rows={2}
                className="w-full mt-2 px-2 py-1 text-xs border border-[var(--color-border)] rounded focus:outline-none focus:border-[var(--color-primary)] resize-none"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
