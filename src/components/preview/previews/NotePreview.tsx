import { GraphViewer } from '@/components/graph';
import type { GraphData, NoteMetadata } from '@/types';
import { MarkdownRenderer } from '../MarkdownRenderer';

interface NotePreviewProps {
  metadata: NoteMetadata;
  content: string;
}

type ContentSegment =
  | { type: 'markdown'; content: string }
  | { type: 'graph'; data: GraphData };

function preprocessAlerts(content: string): string {
  return content.replace(
    /^(>\s*)\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\r?\n?/gm,
    '$1ALERTBOX$2ALERTBOX\n',
  );
}

function parseContent(content: string): ContentSegment[] {
  const segments: ContentSegment[] = [];
  const graphBlockRegex = /```graph\n([\s\S]*?)```/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = graphBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const markdownContent = content.slice(lastIndex, match.index).trim();
      if (markdownContent) {
        segments.push({ type: 'markdown', content: markdownContent });
      }
    }

    try {
      const graphJson = match[1].trim();
      const graphData = JSON.parse(graphJson) as GraphData;
      segments.push({ type: 'graph', data: graphData });
    } catch {
      segments.push({
        type: 'markdown',
        content: '```json\n' + match[1] + '```',
      });
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    const remainingContent = content.slice(lastIndex).trim();
    if (remainingContent) {
      segments.push({ type: 'markdown', content: remainingContent });
    }
  }

  return segments;
}

// 学习笔记预览（与 JasBlog notes/[slug]/page.tsx 一致）
export function NotePreview({ metadata, content }: NotePreviewProps) {
  const segments = parseContent(preprocessAlerts(content));

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <span className="text-sm text-[var(--color-gray)] hover:text-[var(--color-vermilion)] mb-8 inline-block">
        &larr; 返回笔记列表
      </span>

      {/* 文章头部 */}
      <header className="mb-8">
        <time className="text-sm text-[var(--color-gray)]">{metadata.date}</time>
        <h1 className="text-3xl font-bold mt-2 mb-4">{metadata.title}</h1>
        {metadata.tags && metadata.tags.length > 0 && (
          <div className="flex gap-2">
            {metadata.tags.map((tag) => (
              <span
                key={tag}
                className="tag hover:bg-[var(--color-vermilion)] hover:text-white"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </header>

      <div className="divider-cloud mb-8" />

      {/* 文章内容 */}
      <article className="prose-chinese">
        {segments.map((segment, index) => {
          if (segment.type === 'markdown') {
            return <MarkdownRenderer key={index} content={segment.content} />;
          }

          return (
            <div key={index} className="my-8 not-prose">
              <GraphViewer data={segment.data} />
            </div>
          );
        })}
      </article>
    </div>
  );
}
