import {
  FRONTMATTER_HELP_TYPE_OPTIONS,
} from "./frontmatterHelpTypeOptions";
import type { FrontmatterHelpExample } from "./frontmatterHelpData";

export function FrontmatterHelpTypeBrowser({
  activeType,
  examples,
  onSelect,
}: {
  activeType: FrontmatterHelpExample["type"];
  examples: FrontmatterHelpExample[];
  onSelect: (type: FrontmatterHelpExample["type"]) => void;
}) {
  return (
    <section id="frontmatter-type-browser" className="mb-8 min-w-0 scroll-mt-4">
      <div className="mb-3">
        <h3 className="break-words text-base font-semibold text-[var(--color-text)]">
          文档类型切换
        </h3>
        <p className="mt-1 break-words text-sm text-[var(--color-text-muted)]">
          选择文档类型查看对应的 frontmatter 写法和示例。
        </p>
      </div>

      <div
        role="tablist"
        aria-label="Frontmatter 文档类型"
        className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"
      >
        {FRONTMATTER_HELP_TYPE_OPTIONS.map((option) => {
          const example = examples.find((item) => item.type === option.type);
          const isActive = option.type === activeType;

          if (!example) {
            return null;
          }

          return (
            <button
              key={option.type}
              type="button"
              role="tab"
              aria-selected={isActive}
              title={`切换到该文档类型示例：${option.label}`}
              onClick={() => onSelect(option.type)}
              className={`min-w-0 rounded-xl border px-4 py-4 text-left transition-colors ${
                isActive
                  ? "border-[var(--color-primary)] bg-[var(--color-paper)] shadow-sm"
                  : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-paper)]"
              }`}
            >
              <div className="flex min-w-0 items-start justify-between gap-3">
                <p className="break-words text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                  {option.label}
                </p>
                <span className="shrink-0 rounded-full bg-[var(--color-surface)] px-2 py-1 text-[11px] text-[var(--color-text-muted)]">
                  {example.scenarioExamples?.length ?? 0} 个场景
                </span>
              </div>

              <h4 className="mt-2 text-sm font-semibold break-words text-[var(--color-text)]">
                {example.title}
              </h4>

              <p className="mt-2 text-sm leading-relaxed break-words text-[var(--color-text-muted)] line-clamp-2">
                {option.summary}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
