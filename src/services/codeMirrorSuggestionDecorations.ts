import type { Extension, Range } from "@codemirror/state";
import { Decoration, EditorView } from "@codemirror/view";
import {
  buildRenderableSuggestionPatchModel,
  resolveStreamingFrontierPosition,
  resolveStreamingProgressLineStarts,
  resolveStreamingProgressRange,
  type SuggestionPatchHunk,
} from "./aiSuggestionInlineDiff";
import {
  AddedTextWidget,
  StreamingFrontierWidget,
  UnifiedDiffBlockWidget,
} from "./codeMirrorSuggestionWidgets";
import type { PendingAISuggestion } from "./aiSuggestionTypes";
import { createSuggestionGutter } from "./codeMirrorSuggestionGutter";
import { createSuggestionMiniMap } from "./codeMirrorSuggestionMiniMap";

function markRemovedRange(
  ranges: Range<Decoration>[],
  from: number,
  to: number,
  className: string
) {
  if (from === to) {
    return;
  }

  ranges.push(Decoration.mark({ class: className }).range(from, to));
}

function markStreamingProgressRange(
  ranges: Range<Decoration>[],
  from: number,
  to: number
) {
  if (from === to) {
    return;
  }

  ranges.push(
    Decoration.mark({ class: "cm-ai-streaming-progress" }).range(from, to)
  );
}

function markStreamingProgressLines(
  ranges: Range<Decoration>[],
  lineStarts: readonly number[]
) {
  lineStarts.forEach((lineStart) => {
    ranges.push(
      Decoration.line({ class: "cm-ai-streaming-progress-line" }).range(lineStart)
    );
  });
}

function pushAddedInlineWidget(
  ranges: Range<Decoration>[],
  position: number,
  text: string
) {
  if (!text) {
    return;
  }

  ranges.push(
    Decoration.widget({
      widget: new AddedTextWidget(text),
      side: 1,
    }).range(position)
  );
}

function pushStreamingFrontierWidget(
  ranges: Range<Decoration>[],
  position: number
) {
  ranges.push(
    Decoration.widget({
      widget: new StreamingFrontierWidget(),
      side: 1,
    }).range(position)
  );
}

function collectLineStartsInHunk(
  sourceContent: string,
  hunk: SuggestionPatchHunk
): number[] {
  if (hunk.sourceLength === 0) {
    return [];
  }

  const from = Math.max(0, Math.min(hunk.sourceAnchor, sourceContent.length));
  const to = Math.max(
    from,
    Math.min(hunk.sourceAnchor + hunk.sourceLength, sourceContent.length)
  );

  const starts: number[] = [];
  let lineStart = from;
  while (lineStart > 0 && sourceContent[lineStart - 1] !== "\n") {
    lineStart -= 1;
  }
  starts.push(lineStart);

  let cursor = lineStart;
  while (cursor < to) {
    const nextBreak = sourceContent.indexOf("\n", cursor);
    if (nextBreak === -1 || nextBreak >= to) {
      break;
    }
    cursor = nextBreak + 1;
    if (cursor >= to || cursor >= sourceContent.length) {
      break;
    }
    starts.push(cursor);
  }

  return starts;
}

function markChangedSourceLines(
  ranges: Range<Decoration>[],
  suggestion: PendingAISuggestion,
  hunks: readonly SuggestionPatchHunk[]
) {
  const lineStarts = new Set<number>();

  hunks.forEach((hunk) => {
    if (hunk.layout !== "inline") {
      return;
    }
    collectLineStartsInHunk(suggestion.sourceContent, hunk).forEach((start) => {
      lineStarts.add(start);
    });
  });

  Array.from(lineStarts)
    .sort((a, b) => a - b)
    .forEach((start) => {
      ranges.push(
        Decoration.line({ class: "cm-ai-diff-line-changed" }).range(start)
      );
    });
}

function decorateInlineHunk(
  ranges: Range<Decoration>[],
  hunk: SuggestionPatchHunk
) {
  let cursor = hunk.sourceAnchor;

  hunk.segments.forEach((segment) => {
    if (segment.kind === "equal") {
      cursor += segment.text.length;
      return;
    }

    if (segment.kind === "remove") {
      markRemovedRange(
        ranges,
        cursor,
        cursor + segment.text.length,
        "cm-ai-removed-range"
      );
      cursor += segment.text.length;
      return;
    }

    pushAddedInlineWidget(ranges, cursor, segment.text);
  });
}

function decorateBlockHunk(
  ranges: Range<Decoration>[],
  hunk: SuggestionPatchHunk
) {
  const removedTexts = hunk.removedLines.map((line) => line.text);
  const addedTexts = [...hunk.addedLines];
  const from = hunk.sourceAnchor;
  const to = hunk.sourceAnchor + hunk.sourceLength;

  if (from === to) {
    ranges.push(
      Decoration.widget({
        widget: new UnifiedDiffBlockWidget([], addedTexts),
        side: 1,
        block: true,
      }).range(from)
    );
    return;
  }

  ranges.push(
    Decoration.replace({
      widget: new UnifiedDiffBlockWidget(removedTexts, addedTexts),
      block: true,
    }).range(from, to)
  );
}

function decorateHunk(ranges: Range<Decoration>[], hunk: SuggestionPatchHunk) {
  if (hunk.layout === "inline") {
    decorateInlineHunk(ranges, hunk);
    return;
  }

  decorateBlockHunk(ranges, hunk);
}

export function createSuggestionDecorations(
  suggestion: PendingAISuggestion | null,
  isGenerating = false
): Extension {
  if (!suggestion) {
    return [];
  }

  const ranges: Range<Decoration>[] = [];
  const patchModel = buildRenderableSuggestionPatchModel(suggestion, isGenerating);
  markChangedSourceLines(ranges, suggestion, patchModel.hunks);
  patchModel.hunks.forEach((hunk) => {
    decorateHunk(ranges, hunk);
  });
  const frontierPosition = resolveStreamingFrontierPosition(
    suggestion,
    patchModel,
    isGenerating
  );
  const progressRange = resolveStreamingProgressRange(
    suggestion,
    patchModel,
    isGenerating
  );
  const progressLineStarts = resolveStreamingProgressLineStarts(
    suggestion,
    patchModel,
    isGenerating
  );
  if (progressRange) {
    markStreamingProgressRange(ranges, progressRange.from, progressRange.to);
  }
  if (progressLineStarts.length > 0) {
    markStreamingProgressLines(ranges, progressLineStarts);
  }
  if (frontierPosition !== null) {
    pushStreamingFrontierWidget(ranges, frontierPosition);
  }

  return [
    EditorView.decorations.of(Decoration.set(ranges, true)),
    createSuggestionGutter(suggestion, patchModel),
    createSuggestionMiniMap(suggestion, patchModel),
  ];
}
