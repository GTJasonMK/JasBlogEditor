import { normalizeSlashes } from "@/utils";

const MAX_BODY_LENGTH = 20_000;
const MAX_EXCERPT_LENGTH = 160;
const MAX_QUERY_TERMS = 8;
const MAX_SNIPPET_LENGTH = 160;

interface SearchTextCandidate {
  bodyText: string;
  excerpt: string;
  extra: string;
  path: string;
  searchText: string;
  tags: string[];
  title: string;
}

export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function collectMarkdownText(
  content: string,
  options: {
    includeFencedContent: boolean;
    maxLength: number;
    stopAfterParagraph: boolean;
    skipHeadings: boolean;
  }
): string {
  let inFence = false;
  let fenceChar = "";
  let seenText = false;
  let currentLength = 0;
  const parts: string[] = [];

  for (const rawLine of content.split(/\r?\n/)) {
    const trimmed = rawLine.trim();
    const fenceMatch = trimmed.match(/^(`{3,}|~{3,})/);
    if (fenceMatch) {
      const currentFenceChar = fenceMatch[1][0];
      inFence = !inFence || currentFenceChar !== fenceChar;
      fenceChar = inFence ? currentFenceChar : "";
      continue;
    }

    if (!trimmed) {
      if (options.stopAfterParagraph && seenText) break;
      continue;
    }
    if (inFence && !options.includeFencedContent) continue;
    if (!inFence && options.skipHeadings && /^#{1,6}\s+/.test(trimmed)) continue;

    const cleaned = normalizeWhitespace(
      inFence
        ? trimmed
        : trimmed
            .replace(/^#{1,6}\s+/, "")
            .replace(/^>\s+/, "")
            .replace(/^[-*+]\s+/, "")
            .replace(/^\d+\.\s+/, "")
            .replace(/!\[([^\]]*)]\([^)]*\)/g, "$1")
            .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
            .replace(/[`*_~]/g, "")
    );
    if (!cleaned) continue;

    parts.push(cleaned);
    seenText = true;
    currentLength += cleaned.length + 1;
    if (currentLength >= options.maxLength) break;
  }

  return normalizeWhitespace(parts.join(" ")).slice(0, options.maxLength);
}

export function inferExcerptFromContent(content: string): string {
  return collectMarkdownText(content, {
    includeFencedContent: false,
    maxLength: MAX_EXCERPT_LENGTH,
    stopAfterParagraph: true,
    skipHeadings: true,
  });
}

export function buildBodyTextFromMarkdown(content: string): string {
  return collectMarkdownText(content, {
    includeFencedContent: true,
    maxLength: MAX_BODY_LENGTH,
    stopAfterParagraph: false,
    skipHeadings: false,
  });
}

export function buildSearchText(parts: readonly string[]): string {
  return normalizeWhitespace(parts.filter(Boolean).join(" ")).toLowerCase();
}

export function getSearchQueryTerms(query: string): string[] {
  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean)
    .slice(0, MAX_QUERY_TERMS);
}

export function computeSearchScore(item: SearchTextCandidate, terms: readonly string[]): number {
  if (terms.length === 0) return 0;

  const title = item.title.toLowerCase();
  const excerpt = item.excerpt.toLowerCase();
  const tagsJoined = item.tags.join(" ").toLowerCase();
  const tags = item.tags.map((tag) => tag.toLowerCase());
  const extra = item.extra.toLowerCase();
  const path = normalizeSlashes(item.path).toLowerCase();
  let score = 0;

  for (const term of terms) {
    const matchedInPrimary = [title, excerpt, tagsJoined, extra, path].some((value) => value.includes(term));
    if (title.includes(term)) score += 6;
    if (excerpt.includes(term)) score += 2;
    if (tagsJoined.includes(term)) score += 3;
    if (extra.includes(term)) score += 1;
    if (path.includes(term)) score += 1;
    if (!matchedInPrimary && item.searchText.includes(term)) score += 1;
    if (title.startsWith(term)) score += 2;
    if (tags.some((tag) => tag.startsWith(term))) score += 1;
  }

  if (terms.length > 1 && terms.every((term) => item.searchText.includes(term))) {
    score += 2;
  }
  return score;
}

export function getSearchSnippet(item: SearchTextCandidate, query: string): string {
  const terms = getSearchQueryTerms(query);
  const fallback = item.excerpt || item.bodyText;
  if (!fallback) return "";
  if (terms.length === 0) return fallback.slice(0, MAX_SNIPPET_LENGTH);

  const source = item.bodyText || fallback;
  const firstIndex = terms
    .map((term) => source.toLowerCase().indexOf(term))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0];
  if (firstIndex === undefined) return source.slice(0, MAX_SNIPPET_LENGTH);

  const halfLength = Math.floor(MAX_SNIPPET_LENGTH / 2);
  let start = Math.max(0, firstIndex - halfLength);
  let end = Math.min(source.length, start + MAX_SNIPPET_LENGTH);
  start = Math.max(0, end - MAX_SNIPPET_LENGTH);
  if (start > 0) start = alignSnippetStart(source, start);
  if (end < source.length) end = alignSnippetEnd(source, end);
  return `${start > 0 ? "…" : ""}${source.slice(start, end).trim()}${end < source.length ? "…" : ""}`;
}

function alignSnippetStart(source: string, start: number): number {
  const space = source.lastIndexOf(" ", start);
  return space !== -1 && start - space < 20 ? space + 1 : start;
}

function alignSnippetEnd(source: string, end: number): number {
  const space = source.indexOf(" ", end);
  return space !== -1 && space - end < 20 ? space : end;
}
