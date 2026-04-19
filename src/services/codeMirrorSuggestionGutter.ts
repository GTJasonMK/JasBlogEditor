/**
 * AI diff 左侧行标记（gutter）
 *
 * 在编辑器左侧显示一条窄色条，每一个有修改的源文行都会亮起。
 * 用户扫视左侧即可定位全文所有修改点，无需滚到具体位置。
 */

import type { Extension } from "@codemirror/state";
import { gutter, GutterMarker } from "@codemirror/view";
import type { SuggestionPatchModel } from "./aiSuggestionInlineDiff";
import type { SuggestionPatchHunk } from "./aiSuggestionLineChangePlan";
import type { PendingAISuggestion } from "./aiSuggestionTypes";

class ChangedLineMarker extends GutterMarker {
  toDOM(): HTMLElement {
    const element = document.createElement("div");
    element.className = "cm-ai-diff-gutter-marker";
    return element;
  }
}

class SpacerMarker extends GutterMarker {
  toDOM(): HTMLElement {
    const element = document.createElement("div");
    element.className = "cm-ai-diff-gutter-spacer";
    return element;
  }
}

const changedMarker = new ChangedLineMarker();
const spacerMarker = new SpacerMarker();

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
    if (cursor >= sourceContent.length) {
      break;
    }
    starts.push(cursor);
  }

  return starts;
}

function buildChangedLineStartSet(
  suggestion: PendingAISuggestion,
  patchModel: SuggestionPatchModel
): Set<number> {
  const result = new Set<number>();
  patchModel.hunks.forEach((hunk) => {
    collectLineStartsInHunk(suggestion.sourceContent, hunk).forEach((start) => {
      result.add(start);
    });
  });
  return result;
}

export function createSuggestionGutter(
  suggestion: PendingAISuggestion,
  patchModel: SuggestionPatchModel
): Extension {
  const changedLineStarts = buildChangedLineStartSet(suggestion, patchModel);

  if (changedLineStarts.size === 0) {
    return [];
  }

  return gutter({
    class: "cm-ai-diff-gutter",
    lineMarker(_view, line) {
      return changedLineStarts.has(line.from) ? changedMarker : null;
    },
    initialSpacer: () => spacerMarker,
  });
}
