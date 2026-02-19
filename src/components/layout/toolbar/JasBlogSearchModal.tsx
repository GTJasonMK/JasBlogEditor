import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { ReactNode } from 'react';
import { invokeTauri } from '@/platform/tauri';
import { parseMarkdownContent } from '@/services/contentParser';
import { collectLeafFiles, normalizeSlashes } from '@/utils';
import { CONTENT_TYPE_LABELS } from '@/types';
import type { ContentType, DiaryMetadata, GraphMetadata, NoteMetadata, ProjectMetadata, RoadmapMetadata } from '@/types';
import type { FileTreeNode } from '@/store/fileStore';
import { useEditorStore, useFileStore } from '@/store';

interface JasBlogSearchModalProps {
  open: boolean;
  onClose: () => void;
}

interface SearchFile {
  path: string;
  name: string;
  type: Exclude<ContentType, 'doc'>;
}

interface SearchIndexItem {
  path: string;
  type: ContentType;
  title: string;
  excerpt: string;
  date: string;
  tags: string[];
  extra: string;
  bodyText: string;
  searchText: string;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function trimForIndex(value: string, maxLen = 20000): string {
  if (!value) return '';
  if (value.length <= maxLen) return value;
  return value.slice(0, maxLen);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getQueryTerms(query: string): string[] {
  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function inferExcerptFromContent(content: string, maxLen = 160): string {
  if (!content) return '';

  let inFence = false;
  let fenceChar = '';

  const parts: string[] = [];
  let currentLen = 0;

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    const fenceMatch = trimmed.match(/^(`{3,}|~{3,})/);

    if (fenceMatch) {
      const currentFenceChar = fenceMatch[1][0];
      if (!inFence) {
        inFence = true;
        fenceChar = currentFenceChar;
      } else if (currentFenceChar === fenceChar) {
        inFence = false;
        fenceChar = '';
      }
      continue;
    }

    if (inFence) continue;

    if (!trimmed) {
      if (parts.length > 0) break;
      continue;
    }

    // 跳过标题行（# ...）
    if (/^#{1,6}\s+/.test(trimmed)) continue;

    const cleaned = normalizeWhitespace(
      trimmed
        .replace(/^>\s+/, '')
        .replace(/^[-*+]\s+/, '')
        .replace(/^\d+\.\s+/, '')
        .replace(/!\[[^\]]*]\([^)]*\)/g, '')
        .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
        .replace(/[`*_~]/g, '')
    );

    if (!cleaned) continue;

    parts.push(cleaned);
    currentLen += cleaned.length + 1;

    if (currentLen >= maxLen) break;
  }

  return normalizeWhitespace(parts.join(' ')).slice(0, maxLen);
}

function buildBodyTextFromMarkdown(content: string, maxLen = 20000): string {
  if (!content) return '';

  let inFence = false;
  let fenceChar = '';

  const parts: string[] = [];
  let currentLen = 0;

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    const fenceMatch = trimmed.match(/^(`{3,}|~{3,})/);

    if (fenceMatch) {
      const currentFenceChar = fenceMatch[1][0];
      if (!inFence) {
        inFence = true;
        fenceChar = currentFenceChar;
      } else if (currentFenceChar === fenceChar) {
        inFence = false;
        fenceChar = '';
      }
      continue;
    }

    if (inFence) continue;

    if (!trimmed) continue;

    const cleaned = normalizeWhitespace(
      trimmed
        .replace(/^#{1,6}\s+/, '')
        .replace(/^>\s+/, '')
        .replace(/^[-*+]\s+/, '')
        .replace(/^\d+\.\s+/, '')
        .replace(/!\[([^\]]*)]\([^)]*\)/g, '$1')
        .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
        .replace(/[`*_~]/g, '')
    );

    if (!cleaned) continue;

    parts.push(cleaned);
    currentLen += cleaned.length + 1;

    if (currentLen >= maxLen) break;
  }

  return normalizeWhitespace(parts.join(' ')).slice(0, maxLen);
}

