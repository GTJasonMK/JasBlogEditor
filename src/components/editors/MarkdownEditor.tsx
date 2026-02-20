import { useState, useRef, useCallback, lazy, Suspense } from 'react';
import { useEditorStore } from '@/store';
import { ContentPreview } from '../preview/ContentPreview';
import { PreviewScrollProvider } from '@/components/preview/PreviewScrollContext';
import { AIAssistantPanel } from './AIAssistantPanel';

// JasBlogListPreview 体积较大（~1300行），仅在列表预览模式下需要，懒加载
const LazyJasBlogListPreview = lazy(() =>
  import('@/components/preview/JasBlogListPreview').then(m => ({ default: m.JasBlogListPreview }))
);

export function MarkdownEditor() {
  const { currentFile, updateContent, viewMode, previewMode, aiPanelVisible, setAIPanelVisible } = useEditorStore();

  const [previewContainer, setPreviewContainer] = useState<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const getSelectedText = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return '';
    return ta.value.substring(ta.selectionStart, ta.selectionEnd);
  }, []);

  const handleInsert = useCallback((text: string) => {
    const ta = textareaRef.current;
    if (!ta || !currentFile) return;
    const pos = ta.selectionEnd;
    const newContent = currentFile.content.slice(0, pos) + text + currentFile.content.slice(pos);
    updateContent(newContent);
    // 更新光标位置到插入内容之后
    requestAnimationFrame(() => {
      ta.selectionStart = pos + text.length;
      ta.selectionEnd = pos + text.length;
      ta.focus();
    });
  }, [currentFile, updateContent]);

  const handleReplace = useCallback((text: string) => {
    const ta = textareaRef.current;
    if (!ta || !currentFile) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const newContent = currentFile.content.slice(0, start) + text + currentFile.content.slice(end);
    updateContent(newContent);
    requestAnimationFrame(() => {
      ta.selectionStart = start;
      ta.selectionEnd = start + text.length;
      ta.focus();
    });
  }, [currentFile, updateContent]);

  if (!currentFile) return null;

  // 预览内容：store 中已将 frontmatter 与正文分离，此处直接使用正文
  const bodyContent = currentFile.content;

  const renderEditor = () => (
    <textarea
      ref={textareaRef}
      value={currentFile.content}
      onChange={(e) => updateContent(e.target.value)}
      className="w-full h-full p-4 resize-none bg-[var(--color-paper)] editor-textarea focus:outline-none"
      placeholder="开始编写..."
    />
  );

  const renderPreview = () => {
    const showListPreview = previewMode === 'list' && currentFile.type !== 'doc';

    return (
      <div ref={setPreviewContainer} className="w-full h-full overflow-auto bg-[var(--color-paper)]">
        <PreviewScrollProvider container={previewContainer}>
          {showListPreview
            ? <Suspense fallback={<div className="flex items-center justify-center py-20 text-[var(--color-text-muted)]">加载预览中...</div>}>
                <LazyJasBlogListPreview activeFile={currentFile} activeBodyContent={bodyContent} />
              </Suspense>
            : <ContentPreview file={currentFile} bodyContent={bodyContent} />
          }
        </PreviewScrollProvider>
      </div>
    );
  };

  // AI 面板仅在编辑模式和分割模式下显示（预览模式没有 textarea）
  const showAIPanel = aiPanelVisible && viewMode !== 'preview';

  const aiPanel = showAIPanel && (
    <AIAssistantPanel
      visible
      onClose={() => setAIPanelVisible(false)}
      content={currentFile.content}
      selectedText={getSelectedText()}
      fileType={currentFile.type}
      onInsert={handleInsert}
      onReplace={handleReplace}
    />
  );

  if (viewMode === 'edit') {
    return (
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 overflow-hidden">{renderEditor()}</div>
        {aiPanel}
      </div>
    );
  }

  if (viewMode === 'preview') {
    return <div className="flex-1 min-h-0 overflow-hidden">{renderPreview()}</div>;
  }

  // split mode
  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      <div className="flex-1 min-h-0 flex overflow-hidden">
        <div className="w-1/2 min-h-0 border-r border-[var(--color-border)] overflow-hidden">
          {renderEditor()}
        </div>
        <div className="w-1/2 min-h-0 overflow-hidden">
          {renderPreview()}
        </div>
      </div>
      {aiPanel}
    </div>
  );
}
