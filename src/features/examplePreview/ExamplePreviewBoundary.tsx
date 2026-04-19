import { Component, type ReactNode } from "react";
import { FRONTMATTER_HELP_EXAMPLES } from "@/components/layout/toolbar/help/frontmatterHelpData";

const ERROR_ACTION_BUTTON_CLASS =
  "rounded-md border border-[var(--color-border)] bg-[var(--color-paper)] px-3 py-1.5 text-xs font-medium text-[var(--color-text)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]";

interface PreviewErrorBoundaryProps {
  resetKey: string;
  children: ReactNode;
}

interface PreviewErrorBoundaryState {
  error: Error | null;
}

export class PreviewErrorBoundary extends Component<
  PreviewErrorBoundaryProps,
  PreviewErrorBoundaryState
> {
  state: PreviewErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): PreviewErrorBoundaryState {
    return { error };
  }

  componentDidUpdate(prevProps: PreviewErrorBoundaryProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-w-0 break-words rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5 p-4 text-sm">
          <p className="break-words font-medium text-[var(--color-danger)]">
            预览渲染失败
          </p>
          <p className="mt-2 break-words text-[var(--color-text-muted)]">
            {this.state.error.message}
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

export function ExamplePreviewErrorState({
  reason,
  onClose,
}: {
  reason: string;
  onClose: () => Promise<void>;
}) {
  return (
    <div className="flex h-full items-center justify-center bg-[var(--color-bg)] p-6">
      <div className="min-w-0 w-full max-w-xl rounded-2xl border border-[var(--color-danger)]/25 bg-[var(--color-paper)] p-6 shadow-sm">
        <p className="break-words text-sm font-semibold text-[var(--color-danger)]">
          无法打开示例预览
        </p>
        <p className="mt-3 break-words text-sm text-[var(--color-text-muted)]">{reason}</p>
        <div className="mt-4 min-w-0">
          <p className="break-words text-xs uppercase tracking-[0.18em] text-[var(--color-text-subtle)]">
            可用示例
          </p>
          <ul className="mt-2 break-words space-y-1 text-sm text-[var(--color-text)]">
            {FRONTMATTER_HELP_EXAMPLES.map((example) => (
              <li key={example.id} className="break-words">
                {example.id} · {example.title}
              </li>
            ))}
          </ul>
        </div>
        <button
          type="button"
          className={`mt-6 ${ERROR_ACTION_BUTTON_CLASS}`}
          onClick={() => void onClose()}
        >
          关闭窗口
        </button>
      </div>
    </div>
  );
}
