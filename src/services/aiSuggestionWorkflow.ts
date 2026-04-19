import type { PendingAISuggestion } from "./aiSuggestionTypes";
import { shouldDiscardSuggestionOnCompletionFailure } from "./aiSuggestionNoop";

export interface SuggestionEditorViewState {
  readOnly: boolean;
  suggestion: PendingAISuggestion | null;
}

interface ResolveSuggestionEditorViewStateOptions {
  isGenerating: boolean;
  pendingSuggestion: PendingAISuggestion | null;
  deferredSuggestion: PendingAISuggestion | null;
}

export type SuggestionAcceptanceResult =
  | { ok: true; nextContent: string; nextCursor: number }
  | { ok: false; message: string; preserveSuggestion: boolean };

type SuggestionCompletionResult =
  | { ok: true; suggestion: PendingAISuggestion }
  | { ok: false; message: string; discardSuggestion?: boolean };

interface SuggestionFailureResolution {
  pendingSuggestion: PendingAISuggestion | null;
  error: string | null;
  applyIssue: string | null;
}

export interface SuggestionRequest {
  id: number;
  signal: AbortSignal;
}

export interface SuggestionRequestManager {
  start: () => SuggestionRequest;
  cancel: () => void;
  complete: (requestId: number) => void;
  isCurrent: (requestId: number) => boolean;
}

const CONTENT_DRIFT_MESSAGE =
  "正文在 AI 生成后已经发生变化，当前候选稿基于旧版本生成，已阻止直接接受。请重新发起一次 AI 操作。";

export function resolveSuggestionEditorViewState(
  options: ResolveSuggestionEditorViewStateOptions
): SuggestionEditorViewState {
  const readOnly = options.isGenerating || Boolean(options.pendingSuggestion);
  const suggestion = options.isGenerating
    ? options.deferredSuggestion
    : options.pendingSuggestion;

  return { readOnly, suggestion };
}

export function resolveSuggestionCompletion(options: {
  result: SuggestionCompletionResult;
  previousSuggestion: PendingAISuggestion | null;
}): {
  pendingSuggestion: PendingAISuggestion | null;
  applyIssue: string | null;
} {
  if (options.result.ok) {
    return {
      pendingSuggestion: options.result.suggestion,
      applyIssue: null,
    };
  }

  if (
    options.result.message &&
    shouldDiscardSuggestionOnCompletionFailure(
      options.result.discardSuggestion,
      options.result.message
    )
  ) {
    return {
      pendingSuggestion: null,
      applyIssue: options.result.message,
    };
  }

  return {
    pendingSuggestion: options.result.message ? options.previousSuggestion : null,
    applyIssue: options.result.message || null,
  };
}

export function resolveSuggestionFailure(options: {
  issue: unknown;
  previousSuggestion: PendingAISuggestion | null;
}): SuggestionFailureResolution {
  const message = options.issue instanceof Error
    ? options.issue.message
    : String(options.issue);

  if (!options.previousSuggestion) {
    return {
      pendingSuggestion: null,
      error: message,
      applyIssue: null,
    };
  }

  return {
    pendingSuggestion: options.previousSuggestion,
    error: null,
    applyIssue: `${message}\n当前候选稿只包含中断前已收到的部分内容，不能直接接受。`,
  };
}

export function resolveSuggestionAcceptance(
  currentContent: string,
  pendingSuggestion: PendingAISuggestion | null,
  applyIssue: string | null
): SuggestionAcceptanceResult {
  if (!pendingSuggestion) {
    return {
      ok: false,
      message: "当前没有可接受的 AI 修改。",
      preserveSuggestion: false,
    };
  }

  if (applyIssue) {
    return {
      ok: false,
      message: applyIssue,
      preserveSuggestion: true,
    };
  }

  if (currentContent !== pendingSuggestion.sourceContent) {
    return {
      ok: false,
      message: CONTENT_DRIFT_MESSAGE,
      preserveSuggestion: false,
    };
  }

  return {
    ok: true,
    nextContent: pendingSuggestion.nextContent,
    nextCursor:
      pendingSuggestion.selectionStart + pendingSuggestion.generatedText.length,
  };
}

export function createSuggestionRequestManager(): SuggestionRequestManager {
  let nextRequestId = 1;
  let activeRequest: { id: number; controller: AbortController } | null = null;

  return {
    start: () => {
      activeRequest?.controller.abort();
      activeRequest = {
        id: nextRequestId,
        controller: new AbortController(),
      };
      nextRequestId += 1;
      return {
        id: activeRequest.id,
        signal: activeRequest.controller.signal,
      };
    },
    cancel: () => {
      activeRequest?.controller.abort();
      activeRequest = null;
    },
    complete: (requestId) => {
      if (activeRequest?.id === requestId) {
        activeRequest = null;
      }
    },
    isCurrent: (requestId) =>
      activeRequest?.id === requestId && !activeRequest.controller.signal.aborted,
  };
}
