import { useEditorStore } from '@/store';
import { TagInput } from './TagInput';
import type { DiaryMetadata } from '@/types';

export function DiaryMetaForm() {
  const { currentFile, updateMetadata } = useEditorStore();

  if (!currentFile || currentFile.type !== 'diary') return null;

  const metadata = currentFile.metadata as DiaryMetadata;

  const isTitleEmpty = !metadata.title.trim();
  const isDateEmpty = !metadata.date.trim();

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
        <label className="block text-xs text-[var(--color-text-muted)] mb-1">
          日期 <span className="text-[var(--color-danger)]">*</span>
        </label>
        <input
          type="date"
          value={metadata.date}
          onChange={(e) => updateMetadata({ date: e.target.value })}
          className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:border-[var(--color-primary)] ${
            isDateEmpty ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]'
          }`}
          required
        />
        {isDateEmpty && (
          <span className="text-xs text-[var(--color-danger)] mt-1">日期不能为空</span>
        )}
      </div>

      {/* 时间 */}
      <div>
        <label className="block text-xs text-[var(--color-text-muted)] mb-1">时间</label>
        <input
          type="time"
          value={metadata.time || ''}
          onChange={(e) => updateMetadata({ time: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-[var(--color-border)] rounded-md focus:outline-none focus:border-[var(--color-primary)]"
        />
        <p className="text-xs text-[var(--color-text-subtle)] mt-1">
          建议使用 <span className="font-mono">HH:MM</span>（例如 09:30），用于 JasBlog 日记页的时间标签展示
        </p>
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

      {/* 情绪/天气/位置 */}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="block text-xs text-[var(--color-text-muted)] mb-1">情绪</label>
          <input
            type="text"
            value={metadata.mood || ''}
            onChange={(e) => updateMetadata({ mood: e.target.value || undefined })}
            className="w-full px-3 py-2 text-sm border border-[var(--color-border)] rounded-md focus:outline-none focus:border-[var(--color-primary)]"
          />
        </div>
        <div>
          <label className="block text-xs text-[var(--color-text-muted)] mb-1">天气</label>
          <input
            type="text"
            value={metadata.weather || ''}
            onChange={(e) => updateMetadata({ weather: e.target.value || undefined })}
            className="w-full px-3 py-2 text-sm border border-[var(--color-border)] rounded-md focus:outline-none focus:border-[var(--color-primary)]"
          />
        </div>
        <div>
          <label className="block text-xs text-[var(--color-text-muted)] mb-1">位置</label>
          <input
            type="text"
            value={metadata.location || ''}
            onChange={(e) => updateMetadata({ location: e.target.value || undefined })}
            className="w-full px-3 py-2 text-sm border border-[var(--color-border)] rounded-md focus:outline-none focus:border-[var(--color-primary)]"
          />
        </div>
      </div>

      {/* 同行人 */}
      <div>
        <label className="block text-xs text-[var(--color-text-muted)] mb-1">同行人</label>
        <TagInput
          tags={metadata.companions || []}
          onChange={(companions) => updateMetadata({ companions })}
          placeholder="输入人名，回车添加"
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

