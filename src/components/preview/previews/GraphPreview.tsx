import { lazy, Suspense } from 'react';
import type { GraphMetadata } from '@/types';
import { extractGraphFromContent } from '@/services/contentParser';
import { resolveGraphDisplay } from '@/services/displayMetadata';
import { MarkdownRenderer } from '../MarkdownRenderer';
import { PreviewBackButton } from '../PreviewBackButton';
import { PreviewDescription } from '../PreviewMeta';
import type { PreviewLayout } from '../previewLayout';

// @xyflow/react 很大，仅在图谱预览时才加载
const LazyGraphViewer = lazy(() => import('@/components/graph/GraphViewer'));

interface GraphPreviewProps {
  fileName: string;
  metadata: GraphMetadata;
  content: string;
  embedded?: boolean;
  layout?: PreviewLayout;
}

// 知识图谱预览（与 JasBlog graphs/[slug]/page.tsx 一致）
export function GraphPreview({
  fileName,
  metadata,
  content,
  embedded = false,
  layout = 'page',
}: GraphPreviewProps) {
  // 从正文内容中提取图谱数据
  const { graphData, remainingContent, error } = extractGraphFromContent(content);
  const display = resolveGraphDisplay(fileName, metadata);
  const shellClassName =
    layout === 'pane' ? 'min-w-0 py-6' : 'max-w-6xl mx-auto px-6 py-12';

  return (
    <div className={shellClassName}>
      {!embedded && (
        <PreviewBackButton label="返回图谱列表" />
      )}

      {/* 图谱卡片 — 虚线边框暗示节点连接 */}
      <header className="rounded-2xl bg-[var(--color-paper)] border-2 border-dashed border-[var(--color-gold)]/30 p-8 mb-8">
        <p className="text-xs tracking-[0.16em] uppercase text-[var(--color-gold)] mb-2">知识图谱</p>
        <h1 className="text-2xl font-bold mb-2">{display.name}</h1>
        <PreviewDescription text={metadata.description} className="text-[var(--color-gray)] mb-4" />
        {display.date && (
          <p className="text-sm text-[var(--color-gray)] mb-4">{display.date}</p>
        )}
        <div className="flex gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-[var(--color-paper-dark)] rounded-lg border-l-3 border-[var(--color-gold)]">
            <span className="text-2xl font-bold text-[var(--color-ink)]">{graphData.nodes.length}</span>
            <span className="text-sm text-[var(--color-gray)]">个节点</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-[var(--color-paper-dark)] rounded-lg border-l-3 border-[var(--color-vermilion)]">
            <span className="text-2xl font-bold text-[var(--color-ink)]">{graphData.edges.length}</span>
            <span className="text-sm text-[var(--color-gray)]">条连接</span>
          </div>
        </div>
      </header>

      {/* 使用说明 */}
      <div className="mb-6 p-4 bg-[var(--color-paper-dark)] rounded-lg text-sm">
        <p className="text-[var(--color-gray)]">
          <strong>操作提示：</strong>
          滚轮缩放 · 拖拽平移 · 点击节点查看详情 · 右下角小地图导航
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5 text-sm">
          <p className="font-medium text-[var(--color-danger)] mb-1">图谱数据错误</p>
          <p className="text-[var(--color-gray)]">{error}</p>
          <p className="text-xs text-[var(--color-gray)] mt-2">
            请确认文件包含 <span className="font-mono">```graph</span> 代码块，且 JSON 至少包含 nodes/edges 字段。
          </p>
        </div>
      )}

      {/* 图谱查看器 */}
      {!error && (
        <Suspense fallback={<div className="flex items-center justify-center py-10 text-[var(--color-text-muted)]">加载图谱中...</div>}>
          <LazyGraphViewer data={graphData} />
        </Suspense>
      )}

      {/* 正文内容 */}
      {remainingContent.trim() && (
        <article className="prose-chinese mt-8">
          <MarkdownRenderer content={remainingContent} />
        </article>
      )}
    </div>
  );
}
