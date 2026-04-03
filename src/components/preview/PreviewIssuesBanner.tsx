interface PreviewIssuesBannerProps {
  issues?: readonly string[];
}

export function PreviewIssuesBanner({ issues }: PreviewIssuesBannerProps) {
  if (!issues || issues.length === 0) {
    return null;
  }

  return (
    <div className="mx-auto max-w-4xl px-6 pt-6">
      <div className="rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5 p-4 text-sm">
        <p className="mb-2 font-medium text-[var(--color-danger)]">文档契约错误</p>
        <ul className="space-y-1 text-[var(--color-gray)]">
          {issues.map((issue, index) => (
            <li key={`${issue}-${index}`}>{issue}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