function getSnippet(item: SearchIndexItem, query: string, maxLen = 160): string {
  const terms = getQueryTerms(query);
  const fallback = item.excerpt || item.bodyText;
  if (!fallback) return '';
  if (terms.length === 0) return fallback.slice(0, maxLen);

  const source = item.bodyText || fallback;
  const lowered = source.toLowerCase();
  let firstIndex = -1;

  for (const term of terms) {
    const idx = term ? lowered.indexOf(term) : -1;
    if (idx === -1) continue;
    if (firstIndex === -1 || idx < firstIndex) firstIndex = idx;
  }

  if (firstIndex === -1) {
    return source.slice(0, maxLen);
  }

  const half = Math.floor(maxLen / 2);
  let start = Math.max(0, firstIndex - half);
  let end = Math.min(source.length, start + maxLen);
  start = Math.max(0, end - maxLen);

  // 尽量对齐到空白分隔，减少“截断半个单词”的观感（中文无空格时不影响）
  if (start > 0) {
    const space = source.lastIndexOf(' ', start);
    if (space !== -1 && start - space < 20) start = space + 1;
  }
  if (end < source.length) {
    const space = source.indexOf(' ', end);
    if (space !== -1 && space - end < 20) end = space;
  }

  const prefix = start > 0 ? '…' : '';
  const suffix = end < source.length ? '…' : '';
  return `${prefix}${source.slice(start, end).trim()}${suffix}`;
}

function highlightText(text: string, query: string): ReactNode {
  const terms = getQueryTerms(query);
  if (!text) return text;
  if (terms.length === 0) return text;

  const escaped = terms
    .map((term) => term.trim())
    .filter(Boolean)
    .map((term) => escapeRegExp(term));

  if (escaped.length === 0) return text;

  const regex = new RegExp(`(${escaped.join('|')})`, 'ig');
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

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

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <>{parts}</>;
}

function collectSearchFiles(nodes: FileTreeNode[]): SearchFile[] {
  return collectLeafFiles(nodes)
    .map((node) => {
      const type = node.contentType;
      if (!type || type === 'doc') return null;
      return { path: node.path, name: node.name, type } satisfies SearchFile;
    })
    .filter((item): item is SearchFile => item !== null);
}

function computeScore(item: SearchIndexItem, terms: string[]): number {
  if (terms.length === 0) return 0;

  const title = item.title.toLowerCase();
  const excerpt = item.excerpt.toLowerCase();
  const tagsJoined = item.tags.join(' ').toLowerCase();
  const tags = item.tags.map((tag) => tag.toLowerCase());
  const extra = item.extra.toLowerCase();
  const path = normalizeSlashes(item.path).toLowerCase();
  const searchText = item.searchText;

  let score = 0;

  for (const term of terms) {
    const inTitle = title.includes(term);
    const inExcerpt = excerpt.includes(term);
    const inTags = tagsJoined.includes(term);
    const inExtra = extra.includes(term);
    const inPath = path.includes(term);

    if (inTitle) score += 6;
    if (inExcerpt) score += 2;
    if (inTags) score += 3;
    if (inExtra) score += 1;
    if (inPath) score += 1;

    // 兜底：允许正文全文匹配（更接近 JasBlog Pagefind 的行为）
    if (!inTitle && !inExcerpt && !inTags && !inExtra && !inPath && searchText.includes(term)) {
      score += 1;
    }

    // 更偏好标题/标签开头匹配
    if (title.startsWith(term)) score += 2;
    if (tags.some((tag) => tag.startsWith(term))) score += 1;
  }

  if (terms.length > 1 && terms.every((term) => searchText.includes(term))) {
      score += 2;
  }

  return score;
}

