interface AISuggestionFloatingActionsProps {
  isGenerating: boolean;
  canAccept: boolean;
  onAccept: () => void;
  onReject: () => void;
  onCancel: () => void;
}

export function AISuggestionFloatingActions({
  isGenerating,
  canAccept,
  onAccept,
  onReject,
  onCancel,
}: AISuggestionFloatingActionsProps) {
  return (
    <div className="absolute bottom-4 right-4 z-10 flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-paper)]/92 px-2 py-2 shadow-[var(--shadow-md)] backdrop-blur-sm">
      {isGenerating ? (
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full px-3 py-1 text-xs text-[var(--color-danger)] hover:bg-[var(--color-danger-hover)] transition-colors"
        >
          取消
        </button>
      ) : (
        <>
          <button
            type="button"
            onClick={onReject}
            className="rounded-full px-3 py-1 text-xs text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-colors"
          >
            拒绝
          </button>
          <button
            type="button"
            onClick={onAccept}
            disabled={!canAccept}
            title={canAccept ? "接受 AI 修改" : "当前候选稿未通过本地契约校验，不能直接接受"}
            className="rounded-full bg-[var(--color-primary)] px-3 py-1 text-xs text-white hover:bg-[var(--color-primary-dark)] transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            接受
          </button>
        </>
      )}
    </div>
  );
}
