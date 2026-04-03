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
    <section id={id} className="mb-8 scroll-mt-4">
      <h3 className="text-base font-semibold text-[var(--color-text)] mb-3">
        {title}
      </h3>
      {children}
    </section>
  );
}

export function CodeCard({ title, code }: { title: string; code: string }) {
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg overflow-hidden">
      <div className="px-3 py-2 text-xs text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
        {title}
      </div>
      <pre className="p-3 text-xs overflow-auto leading-relaxed">
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
    <div className="bg-[var(--color-paper)] border border-[var(--color-border)] rounded-lg overflow-hidden">
      <div className="px-3 py-2 text-xs text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
        {title}
      </div>
      <div className="p-4">{children}</div>
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
    <div id={id} className="mb-6 scroll-mt-4">
      <div className="mb-2">
        <h4 className="text-sm font-medium text-[var(--color-text)]">{title}</h4>
        {description && (
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            {description}
          </p>
        )}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <CodeCard title={codeTitle} code={code} />
        <PreviewCard title={previewTitle}>{preview}</PreviewCard>
      </div>
    </div>
  );
}

export function MarkdownPreview({ content }: { content: string }) {
  return (
    <article className="prose-chinese">
      <MarkdownRenderer content={content} />
    </article>
  );
}
