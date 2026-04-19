import type { RefObject } from "react";
import { HELP_TAB_GROUPS, type HelpTabDefinition } from "./helpModalSchema";

export function HelpModalActivePanel({
  activeTab,
  contentRef,
  summaryRef,
  onScrollToSection,
}: {
  activeTab: HelpTabDefinition | null;
  contentRef: RefObject<HTMLDivElement | null>;
  summaryRef: RefObject<HTMLDivElement | null>;
  onScrollToSection: (sectionId: string) => void;
}) {
  const activeGroup = HELP_TAB_GROUPS.find((group) => group.id === activeTab?.groupId);

  if (!activeTab) {
    return (
      <div className="min-w-0 min-h-0 flex flex-1 items-center justify-center px-6 text-sm text-[var(--color-text-muted)]">
        当前筛选没有可展示的帮助内容。
      </div>
    );
  }

  return (
    <div className="min-w-0 min-h-0 flex flex-1 flex-col overflow-hidden">
      <div ref={contentRef} className="min-w-0 min-h-0 flex-1 overflow-y-auto">
        <div
          ref={summaryRef}
          className="border-b border-[var(--color-border)] bg-[var(--color-paper)]"
        >
          <div className="min-w-0 space-y-3 p-4">
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2 mb-1">
                {activeGroup ? (
                  <span className="rounded-full bg-[var(--color-surface)] px-3 py-1 text-xs font-medium text-[var(--color-text-muted)]">
                    {activeGroup.label}
                  </span>
                ) : null}
              </div>
              <h2 className="break-words text-lg font-semibold text-[var(--color-text)]">
                {activeTab.label}
              </h2>
              <p className="mt-1 break-words text-sm leading-relaxed text-[var(--color-text-muted)]">
                {activeTab.summary}
              </p>
            </div>

            {activeTab.sectionLinks.length ? (
              <div className="flex min-w-0 flex-wrap gap-2">
                {activeTab.sectionLinks.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => onScrollToSection(section.id)}
                    className="break-words rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-paper)] hover:text-[var(--color-text)]"
                  >
                    {section.title}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="min-w-0 p-4">{activeTab.content}</div>
      </div>
    </div>
  );
}
