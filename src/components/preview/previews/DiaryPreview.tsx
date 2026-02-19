import { useEffect, useMemo, useState } from 'react';
import { invokeTauri } from '@/platform/tauri';
import { parseMarkdownContent } from '@/services/contentParser';
import { useEditorStore, useFileStore } from '@/store';
import type { DiaryMetadata } from '@/types';
import type { FileTreeNode } from '@/store/fileStore';
import { MarkdownRenderer } from '../MarkdownRenderer';

interface DiaryPreviewProps {
  filePath: string;
  fileName: string;
  metadata: DiaryMetadata;
  content: string;
  aggregateByDay?: boolean;
  embedded?: boolean;
}

function preprocessAlerts(content: string): string {
  return content.replace(
    /^(>\s*)\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\r?\n?/gm,
    '$1ALERTBOX$2ALERTBOX\n',
  );
}

const DATE_SLUG_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
// 支持：YYYY-MM-DD-HH-mm-title.md、YYYY-MM-DD-HH-mm.md、YYYY-MM-DD.md（与 JasBlog src/lib/diary.ts 一致）
const FILE_NAME_PATTERN = /^(\d{4}-\d{2}-\d{2})(?:-(\d{2})-(\d{2}))?(?:-(.+))?$/;

interface DiaryEntry {
  id: string;
  path: string;
  title: string;
  date: string;
  time: string;
  excerpt: string;
  tags: string[];
  mood?: string;
  weather?: string;
  location?: string;
  companions: string[];
  content: string;
}

interface DiaryDay {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  tags: string[];
  entryCount: number;
  mood?: string;
  weather?: string;
  location?: string;
  entries: DiaryEntry[];
}

function normalizeSlashes(value: string): string {
  return value.replace(/\\/g, '/');
}

function titleFromSlug(value: string): string {
  return value.replace(/[-_]+/g, ' ').trim();
}

function inferFromFileName(fileNameNoExt: string): { date: string; time: string; title: string } | null {
  const match = fileNameNoExt.match(FILE_NAME_PATTERN);
  if (!match) return null;

  const [, date, hour, minute, titleSlug] = match;
  const time = hour && minute ? `${hour}:${minute}` : '';
  const title = titleSlug ? titleFromSlug(titleSlug) : date;

  return { date, time, title };
}

function collectLeafFiles(nodes?: FileTreeNode[]): FileTreeNode[] {
  if (!nodes) return [];

  const results: FileTreeNode[] = [];
  const queue = [...nodes];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;

    if (current.isDir) {
      if (current.children?.length) {
        queue.push(...current.children);
      }
      continue;
    }

    results.push(current);
  }

  return results;
}

function sortByTimeAsc(a: DiaryEntry, b: DiaryEntry): number {
  if (a.time === b.time) {
    return a.id.localeCompare(b.id);
  }
  return a.time.localeCompare(b.time);
}

function buildDiaryDay(date: string, entries: DiaryEntry[]): DiaryDay {
  const sortedEntries = [...entries].sort(sortByTimeAsc);
  const latestEntry = sortedEntries[sortedEntries.length - 1];

  const mood =
    latestEntry.mood ||
    [...sortedEntries].reverse().map((entry) => entry.mood).find(Boolean);
  const weather =
    latestEntry.weather ||
    [...sortedEntries].reverse().map((entry) => entry.weather).find(Boolean);
  const location =
    latestEntry.location ||
    [...sortedEntries].reverse().map((entry) => entry.location).find(Boolean);

  const tags = Array.from(new Set(sortedEntries.flatMap((entry) => entry.tags))).sort();
  const excerpt =
    latestEntry.excerpt ||
    sortedEntries.map((entry) => entry.excerpt).find(Boolean) ||
    '';
  const title = sortedEntries.length === 1 ? sortedEntries[0].title : `${date} diary`;

  return {
    slug: date,
    title,
    date,
    excerpt,
    tags,
    entryCount: sortedEntries.length,
    mood,
    weather,
    location,
    entries: sortedEntries,
  };
}

function buildDiaryEntryId(filePath: string, diaryDirPath: string): string {
  const normalizedPath = normalizeSlashes(filePath);
  const normalizedDir = normalizeSlashes(diaryDirPath).replace(/\/+$/, '');

  const prefix = `${normalizedDir}/`;
  if (normalizedPath.startsWith(prefix)) {
    return normalizedPath.slice(prefix.length).replace(/\.md$/i, '');
  }

  return (normalizedPath.split('/').pop() || normalizedPath).replace(/\.md$/i, '');
}

