import type {
  HelpTabDefinition,
  HelpTabGroupBucket,
  HelpTabId,
} from "./helpModalSchema";

export function HelpModalSidebar({
  keyword,
  total,
  filteredCount,
  groupedTabs,
  activeId,
  onChange,
  onClear,
  onSelect,
}: {
  keyword: string;
  total: number;
  filteredCount: number;
  groupedTabs: readonly HelpTabGroupBucket[];
  activeId: HelpTabId | null;
  onChange: (value: string) => void;
  onClear: () => void;
  onSelect: (id: HelpTabDefinition["id"]) => void;
}) {
  return (
    <aside className="min-w-0 shrink-0 border-b border-[var(--color-border)] bg-[var(--color-surface)] max-h-[38vh] overflow-y-auto lg:max-h-none lg:border-b-0 lg:border-r">
      <div className="sticky top-0 z-10 border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 p-3 backdrop-blur">
        <label className="relative block min-w-0">
          <span className="sr-only">搜索帮助分类</span>
          <input
            type="text"
            value={keyword}
            onChange={(event) => onChange(event.target.value)}
            placeholder="搜索分类或关键字"
            className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-paper)] px-3 pr-16 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
          />
          {keyword ? (
            <button
              type="button"
              onClick={onClear}
              className="absolute right-1 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-paper)] hover:text-[var(--color-text)]"
            >
              清空
            </button>
          ) : null}
        </label>
        <div className="mt-3 flex min-w-0 items-center justify-between gap-3">
          <p className="break-words text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            分类导航
          </p>
          <span className="shrink-0 rounded-full bg-[var(--color-paper)] px-2 py-1 text-[11px] text-[var(--color-text-muted)]">
            {filteredCount} / {total}
          </span>
        </div>
      </div>

      <div className="space-y-4 p-3">
        {groupedTabs.length ? (
          groupedTabs.map(({ group, tabs }) => (
            <section
              key={group.id}
              className="min-w-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-paper)] p-3"
            >
              <p className="break-words text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                {group.label}
              </p>
              <p className="mt-1 break-words text-xs leading-relaxed text-[var(--color-text-muted)]">
                {group.description}
              </p>
              <div className="mt-3 space-y-2">
                {tabs.map((tab) => {
                  const isActive = tab.id === activeId;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => onSelect(tab.id)}
                      className={`w-full min-w-0 rounded-xl border px-3 py-3 text-left transition-colors ${
                        isActive
                          ? "border-[var(--color-primary)] bg-[var(--color-paper)] shadow-sm"
                          : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-paper)]"
                      }`}
                    >
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <span className="break-words text-sm font-semibold text-[var(--color-text)]">
                          {tab.label}
                        </span>
                        <span className="shrink-0 rounded-full bg-[var(--color-paper)] px-2 py-1 text-[11px] text-[var(--color-text-muted)]">
                          {tab.sectionLinks.length} 节
                        </span>
                      </div>
                      <p className="mt-2 break-words text-xs leading-relaxed text-[var(--color-text-muted)]">
                        {tab.summary}
                      </p>
                      {tab.relatedTopics.length ? (
                        <div className="mt-3 flex min-w-0 flex-wrap gap-2">
                          {tab.relatedTopics.slice(0, 4).map((topic) => (
                            <span
                              key={topic}
                              className="break-words rounded-full border border-[var(--color-border)] bg-[var(--color-paper)] px-2 py-1 text-[11px] text-[var(--color-text-muted)]"
                            >
                              {topic}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </section>
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-paper)] px-4 py-5 text-sm text-[var(--color-text-muted)]">
            未找到匹配分类，请尝试其他关键字。
          </div>
        )}
      </div>
    </aside>
  );
}
