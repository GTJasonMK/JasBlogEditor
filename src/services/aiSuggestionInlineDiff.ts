import type { PendingAISuggestion } from "./aiSuggestionTypes";
import {
  buildRemovedVisualLine,
  buildSuggestionTokenSegments,
  splitLinesWithBreaks,
  type SuggestionPatchSegment,
  type SuggestionRemovedVisualLine,
} from "./aiSuggestionDiffText";
import {
  buildSuggestionLineChangePlan,
  buildStreamingSuggestionLineChangePlan,
  type SuggestionLineChangePlan,
  type SuggestionPatchHunk,
} from "./aiSuggestionLineChangePlan";
import { splitRenderableStreamingLines } from "./aiSuggestionDiffText";

const INLINE_PATCH_MAX_LENGTH = 80;

export type { SuggestionPatchSegment, SuggestionRemovedVisualLine, SuggestionPatchHunk };
export { buildSuggestionLineChangePlan };

export interface SuggestionPatchModel {
  layout: "inline" | "block";
  hunks: SuggestionPatchHunk[];
}

export interface SuggestionRange {
  from: number;
  to: number;
}

function isBlockSuggestion(suggestion: PendingAISuggestion): boolean {
  return (
    suggestion.selectedText.includes("\n") ||
    suggestion.generatedText.includes("\n") ||
    suggestion.selectedText.length > INLINE_PATCH_MAX_LENGTH ||
    suggestion.generatedText.length > INLINE_PATCH_MAX_LENGTH
  );
}

function buildInlineHunk(suggestion: PendingAISuggestion): SuggestionPatchHunk {
  const segments = buildSuggestionTokenSegments(
    suggestion.selectedText,
    suggestion.generatedText
  );

  return {
    sourceAnchor: suggestion.selectionStart,
    sourceLength: suggestion.selectedText.length,
    layout: "inline",
    segments,
    removedLines: suggestion.selectedText
      ? [buildRemovedVisualLine(suggestion.selectedText, segments)]
      : [],
    addedLines: suggestion.generatedText ? [suggestion.generatedText] : [],
  };
}

function buildBlockPatchModel(
  suggestion: PendingAISuggestion
): SuggestionPatchModel {
  const plan: SuggestionLineChangePlan = buildSuggestionLineChangePlan(suggestion);
  return {
    layout: "block",
    hunks: plan.hunks,
  };
}

function buildStreamingBlockPatchModel(
  suggestion: PendingAISuggestion
): SuggestionPatchModel {
  const plan: SuggestionLineChangePlan = buildStreamingSuggestionLineChangePlan(
    suggestion
  );
  return {
    layout: "block",
    hunks: plan.hunks,
  };
}

function buildStreamingRenderableSuggestion(
  suggestion: PendingAISuggestion,
  isGenerating: boolean
): PendingAISuggestion {
  if (!isGenerating || suggestion.mode !== "replace" || !isBlockSuggestion(suggestion)) {
    return suggestion;
  }

  const sourceLines = buildSourceLinePrefix(
    splitLinesWithBreaks(suggestion.selectedText),
    splitRenderableStreamingLines(suggestion.generatedText).length
  );

  return {
    ...suggestion,
    selectedText: sourceLines,
    selectionEnd: suggestion.selectionStart + sourceLines.length,
  };
}

function buildSourceLinePrefix(
  sourceLines: readonly string[],
  targetLineCount: number
): string {
  return sourceLines.slice(0, Math.min(targetLineCount, sourceLines.length)).join("");
}

function buildInlineSourceText(segments: readonly SuggestionPatchSegment[]): string {
  return segments
    .filter((segment) => segment.kind !== "add")
    .map((segment) => segment.text)
    .join("");
}

function buildInlineNextText(segments: readonly SuggestionPatchSegment[]): string {
  return segments
    .filter((segment) => segment.kind !== "remove")
    .map((segment) => segment.text)
    .join("");
}

