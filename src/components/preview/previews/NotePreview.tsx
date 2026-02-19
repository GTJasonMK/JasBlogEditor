import { lazy, Suspense, useEffect, useState } from 'react';
import type { GraphData, NoteMetadata } from '@/types';
import { useEditorStore } from '@/store';

// @xyflow/react 很大，仅在笔记内容包含 ```graph 块时才加载
const LazyGraphViewer = lazy(() => import('@/components/graph/GraphViewer'));
import { MarkdownRenderer } from '../MarkdownRenderer';
import { TableOfContents } from '../TableOfContents';
import { BackToTop } from '../BackToTop';
import { usePreviewScrollContainer } from '../PreviewScrollContext';
import { Comments } from '../Comments';
import { PreviewBackButton } from '../PreviewBackButton';
import { PreviewDate, PreviewTagList } from '../PreviewMeta';

interface NotePreviewProps {
  fileName: string;
  metadata: NoteMetadata;
  content: string;
  embedded?: boolean;
}

type ContentSegment =
  | { type: 'markdown'; content: string }
  | { type: 'graph'; data: GraphData };

function isValidGraphData(value: unknown): value is GraphData {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return Array.isArray(obj.nodes) && Array.isArray(obj.edges);
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
      const parsed = JSON.parse(graphJson) as unknown;
      if (isValidGraphData(parsed)) {
        segments.push({ type: 'graph', data: parsed });
      } else {
        segments.push({
          type: 'markdown',
          content: '```json\n' + match[1] + '```',
        });
      }
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
  const segments = parseContent(content);

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

  const hasTocCandidates = hasVisibleTocHeadings(content);
  const showToc = canShowToc && hasTocCandidates;

  const slug = fileName.replace(/\.md$/i, '');
  const commentTerm = `/notes/${slug}`;
  const handleTagClick = (tag: string) => {
    setNotesListTag(tag);
    setPreviewMode('list');
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      {!embedded && (
        <PreviewBackButton label="返回笔记列表" className="mb-8" />
      )}

      <div className="flex gap-10 items-start">
        <div className="min-w-0 flex-1 max-w-3xl">
          {/* 文章头部 */}
          <header className="mb-8">
            <PreviewDate date={metadata.date} />
            <h1 className="text-3xl font-bold mt-2 mb-4">{metadata.title}</h1>
            <PreviewTagList
              tags={metadata.tags}
              onTagClick={embedded ? undefined : handleTagClick}
              buttonClassName="tag hover:bg-[var(--color-vermilion)] hover:text-white"
            />
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
                  <Suspense fallback={<div className="flex items-center justify-center py-10 text-[var(--color-text-muted)]">加载图谱中...</div>}>
                    <LazyGraphViewer data={segment.data} />
                  </Suspense>
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
            <TableOfContents content={content} />
          </div>
        )}
      </div>

      <BackToTop />
    </div>
  );
}
