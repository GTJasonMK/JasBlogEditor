import { useState } from 'react';
import { useEditorStore } from '@/store';
import { ContentPreview } from '../preview';
import { PreviewScrollProvider } from '@/components/preview/PreviewScrollContext';
import { JasBlogListPreview } from '@/components/preview/JasBlogListPreview';

export function MarkdownEditor() {
  const { currentFile, updateContent, viewMode, previewMode } = useEditorStore();

  const [previewContainer, setPreviewContainer] = useState<HTMLDivElement | null>(null);

  if (!currentFile) return null;

  // 预览内容：store 中已将 frontmatter 与正文分离，此处直接使用正文
  const bodyContent = currentFile.content;

  const renderEditor = () => (
    <textarea
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
