import { useFileStore } from '@/store';
import { JasBlogSidebar } from './JasBlogSidebar';
import { DocsSidebar } from './DocsSidebar';

export function Sidebar() {
  const { workspaceType, isLoading, error, fileTree } = useFileStore();

  // 加载中状态
  if (isLoading) {
    return (
      <div className="w-64 bg-[var(--color-surface)] border-r border-[var(--color-border)] flex items-center justify-center">
        <div className="text-sm text-[var(--color-text-muted)]">加载中...</div>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className="w-64 bg-[var(--color-surface)] border-r border-[var(--color-border)] p-4">
        <div className="text-sm text-[var(--color-danger)]">{error}</div>
      </div>
    );
  }

  // 未选择工作区
  if (fileTree.length === 0 && !workspaceType) {
    return (
      <div className="w-64 bg-[var(--color-surface)] border-r border-[var(--color-border)] flex items-center justify-center p-4">
        <div className="text-sm text-[var(--color-text-muted)] text-center">
          请先选择工作区目录
        </div>
      </div>
    );
  }

  // 根据工作区类型渲染对应的侧边栏
  if (workspaceType === 'jasblog') {
    return <JasBlogSidebar />;
  }

  return <DocsSidebar />;
}
