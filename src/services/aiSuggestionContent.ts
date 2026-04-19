import type { AIApplyMode } from "./aiWritingAssistantTypes";

interface BuildSuggestionNextContentOptions {
  mode: AIApplyMode;
  sourceContent: string;
  generatedText: string;
  selectionStart: number;
  selectionEnd: number;
}

function isWholeDocumentReplace(options: BuildSuggestionNextContentOptions): boolean {
  return (
    options.mode === "replace" &&
    options.selectionStart === 0 &&
    options.selectionEnd === options.sourceContent.length
  );
}

function readLeadingBlankLineBlock(text: string): string {
  const match = text.match(/^(?:[ \t]*\n)*/);
  return match?.[0] ?? "";
}

function readTrailingBlankLineBlock(text: string): string {
  const match = text.match(/(?:\n[ \t]*)*$/);
  return match?.[0] ?? "";
}

function hasVisibleContent(text: string): boolean {
  return /\S/.test(text);
}

function alignBoundaryBlankLinesWithSource(
  sourceContent: string,
  nextContent: string
): string {
  if (!hasVisibleContent(sourceContent) || !hasVisibleContent(nextContent)) {
    return nextContent;
  }

  const sourceLeading = readLeadingBlankLineBlock(sourceContent);
  const sourceTrailing = readTrailingBlankLineBlock(sourceContent);
  const nextLeading = readLeadingBlankLineBlock(nextContent);
  const nextTrailing = readTrailingBlankLineBlock(nextContent);
  const coreStart = nextLeading.length;
  const coreEnd = nextContent.length - nextTrailing.length;
  const core = nextContent.slice(coreStart, coreEnd);

  return `${sourceLeading}${core}${sourceTrailing}`;
}

export function buildSuggestionNextContent(
  options: BuildSuggestionNextContentOptions
): string {
  const {
    mode,
    sourceContent,
    generatedText,
    selectionStart,
    selectionEnd,
  } = options;

  if (mode === "replace") {
    const nextContent = (
      sourceContent.slice(0, selectionStart) +
      generatedText +
      sourceContent.slice(selectionEnd)
    );

    if (isWholeDocumentReplace(options)) {
      return alignBoundaryBlankLinesWithSource(sourceContent, nextContent);
    }

    return nextContent;
  }

  return (
    sourceContent.slice(0, selectionEnd) +
    generatedText +
    sourceContent.slice(selectionEnd)
  );
}
