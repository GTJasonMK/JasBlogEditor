import type { PendingAISuggestion } from "./aiSuggestionTypes";
import { diffSequence } from "./sequenceDiff";
import {
  buildRemovedOnlyVisualLine,
  buildRemovedVisualLine,
  buildSuggestionTokenSegments,
  splitRenderableStreamingLines,
  splitLinesWithBreaks,
  stripTrailingLineBreak,
  type SuggestionPatchSegment,
  type SuggestionRemovedVisualLine,
} from "./aiSuggestionDiffText";
import {
  shouldPairLines,
  shouldRenderInlineReplacement,
} from "./aiSuggestionLineMatching";
import { matchFieldBodyMerge } from "./aiSuggestionStructuredMerge";

export interface SuggestionPatchHunk {
  sourceAnchor: number;
  sourceLength: number;
  layout: "inline" | "block";
  segments: SuggestionPatchSegment[];
  removedLines: SuggestionRemovedVisualLine[];
  addedLines: string[];
}

export interface SuggestionLineChangePlan {
  hunks: SuggestionPatchHunk[];
}

interface PairableLineMatch {
  addedIndex: number;
  removedIndex: number;
}

function sumRawLineLengths(lines: readonly string[]): number {
  return lines.reduce((total, line) => total + line.length, 0);
}

function normalizeAddedLines(lines: readonly string[]): string[] {
  return lines.map((line) => stripTrailingLineBreak(line));
}

function findNextPairableLineMatch(
  removedLines: readonly string[],
  addedLines: readonly string[],
  removedIndex: number,
  addedIndex: number
): PairableLineMatch | null {
  let bestMatch: PairableLineMatch | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let left = removedIndex; left < removedLines.length; left += 1) {
    for (let right = addedIndex; right < addedLines.length; right += 1) {
      if (left === removedIndex && right === addedIndex) {
        continue;
      }
      if (!shouldPairLines(removedLines[left], addedLines[right])) {
        continue;
      }

      const distance = left - removedIndex + right - addedIndex;
      if (distance < bestDistance) {
        bestDistance = distance;
        bestMatch = { removedIndex: left, addedIndex: right };
      }
    }
  }

  return bestMatch;
}

function pushPrefixBlockHunk(
  plan: SuggestionLineChangePlan,
  cursor: number,
  removedLines: readonly string[],
  addedLines: readonly string[],
  removedIndex: number,
  addedIndex: number,
  match: PairableLineMatch
): number {
  const removedPrefix = removedLines.slice(removedIndex, match.removedIndex);
  const addedPrefix = addedLines.slice(addedIndex, match.addedIndex);
  pushHunk(plan, buildBlockHunk(cursor, removedPrefix, addedPrefix));
  return cursor + sumRawLineLengths(removedPrefix);
}

function buildInlineReplacementHunk(
  sourceAnchor: number,
  previousLine: string,
  nextLine: string
): SuggestionPatchHunk {
  const previousText = stripTrailingLineBreak(previousLine);
  const nextText = stripTrailingLineBreak(nextLine);
  const segments = buildSuggestionTokenSegments(previousText, nextText);

  return {
    sourceAnchor,
    sourceLength: previousText.length,
    layout: "inline",
    segments,
    removedLines: [buildRemovedVisualLine(previousText, segments)],
    addedLines: nextText ? [nextText] : [],
  };
}

function hasVisibleReplacementChange(
  previousLine: string,
  nextLine: string
): boolean {
  return stripTrailingLineBreak(previousLine) !== stripTrailingLineBreak(nextLine);
}

function buildReplacementHunk(
  sourceAnchor: number,
  previousLine: string,
  nextLine: string
): SuggestionPatchHunk | null {
  if (!hasVisibleReplacementChange(previousLine, nextLine)) {
    return null;
  }

  return shouldRenderInlineReplacement(previousLine, nextLine)
    ? buildInlineReplacementHunk(sourceAnchor, previousLine, nextLine)
    : buildBlockHunk(sourceAnchor, [previousLine], [nextLine]);
}

function buildBlockHunk(
  sourceAnchor: number,
  removedLines: readonly string[],
  addedLines: readonly string[]
): SuggestionPatchHunk {
  const removedTexts = removedLines.map((line) => stripTrailingLineBreak(line));

  return {
    sourceAnchor,
    sourceLength: sumRawLineLengths(removedLines),
    layout: "block",
    segments: [],
    removedLines: removedTexts.map((line) => buildRemovedOnlyVisualLine(line)),
    addedLines: normalizeAddedLines(addedLines),
  };
}

