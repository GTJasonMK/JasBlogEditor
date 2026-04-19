export const NOOP_SUGGESTION_MESSAGE =
  "AI 本次输出没有产生任何改动，已忽略该候选稿。";

export function isNoopSuggestion(
  sourceContent: string,
  nextContent: string
): boolean {
  return sourceContent === nextContent;
}

export function shouldDiscardSuggestionOnCompletionFailure(
  discardSuggestion: boolean | undefined,
  message: string
): boolean {
  return discardSuggestion === true || message === NOOP_SUGGESTION_MESSAGE;
}