function isSamePath(a: string, b: string): boolean {
  return normalizeSlashes(a).toLowerCase() === normalizeSlashes(b).toLowerCase();
}

// 日记预览（对齐 JasBlog /diary/[slug] 的单日详情页展示）
// 编辑器内可在本地聚合同一天的多条记录：基于 fileTree 找到同日其他 entry，再读取并解析它们。
export function DiaryPreview({ filePath, fileName, metadata, content, aggregateByDay = true, embedded = false }: DiaryPreviewProps) {
  const setPreviewMode = useEditorStore((state) => state.setPreviewMode);
  const { fileTree, workspacePath } = useFileStore();

  const fileBaseName = useMemo(() => fileName.replace(/\.md$/i, ''), [fileName]);
  const inferred = useMemo(() => inferFromFileName(fileBaseName), [fileBaseName]);

  const resolvedDate = useMemo(() => {
    const dateFromMeta = metadata.date?.trim();
    if (dateFromMeta && DATE_SLUG_PATTERN.test(dateFromMeta)) return dateFromMeta;
    const dateFromName = inferred?.date?.trim();
    if (dateFromName && DATE_SLUG_PATTERN.test(dateFromName)) return dateFromName;
    return '';
  }, [metadata.date, inferred]);

  const diaryDirPath = useMemo(() => {
    if (!workspacePath) return null;
    return `${workspacePath}/content/diary`;
  }, [workspacePath]);

  const currentEntry: DiaryEntry = useMemo(() => {
    const title = metadata.title || inferred?.title || fileBaseName;
    const date = resolvedDate || metadata.date || inferred?.date || '';
    const time = metadata.time || inferred?.time || '00:00';

    return {
      id: diaryDirPath ? buildDiaryEntryId(filePath, diaryDirPath) : fileBaseName,
      path: filePath,
      title,
      date,
      time,
      excerpt: metadata.excerpt || '',
      tags: metadata.tags || [],
      mood: metadata.mood,
      weather: metadata.weather,
      location: metadata.location,
      companions: metadata.companions || [],
      content,
    };
  }, [
    metadata.title,
    metadata.date,
    metadata.time,
    metadata.excerpt,
    metadata.tags,
    metadata.mood,
    metadata.weather,
    metadata.location,
    metadata.companions,
    inferred?.title,
    inferred?.date,
    inferred?.time,
    fileBaseName,
    filePath,
    diaryDirPath,
    content,
    resolvedDate,
  ]);

  const [extraEntries, setExtraEntries] = useState<DiaryEntry[]>([]);
  const [extraLoading, setExtraLoading] = useState(false);
  const [extraError, setExtraError] = useState<string | null>(null);

  // 加载同一天的其他 diary entry（不包含当前文件）
  useEffect(() => {
    let cancelled = false;

    async function loadExtraEntries() {
      setExtraError(null);

      if (!aggregateByDay) {
        setExtraEntries([]);
        return;
      }

      if (!diaryDirPath || !workspacePath) {
        setExtraEntries([]);
        return;
      }

      if (!resolvedDate || !DATE_SLUG_PATTERN.test(resolvedDate)) {
        setExtraEntries([]);
        return;
      }

      // 找到 diary 根目录节点，然后递归收集所有叶子文件
      const diaryRoot = fileTree.find((node) => node.isDir && node.contentType === 'diary');
      if (!diaryRoot?.children?.length) {
        setExtraEntries([]);
        return;
      }

      const leaves = collectLeafFiles(diaryRoot.children)
        .filter((node) => node.name.toLowerCase().endsWith('.md'));

      const candidates = leaves
        .map((node) => {
          const baseName = node.name.replace(/\.md$/i, '');
          const inferredFromName = inferFromFileName(baseName);
          if (!inferredFromName?.date) return null;
          if (inferredFromName.date !== resolvedDate) return null;
          if (isSamePath(node.path, filePath)) return null;
          return { node, baseName, inferred: inferredFromName };
        })
        .filter((item): item is { node: FileTreeNode; baseName: string; inferred: { date: string; time: string; title: string } } => item !== null);

      if (candidates.length === 0) {
        setExtraEntries([]);
        return;
      }

      setExtraLoading(true);

      try {
        const loaded = await Promise.all(
          candidates.map(async ({ node, baseName, inferred }) => {
            const raw = await invokeTauri('read_file', { path: node.path });
            const parsed = parseMarkdownContent(raw, 'diary');
            const meta = parsed.metadata as DiaryMetadata;

            const date = meta.date?.trim() || inferred.date;
            if (date !== resolvedDate) return null;

            const time = meta.time || inferred.time || '00:00';
            const title = meta.title || inferred.title || baseName;
            const entryId = buildDiaryEntryId(node.path, diaryDirPath);

            const entry: DiaryEntry = {
              id: entryId,
              path: node.path,
              title,
              date,
              time,
              excerpt: meta.excerpt || '',
              tags: meta.tags || [],
              mood: meta.mood,
              weather: meta.weather,
              location: meta.location,
              companions: meta.companions || [],
              content: parsed.content,
            };

            return entry;
          })
        );

        const next = loaded.filter((entry): entry is DiaryEntry => entry !== null);
        next.sort(sortByTimeAsc);

        if (!cancelled) {
          setExtraEntries(next);
        }
      } catch (error) {
        console.error('加载同日 diary entries 失败:', error);
        if (!cancelled) {
          setExtraError(String(error));
          setExtraEntries([]);
        }
      } finally {
        if (!cancelled) {
          setExtraLoading(false);
        }
      }
    }

    loadExtraEntries();
    return () => {
      cancelled = true;
    };
  }, [aggregateByDay, diaryDirPath, workspacePath, resolvedDate, fileTree, filePath]);

  const day = useMemo(() => {
    // 没有有效日期时，回退为“单条渲染”
    const dayDate = resolvedDate || currentEntry.date;
    if (!dayDate || !DATE_SLUG_PATTERN.test(dayDate)) {
      return buildDiaryDay(currentEntry.date || '', [currentEntry]);
    }

    const entries = [currentEntry, ...extraEntries]
      .filter((entry) => entry.date === dayDate);

    return buildDiaryDay(dayDate, entries.length > 0 ? entries : [currentEntry]);
  }, [resolvedDate, currentEntry, extraEntries]);

  const tags = day.tags || [];

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      {!embedded && (
        <button
          type="button"
          onClick={() => setPreviewMode('list')}
          className="inline-flex items-center gap-1 text-[var(--color-gray)] hover:text-[var(--color-vermilion)] mb-6 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M10 12L6 8L10 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          返回日记时间线
        </button>
      )}

      <header className="mb-8">
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <time className="text-sm text-[var(--color-gray)]">{day.date}</time>
          <span className="text-xs px-2 py-0.5 rounded bg-[var(--color-paper-dark)] text-[var(--color-gray)]">
            {day.entryCount} entries
          </span>
          {day.mood && <span className="tag">{day.mood}</span>}
          {day.weather && <span className="tag">{day.weather}</span>}
          {day.location && <span className="tag">{day.location}</span>}
          {extraLoading && (
            <span className="text-xs px-2 py-0.5 rounded bg-[var(--color-paper-dark)] text-[var(--color-gray)]">
              正在加载同日条目...
            </span>
          )}
        </div>
        <h1 className="text-3xl font-bold mb-3">{day.title}</h1>
        {day.excerpt && (
          <p className="text-[var(--color-gray)]">{day.excerpt}</p>
        )}
        {extraError && (
          <p className="text-xs text-[var(--color-danger)] mt-3">
            同日聚合失败：{extraError}
          </p>
        )}
      </header>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          {tags.map((tag) => (
            <span key={tag} className="tag">{tag}</span>
          ))}
        </div>
      )}

      <div className="grid gap-6">
        {day.entries.map((entry) => (
          <article key={entry.id} className="card-hover rounded-lg p-6">
            <header className="mb-4">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-[var(--color-paper-dark)] text-[var(--color-gray)]">
                  {entry.time}
                </span>
                <h2 className="text-xl font-semibold">{entry.title}</h2>
              </div>

              <div className="flex flex-wrap gap-2">
                {entry.mood && <span className="tag">{entry.mood}</span>}
                {entry.weather && <span className="tag">{entry.weather}</span>}
                {entry.location && <span className="tag">{entry.location}</span>}
                {entry.companions.map((person) => (
                  <span key={`${entry.id}-${person}`} className="tag">{person}</span>
                ))}
              </div>
            </header>

            {entry.excerpt && (
              <p className="text-sm text-[var(--color-gray)] mb-4">
                {entry.excerpt}
              </p>
            )}

            <div className="prose-chinese">
              <MarkdownRenderer content={preprocessAlerts(entry.content)} />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
