import { useEffect, useMemo, useState } from "react";
import { invokeTauri } from "@/platform/tauri";
import {
  buildDiaryEntryId,
  DIARY_DATE_PATTERN,
  type DiaryNameInference,
  inferDiaryFromFileName,
  resolveDiaryDate,
} from "@/services/diary";
import { parseMarkdownContent } from "@/services/contentParser";
import { resolveDiaryDisplay } from "@/services/displayMetadata";
import { combineIssueMessages } from "@/services/previewIssues";
import { useFileStore } from "@/store";
import type { FileTreeNode } from "@/store/fileStore";
import { DIARY_TIMELINE_LABEL, type DiaryMetadata } from "@/types";
import { collectLeafFiles, isSamePath } from "@/utils";
import DiaryDayView from "./diary/DiaryDayView";
import type { DiaryDayPreview, DiaryEntryPreview } from "./diary/types";
import type { PreviewLayout } from "../previewLayout";

type DiaryEntryWithError = DiaryEntryPreview & { error?: string };

interface DiaryPreviewProps {
  filePath: string;
  fileName: string;
  metadata: DiaryMetadata;
  content: string;
  aggregateByDay?: boolean;
  embedded?: boolean;
  layout?: PreviewLayout;
}

function sortByTimeAsc(a: DiaryEntryWithError, b: DiaryEntryWithError): number {
  if (a.time === b.time) {
    return a.id.localeCompare(b.id);
  }

  return a.time.localeCompare(b.time);
}

function buildDiaryDay(
  date: string,
  entries: DiaryEntryWithError[]
): DiaryDayPreview {
  const sortedEntries = [...entries].sort(sortByTimeAsc);
  const latestEntry = sortedEntries[sortedEntries.length - 1];
  const tags = Array.from(
    new Set(sortedEntries.flatMap((entry) => entry.tags))
  ).sort();
  const excerpt =
    latestEntry.excerpt ||
    sortedEntries.map((entry) => entry.excerpt).find(Boolean) ||
    "";
  const mood =
    latestEntry.mood ||
    [...sortedEntries].reverse().map((entry) => entry.mood).find(Boolean);
  const weather =
    latestEntry.weather ||
    [...sortedEntries].reverse().map((entry) => entry.weather).find(Boolean);
  const location =
    latestEntry.location ||
    [...sortedEntries].reverse().map((entry) => entry.location).find(Boolean);
  const error = sortedEntries.map((entry) => entry.error).find(Boolean);

  return {
    slug: date,
    title: sortedEntries.length === 1 ? sortedEntries[0].title : `${date} 考研日志`,
    date,
    excerpt,
    tags,
    entryCount: sortedEntries.length,
    mood,
    weather,
    location,
    entries: sortedEntries,
    error,
  };
}