function trimTrailingInlineRemovals(
  hunk: SuggestionPatchHunk
): SuggestionPatchHunk | null {
  let end = hunk.segments.length;
  while (end > 0 && hunk.segments[end - 1].kind === "remove") {
    end -= 1;
  }

  if (end === hunk.segments.length) {
    return hunk;
  }

  const segments = hunk.segments.slice(0, end);
  if (!segments.some((segment) => segment.kind !== "equal")) {
    return null;
  }

  const sourceText = buildInlineSourceText(segments);
  const nextText = buildInlineNextText(segments);

  return {
    ...hunk,
    sourceLength: sourceText.length,
    segments,
    removedLines: sourceText ? [buildRemovedVisualLine(sourceText, segments)] : [],
    addedLines: nextText ? [nextText] : [],
  };
}

function dropStreamingTailRemovals(
  model: SuggestionPatchModel,
  isGenerating: boolean
): SuggestionPatchModel {
  if (!isGenerating) {
    return model;
  }

  const hunks = [...model.hunks];
  while (hunks.length > 0) {
    const lastHunk = hunks[hunks.length - 1];
    if (lastHunk.layout === "block") {
      if (lastHunk.addedLines.length > 0) {
        break;
      }
      hunks.pop();
      continue;
    }

    const trimmed = trimTrailingInlineRemovals(lastHunk);
    if (trimmed === lastHunk) {
      break;
    }
    hunks.pop();
    if (trimmed) {
      hunks.push(trimmed);
    }
    break;
  }

  return {
    ...model,
    hunks,
  };
}

export function buildSuggestionPatchModel(
  suggestion: PendingAISuggestion
): SuggestionPatchModel {
  if (isBlockSuggestion(suggestion)) {
    return buildBlockPatchModel(suggestion);
  }

  return {
    layout: "inline",
    hunks: [buildInlineHunk(suggestion)],
  };
}

export function buildRenderableSuggestionPatchModel(
  suggestion: PendingAISuggestion,
  isGenerating: boolean
): SuggestionPatchModel {
  const renderableSuggestion = buildStreamingRenderableSuggestion(
    suggestion,
    isGenerating
  );
  const patchModel = isGenerating &&
    suggestion.mode === "replace" &&
    isBlockSuggestion(suggestion)
    ? buildStreamingBlockPatchModel(renderableSuggestion)
    : buildSuggestionPatchModel(renderableSuggestion);

  return dropStreamingTailRemovals(
    patchModel,
    isGenerating
  );
}

export function resolveStreamingFrontierPosition(
  suggestion: PendingAISuggestion,
  patchModel: SuggestionPatchModel,
  isGenerating: boolean
): number | null {
  if (!isGenerating || suggestion.mode !== "replace" || suggestion.generatedText.length === 0) {
    return null;
  }

  if (patchModel.hunks.length > 0) {
    return null;
  }

  if (!suggestion.selectedText.startsWith(suggestion.generatedText)) {
    return null;
  }

  return suggestion.selectionStart + suggestion.generatedText.length;
}

export function resolveStreamingProgressRange(
  suggestion: PendingAISuggestion,
  patchModel: SuggestionPatchModel,
  isGenerating: boolean
): SuggestionRange | null {
  const frontierPosition = resolveStreamingFrontierPosition(
    suggestion,
    patchModel,
    isGenerating
  );
  if (frontierPosition === null || frontierPosition <= suggestion.selectionStart) {
    return null;
  }

  return {
    from: suggestion.selectionStart,
    to: frontierPosition,
  };
}

export function resolveStreamingProgressLineStarts(
  suggestion: PendingAISuggestion,
  patchModel: SuggestionPatchModel,
  isGenerating: boolean
): number[] {
  const range = resolveStreamingProgressRange(suggestion, patchModel, isGenerating);
  if (!range) {
    return [];
  }

  const starts: number[] = [];
  let lineStart = suggestion.selectionStart;

  for (let index = suggestion.selectionStart; index < range.to; index += 1) {
    if (index === lineStart) {
      starts.push(lineStart);
    }

    if (suggestion.sourceContent[index - suggestion.selectionStart] === "\n") {
      lineStart = index + 1;
    }
  }

  return starts;
}
