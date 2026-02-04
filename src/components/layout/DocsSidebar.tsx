import { useFileStore, useEditorStore } from '@/store';
import { DocsTreeItem } from './DocsTreeItem';

export function DocsSidebar() {
  const { fileTree } = useFileStore();
  const { currentFile } = useEditorStore();

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
            />
          ))
        )}
      </div>
    </div>
  );
}
