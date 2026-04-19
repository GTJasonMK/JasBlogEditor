import type { AIApplyMode } from "./aiWritingAssistantTypes";

export type AIPresetAction = "continue" | "polish" | "summary" | "translate";

export interface ResolveAIApplyTargetResult {
  mode: AIApplyMode;
  selectionStart: number;
  selectionEnd: number;
}

const WHOLE_DOCUMENT_SCOPE_MARKERS = [
  "当前文档正文",
  "当前文档",
  "全文",
  "整篇",
  "整个文档",
  "整篇正文",
  "整篇内容",
] as const;

const WHOLE_DOCUMENT_REWRITE_MARKERS = [
  "润色",
  "改写",
  "重写",
  "翻译",
  "优化",
  "精简",
  "扩写",
  "压缩",
  "整理",
] as const;

const INSERTION_MARKERS = [
  "续写",
  "继续写",
  "接着写",
  "补充",
  "补一段",
  "添加",
  "插入",
  "追加",
  "扩展",
  "在这里",
  "当前位置",
] as const;

const PRESET_PROMPTS: Record<
  AIPresetAction,
  { document: string; selection: string }
> = {
  continue: {
    document: "请基于当前文档上下文继续写正文，保持现有语气、结构和格式契约，不要重复前文。",
    selection: "请基于当前选中文本继续往后写，延续现有语气、结构和格式契约，不要重复已写内容。",
  },
  polish: {
    document: "请润色当前文档正文，让表达更清晰、准确、自然，保留原意和 Markdown 结构。",
    selection: "请润色当前选中文本，让表达更清晰、准确、自然，保留原意和 Markdown 结构。",
  },
  summary: {
    document: "请为当前文档正文提炼一段结构清晰的摘要，保留关键信息，不要捏造内容。",
    selection: "请为当前选中文本提炼一段结构清晰的摘要，保留关键信息，不要捏造内容。",
  },
  translate: {
    document: "请翻译当前文档正文，保留标题层级、列表、链接、代码块和特殊 Markdown 语法。",
    selection: "请翻译当前选中文本，保留标题层级、列表、链接、代码块和特殊 Markdown 语法。",
  },
};

export function buildPresetPrompt(
  action: AIPresetAction,
  hasSelection: boolean
): string {
  return hasSelection
    ? PRESET_PROMPTS[action].selection
    : PRESET_PROMPTS[action].document;
}

function resolveSelectionRange(
  selectionStart: number,
  selectionEnd: number
): { start: number; end: number } {
  return {
    start: Math.min(selectionStart, selectionEnd),
    end: Math.max(selectionStart, selectionEnd),
  };
}

function shouldReplaceWholeDocument(prompt: string): boolean {
  const normalizedPrompt = prompt.trim();
  if (!normalizedPrompt) {
    return false;
  }

  const hasScopeMarker = WHOLE_DOCUMENT_SCOPE_MARKERS.some((marker) =>
    normalizedPrompt.includes(marker)
  );
  const hasRewriteMarker = WHOLE_DOCUMENT_REWRITE_MARKERS.some((marker) =>
    normalizedPrompt.includes(marker)
  );

  return hasScopeMarker && hasRewriteMarker;
}

function shouldInsertAtCursor(prompt: string): boolean {
  const normalizedPrompt = prompt.trim();
  if (!normalizedPrompt) {
    return true;
  }

  return INSERTION_MARKERS.some((marker) => normalizedPrompt.includes(marker));
}

export function resolveAIApplyTarget(
  selectionStart: number,
  selectionEnd: number,
  prompt = "",
  documentLength?: number
): ResolveAIApplyTargetResult {
  const { start, end } = resolveSelectionRange(selectionStart, selectionEnd);

  if (start !== end) {
    return {
      mode: "replace",
      selectionStart: start,
      selectionEnd: end,
    };
  }

  if (documentLength !== undefined && shouldReplaceWholeDocument(prompt)) {
    return {
      mode: "replace",
      selectionStart: 0,
      selectionEnd: documentLength,
    };
  }

  if (documentLength !== undefined && prompt.trim() && !shouldInsertAtCursor(prompt)) {
    return {
      mode: "replace",
      selectionStart: 0,
      selectionEnd: documentLength,
    };
  }

  return {
    mode: "insert",
    selectionStart: end,
    selectionEnd: end,
  };
}
