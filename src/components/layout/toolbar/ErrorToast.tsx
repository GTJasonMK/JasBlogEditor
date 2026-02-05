interface ErrorToastProps {
  message: string;
  onDismiss: () => void;
}

export function ErrorToast({ message, onDismiss }: ErrorToastProps) {
  return (
    <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2">
      <div className="flex items-center gap-2 px-4 py-2 bg-[var(--color-danger-bg)] border border-[var(--color-danger)] rounded-lg shadow-lg">
        <svg className="w-4 h-4 text-[var(--color-danger)] flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        <span className="text-sm text-[var(--color-danger)] max-w-[400px] truncate">{message}</span>
        <button
          onClick={onDismiss}
          className="ml-2 text-[var(--color-danger)] opacity-60 hover:opacity-100 transition-opacity"
          aria-label="关闭错误提示"
        >
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
}

