import {
  buildSuggestionTokenSegments,
  scoreLineSimilarity,
  stripTrailingLineBreak,
} from "./aiSuggestionDiffText";

const MIN_INLINE_PAIR_SIMILARITY = 0.45;
const MIN_INLINE_RENDER_SIMILARITY = 0.6;
const MIN_STRUCTURED_INLINE_RENDER_SIMILARITY = 0.78;
const MAX_INLINE_CHANGE_SEGMENTS = 6;
const MAX_STRUCTURED_INLINE_CHANGE_SEGMENTS = 4;
const CHECKLIST_LINE_PREFIX = /^\s*[-*+]\s+\[[ xX]\]\s+/;
const HEADING_LINE_PREFIX = /^\s*#+\s+/;
const QUOTE_LINE_PREFIX = /^\s*>\s+/;
const FIELD_LINE_PREFIX = /^\s*[^:：\n]{1,24}[:：]\s*/;

type StructuredLineKind = "checklist" | "heading" | "quote" | "field";

interface StructuredLineInfo {
  kind: StructuredLineKind;
  key: string;
}

function readStructuredLineInfo(line: string): StructuredLineInfo | null {
  const normalized = stripTrailingLineBreak(line);

  if (CHECKLIST_LINE_PREFIX.test(normalized)) {
    return { kind: "checklist", key: normalized.match(CHECKLIST_LINE_PREFIX)?.[0] ?? "" };
  }

  if (HEADING_LINE_PREFIX.test(normalized)) {
    return { kind: "heading", key: normalized.match(HEADING_LINE_PREFIX)?.[0] ?? "" };
  }

  if (QUOTE_LINE_PREFIX.test(normalized)) {
    return { kind: "quote", key: normalized.match(QUOTE_LINE_PREFIX)?.[0] ?? "" };
  }

  if (FIELD_LINE_PREFIX.test(normalized)) {
    return { kind: "field", key: normalized.match(FIELD_LINE_PREFIX)?.[0] ?? "" };
  }

  return null;
}

function isBlockPreferredStructuredPair(
  previousInfo: StructuredLineInfo | null,
  nextInfo: StructuredLineInfo | null
): boolean {
  if (!previousInfo || !nextInfo) {
    return false;
  }

  return previousInfo.kind === nextInfo.kind && previousInfo.kind !== "field";
}

export function readStructuredLineKey(line: string): string | null {
  return readStructuredLineInfo(line)?.key ?? null;
}

export function shouldPairLines(previousLine: string, nextLine: string): boolean {
  const previousInfo = readStructuredLineInfo(previousLine);
  const nextInfo = readStructuredLineInfo(nextLine);

  if (previousInfo?.kind === "field" && nextInfo?.kind === "field") {
    return previousInfo.key === nextInfo.key;
  }

  return scoreLineSimilarity(previousLine, nextLine) >= MIN_INLINE_PAIR_SIMILARITY;
}

export function shouldRenderInlineReplacement(
  previousLine: string,
  nextLine: string
): boolean {
  const previousInfo = readStructuredLineInfo(previousLine);
  const nextInfo = readStructuredLineInfo(nextLine);
  const blockPreferredStructuredPair = isBlockPreferredStructuredPair(
    previousInfo,
    nextInfo
  );
  const similarityThreshold = blockPreferredStructuredPair
    ? MIN_STRUCTURED_INLINE_RENDER_SIMILARITY
    : MIN_INLINE_RENDER_SIMILARITY;

  if (scoreLineSimilarity(previousLine, nextLine) < similarityThreshold) {
    return false;
  }

  const changeSegments = buildSuggestionTokenSegments(
    stripTrailingLineBreak(previousLine),
    stripTrailingLineBreak(nextLine)
  ).filter((segment) => segment.kind !== "equal");

  return changeSegments.length <= (
    blockPreferredStructuredPair
      ? MAX_STRUCTURED_INLINE_CHANGE_SEGMENTS
      : MAX_INLINE_CHANGE_SEGMENTS
  );
}
