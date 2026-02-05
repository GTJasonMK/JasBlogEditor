import type { RoadmapMetadata, RoadmapItem } from '@/types';
import { parseRoadmapItemsFromContent } from '@/services/contentParser';
import { MarkdownRenderer } from '../MarkdownRenderer';

interface RoadmapPreviewProps {
  metadata: RoadmapMetadata;
  content: string;
}

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

// 规划预览（与 JasBlog roadmap/[slug]/page.tsx 一致）
export function RoadmapPreview({ metadata, content }: RoadmapPreviewProps) {
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

