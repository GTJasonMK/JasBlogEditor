import type { DocMetadata } from '@/types';
import { MarkdownRenderer } from '../MarkdownRenderer';
import { PreviewDate } from '../PreviewMeta';

interface DocPreviewProps {
  metadata: DocMetadata;
  content: string;
}

// 普通文档预览
export function DocPreview({ metadata, content }: DocPreviewProps) {
  return (
    <div className="max-w-3xl mx-auto">
      {/* 文档头部 */}
      {(metadata.title || metadata.date) && (
        <header className="mb-8">
          <PreviewDate date={metadata.date} />
          {metadata.title && (
            <h1 className="text-3xl font-bold mt-2 mb-4 text-[var(--color-text)]">{metadata.title}</h1>
          )}
          <div className="divider-cloud mb-8" />
        </header>
      )}

      {/* 文档内容 */}
      <article className="prose-chinese">
        <MarkdownRenderer content={content} />
      </article>
    </div>
  );
}
