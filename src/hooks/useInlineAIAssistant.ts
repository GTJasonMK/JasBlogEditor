import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { useSettingsStore } from "@/store";
import type { EditorFile } from "@/types";
import {
  buildPresetPrompt,
  resolveAIApplyTarget,
  type AIPresetAction,
} from "@/services/aiComposer";
import type { AIAction } from "@/services/aiWritingAssistantTypes";
import { streamValidatedSuggestion } from "@/services/aiSuggestionSession";
import type { PendingAISuggestion } from "@/services/aiSuggestionTypes";
import {
  resolveSuggestionCompletion,
  resolveSuggestionFailure,
  createSuggestionRequestManager,
  resolveSuggestionAcceptance,
} from "@/services/aiSuggestionWorkflow";
import type { EditorSurfaceHandle, EditorSelectionSnapshot } from "@/services/editorSurface";
import { EMPTY_SELECTION } from "@/services/editorSurface";
interface UseInlineAIAssistantOptions {
  currentFile: EditorFile | null;
  updateContent: (content: string) => void;
  composerVisible: boolean;
  closeComposer: () => void;
  isPreviewMode: boolean;
  editorRef: RefObject<EditorSurfaceHandle | null>;
}

interface InlineAIAssistantResult {
  prompt: string;
  pendingSuggestion: PendingAISuggestion | null;
  isGenerating: boolean;
  error: string | null;
  applyIssue: string | null;
  reasoning: string;
  showReasoning: boolean;
  setPrompt: (value: string) => void;
  handlePresetSelect: (action: AIPresetAction) => void;
  handleSubmit: () => Promise<void>;
  handleCancel: () => void;
  handleCloseComposer: () => void;
  handleAcceptSuggestion: () => void;
  handleRejectSuggestion: () => void;
  toggleReasoning: () => void;
}

function readSelectionSnapshot(
  editor: EditorSurfaceHandle | null,
  fallback: PendingAISuggestion | null
): EditorSelectionSnapshot {
  if (editor) {
    return editor.getSelectionSnapshot();
  }

  if (fallback) {
    return {
      start: fallback.selectionStart,
      end: fallback.selectionEnd,
      text: fallback.selectedText,
    };
  }

  return EMPTY_SELECTION;
}

