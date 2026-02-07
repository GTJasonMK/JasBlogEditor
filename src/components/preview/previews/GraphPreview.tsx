import type { GraphMetadata } from '@/types';
import { extractGraphFromContent } from '@/services/contentParser';
import { GraphViewer } from '@/components/graph';
import { MarkdownRenderer } from '../MarkdownRenderer';

interface GraphPreviewProps {
  metadata: GraphMetadata;
  content: string;
}

// 知识图谱预览（与 JasBlog graphs/[slug]/page.tsx 一致）
export function GraphPreview({ metadata, content }: GraphPreviewProps) {
  // 从正文内容中提取图谱数据
  const { graphData, remainingContent } = extractGraphFromContent(content);

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <span className="inline-flex items-center gap-1 text-[var(--color-gray)] mb-6 transition-colors">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M10 12L6 8L10 4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        返回图谱列表
      </span>

      {/* 标题 */}
      <header className="mb-8">
        <h1 className="text-2xl font-bold mb-2">{metadata.name}</h1>
        {metadata.description && (
          <p className="text-[var(--color-gray)] mb-2">{metadata.description}</p>
        )}
        <p className="text-sm text-[var(--color-gray)]">
          {metadata.date && <span className="mr-4">{metadata.date}</span>}
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

      {/* 图谱查看器 */}
      <GraphViewer data={graphData} />

      {/* 正文内容 */}
      {remainingContent.trim() && (
        <article className="prose-chinese mt-8">
          <MarkdownRenderer content={remainingContent} />
        </article>
      )}
    </div>
  );
}
