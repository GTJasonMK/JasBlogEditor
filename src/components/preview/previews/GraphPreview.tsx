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
    <div className="h-full flex flex-col">
      {/* 头部信息 */}
      <header className="flex-shrink-0 mb-8">
        <h1 className="text-2xl font-bold mb-2 text-[var(--color-text)]">{metadata.name}</h1>
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

      {/* 操作提示 */}
      <div className="flex-shrink-0 mb-6 p-4 bg-[var(--color-paper-dark)] rounded-lg text-sm">
        <p className="text-[var(--color-gray)]">
          <strong>操作提示：</strong>
          滚轮缩放 · 拖拽平移 · 点击节点查看详情 · 右下角小地图导航
        </p>
      </div>

      {/* 图谱可视化 */}
      <div className="flex-1 min-h-[400px]">
        {graphData.nodes.length > 0 ? (
          <GraphViewer data={graphData} />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[var(--color-paper)] rounded-lg border border-[var(--color-border)]">
            <div className="text-center text-[var(--color-gray)]">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M8 12h.01M12 12h.01M16 12h.01" />
              </svg>
              <p>暂无节点数据</p>
              <p className="text-sm mt-1">在 graph 代码块中添加节点后即可预览图谱</p>
            </div>
          </div>
        )}
      </div>

      {/* 正文内容 */}
      {remainingContent && (
        <article className="prose-chinese mt-8">
          <MarkdownRenderer content={remainingContent} />
        </article>
      )}
    </div>
  );
}