export function useInlineAIAssistant(
  options: UseInlineAIAssistantOptions
): InlineAIAssistantResult {
  const {
    currentFile,
    updateContent,
    composerVisible,
    closeComposer,
    isPreviewMode,
    editorRef,
  } = options;
  const { settings } = useSettingsStore();

  const [prompt, setPrompt] = useState("");
  const [pendingSuggestion, setPendingSuggestion] = useState<PendingAISuggestion | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applyIssue, setApplyIssue] = useState<string | null>(null);
  const [reasoning, setReasoning] = useState("");
  const [showReasoning, setShowReasoning] = useState(false);
  const [activeAction, setActiveAction] = useState<AIAction>("custom");

  const requestManagerRef = useRef(createSuggestionRequestManager());

  const getSelectionSnapshot = useCallback(
    () => readSelectionSnapshot(editorRef.current, pendingSuggestion),
    [editorRef, pendingSuggestion]
  );

  const focusEditorRange = useCallback(
    (start: number, end: number) => {
      requestAnimationFrame(() => {
        editorRef.current?.focusRange(start, end);
      });
    },
    [editorRef]
  );

  const clearSuggestionWorkflow = useCallback(() => {
    requestManagerRef.current.cancel();
    setPendingSuggestion(null);
    setIsGenerating(false);
    setError(null);
    setApplyIssue(null);
    setReasoning("");
    setShowReasoning(false);
  }, []);

  useEffect(() => {
    requestManagerRef.current.cancel();
    setPrompt("");
    setPendingSuggestion(null);
    setIsGenerating(false);
    setError(null);
    setApplyIssue(null);
    setReasoning("");
    setShowReasoning(false);
    setActiveAction("custom");
  }, [currentFile?.path]);

  useEffect(() => {
    if (!isPreviewMode && composerVisible) {
      return;
    }

    clearSuggestionWorkflow();
  }, [clearSuggestionWorkflow, composerVisible, isPreviewMode]);

  const handlePromptChange = useCallback((value: string) => {
    setPrompt(value);
    setActiveAction("custom");
  }, []);

  const handlePresetSelect = useCallback(
    (action: AIPresetAction) => {
      const snapshot = getSelectionSnapshot();
      setPrompt(buildPresetPrompt(action, Boolean(snapshot.text.trim())));
      setActiveAction(action);
      setError(null);
      setApplyIssue(null);
    },
    [getSelectionSnapshot]
  );

  const handleCancel = useCallback(() => {
    clearSuggestionWorkflow();
  }, [clearSuggestionWorkflow]);

  const handleCloseComposer = useCallback(() => {
    clearSuggestionWorkflow();
    closeComposer();
  }, [clearSuggestionWorkflow, closeComposer]);

  const handleSubmit = useCallback(async () => {
    if (!currentFile) {
      return;
    }

    if (!settings.llm?.apiKey) {
      setError("请先在设置中配置 API Key");
      return;
    }

    if (!prompt.trim()) {
      setError("请输入指令");
      return;
    }

    if (pendingSuggestion && !isGenerating) {
      setError("当前正文里有一条待接受修改，请先接受或拒绝。");
      return;
    }

    const snapshot = getSelectionSnapshot();
    const targetResult = resolveAIApplyTarget(
      snapshot.start,
      snapshot.end,
      prompt,
      currentFile.content.length
    );

    setError(null);
    setApplyIssue(null);
    setReasoning("");
    setShowReasoning(false);
    setIsGenerating(true);
    setPendingSuggestion(null);
    const request = requestManagerRef.current.start();

    const sourceContent = currentFile.content;
    const selectedText = sourceContent.slice(targetResult.selectionStart, targetResult.selectionEnd);
    let lastSuggestion: PendingAISuggestion | null = null;

    try {
      const result = await streamValidatedSuggestion({
        file: currentFile,
        action: activeAction,
        prompt,
        promptSelectionText: snapshot.text,
        sourceContent,
        selectedText,
        selectionStart: targetResult.selectionStart,
        selectionEnd: targetResult.selectionEnd,
        mode: targetResult.mode,
        clientConfig: {
          apiKey: settings.llm.apiKey,
          baseUrl: settings.llm.baseUrl,
          model: settings.llm.model,
        },
        polishConcurrency: settings.llm.polishConcurrency,
        signal: request.signal,
        isCancelled: () =>
          request.signal.aborted || !requestManagerRef.current.isCurrent(request.id),
        onReasoning: (chunk) => {
          if (!requestManagerRef.current.isCurrent(request.id)) {
            return;
          }
          setReasoning((previous) => previous + chunk);
        },
        onSuggestion: (suggestion) => {
          if (!requestManagerRef.current.isCurrent(request.id)) {
            return;
          }
          lastSuggestion = suggestion;
          setPendingSuggestion(suggestion);
        },
      });

      if (!requestManagerRef.current.isCurrent(request.id)) {
        return;
      }

      const completion = resolveSuggestionCompletion({
        result,
        previousSuggestion: lastSuggestion,
      });
      setPendingSuggestion(completion.pendingSuggestion);
      setApplyIssue(completion.applyIssue);
    } catch (issue) {
      if (requestManagerRef.current.isCurrent(request.id)) {
        const failure = resolveSuggestionFailure({
          issue,
          previousSuggestion: lastSuggestion,
        });
        setPendingSuggestion(failure.pendingSuggestion);
        setError(failure.error);
        setApplyIssue(failure.applyIssue);
      }
    } finally {
      if (requestManagerRef.current.isCurrent(request.id)) {
        requestManagerRef.current.complete(request.id);
        setIsGenerating(false);
      }
    }
  }, [
    activeAction,
    currentFile,
    getSelectionSnapshot,
    isGenerating,
    pendingSuggestion,
    prompt,
    settings.llm,
  ]);

  const handleAcceptSuggestion = useCallback(() => {
    if (!currentFile || !pendingSuggestion) {
      return;
    }

    const acceptance = resolveSuggestionAcceptance(
      currentFile.content,
      pendingSuggestion,
      applyIssue
    );
    if (!acceptance.ok) {
      if (!acceptance.preserveSuggestion) {
        setPendingSuggestion(null);
      }
      setApplyIssue(acceptance.message);
      return;
    }

    updateContent(acceptance.nextContent);
    setPendingSuggestion(null);
    setApplyIssue(null);
    focusEditorRange(acceptance.nextCursor, acceptance.nextCursor);
  }, [applyIssue, currentFile, focusEditorRange, pendingSuggestion, updateContent]);

  const handleRejectSuggestion = useCallback(() => {
    if (!pendingSuggestion) {
      return;
    }

    focusEditorRange(pendingSuggestion.selectionStart, pendingSuggestion.selectionEnd);
    setPendingSuggestion(null);
    setApplyIssue(null);
  }, [focusEditorRange, pendingSuggestion]);

  return {
    prompt,
    pendingSuggestion,
    isGenerating,
    error,
    applyIssue,
    reasoning,
    showReasoning,
    setPrompt: handlePromptChange,
    handlePresetSelect,
    handleSubmit,
    handleCancel,
    handleCloseComposer,
    handleAcceptSuggestion,
    handleRejectSuggestion,
    toggleReasoning: () => setShowReasoning((value) => !value),
  };
}
