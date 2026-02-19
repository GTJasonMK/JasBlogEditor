import type { PreviewMode } from '@/store/editorStore';

interface PreviewModeToggleProps {
  value: PreviewMode;
  onChange: (value: PreviewMode) => void;
}

export function PreviewModeToggle({ value, onChange }: PreviewModeToggleProps) {
  return (
    <div className="flex items-center bg-[var(--color-surface)] rounded-md p-0.5" title="预览模式：详情 / 列表">
      {(['detail', 'list'] as const).map((mode) => (
        <button
          key={mode}
          onClick={() => onChange(mode)}
          className={`px-3 py-1 text-sm rounded transition-colors ${
            value === mode
              ? 'bg-[var(--color-paper)] shadow-sm text-[var(--color-text)]'
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
          }`}
        >
          {mode === 'detail' ? '详情' : '列表'}
        </button>
      ))}
    </div>
  );
}

