/**
 * 内容预览组件
 * 还原 JasBlog 各类型页面的完整渲染效果
 */

import type { EditorFile, NoteMetadata, ProjectMetadata, RoadmapMetadata, RoadmapItem, DocMetadata, GraphMetadata } from '@/types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { TechStack } from './TechStack';
import { parseRoadmapItemsFromContent, extractGraphFromContent } from '@/services/contentParser';
import { GraphViewer } from '../graph';

interface ContentPreviewProps {
  file: EditorFile;
  bodyContent: string; // 去掉 frontmatter 的正文内容
}

export function ContentPreview({ file, bodyContent }: ContentPreviewProps) {
  switch (file.type) {
    case 'note':
      return <NotePreview metadata={file.metadata as NoteMetadata} content={bodyContent} />;
    case 'project':
      return <ProjectPreview metadata={file.metadata as ProjectMetadata} content={bodyContent} />;
    case 'roadmap':
      return <RoadmapPreview metadata={file.metadata as RoadmapMetadata} content={bodyContent} />;
    case 'graph':
      return <GraphPreview metadata={file.metadata as GraphMetadata} content={bodyContent} />;
    case 'doc':
      return <DocPreview metadata={file.metadata as DocMetadata} content={bodyContent} />;
    default:
      return (
        <article className="prose-chinese">
          <MarkdownRenderer content={bodyContent} />
        </article>
      );
  }
}

// ============================================
// 学习笔记预览（与 JasBlog notes/[slug]/page.tsx 一致）
// ============================================
function NotePreview({ metadata, content }: { metadata: NoteMetadata; content: string }) {
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

// ============================================
// 开源项目预览（与 JasBlog projects/[slug]/page.tsx 一致）
// ============================================
function ProjectPreview({ metadata, content }: { metadata: ProjectMetadata; content: string }) {
  return (
    <div className="max-w-4xl mx-auto">
      {/* 项目头部 */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-4 text-[var(--color-text)]">{metadata.title}</h1>
        <p className="text-lg text-[var(--color-gray)] mb-4">{metadata.description}</p>

        {/* 链接按钮 */}
        <div className="flex flex-wrap gap-3 mb-6">
          {metadata.github && (
            <a
              href={metadata.github}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-text)] text-[var(--color-paper)] rounded-lg hover:opacity-90 transition-opacity"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              GitHub
            </a>
          )}
          {metadata.demo && (
            <a
              href={metadata.demo}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 border border-[var(--color-primary)] text-[var(--color-primary)] rounded-lg hover:bg-[var(--color-primary)] hover:text-white transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              在线演示
            </a>
          )}
        </div>

        {/* 标签 */}
        {metadata.tags && metadata.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {metadata.tags.map((tag) => (
              <span key={tag} className="tag">{tag}</span>
            ))}
          </div>
        )}

        {/* 技术栈 */}
        {metadata.techStack && metadata.techStack.length > 0 && (
          <TechStack items={metadata.techStack} />
        )}
      </header>

      <div className="divider-cloud my-8" />

      {/* 项目内容 */}
      <article className="prose-chinese">
        <MarkdownRenderer content={content} />
      </article>
    </div>
  );
}

// ============================================
// 规划预览（与 JasBlog roadmap/[slug]/page.tsx 一致）
// ============================================

// 任务状态配置
const statusConfig: Record<string, { label: string; className: string }> = {
  todo: { label: '待开始', className: 'bg-gray-100 text-gray-600' },
  in_progress: { label: '进行中', className: 'bg-[var(--color-primary)] text-white' },
  done: { label: '已完成', className: 'bg-green-100 text-green-700' },
};

// 规划状态配置
const roadmapStatusConfig: Record<string, { label: string; className: string }> = {
  active: { label: '进行中', className: 'bg-[var(--color-primary)] text-white' },
  completed: { label: '已完成', className: 'bg-green-100 text-green-700' },
  paused: { label: '已暂停', className: 'bg-gray-100 text-gray-600' },
};

// 优先级配置
const priorityConfig: Record<string, { className: string; label: string }> = {
  high: { className: 'bg-[var(--color-primary)]', label: '高' },
  medium: { className: 'bg-yellow-400', label: '中' },
  low: { className: 'bg-gray-300', label: '低' },
};

function StatusBadge({ status }: { status: RoadmapItem['status'] }) {
  const cfg = statusConfig[status] || statusConfig.todo;
  return (
    <span className={`text-xs px-2 py-1 rounded ${cfg.className}`}>{cfg.label}</span>
  );
}

function PriorityIndicator({ priority }: { priority: RoadmapItem['priority'] }) {
  const cfg = priorityConfig[priority];
  return <span className={`w-2 h-2 rounded-full ${cfg.className}`} />;
}

