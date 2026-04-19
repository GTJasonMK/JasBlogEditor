import type { ReactNode } from "react";
import { MarkdownRenderer } from "@/components/preview";

export function Section({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="mb-8 min-w-0 scroll-mt-4">
      <h3 className="mb-3 break-words text-base font-semibold text-[var(--color-text)]">
        {title}
      </h3>
      {children}
    </section>
  );
}

export function CodeCard({ title, code }: { title: string; code: string }) {
  return (
    <div className="min-w-0 flex flex-col rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
      <div className="px-3 py-2 text-xs break-words text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
        {title}
      </div>
      <pre className="min-w-0 flex-1 overflow-auto p-3 text-xs leading-relaxed">
        <code className="font-mono whitespace-pre">{code}</code>
      </pre>
    </div>
  );
}

export function PreviewCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 flex flex-col overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)]">
      <div className="px-3 py-2 text-xs break-words text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
        {title}
      </div>
      <div className="min-w-0 overflow-hidden p-4">{children}</div>
    </div>
  );
}

export function SideBySideExample({
  title,
  description,
  codeTitle = "语法示例",
  previewTitle = "渲染效果",
  id,
  code,
  preview,
}: {
  title: string;
  description?: string;
  codeTitle?: string;
  previewTitle?: string;
  id?: string;
  code: string;
  preview: ReactNode;
}) {
  return (
    <div id={id} className="mb-6 min-w-0 scroll-mt-4">
      <div className="mb-2">
        <h4 className="break-words text-sm font-medium text-[var(--color-text)]">
          {title}
        </h4>
        {description && (
          <p className="text-xs break-words mt-1 text-[var(--color-text-muted)]">
            {description}
          </p>
        )}
      </div>
      <div className="grid grid-cols-1 items-stretch gap-3 lg:grid-cols-[minmax(0,0.94fr)_minmax(0,1.06fr)]">
        <CodeCard title={codeTitle} code={code} />
        <PreviewCard title={previewTitle}>{preview}</PreviewCard>
      </div>
    </div>
  );
}

export function MarkdownPreview({ content }: { content: string }) {
  return (
    <article className="min-w-0 overflow-hidden prose-chinese">
      <MarkdownRenderer content={content} />
    </article>
  );
}
