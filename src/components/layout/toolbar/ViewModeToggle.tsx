import type { EditorViewMode } from '@/store/editorStore';

interface ViewModeToggleProps {
  value: EditorViewMode;
  onChange: (value: EditorViewMode) => void;
}

export function ViewModeToggle({ value, onChange }: ViewModeToggleProps) {
  return (
    <div className="flex items-center bg-[var(--color-surface)] rounded-md p-0.5">
      {(['edit', 'preview', 'split'] as const).map((mode) => (
        <button
          key={mode}
          onClick={() => onChange(mode)}
          className={`px-3 py-1 text-sm rounded transition-colors ${value === mode
            ? 'bg-[var(--color-paper)] shadow-sm text-[var(--color-text)]'
            : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
        >
          {mode === 'edit' ? '编辑' : mode === 'preview' ? '预览' : '分屏'}
        </button>
      ))}
    </div>
  );
}

