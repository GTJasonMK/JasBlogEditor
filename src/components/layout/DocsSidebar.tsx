import { useState, useRef, useEffect } from 'react';
import { useFileStore, useEditorStore } from '@/store';
import { DocsTreeItem } from './DocsTreeItem';
import type { FileTreeNode } from '@/store/fileStore';

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  file: FileTreeNode | null;
}

export function DocsSidebar() {
  const { fileTree, refreshFileTree } = useFileStore();
  const { currentFile, deleteFile, renameFile } = useEditorStore();
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ visible: false, x: 0, y: 0, file: null });
  const [renameDialog, setRenameDialog] = useState<{ visible: boolean; file: FileTreeNode | null; newName: string }>({ visible: false, file: null, newName: '' });
  const menuRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭右键菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(prev => ({ ...prev, visible: false }));
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleContextMenu = (e: React.MouseEvent, file: FileTreeNode) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      file,
    });
  };

  const handleRename = () => {
    if (!contextMenu.file) return;
    const name = contextMenu.file.name.replace(/\.md$/, '');
    setRenameDialog({ visible: true, file: contextMenu.file, newName: name });
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const handleDelete = async () => {
    if (!contextMenu.file) return;
    const confirmed = confirm(`确定要删除 "${contextMenu.file.name}" 吗?`);
    if (!confirmed) return;

    setContextMenu(prev => ({ ...prev, visible: false }));
    try {
      await deleteFile(contextMenu.file.path);
      await refreshFileTree();
    } catch (error) {
      // 错误已在 store 中处理
    }
  };

  const handleRenameSubmit = async () => {
    if (!renameDialog.file || !renameDialog.newName.trim()) return;

    const oldPath = renameDialog.file.path;
    const separator = oldPath.includes('\\') ? '\\' : '/';
    const parentDir = oldPath.substring(0, oldPath.lastIndexOf(separator));
    const newPath = `${parentDir}${separator}${renameDialog.newName.trim()}.md`;

    try {
      await renameFile(oldPath, newPath);
      await refreshFileTree();
      setRenameDialog({ visible: false, file: null, newName: '' });
    } catch (error) {
      // 错误已在 store 中处理
    }
  };

  return (
    <div className="w-64 bg-[var(--color-surface)] border-r border-[var(--color-border)] overflow-y-auto select-none">
      <div className="p-2">
        {fileTree.length === 0 ? (
          <div className="px-2 py-4 text-sm text-[var(--color-text-muted)] text-center">
            未找到 Markdown 文件
          </div>
        ) : (
          fileTree.map((node) => (
            <DocsTreeItem
              key={node.path}
              node={node}
              currentPath={currentFile?.path}
              onContextMenu={handleContextMenu}
            />
          ))
        )}
      </div>

      {/* 右键菜单 */}
      {contextMenu.visible && (
        <div
          ref={menuRef}
          className="fixed bg-[var(--color-paper)] border border-[var(--color-border)] rounded-md shadow-lg py-1 z-50"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={handleRename}
            className="w-full px-4 py-1.5 text-sm text-left text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            重命名
          </button>
          <button
            onClick={handleDelete}
            className="w-full px-4 py-1.5 text-sm text-left text-[var(--color-danger)] hover:bg-[var(--color-danger-hover)] flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            删除
          </button>
        </div>
      )}

      {/* 重命名对话框 */}
      {renameDialog.visible && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[var(--color-paper)] rounded-lg p-4 w-80 shadow-xl">
            <h3 className="text-sm font-medium text-[var(--color-text)] mb-3">重命名文件</h3>
            <input
              type="text"
              value={renameDialog.newName}
              onChange={(e) => setRenameDialog(prev => ({ ...prev, newName: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameSubmit();
                if (e.key === 'Escape') setRenameDialog({ visible: false, file: null, newName: '' });
              }}
              autoFocus
              className="w-full px-3 py-2 text-sm border border-[var(--color-border)] rounded-md focus:outline-none focus:border-[var(--color-primary)] bg-[var(--color-paper)] text-[var(--color-text)]"
              placeholder="输入新文件名"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setRenameDialog({ visible: false, file: null, newName: '' })}
                className="px-3 py-1.5 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] rounded"
              >
                取消
              </button>
              <button
                onClick={handleRenameSubmit}
                disabled={!renameDialog.newName.trim()}
                className="px-3 py-1.5 text-sm bg-[var(--color-primary)] text-white rounded hover:bg-[var(--color-primary-dark)] disabled:opacity-50"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