export function DiaryPreview({
  filePath,
  fileName,
  metadata,
  content,
  aggregateByDay = true,
  embedded = false,
  layout = 'page',
}: DiaryPreviewProps) {
  const { fileTree, workspacePath } = useFileStore();
  const fileBaseName = useMemo(() => fileName.replace(/\.md$/i, ""), [fileName]);
  const inferred = useMemo(() => inferDiaryFromFileName(fileBaseName), [fileBaseName]);
  const display = useMemo(
    () => resolveDiaryDisplay(fileName, metadata, inferred),
    [fileName, metadata, inferred]
  );
  const diaryDirPath = useMemo(() => {
    if (!workspacePath) {
      return null;
    }

    return `${workspacePath}/content/diary`;
  }, [workspacePath]);
  const currentEntry = useMemo<DiaryEntryPreview>(() => {
    return {
      id: diaryDirPath ? buildDiaryEntryId(filePath, diaryDirPath) : fileBaseName,
      path: filePath,
      title: display.title,
      date: display.date,
      time: display.time || "00:00",
      excerpt: metadata.excerpt || "",
      tags: metadata.tags || [],
      mood: metadata.mood,
      weather: metadata.weather,
      location: metadata.location,
      companions: metadata.companions || [],
      content,
    };
  }, [content, diaryDirPath, display, fileBaseName, filePath, metadata]);

  const [extraEntries, setExtraEntries] = useState<DiaryEntryPreview[]>([]);
  const [extraError, setExtraError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadExtraEntries() {
      setExtraError(null);

      if (!aggregateByDay || !diaryDirPath || !resolvedDate(display.date)) {
        setExtraEntries([]);
        return;
      }

      const diaryRoot = fileTree.find(
        (node) => node.isDir && node.contentType === "diary"
      );
      if (!diaryRoot?.children?.length) {
        setExtraEntries([]);
        return;
      }

      const candidates = collectLeafFiles(diaryRoot.children)
        .filter((node) => node.name.toLowerCase().endsWith(".md"))
        .map((node) => {
          const candidateInference = inferDiaryFromFileName(
            node.name.replace(/\.md$/i, "")
          );

          if (isSamePath(node.path, filePath)) {
            return null;
          }

          if (
            candidateInference?.date &&
            candidateInference.date !== display.date
          ) {
            return null;
          }

          return { inferred: candidateInference, node };
        })
        .filter(
          (
            item
          ): item is {
            inferred: DiaryNameInference | null;
            node: FileTreeNode;
          } => item !== null
        );

      if (candidates.length === 0) {
        setExtraEntries([]);
        return;
      }

      try {
        const loaded: Array<DiaryEntryPreview | null> = await Promise.all(
          candidates.map(async ({ inferred: candidateInference, node }) => {
            const raw = await invokeTauri("read_file", { path: node.path });
            const parsed = parseMarkdownContent(raw, "diary");
            const meta = parsed.metadata as DiaryMetadata;
            const entryDisplay = resolveDiaryDisplay(
              node.name,
              meta,
              candidateInference
            );
            const date = resolveDiaryDate(
              entryDisplay.date,
              candidateInference?.date
            );

            if (date !== display.date) {
              return null;
            }

            return {
              id: buildDiaryEntryId(node.path, diaryDirPath),
              path: node.path,
              title: entryDisplay.title,
              date,
              time: entryDisplay.time || "00:00",
              excerpt: meta.excerpt || "",
              tags: meta.tags || [],
              mood: meta.mood,
              weather: meta.weather,
              location: meta.location,
              companions: meta.companions || [],
              content: parsed.content,
              error: combineIssueMessages(parsed.issues),
            } satisfies DiaryEntryPreview;
          })
        );

        if (!cancelled) {
          setExtraEntries(loaded.filter((entry): entry is DiaryEntryPreview => entry !== null));
        }
      } catch (error) {
        console.error("加载同日 diary entries 失败:", error);
        if (!cancelled) {
          setExtraError(String(error));
          setExtraEntries([]);
        }
      }
    }

    void loadExtraEntries();
    return () => {
      cancelled = true;
    };
  }, [aggregateByDay, diaryDirPath, display.date, filePath, fileTree]);

  const day = useMemo(() => {
    const date = resolvedDate(display.date) || currentEntry.date;
    if (!date || !DIARY_DATE_PATTERN.test(date)) {
      return buildDiaryDay(currentEntry.date || "", [currentEntry]);
    }

    const entries = [currentEntry, ...extraEntries].filter(
      (entry) => entry.date === date
    );
    return buildDiaryDay(date, entries.length > 0 ? entries : [currentEntry]);
  }, [currentEntry, display.date, extraEntries]);

  return (
    <DiaryDayView
      day={day}
      timelineBackLabel={`返回${DIARY_TIMELINE_LABEL}`}
      showBackButton={!embedded}
      aggregateError={extraError}
      layout={layout}
    />
  );
}

function resolvedDate(date: string): string {
  return DIARY_DATE_PATTERN.test(date) ? date : "";
}
