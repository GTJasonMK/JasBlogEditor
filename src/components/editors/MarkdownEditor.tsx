import { useState, useEffect, useRef, useCallback } from 'react';
import { useEditorStore } from '@/store';
import { ContentPreview } from '../preview';
import { PreviewScrollProvider } from '@/components/preview/PreviewScrollContext';
import { JasBlogListPreview } from '@/components/preview/JasBlogListPreview';

// 防抖延迟时间（毫秒）
const DEBOUNCE_DELAY = 300;

export function MarkdownEditor() {
  const { currentFile, updateContent, viewMode, previewMode } = useEditorStore();

  // 本地内容状态，用于即时响应输入
  const [localContent, setLocalContent] = useState('');
  const [previewContainer, setPreviewContainer] = useState<HTMLDivElement | null>(null);

  // 防抖定时器
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 同步本地状态与 store
  useEffect(() => {
    if (currentFile) {
      setLocalContent(currentFile.content);
    }
  }, [currentFile?.path]); // 仅在文件切换时同步

  // 处理内容变化（带防抖）
  const handleContentChange = useCallback((value: string) => {
    // 立即更新本地状态
    setLocalContent(value);

    // 清除之前的定时器
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // 设置新的防抖定时器
    debounceTimerRef.current = setTimeout(() => {
      updateContent(value);
    }, DEBOUNCE_DELAY);
  }, [updateContent]);

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  if (!currentFile) return null;

  // 预览内容：store 中已将 frontmatter 与正文分离，此处直接使用正文
  const bodyContent = localContent;

  const renderEditor = () => (
    <textarea
      value={localContent}
      onChange={(e) => handleContentChange(e.target.value)}
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
            ? <JasBlogListPreview activeFile={currentFile} activeBodyContent={bodyContent} />
            : <ContentPreview file={currentFile} bodyContent={bodyContent} />
          }
        </PreviewScrollProvider>
      </div>
    );
  };

  if (viewMode === 'edit') {
    return <div className="flex-1 min-h-0 overflow-hidden">{renderEditor()}</div>;
  }

  if (viewMode === 'preview') {
    return <div className="flex-1 min-h-0 overflow-hidden">{renderPreview()}</div>;
  }

  // split mode
  return (
    <div className="flex-1 min-h-0 flex overflow-hidden">
      <div className="w-1/2 min-h-0 border-r border-[var(--color-border)] overflow-hidden">
        {renderEditor()}
      </div>
      <div className="w-1/2 min-h-0 overflow-hidden">
        {renderPreview()}
      </div>
    </div>
  );
}
