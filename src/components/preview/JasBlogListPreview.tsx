import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { isTauri } from '@/platform/runtime';
import { invokeTauri } from '@/platform/tauri';
import { buildDiaryEntryId, inferDiaryFromFileName, resolveDiaryDate } from '@/services/diary';
import { parseMarkdownContent, extractGraphFromContent, parseRoadmapItemsFromContent } from '@/services/contentParser';
import { collectLeafFilesByType, isSamePath } from '@/utils';
import { BackToTop } from './BackToTop';
import type {
  DiaryMetadata,
  EditorFile,
  GraphMetadata,
  NoteMetadata,
  ProjectMetadata,
  RoadmapItem,
  RoadmapMetadata,
  TechStackItem,
} from '@/types';
import { useEditorStore, useFileStore } from '@/store';

interface JasBlogListPreviewProps {
  activeFile: EditorFile;
  activeBodyContent: string;
}

function getSlugFromName(fileName: string): string {
  return fileName.replace(/\.md$/i, '');
}

function sortByDateDesc(a: { date: string }, b: { date: string }): number {
  if (a.date === b.date) return 0;
  return a.date > b.date ? -1 : 1;
}

interface PreviewDataCacheEntry<T> {
  workspacePath: string;
  fileTreeVersion: number;
  data: T;
}

interface UseCachedPreviewDataOptions<T> {
  cacheKey: string;
  workspacePath: string | null;
  fileTreeVersion: number;
  loadData: () => Promise<T>;
  emptyValue: () => T;
  errorLabel: string;
}

const previewDataCache = new Map<string, PreviewDataCacheEntry<unknown>>();

type DateSortedListItem = {
  path: string;
  date: string;
};

type OpenDetailContentType = Extract<EditorFile['type'], 'note' | 'project' | 'graph' | 'roadmap'>;

function readCachedPreviewData<T>(
  cacheKey: string,
  workspacePath: string,
  fileTreeVersion: number
): T | null {
  const cached = previewDataCache.get(cacheKey);
  if (!cached) return null;
  if (cached.workspacePath !== workspacePath) return null;
  if (cached.fileTreeVersion !== fileTreeVersion) return null;
  return cached.data as T;
}

function writeCachedPreviewData<T>(
  cacheKey: string,
  workspacePath: string,
  fileTreeVersion: number,
  data: T
): void {
  previewDataCache.set(cacheKey, {
    workspacePath,
    fileTreeVersion,
    data,
  } satisfies PreviewDataCacheEntry<T>);
}

function useCachedPreviewData<T>(options: UseCachedPreviewDataOptions<T>): {
  data: T;
  loading: boolean;
  error: string | null;
} {
  const {
    cacheKey,
    workspacePath,
    fileTreeVersion,
    loadData,
    emptyValue,
    errorLabel,
  } = options;

  const [data, setData] = useState<T>(() => emptyValue());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError(null);

      if (workspacePath) {
        const cached = readCachedPreviewData<T>(cacheKey, workspacePath, fileTreeVersion);
        if (cached !== null) {
          setData(cached);
          setLoading(false);
          return;
        }
      }

      setLoading(true);

      try {
        const nextData = await loadData();
        if (cancelled) return;

        setData(nextData);

        if (workspacePath) {
          writeCachedPreviewData(cacheKey, workspacePath, fileTreeVersion, nextData);
        }
      } catch (e) {
        console.error(`${errorLabel}失败:`, e);
        if (!cancelled) {
          setData(emptyValue());
          setError(String(e));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [cacheKey, workspacePath, fileTreeVersion, loadData, emptyValue, errorLabel]);

  return { data, loading, error };
}

function useMergedActiveItemList<T extends DateSortedListItem>(
  diskItems: T[],
  activeItem: T,
  activePath: string
): T[] {
  return useMemo(() => {
    const merged = [...diskItems.filter((item) => !isSamePath(item.path, activePath)), activeItem];
    merged.sort(sortByDateDesc);
    return merged;
  }, [diskItems, activeItem, activePath]);
}

function useOpenDetailByPath(options: {
  activePath: string;
  contentType: OpenDetailContentType;
  openFile: (path: string, type: EditorFile['type']) => Promise<void>;
  setPreviewMode: (mode: 'list' | 'detail') => void;
}): (path: string) => Promise<void> {
  const { activePath, contentType, openFile, setPreviewMode } = options;

  return useCallback(async (path: string) => {
    if (isSamePath(path, activePath)) {
      setPreviewMode('detail');
      return;
    }

    await openFile(path, contentType);
    setPreviewMode('detail');
  }, [activePath, contentType, openFile, setPreviewMode]);
}

function PreviewLoadState({
  loading,
  error,
  children,
}: {
  loading: boolean;
  error: string | null;
  children: ReactNode;
}) {
  if (loading) {
    return <p className="text-sm text-[var(--color-gray)]">加载中...</p>;
  }

  if (error) {
    return <p className="text-sm text-[var(--color-danger)]">加载失败：{error}</p>;
  }

  return <>{children}</>;
}

export function JasBlogListPreview({ activeFile, activeBodyContent }: JasBlogListPreviewProps) {
  if (!isTauri()) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold mb-2">列表预览</h1>
        <p className="text-sm text-[var(--color-gray)]">
          列表预览需要在桌面端（Tauri）运行才能读取工作区文件。
        </p>
      </div>
    );
  }

  if (activeFile.type === 'note') {
    return <NotesListPreview activeFile={activeFile} />;
  }

  if (activeFile.type === 'project') {
    return <ProjectsListPreview activeFile={activeFile} />;
  }

  if (activeFile.type === 'diary') {
    return <DiaryTimelinePreview activeFile={activeFile} />;
  }

  if (activeFile.type === 'graph') {
    return <GraphsListPreview activeFile={activeFile} activeBodyContent={activeBodyContent} />;
  }

  if (activeFile.type === 'roadmap') {
    return <RoadmapsListPreview activeFile={activeFile} activeBodyContent={activeBodyContent} />;
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <p className="text-sm text-[var(--color-gray)]">当前类型不支持列表预览。</p>
    </div>
  );
}

