import { useState } from 'react';
import { useFileStore, useEditorStore } from '@/store';
import type { FileTreeNode } from '@/store/fileStore';
import { CONTENT_DIRS, JASBLOG_CONTENT_TYPES, JASBLOG_SECTION_ICONS, JASBLOG_SECTION_LABELS } from '@/types';
import type { JasBlogContentType } from '@/types';
import { confirmDialog } from '@/utils/confirmDialog';
import { renameSiblingPath } from '@/utils';
import { FileContextMenu } from './sidebar/FileContextMenu';
import { RenameDialog } from './sidebar/RenameDialog';

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  file: FileTreeNode | null;
}

export function JasBlogSidebar() {
  const { fileTree, refreshFileTree } = useFileStore();
  const { currentFile, openFile, deleteFile, renameFile } = useEditorStore();
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    () => new Set(JASBLOG_CONTENT_TYPES.map((type) => CONTENT_DIRS[type]))
  );
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ visible: false, x: 0, y: 0, file: null });
  const [renameDialog, setRenameDialog] = useState<{ visible: boolean; file: FileTreeNode | null; newName: string }>({ visible: false, file: null, newName: '' });

  const toggleFolder = (name: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const handleFileClick = (node: FileTreeNode) => {
    if (node.isDir || !node.contentType) return;
    openFile(node.path, node.contentType);
  };

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
    const name = contextMenu.file.name.replace(/\.(md|json)$/, '');
    setRenameDialog({ visible: true, file: contextMenu.file, newName: name });
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const handleDelete = async () => {
    const file = contextMenu.file;
    if (!file) return;

    setContextMenu((prev) => ({ ...prev, visible: false }));
    const confirmed = await confirmDialog(`确定要删除 "${file.name}" 吗?`, {
      title: '删除文件',
      kind: 'warning',
      okLabel: '删除',
      cancelLabel: '取消',
    });
    if (!confirmed) return;

    try {
      await deleteFile(file.path);
      await refreshFileTree();
    } catch (error) {
      // 错误已在 store 中处理
    }
  };

  const handleRenameSubmit = async () => {
    if (!renameDialog.file || !renameDialog.newName.trim()) return;

    const oldPath = renameDialog.file.path;
    const ext = renameDialog.file.name.match(/\.(md|json)$/)?.[0] || '.md';
    const newPath = renameSiblingPath(oldPath, renameDialog.newName, ext);

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
        {fileTree.map((folder) => {
          const folderType = folder.contentType && folder.contentType !== 'doc'
            ? (folder.contentType as JasBlogContentType)
            : null;
          const label = folderType ? JASBLOG_SECTION_LABELS[folderType] : folder.name;
          const iconPath = folderType ? JASBLOG_SECTION_ICONS[folderType] : JASBLOG_SECTION_ICONS.note;

          return (
            <div key={folder.path} className="mb-1">
              {/* 文件夹 */}
              <button
                onClick={() => toggleFolder(folder.name)}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] rounded transition-colors"
              >
                <svg
                  className={`w-4 h-4 transition-transform ${expandedFolders.has(folder.name) ? 'rotate-90' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <svg className="w-4 h-4 text-[var(--color-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPath} />
                </svg>
                <span>{label}</span>
                <span className="ml-auto text-xs text-[var(--color-text-subtle)]">
                  {folder.children?.length || 0}
                </span>
              </button>

            {/* 文件列表 */}
            {expandedFolders.has(folder.name) && folder.children && (
              <div className="ml-4 mt-1">
                {folder.children.length === 0 ? (
                  <div className="px-2 py-1 text-xs text-[var(--color-text-subtle)]">
                    暂无内容
                  </div>
                ) : (
                  folder.children.map((file) => (
                    <button
                      key={file.path}
                      onClick={() => handleFileClick(file)}
                      onContextMenu={(e) => handleContextMenu(e, file)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded transition-colors ${
                        currentFile?.path === file.path
                          ? 'bg-[var(--color-primary)] text-white'
                          : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]'
                      }`}
                    >
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <span className="truncate">{file.name}</span>
                    </button>
                  ))
                )}
              </div>
            )}
            </div>
          );
        })}
      </div>

      {/* 右键菜单 */}
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