function RoadmapItemCard({ item }: { item: RoadmapItem }) {
  return (
    <div className="bg-[var(--color-paper)] rounded-lg p-5 border border-[var(--color-border)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <PriorityIndicator priority={item.priority} />
          <h4 className="font-medium text-[var(--color-text)]">{item.title}</h4>
        </div>
        <StatusBadge status={item.status} />
      </div>
      {item.description && (
        <p className="text-sm text-[var(--color-gray)] mt-2 ml-5">
          {item.description}
        </p>
      )}
      {(item.deadline || item.completedAt) && (
        <div className="flex flex-wrap gap-4 text-xs text-[var(--color-gray)] mt-2 ml-5">
          {item.deadline && <span>截止: {item.deadline}</span>}
          {item.completedAt && <span className="text-green-600">完成: {item.completedAt}</span>}
        </div>
      )}
    </div>
  );
}

function RoadmapPreview({ metadata, content }: { metadata: RoadmapMetadata; content: string }) {
  // 从正文内容解析任务列表和剩余内容
  const { items, remainingContent } = parseRoadmapItemsFromContent(content);

  const inProgress = items.filter((item) => item.status === 'in_progress');
  const todo = items.filter((item) => item.status === 'todo');
  const done = items.filter((item) => item.status === 'done');

  const total = items.length;
  const doneCount = done.length;
  const progressPercent = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  const roadmapStatus = metadata.status || 'active';
  const roadmapStatusCfg = roadmapStatusConfig[roadmapStatus];

  return (
    <div className="max-w-4xl mx-auto">
      {/* 标题区域 */}
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-bold text-[var(--color-text)]">{metadata.title}</h1>
          <span className={`text-xs px-2 py-1 rounded ${roadmapStatusCfg.className}`}>
            {roadmapStatusCfg.label}
          </span>
        </div>
        <p className="text-[var(--color-gray)] mb-4">{metadata.description}</p>

        {/* 进度条 */}
        {total > 0 && (
          <div className="bg-[var(--color-paper-dark)] rounded-lg p-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-[var(--color-gray)]">完成进度</span>
              <span className="font-medium text-[var(--color-text)]">
                {doneCount}/{total} ({progressPercent}%)
              </span>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </header>

      {/* 正文内容（非任务部分） */}
      {remainingContent && (
        <article className="prose-chinese mb-8">
          <MarkdownRenderer content={remainingContent} />
        </article>
      )}

      <div className="divider-cloud my-8" />

      {/* 任务列表 - 进行中 */}
      {inProgress.length > 0 && (
        <section className="mb-10">
          <h3 className="text-lg font-medium mb-4 flex items-center gap-2 text-[var(--color-text)]">
            <span className="w-3 h-3 rounded-full bg-[var(--color-primary)]" />
            正在进行 ({inProgress.length})
          </h3>
          <div className="grid gap-3">
            {inProgress.map((item) => (
              <RoadmapItemCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}

      {/* 任务列表 - 待开始 */}
      {todo.length > 0 && (
        <section className="mb-10">
          <h3 className="text-lg font-medium mb-4 flex items-center gap-2 text-[var(--color-text)]">
            <span className="w-3 h-3 rounded-full bg-gray-300" />
            计划中 ({todo.length})
          </h3>
          <div className="grid gap-3">
            {todo.map((item) => (
              <RoadmapItemCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}

      {/* 任务列表 - 已完成 */}
      {done.length > 0 && (
        <section>
          <h3 className="text-lg font-medium mb-4 flex items-center gap-2 text-[var(--color-text)]">
            <span className="w-3 h-3 rounded-full bg-green-500" />
            已完成 ({done.length})
          </h3>
          <div className="grid gap-3">
            {done.map((item) => (
              <RoadmapItemCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}

      {items.length === 0 && (
        <p className="text-[var(--color-gray)] text-center py-12">
          暂无任务项
        </p>
      )}
    </div>
  );
}

// ============================================
// 普通文档预览
// ============================================
function DocPreview({ metadata, content }: { metadata: DocMetadata; content: string }) {
  return (
    <div className="max-w-3xl mx-auto">
      {/* 文档头部 */}
      {(metadata.title || metadata.date) && (
        <header className="mb-8">
          {metadata.date && (
            <time className="text-sm text-[var(--color-gray)]">{metadata.date}</time>
          )}
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

// ============================================
// 知识图谱预览（与 JasBlog graphs/[slug]/page.tsx 一致）
// ============================================
function GraphPreview({ metadata, content }: { metadata: GraphMetadata; content: string }) {
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
