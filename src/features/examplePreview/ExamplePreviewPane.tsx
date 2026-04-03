import type { ReactNode } from "react";

export function ExamplePreviewPane({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-paper)] shadow-sm">
      <header className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] px-4 py-3">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">{title}</h2>
        {actions}
      </header>
      <div className="min-h-0 flex flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </section>
  );
}
