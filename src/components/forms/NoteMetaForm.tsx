import { useEditorStore } from '@/store';
import { TagInput } from './TagInput';
import type { NoteMetadata } from '@/types';

export function NoteMetaForm() {
  const { currentFile, updateMetadata } = useEditorStore();

  if (!currentFile || currentFile.type !== 'note') return null;

  const metadata = currentFile.metadata as NoteMetadata;

  // 验证标题是否为空
  const isTitleEmpty = !metadata.title.trim();

  return (
    <div className="space-y-4">
      {/* 标题 */}
      <div>
        <label className="block text-xs text-[var(--color-text-muted)] mb-1">
          标题 <span className="text-[var(--color-danger)]">*</span>
        </label>
        <input
          type="text"
          value={metadata.title}
          onChange={(e) => updateMetadata({ title: e.target.value })}
          className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:border-[var(--color-primary)] ${
            isTitleEmpty ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]'
          }`}
          required
        />
        {isTitleEmpty && (
          <span className="text-xs text-[var(--color-danger)] mt-1">标题不能为空</span>
        )}
      </div>

      {/* 日期 */}
      <div>
        <label className="block text-xs text-[var(--color-text-muted)] mb-1">日期</label>
        <input
          type="date"
          value={metadata.date}
          onChange={(e) => updateMetadata({ date: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-[var(--color-border)] rounded-md focus:outline-none focus:border-[var(--color-primary)]"
        />
      </div>

      {/* 摘要 */}
      <div>
        <label className="block text-xs text-[var(--color-text-muted)] mb-1">摘要</label>
        <textarea
          value={metadata.excerpt}
          onChange={(e) => updateMetadata({ excerpt: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 text-sm border border-[var(--color-border)] rounded-md focus:outline-none focus:border-[var(--color-primary)] resize-none"
        />
      </div>

      {/* 标签 */}
      <div>
        <label className="block text-xs text-[var(--color-text-muted)] mb-1">标签</label>
        <TagInput
          tags={metadata.tags || []}
          onChange={(tags) => updateMetadata({ tags })}
        />
      </div>
    </div>
  );
}
