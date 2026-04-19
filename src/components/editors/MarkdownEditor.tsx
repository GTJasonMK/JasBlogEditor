import { lazy, Suspense, useDeferredValue, useRef, useState } from "react";
import { useEditorStore } from "@/store";
import { useInlineAIAssistant } from "@/hooks/useInlineAIAssistant";
import type { EditorSurfaceHandle } from "@/services/editorSurface";
import { resolveSuggestionEditorViewState } from "@/services/aiSuggestionWorkflow";
import { ContentPreview } from "../preview/ContentPreview";
import { PreviewScrollProvider } from "@/components/preview/PreviewScrollContext";
import { AISuggestionFloatingActions } from "./AISuggestionFloatingActions";
import { AIAssistantComposer } from "./AIAssistantComposer";
import { MarkdownCodeEditor } from "./MarkdownCodeEditor";

const LazyJasBlogListPreview = lazy(() =>
  import("@/components/preview/JasBlogListPreview").then((module) => ({
    default: module.JasBlogListPreview,
  }))
);

export function MarkdownEditor() {
  const {
    currentFile,
    updateContent,
    viewMode,
    previewMode,
    aiPanelVisible,
    setAIPanelVisible,
  } = useEditorStore();
  const [previewContainer, setPreviewContainer] = useState<HTMLDivElement | null>(null);
  const editorRef = useRef<EditorSurfaceHandle | null>(null);

  const aiAssistant = useInlineAIAssistant({
    currentFile,
    updateContent,
    composerVisible: aiPanelVisible,
    closeComposer: () => setAIPanelVisible(false),
    isPreviewMode: viewMode === "preview",
    editorRef,
  });
  const deferredSuggestion = useDeferredValue(aiAssistant.pendingSuggestion);
  const suggestionViewState = resolveSuggestionEditorViewState({
    isGenerating: aiAssistant.isGenerating,
    pendingSuggestion: aiAssistant.pendingSuggestion,
    deferredSuggestion,
  });

  if (!currentFile) {
    return null;
  }

  const editorContent = currentFile.content;
  const bodyContent = aiAssistant.pendingSuggestion
    ? aiAssistant.pendingSuggestion.nextContent
    : currentFile.content;
  const showListPreview = previewMode === "list" && currentFile.type !== "doc";
  const showAIComposer = aiPanelVisible && viewMode !== "preview";

  const renderEditor = () =>
    <div className="relative flex h-full min-h-0 flex-col">
      {aiAssistant.pendingSuggestion && (
        <AISuggestionFloatingActions
          isGenerating={aiAssistant.isGenerating}
          canAccept={!aiAssistant.applyIssue}
          onAccept={aiAssistant.handleAcceptSuggestion}
          onReject={aiAssistant.handleRejectSuggestion}
          onCancel={aiAssistant.handleCancel}
        />
      )}

      <MarkdownCodeEditor
        ref={editorRef}
        value={editorContent}
        readOnly={suggestionViewState.readOnly}
        isGenerating={aiAssistant.isGenerating}
        suggestion={suggestionViewState.suggestion}
        onChange={updateContent}
      />
    </div>;

  const renderPreview = () => (
    <div ref={setPreviewContainer} className="w-full h-full overflow-auto bg-[var(--color-paper)]">
      <PreviewScrollProvider container={previewContainer}>
        {showListPreview ? (
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-20 text-[var(--color-text-muted)]">
                加载预览中...
              </div>
            }
          >
            <LazyJasBlogListPreview
              activeFile={currentFile}
              activeBodyContent={bodyContent}
            />
          </Suspense>
        ) : (
          <ContentPreview file={currentFile} bodyContent={bodyContent} />
        )}
      </PreviewScrollProvider>
    </div>
  );

  const composer = (
    <AIAssistantComposer
      visible={showAIComposer}
      prompt={aiAssistant.prompt}
      isGenerating={aiAssistant.isGenerating}
      hasPendingSuggestion={Boolean(aiAssistant.pendingSuggestion)}
      error={aiAssistant.error}
      applyIssue={aiAssistant.applyIssue}
      reasoning={aiAssistant.reasoning}
      showReasoning={aiAssistant.showReasoning}
      onClose={aiAssistant.handleCloseComposer}
      onPromptChange={aiAssistant.setPrompt}
      onPresetSelect={aiAssistant.handlePresetSelect}
      onSubmit={() => void aiAssistant.handleSubmit()}
      onCancel={aiAssistant.handleCancel}
      onToggleReasoning={aiAssistant.toggleReasoning}
    />
  );

  if (viewMode === "edit") {
    return (
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 overflow-hidden">{renderEditor()}</div>
        {composer}
      </div>
    );
  }

  if (viewMode === "preview") {
    return <div className="flex-1 min-h-0 overflow-hidden">{renderPreview()}</div>;
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      <div className="flex-1 min-h-0 flex overflow-hidden">
        <div className="w-1/2 min-h-0 border-r border-[var(--color-border)] overflow-hidden">
          {renderEditor()}
        </div>
        <div className="w-1/2 min-h-0 overflow-hidden">{renderPreview()}</div>
      </div>
      {composer}
    </div>
  );
}
