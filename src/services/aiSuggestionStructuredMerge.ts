import { stripTrailingLineBreak } from "./aiSuggestionDiffText";

const FIELD_ONLY_LINE = /^\s*([^:：\n]{1,24}[:：])\s*$/;
const FIELD_WITH_VALUE_LINE = /^\s*([^:：\n]{1,24}[:：])\s*(.+)$/;

export interface FieldBodyMergeMatch {
  addedCount: number;
  removedCount: number;
}

function readFieldOnlyKey(line: string): string | null {
  return stripTrailingLineBreak(line).match(FIELD_ONLY_LINE)?.[1] ?? null;
}

function readFieldWithValue(line: string): { key: string; value: string } | null {
  const match = stripTrailingLineBreak(line).match(FIELD_WITH_VALUE_LINE);
  if (!match) {
    return null;
  }

  return {
    key: match[1],
    value: match[2],
  };
}

export function matchFieldBodyMerge(
  removedLines: readonly string[],
  addedLines: readonly string[],
  removedIndex: number,
  addedIndex: number
): FieldBodyMergeMatch | null {
  const fieldKey = readFieldOnlyKey(removedLines[removedIndex] ?? "");
  const bodyLine = stripTrailingLineBreak(removedLines[removedIndex + 1] ?? "");
  const addedField = readFieldWithValue(addedLines[addedIndex] ?? "");

  if (!fieldKey || !addedField || addedField.key !== fieldKey) {
    return null;
  }

  if (!bodyLine.trim()) {
    return null;
  }

  if (readFieldOnlyKey(removedLines[removedIndex + 1] ?? "")) {
    return null;
  }

  return {
    removedCount: 2,
    addedCount: 1,
  };
}