function pushHunk(plan: SuggestionLineChangePlan, hunk: SuggestionPatchHunk) {
  const hasContent =
    hunk.sourceLength > 0 ||
    hunk.segments.length > 0 ||
    hunk.removedLines.length > 0 ||
    hunk.addedLines.length > 0;

  if (hasContent) {
    plan.hunks.push(hunk);
  }
}

function flushPositionalFallback(
  plan: SuggestionLineChangePlan,
  startPosition: number,
  removedLines: readonly string[],
  addedLines: readonly string[]
): number {
  const pairCount = Math.min(removedLines.length, addedLines.length);
  let cursor = startPosition;

  for (let index = 0; index < pairCount; index += 1) {
    const hunk = buildReplacementHunk(
      cursor,
      removedLines[index],
      addedLines[index]
    );
    if (hunk) {
      pushHunk(plan, hunk);
    }
    cursor += removedLines[index].length;
  }

  if (pairCount < removedLines.length || pairCount < addedLines.length) {
    const remainingRemoved = removedLines.slice(pairCount);
    const remainingAdded = addedLines.slice(pairCount);
    pushHunk(plan, buildBlockHunk(cursor, remainingRemoved, remainingAdded));
    cursor += sumRawLineLengths(remainingRemoved);
  }

  return cursor;
}

function flushPendingLines(
  plan: SuggestionLineChangePlan,
  startPosition: number,
  removedLines: readonly string[],
  addedLines: readonly string[]
): number {
  if (removedLines.length === 0 && addedLines.length === 0) {
    return startPosition;
  }

  if (removedLines.length === 0) {
    pushHunk(plan, buildBlockHunk(startPosition, [], addedLines));
    return startPosition;
  }

  if (addedLines.length === 0) {
    pushHunk(plan, buildBlockHunk(startPosition, removedLines, []));
    return startPosition + sumRawLineLengths(removedLines);
  }

  if (removedLines.length === 1 && addedLines.length === 1) {
    const hunk = buildReplacementHunk(startPosition, removedLines[0], addedLines[0]);
    if (hunk) {
      pushHunk(plan, hunk);
    }
    return startPosition + removedLines[0].length;
  }

  let cursor = startPosition;
  let removedIndex = 0;
  let addedIndex = 0;

  while (removedIndex < removedLines.length && addedIndex < addedLines.length) {
    const fieldBodyMerge = matchFieldBodyMerge(
      removedLines,
      addedLines,
      removedIndex,
      addedIndex
    );
    if (fieldBodyMerge) {
      const mergedRemoved = removedLines.slice(
        removedIndex,
        removedIndex + fieldBodyMerge.removedCount
      );
      const mergedAdded = removedIndex + fieldBodyMerge.removedCount >= removedLines.length
        ? addedLines.slice(addedIndex)
        : addedLines.slice(
          addedIndex,
          addedIndex + fieldBodyMerge.addedCount
        );
      pushHunk(plan, buildBlockHunk(cursor, mergedRemoved, mergedAdded));
      cursor += sumRawLineLengths(mergedRemoved);
      removedIndex += fieldBodyMerge.removedCount;
      addedIndex += mergedAdded.length;
      continue;
    }

    if (shouldPairLines(removedLines[removedIndex], addedLines[addedIndex])) {
      const hunk = buildReplacementHunk(
        cursor,
        removedLines[removedIndex],
        addedLines[addedIndex]
      );
      if (hunk) {
        pushHunk(plan, hunk);
      }
      cursor += removedLines[removedIndex].length;
      removedIndex += 1;
      addedIndex += 1;
      continue;
    }

    const match = findNextPairableLineMatch(
      removedLines,
      addedLines,
      removedIndex,
      addedIndex
    );
    if (!match) {
      const remainingRemoved = removedLines.slice(removedIndex);
      return flushPositionalFallback(
        plan,
        cursor,
        remainingRemoved,
        addedLines.slice(addedIndex)
      );
    }

    cursor = pushPrefixBlockHunk(
      plan,
      cursor,
      removedLines,
      addedLines,
      removedIndex,
      addedIndex,
      match
    );
    removedIndex = match.removedIndex;
    addedIndex = match.addedIndex;
  }

  if (removedIndex < removedLines.length || addedIndex < addedLines.length) {
    cursor = flushPositionalFallback(
      plan,
      cursor,
      removedLines.slice(removedIndex),
      addedLines.slice(addedIndex)
    );
  }

  return cursor;
}

