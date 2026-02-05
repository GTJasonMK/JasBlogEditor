import { useEffect, useRef } from 'react';

interface FileContextMenuProps {
  visible: boolean;
  x: number;
  y: number;
  onRename: () => void;
  onDelete: () => void;
  onClose: () => void;
}

/**
 * 侧边栏文件右键菜单（重命名 / 删除）
 */
export function FileContextMenu({
  visible,
  x,
  y,
  onRename,
  onDelete,
  onClose,
}: FileContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭右键菜单
  useEffect(() => {
    if (!visible) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <div
      ref={menuRef}
      className="fixed bg-[var(--color-paper)] border border-[var(--color-border)] rounded-md shadow-lg py-1 z-50"
      style={{ left: x, top: y }}
    >
      <button
        onClick={onRename}
        className="w-full px-4 py-1.5 text-sm text-left text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        重命名
      </button>
      <button
        onClick={onDelete}
        className="w-full px-4 py-1.5 text-sm text-left text-[var(--color-danger)] hover:bg-[var(--color-danger-hover)] flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        删除
      </button>
    </div>
  );
}

