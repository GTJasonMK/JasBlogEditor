import { useState } from 'react';
import { useEditorStore } from '@/store';
import type { FileTreeNode } from '@/store/fileStore';

interface DocsTreeItemProps {
  node: FileTreeNode;
  currentPath?: string;
  depth?: number;
  onContextMenu?: (e: React.MouseEvent, node: FileTreeNode) => void;
}

export function DocsTreeItem({ node, currentPath, depth = 0, onContextMenu }: DocsTreeItemProps) {
  // 默认展开前两层
  const [expanded, setExpanded] = useState(depth < 2);
  const { openFile } = useEditorStore();

  const handleClick = () => {
    if (node.isDir) {
      setExpanded(!expanded);
    } else if (node.contentType) {
      openFile(node.path, node.contentType);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    // 只对文件显示右键菜单
    if (!node.isDir && onContextMenu) {
      onContextMenu(e, node);
    }
  };

  const isActive = currentPath === node.path;
  const paddingLeft = depth * 12 + 8;

  return (
    <div>
      <button
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        style={{ paddingLeft: `${paddingLeft}px` }}
        className={`w-full flex items-center gap-2 pr-2 py-1.5 text-sm rounded transition-colors ${
          isActive
            ? 'bg-[var(--color-primary)] text-white'
            : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]'
        }`}
      >
        {node.isDir ? (
          <>
            {/* 展开/收起箭头 */}
            <svg
              className={`w-4 h-4 flex-shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {/* 文件夹图标 */}
            <svg className="w-4 h-4 flex-shrink-0 text-[var(--color-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </>
        ) : (
          <>
            {/* 占位符，保持对齐 */}
            <span className="w-4" />
            {/* 文件图标 */}
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </>
        )}
        <span className="truncate">{node.name}</span>
        {node.isDir && node.children && (
          <span className="ml-auto text-xs text-[var(--color-text-subtle)]">
            {node.children.length}
          </span>
        )}
      </button>

      {/* 子节点 */}
      {node.isDir && expanded && node.children && (
        <div>
          {node.children.map((child) => (
            <DocsTreeItem
              key={child.path}
              node={child}
              currentPath={currentPath}
              depth={depth + 1}
              onContextMenu={onContextMenu}
            />
          ))}
        </div>
      )}
    </div>
  );
}
