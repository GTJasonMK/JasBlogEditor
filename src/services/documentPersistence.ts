import {
  parseMarkdownContent,
  serializeDocContentPreservingFrontmatter,
  serializeMarkdownContentPreservingFrontmatter,
} from '@/services/contentParser';
import { normalizeEditorMetadata } from '@/services/editorMetadata';
import type {
  DiaryMetadata,
  ContentType,
  DocMetadata,
  EditorFile,
  GraphMetadata,
  NoteMetadata,
  ProjectMetadata,
  RoadmapMetadata,
} from '@/types';

type MarkdownMetadata =
  | NoteMetadata
  | ProjectMetadata
  | DiaryMetadata
  | RoadmapMetadata
  | GraphMetadata;

export interface PreparedDocumentSave {
  fileContent: string;
  nextFile: EditorFile;
}

/**
 * 统一封装保存前的序列化与保存后的状态回写。
 * 这样 UI 与 agent action 都能复用同一条文档落盘路径。
 */
export function prepareDocumentSave(currentFile: EditorFile): PreparedDocumentSave {
  let fileContent: string;

  if (currentFile.type === 'doc') {
    const metadata = currentFile.metadata as DocMetadata;
    const shouldIncludeFrontmatter = currentFile.hasFrontmatter || !!metadata.title;
    if (currentFile.hasFrontmatter && currentFile.frontmatterBlock && !currentFile.metadataDirty) {
      fileContent = `${currentFile.frontmatterBlock}${currentFile.content}`;
    } else {
      fileContent = serializeDocContentPreservingFrontmatter(metadata, currentFile.content, {
        includeFrontmatter: shouldIncludeFrontmatter,
        frontmatterBlock: currentFile.frontmatterBlock,
      });
    }
  } else if (currentFile.hasFrontmatter && currentFile.frontmatterBlock && !currentFile.metadataDirty) {
    fileContent = `${currentFile.frontmatterBlock}${currentFile.content}`;
  } else {
    fileContent = serializeMarkdownContentPreservingFrontmatter(
      currentFile.metadata as MarkdownMetadata,
      currentFile.content,
      {
        frontmatterBlock: currentFile.frontmatterBlock,
        frontmatterRaw: currentFile.frontmatterRaw,
      }
    );
  }

  const lineEnding = currentFile.lineEnding || 'lf';
  fileContent = fileContent.replace(/\r\n/g, '\n');
  if (lineEnding === 'crlf') {
    fileContent = fileContent.replace(/\n/g, '\r\n');
  }

  if (currentFile.hasBom && fileContent.charCodeAt(0) !== 0xFEFF) {
    fileContent = `\uFEFF${fileContent}`;
  }

  const reparsed = parseMarkdownContent(fileContent, currentFile.type);
  const nextFrontmatterBlock = reparsed.hasFrontmatter ? reparsed.frontmatterBlock ?? undefined : undefined;
  const nextFrontmatterRaw = reparsed.hasFrontmatter ? reparsed.frontmatterRaw : undefined;
  const nextMetadata = normalizeEditorMetadata(
    currentFile.name,
    currentFile.type as ContentType,
    reparsed.metadata as MarkdownMetadata | DocMetadata
  );

  return {
    fileContent,
    nextFile: {
      ...currentFile,
      content: reparsed.content,
      metadata: nextMetadata,
      isDirty: false,
      metadataDirty: false,
      issues: reparsed.issues,
      hasFrontmatter: reparsed.hasFrontmatter,
      frontmatterBlock: nextFrontmatterBlock,
      frontmatterRaw: nextFrontmatterRaw,
    },
  };
}
