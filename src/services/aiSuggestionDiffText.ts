import { diffSequence } from "./sequenceDiff";

export type SuggestionPatchSegmentKind = "equal" | "remove" | "add";

export interface SuggestionPatchSegment {
  kind: SuggestionPatchSegmentKind;
  text: string;
}

export interface SuggestionRemovedLineSegment {
  kind: "equal" | "remove";
  text: string;
}

export interface SuggestionRemovedVisualLine {
  text: string;
  segments: SuggestionRemovedLineSegment[];
}

export function splitLinesWithBreaks(text: string): string[] {
  if (!text) {
    return [];
  }

  const lines = text.split("\n");
  if (lines.length === 1) {
    return lines;
  }

  return lines.map((line, index) => (index < lines.length - 1 ? `${line}\n` : line));
}

export function splitRenderableStreamingLines(text: string): string[] {
  const lines = splitLinesWithBreaks(text);
  if (!text.endsWith("\n")) {
    return lines;
  }

  if (lines[lines.length - 1] === "") {
    return lines.slice(0, -1);
  }

  return lines;
}

export function stripTrailingLineBreak(text: string): string {
  return text.endsWith("\n") ? text.slice(0, -1) : text;
}

export function tokenizeText(text: string): string[] {
  return text.match(/\s+|[A-Za-z0-9_]+|[\u4E00-\u9FFF]|[^\s]/g) ?? [];
}

function appendPatchSegment(
  segments: SuggestionPatchSegment[],
  kind: SuggestionPatchSegmentKind,
  text: string
) {
  if (!text) {
    return;
  }

  const previous = segments[segments.length - 1];
  if (previous && previous.kind === kind) {
    previous.text += text;
    return;
  }

  segments.push({ kind, text });
}

function appendRemovedSegment(
  segments: SuggestionRemovedLineSegment[],
  kind: "equal" | "remove",
  text: string
) {
  if (!text) {
    return;
  }

  const previous = segments[segments.length - 1];
  if (previous && previous.kind === kind) {
    previous.text += text;
    return;
  }

  segments.push({ kind, text });
}

export function buildSuggestionTokenSegments(
  previousText: string,
  nextText: string
): SuggestionPatchSegment[] {
  const operations = diffSequence(
    tokenizeText(previousText),
    tokenizeText(nextText),
    (left, right) => left === right
  );
  const segments: SuggestionPatchSegment[] = [];

  operations.forEach((operation) => {
    appendPatchSegment(segments, operation.kind, operation.value);
  });

  return segments;
}

export function buildRemovedVisualLine(
  previousText: string,
  segments: readonly SuggestionPatchSegment[]
): SuggestionRemovedVisualLine {
  const removedSegments: SuggestionRemovedLineSegment[] = [];

  segments.forEach((segment) => {
    if (segment.kind === "add") {
      return;
    }

    appendRemovedSegment(removedSegments, segment.kind, segment.text);
  });

  return {
    text: previousText,
    segments: removedSegments,
  };
}

export function buildRemovedOnlyVisualLine(text: string): SuggestionRemovedVisualLine {
  return {
    text,
    segments: text ? [{ kind: "remove", text }] : [],
  };
}

export function scoreLineSimilarity(previousText: string, nextText: string): number {
  const previous = stripTrailingLineBreak(previousText);
  const next = stripTrailingLineBreak(nextText);
  const maxLength = Math.max(previous.length, next.length, 1);
  const operations = diffSequence(tokenizeText(previous), tokenizeText(next), (left, right) => (
    left === right
  ));
  let equalLength = 0;

  operations.forEach((operation) => {
    if (operation.kind === "equal") {
      equalLength += operation.value.length;
    }
  });

  return equalLength / maxLength;
}