export function buildSuggestionLineChangePlan(
  suggestion: PendingAISuggestion
): SuggestionLineChangePlan {
  const plan: SuggestionLineChangePlan = { hunks: [] };
  const operations = diffSequence(
    splitLinesWithBreaks(suggestion.selectedText),
    splitLinesWithBreaks(suggestion.generatedText),
    (left, right) => left === right
  );

  let cursor = suggestion.selectionStart;
  let pendingRemoved: string[] = [];
  let pendingAdded: string[] = [];

  operations.forEach((operation) => {
    if (operation.kind === "equal") {
      cursor = flushPendingLines(plan, cursor, pendingRemoved, pendingAdded);
      pendingRemoved = [];
      pendingAdded = [];
      cursor += operation.value.length;
      return;
    }

    if (operation.kind === "remove") {
      pendingRemoved.push(operation.value);
      return;
    }

    pendingAdded.push(operation.value);
  });

  flushPendingLines(plan, cursor, pendingRemoved, pendingAdded);
  return plan;
}

function buildStreamingReplacementHunk(
  sourceAnchor: number,
  previousLine: string,
  nextLine: string,
  openLine: boolean
): SuggestionPatchHunk | null {
  if (!hasVisibleReplacementChange(previousLine, nextLine)) {
    return null;
  }

  if (openLine) {
    return buildBlockHunk(sourceAnchor, [previousLine], [nextLine]);
  }

  return buildReplacementHunk(sourceAnchor, previousLine, nextLine);
}

export function buildStreamingSuggestionLineChangePlan(
  suggestion: PendingAISuggestion
): SuggestionLineChangePlan {
  const plan: SuggestionLineChangePlan = { hunks: [] };
  const sourceLines = splitLinesWithBreaks(suggestion.selectedText);
  const generatedLines = splitRenderableStreamingLines(suggestion.generatedText);
  const lastGeneratedIndex = generatedLines.length - 1;
  const hasOpenLine = !suggestion.generatedText.endsWith("\n") && lastGeneratedIndex >= 0;

  const operations = diffSequence(
    sourceLines,
    generatedLines,
    (left, right) => left === right
  );

  let cursor = suggestion.selectionStart;
  let pendingRemoved: string[] = [];
  let pendingAdded: string[] = [];
  let generatedIndex = 0;

  operations.forEach((operation) => {
    if (operation.kind === "equal") {
      cursor = flushStreamingPendingLines(
        plan,
        cursor,
        pendingRemoved,
        pendingAdded,
        generatedIndex,
        lastGeneratedIndex,
        hasOpenLine
      );
      generatedIndex += pendingAdded.length + 1;
      pendingRemoved = [];
      pendingAdded = [];
      cursor += operation.value.length;
      return;
    }

    if (operation.kind === "remove") {
      pendingRemoved.push(operation.value);
      return;
    }

    pendingAdded.push(operation.value);
  });

  flushStreamingPendingLines(
    plan,
    cursor,
    pendingRemoved,
    pendingAdded,
    generatedIndex,
    lastGeneratedIndex,
    hasOpenLine
  );

  return plan;
}

function flushStreamingPendingLines(
  plan: SuggestionLineChangePlan,
  startPosition: number,
  removedLines: readonly string[],
  addedLines: readonly string[],
  generatedStartIndex: number,
  lastGeneratedIndex: number,
  hasOpenLine: boolean
): number {
  if (removedLines.length === 0 && addedLines.length === 0) {
    return startPosition;
  }

  if (removedLines.length === 0) {
    pushHunk(plan, buildBlockHunk(startPosition, [], [...addedLines]));
    return startPosition;
  }

  if (addedLines.length === 0) {
    pushHunk(plan, buildBlockHunk(startPosition, [...removedLines], []));
    return startPosition + sumRawLineLengths(removedLines);
  }

  if (removedLines.length === 1 && addedLines.length === 1) {
    const openLine = hasOpenLine && generatedStartIndex === lastGeneratedIndex;
    const hunk = buildStreamingReplacementHunk(
      startPosition,
      removedLines[0],
      addedLines[0],
      openLine
    );
    if (hunk) {
      pushHunk(plan, hunk);
    }
    return startPosition + removedLines[0].length;
  }

  let cursor = startPosition;
  const pairCount = Math.min(removedLines.length, addedLines.length);

  for (let index = 0; index < pairCount; index += 1) {
    const genIndex = generatedStartIndex + index;
    const openLine = hasOpenLine && genIndex === lastGeneratedIndex;
    const hunk = buildStreamingReplacementHunk(
      cursor,
      removedLines[index],
      addedLines[index],
      openLine
    );
    if (hunk) {
      pushHunk(plan, hunk);
    }
    cursor += removedLines[index].length;
  }

  if (pairCount < removedLines.length || pairCount < addedLines.length) {
    const remainingRemoved = removedLines.slice(pairCount);
    const remainingAdded = addedLines.slice(pairCount);
    pushHunk(plan, buildBlockHunk(cursor, [...remainingRemoved], [...remainingAdded]));
    cursor += sumRawLineLengths(remainingRemoved);
  }

  return cursor;
}
