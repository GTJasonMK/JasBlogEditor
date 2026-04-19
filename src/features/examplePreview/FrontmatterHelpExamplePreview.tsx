import { useMemo } from "react";
import { parseMarkdownContent } from "@/services/contentParser";
import type {
  DocMetadata,
  DiaryMetadata,
  GraphMetadata,
  NoteMetadata,
  ProjectMetadata,
  RoadmapMetadata,
} from "@/types";
import { DocPreview } from "@/components/preview/previews/DocPreview";
import { DiaryPreview } from "@/components/preview/previews/DiaryPreview";
import { GraphPreview } from "@/components/preview/previews/GraphPreview";
import { NotePreview } from "@/components/preview/previews/NotePreview";
import { ProjectPreview } from "@/components/preview/previews/ProjectPreview";
import { RoadmapPreview } from "@/components/preview/previews/RoadmapPreview";
import type { PreviewLayout } from "@/components/preview/previewLayout";
import type { FrontmatterHelpExample } from "@/components/layout/toolbar/help/frontmatterHelpData";

const DIARY_HELP_FILE_PATH = "content/diary/2026/04/2026-04-03-22-10-review.md";
const DIARY_HELP_FILE_NAME = "2026-04-03-22-10-review.md";
const NOTE_HELP_FILE_NAME = "react-state-sync-note.md";
const PROJECT_HELP_FILE_NAME = "demo-project.md";
const ROADMAP_HELP_FILE_NAME = "study-roadmap.md";
const GRAPH_HELP_FILE_NAME = "knowledge-graph.md";
const HELP_FRAME_CLASS = "min-w-0 min-h-0";
const HELP_GRAPH_FRAME_CLASS = "min-w-0 min-h-[420px]";

function renderNotePreview(
  parsed: ReturnType<typeof parseMarkdownContent>,
  frameClassName: string,
  layout: PreviewLayout
) {
  return (
    <div className={frameClassName}>
      <NotePreview
        fileName={NOTE_HELP_FILE_NAME}
        metadata={parsed.metadata as NoteMetadata}
        content={parsed.content}
        embedded
        layout={layout}
      />
    </div>
  );
}

function renderDiaryPreview(
  parsed: ReturnType<typeof parseMarkdownContent>,
  frameClassName: string,
  layout: PreviewLayout
) {
  return (
    <div className={frameClassName}>
      <DiaryPreview
        filePath={DIARY_HELP_FILE_PATH}
        fileName={DIARY_HELP_FILE_NAME}
        metadata={parsed.metadata as DiaryMetadata}
        content={parsed.content}
        aggregateByDay={false}
        embedded
        layout={layout}
      />
    </div>
  );
}

function renderProjectPreview(
  parsed: ReturnType<typeof parseMarkdownContent>,
  frameClassName: string,
  layout: PreviewLayout
) {
  return (
    <div className={frameClassName}>
      <ProjectPreview
        fileName={PROJECT_HELP_FILE_NAME}
        metadata={parsed.metadata as ProjectMetadata}
        content={parsed.content}
        embedded
        layout={layout}
      />
    </div>
  );
}

function renderRoadmapPreview(
  parsed: ReturnType<typeof parseMarkdownContent>,
  frameClassName: string,
  layout: PreviewLayout
) {
  return (
    <div className={frameClassName}>
      <RoadmapPreview
        fileName={ROADMAP_HELP_FILE_NAME}
        metadata={parsed.metadata as RoadmapMetadata}
        content={parsed.content}
        embedded
        layout={layout}
      />
    </div>
  );
}

function renderGraphPreview(
  parsed: ReturnType<typeof parseMarkdownContent>,
  frameClassName: string,
  layout: PreviewLayout
) {
  return (
    <div className={frameClassName}>
      <GraphPreview
        fileName={GRAPH_HELP_FILE_NAME}
        metadata={parsed.metadata as GraphMetadata}
        content={parsed.content}
        embedded
        layout={layout}
      />
    </div>
  );
}

function renderDocPreview(
  parsed: ReturnType<typeof parseMarkdownContent>,
  frameClassName: string,
  layout: PreviewLayout
) {
  return (
    <div className={frameClassName}>
      <DocPreview
        metadata={parsed.metadata as DocMetadata}
        content={parsed.content}
        layout={layout}
      />
    </div>
  );
}

export function FrontmatterHelpExamplePreview({
  example,
  variant = "help",
}: {
  example: FrontmatterHelpExample;
  variant?: "help" | "window";
}) {
  const parsed = useMemo(
    () => parseMarkdownContent(example.raw, example.type),
    [example.raw, example.type]
  );
  const layout: PreviewLayout = "pane";
  const frameClassName =
    variant === "window" ? "min-w-0 min-h-full" : HELP_FRAME_CLASS;
  const graphFrameClassName =
    variant === "window" ? "min-w-0 min-h-full" : HELP_GRAPH_FRAME_CLASS;

  if (example.type === "note") {
    return renderNotePreview(parsed, frameClassName, layout);
  }

  if (example.type === "diary") {
    return renderDiaryPreview(parsed, frameClassName, layout);
  }

  if (example.type === "project") {
    return renderProjectPreview(parsed, frameClassName, layout);
  }

  if (example.type === "roadmap") {
    return renderRoadmapPreview(parsed, frameClassName, layout);
  }

  if (example.type === "graph") {
    return renderGraphPreview(parsed, graphFrameClassName, layout);
  }

  return renderDocPreview(parsed, frameClassName, layout);
}
