interface RenameDialogProps {
  visible: boolean;
  title?: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

/**
 * 通用重命名对话框（输入框 + 确认/取消）
 */
export function RenameDialog({
  visible,
  title = '重命名',
  value,
  placeholder,
  onChange,
  onSubmit,
  onCancel,
}: RenameDialogProps) {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[var(--color-paper)] rounded-lg p-4 w-80 shadow-xl">
        <h3 className="text-sm font-medium text-[var(--color-text)] mb-3">{title}</h3>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSubmit();
            if (e.key === 'Escape') onCancel();
          }}
          autoFocus
          className="w-full px-3 py-2 text-sm border border-[var(--color-border)] rounded-md focus:outline-none focus:border-[var(--color-primary)] bg-[var(--color-paper)] text-[var(--color-text)]"
          placeholder={placeholder}
        />
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] rounded"
          >
            取消
          </button>
          <button
            onClick={onSubmit}
            disabled={!value.trim()}
            className="px-3 py-1.5 text-sm bg-[var(--color-primary)] text-white rounded hover:bg-[var(--color-primary-dark)] disabled:opacity-50"
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
}

