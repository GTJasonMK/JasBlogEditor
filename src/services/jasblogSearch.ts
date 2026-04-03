import { inferDiaryFromFileName, resolveDiaryDate, DIARY_DATE_PATTERN } from "@/services/diary";
import { parseMarkdownContent } from "@/services/contentParser";
import {
  resolveDiaryDisplay,
  resolveGraphDisplay,
  resolveNoteDisplay,
  resolveProjectDisplay,
  resolveRoadmapDisplay,
} from "@/services/displayMetadata";
import {
  buildBodyTextFromMarkdown,
  buildSearchText,
  inferExcerptFromContent,
  normalizeWhitespace,
} from "@/services/searchText";
import type { FileTreeNode } from "@/store/fileStore";
import type {
  ContentType,
  DiaryMetadata,
  GraphMetadata,
  NoteMetadata,
  ProjectMetadata,
  RoadmapMetadata,
  TechStackItem,
} from "@/types";
import { collectLeafFiles, normalizeSlashes } from "@/utils";

const MAX_BODY_LENGTH = 20_000;

export interface SearchFileRef {
  path: string;
  name: string;
  type: Exclude<ContentType, "doc">;
}

export interface SearchSourceFile extends SearchFileRef {
  raw: string;
}

export interface SearchIndexItem {
  path: string;
  type: Exclude<ContentType, "doc">;
  title: string;
  excerpt: string;
  date: string;
  tags: string[];
  extra: string;
  bodyText: string;
  searchText: string;
}

interface DiarySearchEntry {
  path: string;
  slug: string;
  title: string;
  date: string;
  time: string;
  excerpt: string;
  tags: string[];
  mood?: string;
  weather?: string;
  location?: string;
  bodyText: string;
}

function getSlug(fileName: string): string {
  return fileName.replace(/\.md$/i, "");
}

function buildBaseIndexItem(
  file: SearchSourceFile,
  title: string,
  excerpt: string,
  date: string,
  tags: string[],
  extra: string,
  searchParts: readonly string[],
  bodyText: string
): SearchIndexItem {
  return {
    path: file.path,
    type: file.type,
    title,
    excerpt,
    date,
    tags,
    extra,
    bodyText,
    searchText: buildSearchText(searchParts),
  };
}

function buildNoteSearchItem(file: SearchSourceFile): SearchIndexItem {
  const parsed = parseMarkdownContent(file.raw, "note");
  const metadata = parsed.metadata as NoteMetadata;
  const display = resolveNoteDisplay(file.name, metadata);
  const bodyText = buildBodyTextFromMarkdown(parsed.content);
  const excerpt = metadata.excerpt || inferExcerptFromContent(parsed.content);
  const tags = metadata.tags || [];
  return buildBaseIndexItem(file, display.title, excerpt, display.date, tags, display.date, [
    display.title,
    excerpt,
    tags.join(" "),
    display.date,
    getSlug(file.name),
    bodyText,
  ], bodyText);
}

function getTechStackNames(items?: TechStackItem[]): string[] {
  return (items || [])
    .map((item) => item.name?.trim() || "")
    .filter(Boolean);
}

function buildProjectSearchItem(file: SearchSourceFile): SearchIndexItem {
  const parsed = parseMarkdownContent(file.raw, "project");
  const metadata = parsed.metadata as ProjectMetadata;
  const display = resolveProjectDisplay(file.name, metadata);
  const bodyText = buildBodyTextFromMarkdown(parsed.content);
  const excerpt = metadata.description || inferExcerptFromContent(parsed.content);
  const tags = metadata.tags || [];
  const techStackNames = getTechStackNames(metadata.techStack);
  return buildBaseIndexItem(file, display.name, excerpt, display.date, tags, display.date, [
    display.name,
    excerpt,
    tags.join(" "),
    techStackNames.join(" "),
    display.date,
    getSlug(file.name),
    bodyText,
  ], bodyText);
}

function buildGraphSearchItem(file: SearchSourceFile): SearchIndexItem {
  const parsed = parseMarkdownContent(file.raw, "graph");
  const metadata = parsed.metadata as GraphMetadata;
  const display = resolveGraphDisplay(file.name, metadata);
  const bodyText = buildBodyTextFromMarkdown(parsed.content);
  const excerpt = metadata.description || inferExcerptFromContent(parsed.content);
  return buildBaseIndexItem(file, display.name, excerpt, display.date, [], display.date, [
    display.name,
    excerpt,
    display.date,
    getSlug(file.name),
    bodyText,
  ], bodyText);
}

function buildRoadmapSearchItem(file: SearchSourceFile): SearchIndexItem {
  const parsed = parseMarkdownContent(file.raw, "roadmap");
  const metadata = parsed.metadata as RoadmapMetadata;
  const display = resolveRoadmapDisplay(file.name, metadata);
  const bodyText = buildBodyTextFromMarkdown(parsed.content);
  const excerpt = metadata.description || inferExcerptFromContent(parsed.content);
  const extra = [display.date, display.status].filter(Boolean).join(" ");
  return buildBaseIndexItem(file, display.title, excerpt, display.date, [], extra, [
    display.title,
    excerpt,
    extra,
    getSlug(file.name),
    bodyText,
  ], bodyText);
}

