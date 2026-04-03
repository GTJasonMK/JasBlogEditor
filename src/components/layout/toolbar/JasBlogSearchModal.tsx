import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useJasBlogSearchIndex } from "@/hooks/useJasBlogSearchIndex";
import { useEditorStore } from "@/store";
import {
  computeSearchScore,
  getSearchQueryTerms,
} from "@/services/searchText";
import type { SearchIndexItem } from "@/services/jasblogSearch";
import { JasBlogSearchResults } from "./JasBlogSearchResults";

interface JasBlogSearchModalProps {
  open: boolean;
  onClose: () => void;
}

export function JasBlogSearchModal({ open, onClose }: JasBlogSearchModalProps) {
  const { openFile, setPreviewMode } = useEditorStore();
  const { index, indexing, indexError } = useJasBlogSearchIndex(open);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchIndexItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [activeResultIndex, setActiveResultIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const resultsRef = useRef<HTMLUListElement | null>(null);

  const close = useCallback(() => {
    onClose();
    setQuery("");
    setResults([]);
    setSearching(false);
    setActiveResultIndex(0);
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setResults([]);
      setSearching(false);
      setActiveResultIndex(0);
      return;
    }

    setSearching(true);
    const timer = window.setTimeout(() => {
      const terms = getSearchQueryTerms(trimmedQuery);
      const nextResults = index
        .map((item) => ({ item, score: computeSearchScore(item, terms) }))
        .filter((entry) => entry.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 12)
        .map((entry) => entry.item);

      setResults(nextResults);
      setSearching(false);
      setActiveResultIndex(0);
    }, 200);

    return () => {
      window.clearTimeout(timer);
      setSearching(false);
    };
  }, [index, open, query]);

  useEffect(() => {
    if (!open || results.length === 0) return;
    const nextIndex = Math.max(0, Math.min(activeResultIndex, results.length - 1));
    if (nextIndex !== activeResultIndex) {
      setActiveResultIndex(nextIndex);
      return;
    }

    const activeResult = resultsRef.current?.querySelector<HTMLElement>(
      `[data-result-index="${nextIndex}"]`
    );
    activeResult?.scrollIntoView({ block: "nearest" });
  }, [activeResultIndex, open, results.length]);

  const handleSelect = useCallback(async (item: SearchIndexItem) => {
    try {
      await openFile(item.path, item.type);
      setPreviewMode("detail");
    } finally {
      close();
    }
  }, [close, openFile, setPreviewMode]);

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (results.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveResultIndex((value) => Math.min(results.length - 1, value + 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveResultIndex((value) => Math.max(0, value - 1));
      return;
    }
    if (event.key === "Enter") {
      const item = results[activeResultIndex];
      if (!item) return;
      event.preventDefault();
      void handleSelect(item);
    }
  };

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="关闭搜索"
        className="fixed inset-0 z-40 cursor-default bg-black/10"
        onClick={close}
      />

      <div className="fixed left-0 right-0 top-14 z-50">
        <div className="max-w-4xl mx-auto px-6">
          <div className="bg-[var(--color-paper)] border border-[var(--color-paper-darker)] rounded-lg shadow-lg p-4">
            <div className="flex items-center gap-3">
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="搜索 notes / diary（考研日志） / projects / graphs / roadmap（快捷键：/）"
                className="flex-1 bg-white border border-[var(--color-paper-darker)] rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-vermilion)]"
              />
              <button
                type="button"
                onClick={close}
                className="text-xs px-2 py-2 rounded-md text-[var(--color-gray)] hover:text-[var(--color-ink)] border border-transparent hover:border-[var(--color-paper-darker)] transition-colors"
                title="ESC"
              >
                ESC
              </button>
            </div>

            <div className="mt-3">
              <JasBlogSearchResults
                activeResultIndex={activeResultIndex}
                indexError={indexError}
                indexing={indexing}
                onHover={setActiveResultIndex}
                onSelect={(item) => void handleSelect(item)}
                query={query}
                results={results}
                resultsRef={resultsRef}
                searching={searching}
              />
            </div>

            <div className="mt-3 text-xs text-[var(--color-gray)]">
              Tip: <span className="font-mono">/</span> 打开，<span className="font-mono">ESC</span> 关闭，<span className="font-mono">↑↓</span> 选择，<span className="font-mono">Enter</span> 打开。
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
