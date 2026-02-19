import { lazy, Suspense } from 'react';
import type { GraphMetadata } from '@/types';
import { extractGraphFromContent } from '@/services/contentParser';
import { MarkdownRenderer } from '../MarkdownRenderer';
import { PreviewBackButton } from '../PreviewBackButton';
import { PreviewDescription, PreviewDate } from '../PreviewMeta';

// @xyflow/react 很大，仅在图谱预览时才加载
const LazyGraphViewer = lazy(() => import('@/components/graph/GraphViewer'));

interface GraphPreviewProps {
  metadata: GraphMetadata;
  content: string;
  embedded?: boolean;
}

// 知识图谱预览（与 JasBlog graphs/[slug]/page.tsx 一致）
export function GraphPreview({ metadata, content, embedded = false }: GraphPreviewProps) {
  // 从正文内容中提取图谱数据
  const { graphData, remainingContent, error } = extractGraphFromContent(content);

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      {!embedded && (
        <PreviewBackButton label="返回图谱列表" />
      )}

      {/* 标题 */}
      <header className="mb-8">
        <h1 className="text-2xl font-bold mb-2">{metadata.name}</h1>
        <PreviewDescription text={metadata.description} className="text-[var(--color-gray)] mb-2" />
        <p className="text-sm text-[var(--color-gray)]">
          <PreviewDate date={metadata.date} className="mr-4" />
          <span>{graphData.nodes.length} 个节点</span>
          <span className="mx-2">·</span>
          <span>{graphData.edges.length} 条连接</span>
        </p>
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
