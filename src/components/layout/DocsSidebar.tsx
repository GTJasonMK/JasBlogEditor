import { useState } from 'react';
import { useFileStore, useEditorStore } from '@/store';
import { DocsTreeItem } from './DocsTreeItem';
import type { FileTreeNode } from '@/store/fileStore';
import { renameSiblingPath } from '@/utils';
import { FileContextMenu } from './sidebar/FileContextMenu';
import { RenameDialog } from './sidebar/RenameDialog';

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
    const newPath = renameSiblingPath(oldPath, renameDialog.newName, '.md');

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

      <FileContextMenu
        visible={contextMenu.visible}
        x={contextMenu.x}
        y={contextMenu.y}
        onRename={handleRename}
        onDelete={handleDelete}
        onClose={() => setContextMenu(prev => ({ ...prev, visible: false }))}
      />

      <RenameDialog
        visible={renameDialog.visible}
        title="重命名文件"
        value={renameDialog.newName}
        placeholder="输入新文件名"
        onChange={(newName) => setRenameDialog(prev => ({ ...prev, newName }))}
        onSubmit={handleRenameSubmit}
        onCancel={() => setRenameDialog({ visible: false, file: null, newName: '' })}
      />
    </div>
  );
}
