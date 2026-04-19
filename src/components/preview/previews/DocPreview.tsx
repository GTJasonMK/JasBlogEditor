import type { DocMetadata } from '@/types';
import { MarkdownRenderer } from '../MarkdownRenderer';
import { TableOfContents } from '../TableOfContents';
import { BackToTop } from '../BackToTop';
import { PreviewDate } from '../PreviewMeta';
import type { PreviewLayout } from '../previewLayout';

interface DocPreviewProps {
  metadata: DocMetadata;
  content: string;
  layout?: PreviewLayout;
}

function hasVisibleTocHeadings(content: string): boolean {
  let inFence = false;
  let fenceChar = '';

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trimStart();
    const fenceMatch = trimmed.match(/^(`{3,}|~{3,})/);

    if (fenceMatch) {
      const currentFenceChar = fenceMatch[1][0];
      if (!inFence) {
        inFence = true;
        fenceChar = currentFenceChar;
      } else if (currentFenceChar === fenceChar) {
        inFence = false;
        fenceChar = '';
      }
      continue;
    }

    if (!inFence && /^(#{2,4})\s+/.test(line)) {
      return true;
    }
  }

  return false;
}

// 普通文档预览
export function DocPreview({
  metadata,
  content,
  layout = 'page',
}: DocPreviewProps) {
  const showToc = hasVisibleTocHeadings(content) && layout === 'page';
  const shellClassName =
    layout === 'pane' ? 'min-w-0 py-6' : 'max-w-6xl mx-auto px-6 py-12';
  const contentClassName =
    layout === 'pane'
      ? 'flex min-w-0 flex-col gap-8'
      : 'flex gap-10 items-start';
  const articleClassName =
    layout === 'pane' ? 'min-w-0 flex-1' : 'min-w-0 flex-1 max-w-3xl';

  return (
    <div className={shellClassName}>
      <div className={contentClassName}>
        <div className={articleClassName}>
          {(metadata.title || metadata.date) && (
            <header className="mb-8">
              <PreviewDate date={metadata.date} />
              {metadata.title && (
                <h1 className="text-3xl font-bold mt-2 mb-4 text-[var(--color-text)]">
                  {metadata.title}
                </h1>
              )}
              <div className="divider-cloud mb-8" />
            </header>
          )}

          <article className="prose-chinese">
            <MarkdownRenderer content={content} />
          </article>
        </div>

        {showToc && (
          <div className="hidden lg:block w-56 flex-shrink-0">
            <TableOfContents content={content} />
          </div>
        )}
      </div>

      <BackToTop />
    </div>
  );
}
