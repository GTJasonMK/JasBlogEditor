import { useEditorStore } from '@/store';
import { MarkdownEditor } from '../editors/MarkdownEditor';
import { JsonEditor } from '../editors/JsonEditor';

export function EditorArea() {
  const { currentFile, isLoading } = useEditorStore();

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="text-[var(--color-text-muted)]">加载中...</div>
      </div>
    );
  }

  if (!currentFile) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="text-center">
          <svg className="w-16 h-16 mx-auto text-[var(--color-border)] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-[var(--color-text-muted)]">选择或创建一个文件开始编辑</p>
        </div>
      </div>
    );
  }

  if (currentFile.type === 'graph') {
    return <JsonEditor />;
  }

  return <MarkdownEditor />;
}