// ============================================
// Notes 列表预览
// ============================================

interface NoteListItem {
  path: string;
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  tags: string[];
}

const emptyNoteListItems = (): NoteListItem[] => [];

function NotesListPreview({ activeFile }: { activeFile: EditorFile }) {
  const { fileTree, fileTreeVersion, workspacePath } = useFileStore();
  const openFile = useEditorStore((state) => state.openFile);
  const setPreviewMode = useEditorStore((state) => state.setPreviewMode);
  const selectedTag = useEditorStore((state) => state.notesListTag);
  const setSelectedTag = useEditorStore((state) => state.setNotesListTag);

  const noteFiles = useMemo(() => collectLeafFilesByType(fileTree, 'note'), [fileTree]);
  const activePath = activeFile.path;
  const activeSlug = getSlugFromName(activeFile.name);
  const activeMeta = activeFile.metadata as NoteMetadata;

  const activeItem: NoteListItem = useMemo(() => ({
    path: activePath,
    slug: activeSlug,
    title: activeMeta.title || activeSlug,
    date: activeMeta.date || '',
    excerpt: activeMeta.excerpt || '',
    tags: activeMeta.tags || [],
  }), [activePath, activeSlug, activeMeta]);

  const loadNoteItems = useCallback(async (): Promise<NoteListItem[]> => {
    const items = await Promise.all(
      noteFiles.map(async (node) => {
        const raw = await invokeTauri('read_file', { path: node.path });
        const parsed = parseMarkdownContent(raw, 'note');
        const meta = parsed.metadata as NoteMetadata;
        const slug = getSlugFromName(node.name);

        return {
          path: node.path,
          slug,
          title: meta.title || slug,
          date: meta.date || '',
          excerpt: meta.excerpt || '',
          tags: meta.tags || [],
        } satisfies NoteListItem;
      })
    );

    items.sort(sortByDateDesc);
    return items;
  }, [noteFiles]);

  const { data: diskItems, loading, error } = useCachedPreviewData<NoteListItem[]>({
    cacheKey: 'notes-list',
    workspacePath,
    fileTreeVersion,
    loadData: loadNoteItems,
    emptyValue: emptyNoteListItems,
    errorLabel: '加载 notes 列表',
  });

  const items = useMergedActiveItemList(diskItems, activeItem, activePath);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    items.forEach((item) => item.tags.forEach((tag) => tagSet.add(tag)));
    return Array.from(tagSet).sort();
  }, [items]);

  useEffect(() => {
    if (!selectedTag) return;
    if (allTags.includes(selectedTag)) return;
    setSelectedTag('');
  }, [selectedTag, allTags, setSelectedTag]);

  const filteredItems = useMemo(() => {
    if (!selectedTag) return items;
    return items.filter((item) => item.tags.includes(selectedTag));
  }, [items, selectedTag]);

  const openNote = useOpenDetailByPath({
    activePath,
    contentType: 'note',
    openFile,
    setPreviewMode,
  });

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">学习笔记</h1>
        <p className="text-sm text-[var(--color-gray)] mt-2">
          列表页预览（对齐 JasBlog `/notes` 的标签筛选与卡片布局）
        </p>
      </header>

      <PreviewLoadState loading={loading} error={error}>
        <>
          {allTags.length > 0 && (
            <div className="mb-8">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedTag('')}
                  className={`tag ${
                    !selectedTag
                      ? 'bg-[var(--color-vermilion)] text-white'
                      : 'hover:bg-[var(--color-vermilion)] hover:text-white'
                  }`}
                >
                  All
                </button>
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setSelectedTag(tag)}
                    className={`tag ${
                      selectedTag === tag
                        ? 'bg-[var(--color-vermilion)] text-white'
                        : 'hover:bg-[var(--color-vermilion)] hover:text-white'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {filteredItems.length > 0 ? (
            <div className="grid gap-6">
              {filteredItems.map((post) => (
                <button
                  key={post.path}
                  type="button"
                  onClick={() => void openNote(post.path)}
                  className={`card-hover block rounded-lg p-6 ${
                    isSamePath(post.path, activePath)
                      ? 'ring-2 ring-[var(--color-vermilion)]/40'
                      : ''
                  } text-left w-full`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <time className="text-xs text-[var(--color-gray-light)]">{post.date}</time>
                    {post.tags.slice(0, 2).map((tag) => (
                      <span key={`${post.slug}-${tag}`} className="tag">{tag}</span>
                    ))}
                  </div>
                  <h3 className="text-lg font-semibold mb-2 hover:text-[var(--color-vermilion)]">
                    {post.title}
                  </h3>
                  <p className="text-[var(--color-gray)] text-sm line-clamp-2">
                    {post.excerpt}
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-[var(--color-gray)] text-center py-16">
              {selectedTag ? `未找到标签 "${selectedTag}" 的文章。` : '暂无笔记。'}
            </p>
          )}
        </>
      </PreviewLoadState>

      <BackToTop />
    </div>
  );
}

// ============================================
// Projects 列表预览
// ============================================

interface ProjectListItem {
  path: string;
  slug: string;
  name: string;
  description: string;
  date: string;
  tags: string[];
  techStack: TechStackItem[];
}

const emptyProjectListItems = (): ProjectListItem[] => [];

function ProjectsListPreview({ activeFile }: { activeFile: EditorFile }) {
  const { fileTree, fileTreeVersion, workspacePath } = useFileStore();
  const { openFile, setPreviewMode } = useEditorStore();
  const projectFiles = useMemo(() => collectLeafFilesByType(fileTree, 'project'), [fileTree]);

  const activePath = activeFile.path;
  const activeSlug = getSlugFromName(activeFile.name);
  const activeMeta = activeFile.metadata as ProjectMetadata;

  const activeItem: ProjectListItem = useMemo(() => ({
    path: activePath,
    slug: activeSlug,
    name: activeMeta.name || activeSlug,
    description: activeMeta.description || '',
    date: activeMeta.date || '',
    tags: activeMeta.tags || [],
    techStack: activeMeta.techStack || [],
  }), [activePath, activeSlug, activeMeta]);

  const loadProjectItems = useCallback(async (): Promise<ProjectListItem[]> => {
    const items = await Promise.all(
      projectFiles.map(async (node) => {
        const raw = await invokeTauri('read_file', { path: node.path });
        const parsed = parseMarkdownContent(raw, 'project');
        const meta = parsed.metadata as ProjectMetadata;
        const slug = getSlugFromName(node.name);

        return {
          path: node.path,
          slug,
          name: meta.name || slug,
          description: meta.description || '',
          date: meta.date || '',
          tags: meta.tags || [],
          techStack: meta.techStack || [],
        } satisfies ProjectListItem;
      })
    );

    items.sort(sortByDateDesc);
    return items;
  }, [projectFiles]);

  const { data: diskItems, loading, error } = useCachedPreviewData<ProjectListItem[]>({
    cacheKey: 'projects-list',
    workspacePath,
    fileTreeVersion,
    loadData: loadProjectItems,
    emptyValue: emptyProjectListItems,
    errorLabel: '加载 projects 列表',
  });

  const items = useMergedActiveItemList(diskItems, activeItem, activePath);

  const openProject = useOpenDetailByPath({
    activePath,
    contentType: 'project',
    openFile,
    setPreviewMode,
  });

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">开源项目</h1>
        <p className="text-sm text-[var(--color-gray)] mt-2">
          列表页预览（对齐 JasBlog `/projects` 的卡片布局）
        </p>
      </header>

      <PreviewLoadState loading={loading} error={error}>
        <>
          {items.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-6">
              {items.map((project) => (
                <button
                  key={project.path}
                  type="button"
                  onClick={() => void openProject(project.path)}
                  className={`card-hover block rounded-lg p-6 ${
                    isSamePath(project.path, activePath)
                      ? 'ring-2 ring-[var(--color-vermilion)]/40'
                      : ''
                  } text-left w-full`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold hover:text-[var(--color-vermilion)]">
                      {project.name}
                    </h3>
                  </div>
                  <p className="text-[var(--color-gray)] text-sm mb-3 line-clamp-2">
                    {project.description}
                  </p>
                  {project.techStack.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {project.techStack.slice(0, 4).map((tech, index) => (
                        <span
                          key={`${project.slug}-${tech.name}-${index}`}
                          className="text-xs px-2 py-0.5 rounded bg-[var(--color-paper-dark)] text-[var(--color-gray)]"
                        >
                          {tech.name}
                        </span>
                      ))}
                      {project.techStack.length > 4 && (
                        <span className="text-xs px-2 py-0.5 text-[var(--color-gray)]">
                          +{project.techStack.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {project.tags.map((tag) => (
                      <span key={`${project.slug}-${tag}`} className="tag">{tag}</span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-[var(--color-gray)] text-center py-16">暂无项目，敬请期待...</p>
          )}
        </>
      </PreviewLoadState>

      <BackToTop />
    </div>
  );
}

// ============================================
// Diary 时间线列表预览
// ============================================

interface DiaryEntryMeta {
  id: string;
  path: string;
  date: string;
  time: string;
  title: string;
  excerpt: string;
  tags: string[];
  mood: string | undefined;
  weather: string | undefined;
  location: string | undefined;
  companions: string[];
}

interface DiaryDayMeta {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  tags: string[];
  entryCount: number;
  mood?: string;
  weather?: string;
  location?: string;
  // 用于在编辑器内定位到某个 entry（站点里 slug=日期）
  openPath: string;
}

const emptyDiaryTimelineDays = (): DiaryDayMeta[] => [];

function sortDiaryEntryByTimeAsc(a: DiaryEntryMeta, b: DiaryEntryMeta): number {
  if (a.time === b.time) return a.id.localeCompare(b.id);
  return a.time.localeCompare(b.time);
}

function buildDiaryDay(date: string, entries: DiaryEntryMeta[]): DiaryDayMeta {
  const sortedEntries = [...entries].sort(sortDiaryEntryByTimeAsc);
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
    openPath: latestEntry.path,
  };
}

function getYear(date: string): string {
  return date.split('-')[0] || '';
}

function getMonth(date: string): string {
  return date.split('-')[1] || '';
}

function getMonthsForYear(days: DiaryDayMeta[], year: string): string[] {
  const options = days
    .filter((day) => year === 'all' || getYear(day.date) === year)
    .map((day) => getMonth(day.date))
    .filter(Boolean);

  return Array.from(new Set(options)).sort((a, b) => b.localeCompare(a));
}

function DiaryTimelinePreview({ activeFile }: { activeFile: EditorFile }) {
  const { fileTree, fileTreeVersion, workspacePath } = useFileStore();
  const openFile = useEditorStore((state) => state.openFile);
  const setPreviewMode = useEditorStore((state) => state.setPreviewMode);
  const selectedYear = useEditorStore((state) => state.diaryTimelineYear);
  const setSelectedYear = useEditorStore((state) => state.setDiaryTimelineYear);
  const selectedMonth = useEditorStore((state) => state.diaryTimelineMonth);
  const setSelectedMonth = useEditorStore((state) => state.setDiaryTimelineMonth);
  const diaryFiles = useMemo(() => collectLeafFilesByType(fileTree, 'diary'), [fileTree]);
  const diaryRootPath = useMemo(
    () => (workspacePath ? `${workspacePath}/content/diary` : ''),
    [workspacePath]
  );

  const activeMeta = activeFile.metadata as DiaryMetadata;
  const activeInferred = useMemo(
    () => inferDiaryFromFileName(activeFile.name.replace(/\.md$/i, '')),
    [activeFile.name]
  );
  const activeDate = resolveDiaryDate(activeMeta.date, activeInferred?.date);

  const loadDiaryTimelineDays = useCallback(async (): Promise<DiaryDayMeta[]> => {
    const entries = await Promise.all(
      diaryFiles.map(async (node) => {
        const baseName = node.name.replace(/\.md$/i, '');
        const inferred = inferDiaryFromFileName(baseName);

        const raw = await invokeTauri('read_file', { path: node.path });
        const parsed = parseMarkdownContent(raw, 'diary');
        const meta = parsed.metadata as DiaryMetadata;

        const date = resolveDiaryDate(meta.date, inferred?.date);
        if (!date) return null;

        const title = meta.title || inferred?.title || baseName;
        const time = meta.time || inferred?.time || '00:00';

        return {
          id: buildDiaryEntryId(node.path, diaryRootPath),
          path: node.path,
          date,
          time,
          title,
          excerpt: meta.excerpt || '',
          tags: meta.tags || [],
          mood: meta.mood,
          weather: meta.weather,
          location: meta.location,
          companions: meta.companions || [],
        } satisfies DiaryEntryMeta;
      })
    );

    const validEntries = entries.filter((entry): entry is DiaryEntryMeta => entry !== null);

    const grouped = new Map<string, DiaryEntryMeta[]>();
    validEntries.forEach((entry) => {
      const current = grouped.get(entry.date) || [];
      current.push(entry);
      grouped.set(entry.date, current);
    });

    return Array.from(grouped.entries())
      .map(([date, dayEntries]) => buildDiaryDay(date, dayEntries))
      .sort((a, b) => (a.date > b.date ? -1 : 1));
  }, [diaryFiles, diaryRootPath]);

  const { data: days, loading, error } = useCachedPreviewData<DiaryDayMeta[]>({
    cacheKey: 'diary-timeline',
    workspacePath,
    fileTreeVersion,
    loadData: loadDiaryTimelineDays,
    emptyValue: emptyDiaryTimelineDays,
    errorLabel: '加载 diary 时间线',
  });

  const years = useMemo(() => {
    return Array.from(new Set(days.map((day) => getYear(day.date))))
      .filter(Boolean)
      .sort((a, b) => b.localeCompare(a));
  }, [days]);

  useEffect(() => {
    if (selectedYear === 'all') return;
    if (years.includes(selectedYear)) return;
    setSelectedYear('all');
  }, [selectedYear, years, setSelectedYear]);

  const months = useMemo(() => getMonthsForYear(days, selectedYear), [days, selectedYear]);

  useEffect(() => {
    if (selectedMonth === 'all') return;
    if (months.includes(selectedMonth)) return;
    setSelectedMonth('all');
  }, [months, selectedMonth, setSelectedMonth]);

  const filteredDays = useMemo(() => {
    return days.filter((day) => {
      const year = getYear(day.date);
      const month = getMonth(day.date);
      const yearMatches = selectedYear === 'all' || year === selectedYear;
      const monthMatches = selectedMonth === 'all' || month === selectedMonth;
      return yearMatches && monthMatches;
    });
  }, [days, selectedYear, selectedMonth]);

  const hint = activeDate ? `当前打开的条目日期：${activeDate}（列表页显示的是按天聚合结果）` : null;

  async function openDay(day: DiaryDayMeta) {
    if (activeDate && day.date === activeDate) {
      setPreviewMode('detail');
      return;
    }

    await openFile(day.openPath, 'diary');
    setPreviewMode('detail');
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">日记时间线</h1>
        <p className="text-sm text-[var(--color-gray)] mt-2">
          列表页预览（对齐 JasBlog `/diary` 的年/月筛选与时间线卡片布局）
        </p>
        {hint && (
          <p className="text-xs text-[var(--color-gray)] mt-2">{hint}</p>
        )}
      </header>

      <PreviewLoadState loading={loading} error={error}>
        <>
          {days.length > 0 ? (
            <>
              <div className="mb-8 flex flex-wrap items-end gap-4">
                <label className="text-sm text-[var(--color-gray)]">
                  <span className="block mb-2">年份</span>
                  <select
                    value={selectedYear}
                    onChange={(event) => setSelectedYear(event.target.value)}
                    className="bg-white border border-[var(--color-paper-darker)] rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-vermilion)]"
                  >
                    <option value="all">全部年份</option>
                    {years.map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </label>

                <label className="text-sm text-[var(--color-gray)]">
                  <span className="block mb-2">月份</span>
                  <select
                    value={selectedMonth}
                    onChange={(event) => setSelectedMonth(event.target.value)}
                    className="bg-white border border-[var(--color-paper-darker)] rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-vermilion)]"
                  >
                    <option value="all">全部月份</option>
                    {months.map((month) => (
                      <option key={month} value={month}>{month}</option>
                    ))}
                  </select>
                </label>
              </div>

              {filteredDays.length > 0 ? (
                <div className="relative pl-6">
                  <div className="absolute left-2 top-1 bottom-1 w-px bg-[var(--color-paper-darker)]" />
                  <div className="space-y-6">
                    {filteredDays.map((day) => (
                      <article key={day.slug} className="relative">
                        <span className="absolute -left-5 top-8 w-3 h-3 rounded-full bg-[var(--color-vermilion)] border-2 border-[var(--color-paper)]" />
                        <button
                          type="button"
                          onClick={() => void openDay(day)}
                          className={`card-hover block w-full text-left rounded-lg p-5 ${
                            activeDate && day.date === activeDate
                              ? 'ring-2 ring-[var(--color-vermilion)]/40'
                              : ''
                          }`}
                        >
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <time className="text-xs text-[var(--color-gray-light)]">{day.date}</time>
                            <span className="text-xs px-2 py-0.5 rounded bg-[var(--color-paper-dark)] text-[var(--color-gray)]">
                              {day.entryCount} entries
                            </span>
                            {day.mood && <span className="tag">{day.mood}</span>}
                            {day.weather && <span className="tag">{day.weather}</span>}
                            {day.location && <span className="tag">{day.location}</span>}
                          </div>

                          <h3 className="text-lg font-semibold hover:text-[var(--color-vermilion)] mb-2">
                            {day.title}
                          </h3>

                          {day.excerpt && (
                            <p className="text-sm text-[var(--color-gray)] line-clamp-2">
                              {day.excerpt}
                            </p>
                          )}

                          {day.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                              {day.tags.slice(0, 4).map((tag) => (
                                <span key={`${day.slug}-${tag}`} className="tag">{tag}</span>
                              ))}
                              {day.tags.length > 4 && (
                                <span className="text-xs px-2 py-0.5 text-[var(--color-gray)]">
                                  +{day.tags.length - 4}
                                </span>
                              )}
                            </div>
                          )}
                        </button>
                      </article>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-[var(--color-gray)] text-center py-16">
                  当前筛选条件下没有日记条目。
                </p>
              )}
            </>
          ) : (
            <div className="text-center py-16">
              <p className="text-[var(--color-gray)]">暂无日记条目。</p>
              <p className="text-sm text-[var(--color-gray)] mt-2">
                将 Markdown 文件放入 <span className="font-mono">content/diary/YYYY/MM</span> 即可展示
              </p>
            </div>
          )}
        </>
      </PreviewLoadState>

      <BackToTop />
    </div>
  );
}

// ============================================
// Graphs 列表预览
// ============================================

interface GraphListItem {
  path: string;
  slug: string;
  name: string;
  description: string;
  date: string;
  nodeCount: number;
  edgeCount: number;
  error?: string;
}

const emptyGraphListItems = (): GraphListItem[] => [];

function GraphsListPreview({ activeFile, activeBodyContent }: { activeFile: EditorFile; activeBodyContent: string }) {
  const { fileTree, fileTreeVersion, workspacePath } = useFileStore();
  const { openFile, setPreviewMode } = useEditorStore();
  const graphFiles = useMemo(() => collectLeafFilesByType(fileTree, 'graph'), [fileTree]);

  const activePath = activeFile.path;
  const activeSlug = getSlugFromName(activeFile.name);
  const activeMeta = activeFile.metadata as GraphMetadata;

  const activeGraphInfo = useMemo(() => {
    const { graphData, error } = extractGraphFromContent(activeBodyContent);
    return {
      nodeCount: graphData.nodes.length,
      edgeCount: graphData.edges.length,
      error: error || undefined,
    };
  }, [activeBodyContent]);

  const activeItem: GraphListItem = useMemo(() => ({
    path: activePath,
    slug: activeSlug,
    name: activeMeta.name || activeSlug,
    description: activeMeta.description || '',
    date: activeMeta.date || '',
    nodeCount: activeGraphInfo.nodeCount,
    edgeCount: activeGraphInfo.edgeCount,
    error: activeGraphInfo.error,
  }), [activePath, activeSlug, activeMeta, activeGraphInfo]);

  const loadGraphItems = useCallback(async (): Promise<GraphListItem[]> => {
    const items = await Promise.all(
      graphFiles.map(async (node) => {
        const raw = await invokeTauri('read_file', { path: node.path });
        const parsed = parseMarkdownContent(raw, 'graph');
        const meta = parsed.metadata as GraphMetadata;
        const slug = getSlugFromName(node.name);

        const extracted = extractGraphFromContent(parsed.content);

        return {
          path: node.path,
          slug,
          name: meta.name || slug,
          description: meta.description || '',
          date: meta.date || '',
          nodeCount: extracted.graphData.nodes.length,
          edgeCount: extracted.graphData.edges.length,
          error: extracted.error || undefined,
        } satisfies GraphListItem;
      })
    );

    items.sort(sortByDateDesc);
    return items;
  }, [graphFiles]);

  const { data: diskItems, loading, error } = useCachedPreviewData<GraphListItem[]>({
    cacheKey: 'graphs-list',
    workspacePath,
    fileTreeVersion,
    loadData: loadGraphItems,
    emptyValue: emptyGraphListItems,
    errorLabel: '加载 graphs 列表',
  });

  const items = useMergedActiveItemList(diskItems, activeItem, activePath);

  const openGraph = useOpenDetailByPath({
    activePath,
    contentType: 'graph',
    openFile,
    setPreviewMode,
  });

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">知识图谱</h1>
        <p className="text-sm text-[var(--color-gray)] mt-2">
          列表页预览（对齐 JasBlog `/graphs` 的卡片布局与统计信息）
        </p>
      </header>

      <PreviewLoadState loading={loading} error={error}>
        <>
          {items.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-6">
              {items.map((graph) => (
                <button
                  key={graph.path}
                  type="button"
                  onClick={() => void openGraph(graph.path)}
                  className={`card-hover block rounded-lg p-6 ${
                    isSamePath(graph.path, activePath)
                      ? 'ring-2 ring-[var(--color-vermilion)]/40'
                      : ''
                  } text-left w-full`}
                >
                  <div className="w-12 h-12 mb-4 rounded-lg bg-[var(--color-vermilion)]/10 flex items-center justify-center">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--color-vermilion)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="6" cy="6" r="3" />
                      <circle cx="18" cy="6" r="3" />
                      <circle cx="6" cy="18" r="3" />
                      <circle cx="18" cy="18" r="3" />
                      <path d="M6 9v6M9 6h6M18 9v6M9 18h6" />
                    </svg>
                  </div>

                  <h3 className="text-lg font-semibold mb-2 hover:text-[var(--color-vermilion)]">
                    {graph.name}
                  </h3>
                  <p className="text-[var(--color-gray)] text-sm mb-3">
                    {graph.description}
                  </p>

                  {graph.error && (
                    <p className="text-xs text-[var(--color-danger)] mb-3 line-clamp-2">
                      {graph.error}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-4 text-xs text-[var(--color-gray)]">
                    {graph.date && <span>{graph.date}</span>}
                    <span className="flex items-center gap-1">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                      {graph.nodeCount} 个节点
                    </span>
                    <span className="flex items-center gap-1">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 12h14" />
                      </svg>
                      {graph.edgeCount} 条连接
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-[var(--color-gray)]">暂无知识图谱，敬请期待...</p>
              <p className="text-sm text-[var(--color-gray)] mt-2">
                将图谱 Markdown 文件放入 <span className="font-mono">content/graphs/</span> 目录即可展示
              </p>
            </div>
          )}
        </>
      </PreviewLoadState>

      <BackToTop />
    </div>
  );
}

// ============================================
// Roadmap 列表预览
// ============================================

type RoadmapStatus = 'active' | 'completed' | 'paused';

interface RoadmapProgress {
  total: number;
  done: number;
  inProgress: number;
  todo: number;
}

interface RoadmapListItem {
  path: string;
  slug: string;
  name: string;
  description: string;
  date: string;
  status: RoadmapStatus;
  progress: RoadmapProgress;
}

const emptyRoadmapListItems = (): RoadmapListItem[] => [];

const roadmapStatusConfig: Record<RoadmapStatus, { label: string; className: string }> = {
  active: { label: '进行中', className: 'bg-[var(--color-vermilion)] text-white' },
  completed: { label: '已完成', className: 'bg-green-100 text-green-700' },
  paused: { label: '已暂停', className: 'bg-gray-100 text-gray-600' },
};

function calculateProgress(items: RoadmapItem[]): RoadmapProgress {
  const done = items.filter((i) => i.status === 'done').length;
  const inProgress = items.filter((i) => i.status === 'in_progress').length;
  const todo = items.filter((i) => i.status === 'todo').length;
  return { total: items.length, done, inProgress, todo };
}

function ProgressBar({ progress }: { progress: RoadmapProgress }) {
  if (progress.total === 0) return null;

  const donePercent = (progress.done / progress.total) * 100;
  const inProgressPercent = (progress.inProgress / progress.total) * 100;

  return (
    <div className="mt-4">
      <div className="flex justify-between text-xs text-[var(--color-gray)] mb-1">
        <span>{progress.done}/{progress.total} 已完成</span>
        <span>{Math.round(donePercent)}%</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
        {donePercent > 0 && (
          <div className="h-full bg-green-500 transition-all" style={{ width: `${donePercent}%` }} />
        )}
        {inProgressPercent > 0 && (
          <div className="h-full bg-[var(--color-vermilion)] transition-all" style={{ width: `${inProgressPercent}%` }} />
        )}
      </div>
    </div>
  );
}

function RoadmapCard({
  roadmap,
  isActive,
  onOpen,
}: {
  roadmap: RoadmapListItem;
  isActive: boolean;
  onOpen: (path: string) => void | Promise<void>;
}) {
  return (
    <button
      type="button"
      onClick={() => void onOpen(roadmap.path)}
      className={`card-hover block rounded-lg p-6 text-left w-full ${isActive ? 'ring-2 ring-[var(--color-vermilion)]/40' : ''}`}
    >
      <div className="flex items-start justify-between gap-4 mb-2">
        <h3 className="text-lg font-semibold hover:text-[var(--color-vermilion)]">
          {roadmap.name}
        </h3>
        <span className={`text-xs px-2 py-1 rounded ${roadmapStatusConfig[roadmap.status].className}`}>
          {roadmapStatusConfig[roadmap.status].label}
        </span>
      </div>
      <p className="text-sm text-[var(--color-gray)] mb-2">
        {roadmap.description}
      </p>
      {roadmap.date && (
        <p className="text-xs text-[var(--color-gray)]">创建于 {roadmap.date}</p>
      )}
      <ProgressBar progress={roadmap.progress} />
    </button>
  );
}

function RoadmapsListPreview({ activeFile, activeBodyContent }: { activeFile: EditorFile; activeBodyContent: string }) {
  const { fileTree, fileTreeVersion, workspacePath } = useFileStore();
  const { openFile, setPreviewMode } = useEditorStore();
  const roadmapFiles = useMemo(() => collectLeafFilesByType(fileTree, 'roadmap'), [fileTree]);

  const activePath = activeFile.path;
  const activeSlug = getSlugFromName(activeFile.name);
  const activeMeta = activeFile.metadata as RoadmapMetadata;

  const activeProgress = useMemo(() => {
    const { items } = parseRoadmapItemsFromContent(activeBodyContent);
    return calculateProgress(items);
  }, [activeBodyContent]);

  const activeItem: RoadmapListItem = useMemo(() => ({
    path: activePath,
    slug: activeSlug,
    name: activeMeta.title || activeSlug,
    description: activeMeta.description || '',
    date: activeMeta.date || '',
    status: (activeMeta.status || 'active') as RoadmapStatus,
    progress: activeProgress,
  }), [activePath, activeSlug, activeMeta, activeProgress]);

  const loadRoadmapItems = useCallback(async (): Promise<RoadmapListItem[]> => {
    const items = await Promise.all(
      roadmapFiles.map(async (node) => {
        const raw = await invokeTauri('read_file', { path: node.path });
        const parsed = parseMarkdownContent(raw, 'roadmap');
        const meta = parsed.metadata as RoadmapMetadata;
        const slug = getSlugFromName(node.name);

        const { items: parsedItems } = parseRoadmapItemsFromContent(parsed.content);

        return {
          path: node.path,
          slug,
          name: meta.title || slug,
          description: meta.description || '',
          date: meta.date || '',
          status: (meta.status || 'active') as RoadmapStatus,
          progress: calculateProgress(parsedItems),
        } satisfies RoadmapListItem;
      })
    );

    items.sort(sortByDateDesc);
    return items;
  }, [roadmapFiles]);

  const { data: diskItems, loading, error } = useCachedPreviewData<RoadmapListItem[]>({
    cacheKey: 'roadmaps-list',
    workspacePath,
    fileTreeVersion,
    loadData: loadRoadmapItems,
    emptyValue: emptyRoadmapListItems,
    errorLabel: '加载 roadmaps 列表',
  });

  const items = useMergedActiveItemList(diskItems, activeItem, activePath);

  const openRoadmap = useOpenDetailByPath({
    activePath,
    contentType: 'roadmap',
    openFile,
    setPreviewMode,
  });

  const activeRoadmaps = items.filter((r) => r.status === 'active');
  const pausedRoadmaps = items.filter((r) => r.status === 'paused');
  const completedRoadmaps = items.filter((r) => r.status === 'completed');

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">我的规划</h1>
        <p className="text-sm text-[var(--color-gray)] mt-2">
          列表页预览（对齐 JasBlog `/roadmap` 的状态分组与进度条）
        </p>
      </header>

      <PreviewLoadState loading={loading} error={error}>
        <>
          {activeRoadmaps.length > 0 && (
            <section className="mb-12">
              <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[var(--color-vermilion)]" />
                进行中
              </h3>
              <div className="grid gap-4">
                {activeRoadmaps.map((roadmap) => (
                  <RoadmapCard
                    key={roadmap.path}
                    roadmap={roadmap}
                    isActive={isSamePath(roadmap.path, activePath)}
                    onOpen={openRoadmap}
                  />
                ))}
              </div>
            </section>
          )}

          {pausedRoadmaps.length > 0 && (
            <section className="mb-12">
              <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-gray-400" />
                已暂停
              </h3>
              <div className="grid gap-4">
                {pausedRoadmaps.map((roadmap) => (
                  <RoadmapCard
                    key={roadmap.path}
                    roadmap={roadmap}
                    isActive={isSamePath(roadmap.path, activePath)}
                    onOpen={openRoadmap}
                  />
                ))}
              </div>
            </section>
          )}

          {completedRoadmaps.length > 0 && (
            <section>
              <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-green-500" />
                已完成
              </h3>
              <div className="grid gap-4">
                {completedRoadmaps.map((roadmap) => (
                  <RoadmapCard
                    key={roadmap.path}
                    roadmap={roadmap}
                    isActive={isSamePath(roadmap.path, activePath)}
                    onOpen={openRoadmap}
                  />
                ))}
              </div>
            </section>
          )}

          {items.length === 0 && (
            <div className="text-center py-16">
              <p className="text-[var(--color-gray)]">暂无规划，敬请期待...</p>
              <p className="text-sm text-[var(--color-gray)] mt-2">
                将规划文档放入 <span className="font-mono">content/roadmaps/</span> 目录即可展示
              </p>
            </div>
          )}
        </>
      </PreviewLoadState>

      <BackToTop />
    </div>
  );
}
