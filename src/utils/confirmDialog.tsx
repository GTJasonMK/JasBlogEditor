import { useEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';

export type ConfirmDialogKind = 'info' | 'warning' | 'error';

export interface ConfirmDialogOptions {
  title?: string;
  kind?: ConfirmDialogKind;
  okLabel?: string;
  cancelLabel?: string;
}

interface ConfirmModalProps {
  title: string;
  message: string;
  kind: ConfirmDialogKind;
  okLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmModal({
  title,
  message,
  kind,
  okLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onCancel]);

  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  const confirmButtonClassName = useMemo(() => {
    const base =
      'px-3 py-1.5 text-sm text-white rounded-md transition-colors focus:outline-none';

    if (kind === 'warning' || kind === 'error') {
      return `${base} bg-[var(--color-danger)] hover:opacity-90`;
    }

    return `${base} bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)]`;
  }, [kind]);

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[var(--color-paper)] border border-[var(--color-border)] rounded-lg shadow-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center gap-2">
            <span className="text-sm font-medium text-[var(--color-text)]">{title}</span>
            <div className="flex-1" />
            <button
              onClick={onCancel}
              className="px-2 py-1 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] rounded-md transition-colors"
              aria-label="关闭"
              title="关闭 (Esc)"
            >
              关闭
            </button>
          </div>

          <div className="px-4 py-4 text-sm text-[var(--color-text)] leading-relaxed">
            {message}
          </div>

          <div className="px-4 py-3 border-t border-[var(--color-border)] flex justify-end gap-2 bg-[var(--color-surface)]">
            <button
              ref={cancelRef}
              onClick={onCancel}
              className="px-3 py-1.5 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] rounded-md transition-colors"
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              className={confirmButtonClassName}
            >
              {okLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 主题适配的确认对话框（Promise API）
 *
 * 设计目标：
 * - 替代原生 `confirm()`/Tauri 原生弹窗，保证与应用主题一致
 * - 以 Promise 形式返回，便于 `await` 使用，避免“先执行再确认”的时序问题
 */
export function confirmDialog(
  message: string,
  options?: string | ConfirmDialogOptions,
): Promise<boolean> {
  if (typeof document === 'undefined') {
    return Promise.resolve(false);
  }

  const normalized: ConfirmDialogOptions =
    typeof options === 'string' ? { title: options } : (options ?? {});

  const title = normalized.title ?? '确认';
  const kind: ConfirmDialogKind = normalized.kind ?? 'info';
  const okLabel = normalized.okLabel ?? '确定';
  const cancelLabel = normalized.cancelLabel ?? '取消';

  const previousFocus = document.activeElement as HTMLElement | null;

  return new Promise((resolve) => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const root = createRoot(host);
    let settled = false;

    const cleanup = (result: boolean) => {
      if (settled) return;
      settled = true;

      root.unmount();
      host.remove();
      previousFocus?.focus?.();

      resolve(result);
    };

    root.render(
      <ConfirmModal
        title={title}
        message={message}
        kind={kind}
        okLabel={okLabel}
        cancelLabel={cancelLabel}
        onConfirm={() => cleanup(true)}
        onCancel={() => cleanup(false)}
      />,
    );
  });
}