function buildDiaryEntry(file: SearchSourceFile): DiarySearchEntry {
  const parsed = parseMarkdownContent(file.raw, "diary");
  const metadata = parsed.metadata as DiaryMetadata;
  const inferred = inferDiaryFromFileName(getSlug(file.name));
  const display = resolveDiaryDisplay(file.name, metadata, inferred);
  return {
    path: file.path,
    slug: getSlug(file.name),
    title: display.title,
    date: resolveDiaryDate(display.date, inferred?.date),
    time: display.time || "00:00",
    excerpt: metadata.excerpt || inferExcerptFromContent(parsed.content),
    tags: metadata.tags || [],
    mood: metadata.mood,
    weather: metadata.weather,
    location: metadata.location,
    bodyText: buildBodyTextFromMarkdown(parsed.content),
  };
}

function sortDiaryEntries(entries: DiarySearchEntry[]): DiarySearchEntry[] {
  return [...entries].sort((a, b) => {
    if (a.time !== b.time) return a.time.localeCompare(b.time);
    return a.path.localeCompare(b.path);
  });
}

function buildDiaryAggregateItem(entries: DiarySearchEntry[]): SearchIndexItem {
  const sortedEntries = sortDiaryEntries(entries);
  const latestEntry = sortedEntries[sortedEntries.length - 1];
  const title = sortedEntries.length === 1 ? sortedEntries[0].title : `${latestEntry.date} 考研日志`;
  const tags = Array.from(new Set(sortedEntries.flatMap((entry) => entry.tags))).sort();
  const excerpt = latestEntry.excerpt || sortedEntries.map((entry) => entry.excerpt).find(Boolean) || "";
  const extra = sortedEntries.flatMap((entry) => [
    entry.date,
    entry.time,
    entry.mood,
    entry.weather,
    entry.location,
  ]).filter(Boolean).join(" ");
  const bodyText = normalizeWhitespace(
    sortedEntries.map((entry) => entry.bodyText).join(" ")
  ).slice(0, MAX_BODY_LENGTH);
  return {
    path: sortedEntries[0].path,
    type: "diary",
    title,
    excerpt,
    date: latestEntry.date,
    tags,
    extra,
    bodyText,
    searchText: buildSearchText([
      title,
      excerpt,
      tags.join(" "),
      extra,
      sortedEntries.map((entry) => `${entry.title} ${entry.slug}`).join(" "),
      bodyText,
    ]),
  };
}

function buildDiarySearchItems(files: SearchSourceFile[]): SearchIndexItem[] {
  const grouped = new Map<string, DiarySearchEntry[]>();
  const singles: SearchIndexItem[] = [];

  for (const file of files) {
    const entry = buildDiaryEntry(file);
    if (!DIARY_DATE_PATTERN.test(entry.date)) {
      singles.push(buildDiaryAggregateItem([entry]));
      continue;
    }
    const current = grouped.get(entry.date) || [];
    current.push(entry);
    grouped.set(entry.date, current);
  }

  const groupedItems = Array.from(grouped.values()).map(buildDiaryAggregateItem);
  return [...groupedItems, ...singles];
}

function sortSearchItems(items: SearchIndexItem[]): SearchIndexItem[] {
  return [...items].sort((a, b) => {
    if (a.date === b.date) return a.title.localeCompare(b.title);
    return a.date > b.date ? -1 : 1;
  });
}

export function collectJasBlogSearchFiles(nodes: FileTreeNode[]): SearchFileRef[] {
  return collectLeafFiles(nodes)
    .map((node) => {
      const type = node.contentType;
      if (!type || type === "doc") return null;
      return { path: node.path, name: node.name, type };
    })
    .filter((item): item is SearchFileRef => item !== null);
}

export function buildSearchFilesSignature(files: readonly SearchFileRef[], fileTreeVersion: number): string {
  if (files.length === 0) return "";
  const base = files
    .map((file) => `${file.type}:${normalizeSlashes(file.path).toLowerCase()}`)
    .sort()
    .join("\n");
  return `${fileTreeVersion}\n${base}`;
}

export function buildJasBlogSearchIndex(files: readonly SearchSourceFile[]): SearchIndexItem[] {
  const notes = files.filter((file) => file.type === "note").map(buildNoteSearchItem);
  const projects = files.filter((file) => file.type === "project").map(buildProjectSearchItem);
  const diaries = buildDiarySearchItems(files.filter((file) => file.type === "diary"));
  const graphs = files.filter((file) => file.type === "graph").map(buildGraphSearchItem);
  const roadmaps = files.filter((file) => file.type === "roadmap").map(buildRoadmapSearchItem);
  return sortSearchItems([...notes, ...projects, ...diaries, ...graphs, ...roadmaps]);
}
