import type { ChangeEvent, ReactNode } from "react";
import {
  FRONTMATTER_HELP_EXAMPLES,
  type FrontmatterHelpExample,
} from "@/components/layout/toolbar/help/frontmatterHelpData";
import { getFrontmatterHelpExamplesByType } from "./examplePreviewModel";

const TOOLBAR_BUTTON_CLASS =
  "rounded-md border border-[var(--color-border)] bg-[var(--color-paper)] px-3 py-1.5 text-xs font-medium text-[var(--color-text)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60";
const TOOLBAR_SELECT_CLASS =
  "min-w-[11rem] max-w-full rounded-md border border-[var(--color-border)] bg-[var(--color-paper)] px-3 py-1.5 text-xs text-[var(--color-text)] sm:flex-1 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20";

const EXAMPLE_TYPES = Array.from(
  new Set(FRONTMATTER_HELP_EXAMPLES.map((example) => example.type))
);

function ToolbarGroup({
  title,
  children,
  alignEnd = false,
}: {
  title: string;
  children: ReactNode;
  alignEnd?: boolean;
}) {
  return (
    <section
      className={`min-w-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 ${
        alignEnd ? "xl:justify-self-end" : ""
      }`}
    >
      <p className="break-words text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
        {title}
      </p>
      <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2">
        {children}
      </div>
    </section>
  );
}

export function ExamplePreviewToolbar({
  currentExample,
  syncScroll,
  copyStatus,
  onTypeChange,
  onExampleChange,
  onStep,
  onCopy,
  onToggleSyncScroll,
  onClose,
}: {
  currentExample: FrontmatterHelpExample;
  syncScroll: boolean;
  copyStatus: string | null;
  onTypeChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  onExampleChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  onStep: (offset: number) => void;
  onCopy: () => Promise<void>;
  onToggleSyncScroll: () => void;
  onClose: () => Promise<void>;
}) {
  const examplesOfSameType = getFrontmatterHelpExamplesByType(currentExample.type);

  return (
    <header className="border-b border-[var(--color-border)] bg-[var(--color-paper)] px-4 py-3">
      <div className="min-w-0 grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_auto] xl:items-start">
        <ToolbarGroup title="浏览示例">
          <select
            value={currentExample.type}
            onChange={onTypeChange}
            className={TOOLBAR_SELECT_CLASS}
          >
            {EXAMPLE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <select
            value={currentExample.id}
            onChange={onExampleChange}
            className={TOOLBAR_SELECT_CLASS}
          >
            {examplesOfSameType.map((example) => (
              <option key={example.id} value={example.id}>
                {example.title}
              </option>
            ))}
          </select>
          <button
            type="button"
            className={TOOLBAR_BUTTON_CLASS}
            onClick={() => onStep(-1)}
          >
            上一条
          </button>
          <button
            type="button"
            className={TOOLBAR_BUTTON_CLASS}
            onClick={() => onStep(1)}
          >
            下一条
          </button>
        </ToolbarGroup>

        <ToolbarGroup title="查看操作">
          <button
            type="button"
            className={TOOLBAR_BUTTON_CLASS}
            onClick={() => void onCopy()}
          >
            复制原文
          </button>
          <button
            type="button"
            className={TOOLBAR_BUTTON_CLASS}
            onClick={onToggleSyncScroll}
          >
            {syncScroll ? "同步滚动：开" : "同步滚动：关"}
          </button>
          {copyStatus ? (
            <span className="break-words text-xs text-[var(--color-text-muted)]">
              {copyStatus}
            </span>
          ) : null}
        </ToolbarGroup>

        <ToolbarGroup title="窗口控制" alignEnd>
          <button
            type="button"
            className={TOOLBAR_BUTTON_CLASS}
            onClick={() => void onClose()}
          >
            关闭窗口
          </button>
        </ToolbarGroup>
      </div>
    </header>
  );
}
