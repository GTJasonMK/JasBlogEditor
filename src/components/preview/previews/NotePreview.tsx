import { useEffect, useState } from 'react';
import { GraphViewer } from '@/components/graph';
import type { GraphData, NoteMetadata } from '@/types';
import { useEditorStore } from '@/store';
import { MarkdownRenderer } from '../MarkdownRenderer';
import { TableOfContents } from '../TableOfContents';
import { BackToTop } from '../BackToTop';
import { usePreviewScrollContainer } from '../PreviewScrollContext';
import { Comments } from '../Comments';

interface NotePreviewProps {
  fileName: string;
  metadata: NoteMetadata;
  content: string;
  embedded?: boolean;
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
  // 与 JasBlog ArticleContent.tsx 保持一致：允许 ```graph 后带空格，兼容 CRLF
  const graphBlockRegex = /```graph\s*\r?\n([\s\S]*?)\r?\n```/g;

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

    if (inFence) continue;

    if (/^(#{2,4})\s+/.test(line)) {
      return true;
    }
  }

  return false;
}

// 学习笔记预览（与 JasBlog notes/[slug]/page.tsx 一致）
export function NotePreview({ fileName, metadata, content, embedded = false }: NotePreviewProps) {
  const setPreviewMode = useEditorStore((state) => state.setPreviewMode);
  const setNotesListTag = useEditorStore((state) => state.setNotesListTag);
  const processedContent = preprocessAlerts(content);
  const segments = parseContent(processedContent);

  const scrollContainer = usePreviewScrollContainer();
  const [canShowToc, setCanShowToc] = useState(false);

  // 目录只在主预览区域启用：需要 PreviewScrollProvider 提供滚动容器
  useEffect(() => {
    if (!scrollContainer) {
      setCanShowToc(false);
      return;
    }

    const update = () => {
      // 经验阈值：容器宽度足够时再显示目录，避免分屏/迷你窗口挤占正文宽度
      setCanShowToc(scrollContainer.clientWidth >= 900);
    };

    update();

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => update());
      ro.observe(scrollContainer);
    }

    return () => {
      ro?.disconnect();
    };
  }, [scrollContainer]);

  const hasTocCandidates = hasVisibleTocHeadings(processedContent);
  const showToc = canShowToc && hasTocCandidates;

  const slug = fileName.replace(/\.md$/i, '');
  const commentTerm = `/notes/${slug}`;

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      {!embedded && (
        <button
          type="button"
          onClick={() => setPreviewMode('list')}
          className="text-sm text-[var(--color-gray)] hover:text-[var(--color-vermilion)] mb-8 inline-block"
        >
          &larr; 返回笔记列表
        </button>
      )}

      <div className="flex gap-10 items-start">
        <div className="min-w-0 flex-1 max-w-3xl">
          {/* 文章头部 */}
          <header className="mb-8">
            <time className="text-sm text-[var(--color-gray)]">{metadata.date}</time>
            <h1 className="text-3xl font-bold mt-2 mb-4">{metadata.title}</h1>
            {metadata.tags && metadata.tags.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {metadata.tags.map((tag) => (
                  embedded ? (
                    <span key={tag} className="tag">
                      {tag}
                    </span>
                  ) : (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        setNotesListTag(tag);
                        setPreviewMode('list');
                      }}
                      className="tag hover:bg-[var(--color-vermilion)] hover:text-white"
                    >
                      {tag}
                    </button>
                  )
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

          <div className="divider-cloud my-12" />

          {!embedded && (
            <section>
              <h2 className="text-xl font-semibold mb-6">Comments and discussion</h2>
              <Comments term={commentTerm} />
            </section>
          )}
        </div>

        {/* 右侧目录（只在主预览区启用） */}
        {showToc && (
          <div className="hidden lg:block w-56 flex-shrink-0">
            <TableOfContents content={processedContent} />
          </div>
        )}
      </div>

      <BackToTop />
    </div>
  );
}
