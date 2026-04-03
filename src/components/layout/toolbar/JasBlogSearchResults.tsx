import type { ReactNode } from "react";
import { CONTENT_TYPE_LABELS } from "@/types";
import type { SearchIndexItem } from "@/services/jasblogSearch";
import {
  getSearchQueryTerms,
  getSearchSnippet,
} from "@/services/searchText";

interface JasBlogSearchResultsProps {
  activeResultIndex: number;
  indexError: string | null;
  indexing: boolean;
  onHover: (index: number) => void;
  onSelect: (item: SearchIndexItem) => void;
  query: string;
  results: SearchIndexItem[];
  resultsRef: React.RefObject<HTMLUListElement | null>;
  searching: boolean;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightText(text: string, query: string): ReactNode {
  const terms = getSearchQueryTerms(query);
  if (!text || terms.length === 0) return text;

  const escapedTerms = terms.map(escapeRegExp);
  if (escapedTerms.length === 0) return text;

  const regex = new RegExp(`(${escapedTerms.join("|")})`, "ig");
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    parts.push(
      <mark
        key={`${match.index}-${match[0]}`}
        className="bg-[var(--color-gold)]/30 text-[var(--color-ink)] px-0.5 rounded"
      >
        {match[0]}
      </mark>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return <>{parts}</>;
}

export function JasBlogSearchResults({
  activeResultIndex,
  indexError,
  indexing,
  onHover,
  onSelect,
  query,
  results,
  resultsRef,
  searching,
}: JasBlogSearchResultsProps) {
  if (indexError) {
    return <p className="text-sm text-[var(--color-gray)]">{indexError}</p>;
  }
  if (indexing) {
    return <p className="text-sm text-[var(--color-gray)]">正在构建索引...</p>;
  }
  if (searching) {
    return <p className="text-sm text-[var(--color-gray)]">Searching...</p>;
  }
  if (query.trim() && results.length === 0) {
    return <p className="text-sm text-[var(--color-gray)]">No results.</p>;
  }
  if (results.length === 0) return null;

  return (
    <ul
      ref={resultsRef}
      className="mt-2 max-h-[60vh] overflow-auto divide-y divide-[var(--color-paper-darker)]"
    >
      {results.map((item, index) => (
        <li key={`${item.type}:${item.path}`} className="py-3">
          <button
            type="button"
            data-result-index={index}
            onMouseEnter={() => onHover(index)}
            className={`text-left w-full rounded-md px-2 py-2 transition-colors ${
              index === activeResultIndex
                ? "bg-[var(--color-paper-dark)] text-[var(--color-vermilion)]"
                : "hover:text-[var(--color-vermilion)]"
            }`}
            onClick={() => onSelect(item)}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded bg-[var(--color-paper-dark)] text-[var(--color-gray)]">
                {CONTENT_TYPE_LABELS[item.type]}
              </span>
              {item.date && (
                <span className="text-xs text-[var(--color-gray)]">{item.date}</span>
              )}
            </div>
            <div className="text-sm font-medium mt-1">
              {highlightText(item.title, query)}
            </div>
            {Boolean(item.excerpt || item.bodyText) && (
              <div className="text-sm text-[var(--color-gray)] mt-1 line-clamp-2">
                {highlightText(getSearchSnippet(item, query), query)}
              </div>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}
