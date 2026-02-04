import { useState } from 'react';
import { useFileStore, useEditorStore } from '@/store';
import type { ContentType } from '@/types';

interface FileTreeNode {
  name: string;
  path: string;
  isDir: boolean;
  children?: FileTreeNode[];
  contentType?: ContentType;
}

const FOLDER_LABELS: Record<string, string> = {
  notes: '学习笔记',
  projects: '开源项目',
  roadmaps: '我的规划',
  graphs: '知识图谱',
};

const FOLDER_ICONS: Record<string, string> = {
  notes: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  projects: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z',
  roadmaps: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
  graphs: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1',
};

export function Sidebar() {
  const { fileTree, isLoading, error } = useFileStore();
  const { currentFile, openFile } = useEditorStore();
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['notes', 'projects', 'roadmaps', 'graphs']));

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

  if (isLoading) {
    return (
      <div className="w-64 bg-[var(--color-surface)] border-r border-[var(--color-border)] flex items-center justify-center">
        <div className="text-sm text-[var(--color-text-muted)]">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-64 bg-[var(--color-surface)] border-r border-[var(--color-border)] p-4">
        <div className="text-sm text-red-500">{error}</div>
      </div>
    );
  }

  if (fileTree.length === 0) {
    return (
      <div className="w-64 bg-[var(--color-surface)] border-r border-[var(--color-border)] flex items-center justify-center p-4">
        <div className="text-sm text-[var(--color-text-muted)] text-center">
          请先选择 JasBlog 项目目录
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 bg-[var(--color-surface)] border-r border-[var(--color-border)] overflow-y-auto select-none">
      <div className="p-2">
        {fileTree.map((folder) => (
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={FOLDER_ICONS[folder.name] || FOLDER_ICONS.notes} />
              </svg>
              <span>{FOLDER_LABELS[folder.name] || folder.name}</span>
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
        ))}
      </div>
    </div>
  );
}
