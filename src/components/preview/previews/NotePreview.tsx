import type { NoteMetadata } from '@/types';
import { MarkdownRenderer } from '../MarkdownRenderer';

interface NotePreviewProps {
  metadata: NoteMetadata;
  content: string;
}

// 学习笔记预览（与 JasBlog notes/[slug]/page.tsx 一致）
export function NotePreview({ metadata, content }: NotePreviewProps) {
  return (
    <div className="max-w-3xl mx-auto">
      {/* 文章头部 */}
      <header className="mb-8">
        <time className="text-sm text-[var(--color-gray)]">{metadata.date}</time>
        <h1 className="text-3xl font-bold mt-2 mb-4 text-[var(--color-text)]">{metadata.title}</h1>
        {metadata.tags && metadata.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {metadata.tags.map((tag) => (
              <span key={tag} className="tag">
                {tag}
              </span>
            ))}
          </div>
        )}
      </header>

      <div className="divider-cloud mb-8" />

      {/* 文章内容 */}
      <article className="prose-chinese">
        <MarkdownRenderer content={content} />
      </article>
    </div>
  );
}

