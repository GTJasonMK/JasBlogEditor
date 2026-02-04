import { useEditorStore } from '@/store';
import type { DocMetadata } from '@/types';

export function DocMetaForm() {
  const { currentFile, updateMetadata } = useEditorStore();
  const metadata = currentFile?.metadata as DocMetadata | undefined;

  if (!metadata) return null;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-[var(--color-text-muted)] mb-1">
          标题
        </label>
        <input
          type="text"
          value={metadata.title}
          onChange={(e) => updateMetadata({ title: e.target.value })}
          placeholder="文档标题"
          className="w-full px-2 py-1.5 text-sm border border-[var(--color-border)] rounded focus:outline-none focus:border-[var(--color-primary)]"
        />
      </div>

      <div>
        <label className="block text-xs text-[var(--color-text-muted)] mb-1">
          日期
        </label>
        <input
          type="date"
          value={metadata.date || ''}
          onChange={(e) => updateMetadata({ date: e.target.value || undefined })}
          className="w-full px-2 py-1.5 text-sm border border-[var(--color-border)] rounded focus:outline-none focus:border-[var(--color-primary)]"
        />
      </div>
    </div>
  );
}