export function JasBlogSearchModal({ open, onClose }: JasBlogSearchModalProps) {
  const { fileTree, workspaceType, fileTreeVersion } = useFileStore();
  const { openFile, setPreviewMode } = useEditorStore();

  const files = useMemo(() => collectSearchFiles(fileTree), [fileTree]);
  const filesSignature = useMemo(() => {
    if (files.length === 0) return '';
    const base = files
      .map((file) => `${file.type}:${normalizeSlashes(file.path).toLowerCase()}`)
      .sort()
      .join('\n');
    // fileTreeVersion 会在保存/新建/删除后刷新，确保索引不会“路径不变但内容已变”而过期
    return `${fileTreeVersion}\n${base}`;
  }, [files, fileTreeVersion]);

  const [query, setQuery] = useState('');
  const [index, setIndex] = useState<SearchIndexItem[]>([]);
  const [indexing, setIndexing] = useState(false);
  const [indexError, setIndexError] = useState<string | null>(null);

  const [results, setResults] = useState<SearchIndexItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [activeResultIndex, setActiveResultIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const resultsRef = useRef<HTMLUListElement | null>(null);
  const buildRequestIdRef = useRef(0);
  const indexSignatureRef = useRef<string | null>(null);
  const indexSizeRef = useRef(0);

  const close = useCallback(() => {
    buildRequestIdRef.current += 1;
    onClose();
    setQuery('');
    setResults([]);
    setSearching(false);
    setIndexError(null);
    setActiveResultIndex(0);
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  // 打开时构建索引（基于 fileTree + frontmatter）
  useEffect(() => {
    if (!open) return;
    if (workspaceType !== 'jasblog') {
      indexSignatureRef.current = null;
      indexSizeRef.current = 0;
      return;
    }
    if (files.length === 0) {
      indexSignatureRef.current = null;
      indexSizeRef.current = 0;
      setIndex([]);
      return;
    }

    let cancelled = false;
    const requestId = ++buildRequestIdRef.current;

    async function build() {
      if (indexSignatureRef.current === filesSignature && indexSizeRef.current > 0) return;
      setIndexError(null);
      setIndexing(true);

      try {
        const settled = await Promise.allSettled(
          files.map(async (file) => {
            const raw = await invokeTauri('read_file', { path: file.path });
            const parsed = parseMarkdownContent(raw, file.type);
            const body = trimForIndex(parsed.content || '');
            const bodyText = buildBodyTextFromMarkdown(body);

            const baseSlug = file.name.replace(/\.md$/i, '');

            const base: Omit<SearchIndexItem, 'title' | 'excerpt' | 'date' | 'tags' | 'extra' | 'bodyText' | 'searchText'> = {
              path: file.path,
              type: file.type,
            };

            if (file.type === 'note') {
              const meta = parsed.metadata as NoteMetadata;
              const title = meta.title || baseSlug;
              const excerpt = meta.excerpt || inferExcerptFromContent(body);
              const date = meta.date || '';
              const tags = meta.tags || [];
              const extra = date;
              const searchText = normalizeWhitespace(
                `${title} ${excerpt} ${tags.join(' ')} ${date} ${baseSlug} ${bodyText}`
              ).toLowerCase();
              return { ...base, title, excerpt, date, tags, extra, bodyText, searchText };
            }

            if (file.type === 'project') {
              const meta = parsed.metadata as ProjectMetadata;
              const title = meta.name || (meta as unknown as { title?: string }).title || baseSlug;
              const excerpt = meta.description || inferExcerptFromContent(body);
              const date = meta.date || '';
              const tags = meta.tags || [];
              const extra = date;
              const searchText = normalizeWhitespace(
                `${title} ${excerpt} ${tags.join(' ')} ${date} ${baseSlug} ${bodyText}`
              ).toLowerCase();
              return { ...base, title, excerpt, date, tags, extra, bodyText, searchText };
            }

            if (file.type === 'diary') {
              const meta = parsed.metadata as DiaryMetadata;
              const title = meta.title || baseSlug;
              const excerpt = meta.excerpt || inferExcerptFromContent(body);
              const date = meta.date || '';
              const time = meta.time || '';
              const tags = meta.tags || [];
              const extra = [date, time, meta.mood, meta.weather, meta.location].filter(Boolean).join(' ');
              const searchText = normalizeWhitespace(
                `${title} ${excerpt} ${tags.join(' ')} ${extra} ${baseSlug} ${bodyText}`
              ).toLowerCase();
              return { ...base, title, excerpt, date, tags, extra, bodyText, searchText };
            }

            if (file.type === 'graph') {
              const meta = parsed.metadata as GraphMetadata;
              const title = meta.name || (meta as unknown as { title?: string }).title || baseSlug;
              const excerpt = meta.description || inferExcerptFromContent(body);
              const date = meta.date || '';
              const tags: string[] = [];
              const extra = date;
              const searchText = normalizeWhitespace(
                `${title} ${excerpt} ${date} ${baseSlug} ${bodyText}`
              ).toLowerCase();
              return { ...base, title, excerpt, date, tags, extra, bodyText, searchText };
            }

            // roadmap
            const meta = parsed.metadata as RoadmapMetadata;
            const title = meta.title || baseSlug;
            const excerpt = meta.description || inferExcerptFromContent(body);
            const date = meta.date || '';
            const tags: string[] = [];
            const status = meta.status || 'active';
            const extra = [date, status].filter(Boolean).join(' ');
            const searchText = normalizeWhitespace(
              `${title} ${excerpt} ${extra} ${baseSlug} ${bodyText}`
            ).toLowerCase();
            return { ...base, title, excerpt, date, tags, extra, bodyText, searchText };
          })
        );

        const failures = settled.filter((item) => item.status === 'rejected');
        const next = settled
          .filter((item): item is PromiseFulfilledResult<SearchIndexItem> => item.status === 'fulfilled')
          .map((item) => item.value);

        // 用日期做一个稳定排序（对齐 JasBlog 列表的倒序习惯）
        next.sort((a, b) => {
          if (a.date === b.date) return a.title.localeCompare(b.title);
          return a.date > b.date ? -1 : 1;
        });

        if (cancelled || requestId !== buildRequestIdRef.current) return;

        setIndex(next);
        indexSignatureRef.current = filesSignature;
        indexSizeRef.current = next.length;

        if (failures.length > 0) {
          setIndexError(`索引构建完成，但有 ${failures.length} 个文件读取失败（请检查工作区权限或文件编码）。`);
        }
      } catch (e) {
        console.error('构建搜索索引失败:', e);
        if (!cancelled && requestId === buildRequestIdRef.current) {
          setIndex([]);
          setIndexError(String(e));
        }
      } finally {
        if (!cancelled && requestId === buildRequestIdRef.current) {
          setIndexing(false);
        }
      }
    }

    build();
    return () => { cancelled = true; };
  }, [open, workspaceType, files, filesSignature]);

  // 查询变化时搜索
  useEffect(() => {
    if (!open) return;

    const q = query.trim();
    if (!q) {
      setResults([]);
      setSearching(false);
      setActiveResultIndex(0);
      return;
    }

    const timer = window.setTimeout(() => {
      setSearching(true);

      const terms = getQueryTerms(q);
      const scored = index
        .map((item) => ({ item, score: computeScore(item, terms) }))
        .filter((it) => it.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 12)
        .map((it) => it.item);

      setResults(scored);
      setSearching(false);
      setActiveResultIndex(0);
    }, 200);

    return () => window.clearTimeout(timer);
  }, [open, query, index]);

  useEffect(() => {
    if (!open) return;
    if (results.length === 0) return;

    const active = Math.max(0, Math.min(activeResultIndex, results.length - 1));
    if (active !== activeResultIndex) {
      setActiveResultIndex(active);
      return;
    }

    const el = resultsRef.current?.querySelector<HTMLElement>(`[data-result-index="${active}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [open, results.length, activeResultIndex]);

  const handleSelect = useCallback(async (item: SearchIndexItem) => {
    try {
      await openFile(item.path, item.type);
      setPreviewMode('detail');
    } finally {
      close();
    }
  }, [openFile, setPreviewMode, close]);

  if (!open) return null;

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (results.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveResultIndex((value) => Math.min(results.length - 1, value + 1));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveResultIndex((value) => Math.max(0, value - 1));
      return;
    }

    if (event.key === 'Enter') {
      const item = results[activeResultIndex];
      if (!item) return;
      event.preventDefault();
      void handleSelect(item);
    }
  };

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
                placeholder="搜索 notes / diary / projects / graphs / roadmap（快捷键：/）"
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
              {indexError && (
                <p className="text-sm text-[var(--color-gray)]">{indexError}</p>
              )}

              {!indexError && indexing && (
                <p className="text-sm text-[var(--color-gray)]">正在构建索引...</p>
              )}

              {!indexError && !indexing && searching && (
                <p className="text-sm text-[var(--color-gray)]">Searching...</p>
              )}

              {!indexError && !indexing && query.trim() && results.length === 0 && !searching && (
                <p className="text-sm text-[var(--color-gray)]">No results.</p>
              )}

              {results.length > 0 && (
                <ul
                  ref={resultsRef}
                  className="mt-2 max-h-[60vh] overflow-auto divide-y divide-[var(--color-paper-darker)]"
                >
                  {results.map((item, index) => (
                    <li key={`${item.type}:${item.path}`} className="py-3">
                      <button
                        type="button"
                        data-result-index={index}
                        onMouseEnter={() => setActiveResultIndex(index)}
                        className={`text-left w-full rounded-md px-2 py-2 transition-colors ${
                          index === activeResultIndex
                            ? 'bg-[var(--color-paper-dark)] text-[var(--color-vermilion)]'
                            : 'hover:text-[var(--color-vermilion)]'
                        }`}
                        onClick={() => handleSelect(item)}
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
                            {highlightText(getSnippet(item, query), query)}
                          </div>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
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
