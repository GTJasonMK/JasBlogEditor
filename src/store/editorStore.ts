import { create } from 'zustand';
import { invokeTauri } from '@/platform/tauri';
import { inferDiaryFromFileName } from '@/services/diary';
import {
  parseMarkdownContent,
  serializeDocContentPreservingFrontmatter,
  serializeMarkdownContentPreservingFrontmatter,
} from '@/services/contentParser';
import {
  buildDocFilePath,
  buildDocFolderPath,
  buildJasblogFilePath,
  createNewDocMarkdown,
  createNewJasblogMarkdown,
} from '@/services/contentTemplates';
import type { ContentType, EditorFile, NoteMetadata, ProjectMetadata, DiaryMetadata, RoadmapMetadata, GraphMetadata, DocMetadata, JasBlogContentType } from '@/types';

type Metadata = NoteMetadata | ProjectMetadata | DiaryMetadata | RoadmapMetadata | GraphMetadata | DocMetadata;

export type EditorViewMode = 'edit' | 'preview' | 'split';
export type PreviewMode = 'detail' | 'list';

function getLocalDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  if (Array.isArray(a) || Array.isArray(b)) return false;

  if (isRecord(a) && isRecord(b)) {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;

    for (const key of aKeys) {
      if (!(key in b)) return false;
      if (!deepEqual(a[key], b[key])) return false;
    }

    return true;
  }

  return false;
}

interface EditorState {
  currentFile: EditorFile | null;
  isLoading: boolean;
  error: string | null;
  viewMode: EditorViewMode;
  previewMode: PreviewMode;

  // 列表页预览的 UI 状态：用于在 detail/list 之间切换时保留筛选条件
  notesListTag: string;
  diaryTimelineYear: string;
  diaryTimelineMonth: string;

  // AI 助手面板
  aiPanelVisible: boolean;

  openFile: (path: string, type: ContentType) => Promise<void>;
  closeFile: () => void;
  updateContent: (content: string) => void;
  updateMetadata: (metadata: Partial<Metadata>) => void;
  saveFile: () => Promise<void>;
  createNewFile: (workspacePath: string, type: JasBlogContentType, filename: string, templateContent?: string) => Promise<string>;
  createDocFile: (workspacePath: string, relativePath: string) => Promise<string>;
  createFolder: (workspacePath: string, relativePath: string) => Promise<void>;
  deleteCurrentFile: () => Promise<void>;
  deleteFile: (path: string) => Promise<void>;
  renameFile: (oldPath: string, newPath: string) => Promise<void>;
  setViewMode: (mode: EditorViewMode) => void;
  setPreviewMode: (mode: PreviewMode) => void;
  setNotesListTag: (tag: string) => void;
  setDiaryTimelineYear: (year: string) => void;
  setDiaryTimelineMonth: (month: string) => void;
  toggleAIPanel: () => void;
  setAIPanelVisible: (visible: boolean) => void;
  clearError: () => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  currentFile: null,
  isLoading: false,
  error: null,
  viewMode: 'edit',
  previewMode: 'detail',

  notesListTag: '',
  diaryTimelineYear: 'all',
  diaryTimelineMonth: 'all',

  aiPanelVisible: false,

  openFile: async (path, type) => {
    set({ isLoading: true, error: null });

    try {
      const content = await invokeTauri('read_file', { path });
      const name = path.split(/[/\\]/).pop() || '';

      // 所有类型都使用 Markdown 解析
      const parsed = parseMarkdownContent(content, type);
      let metadata = parsed.metadata as Metadata;

      if (type === 'diary') {
        const inferred = inferDiaryFromFileName(name.replace(/\.md$/i, ''));
        const today = getLocalDateString();

        const diary = metadata as DiaryMetadata;
        // 无 frontmatter 时，parseMarkdownContent 会给 diary 提供默认 date/time；
        // 这里优先使用文件名推断，避免把“今天/00:00”错误写回历史日记文件。
        const preferInferred = !parsed.hasFrontmatter;
        const resolvedDate = preferInferred
          ? (inferred?.date || diary.date || today)
          : (diary.date || inferred?.date || today);
        const resolvedTime = preferInferred
          ? (inferred?.time || diary.time || '00:00')
          : (diary.time || inferred?.time || '00:00');

        metadata = {
          ...diary,
          title: diary.title || inferred?.title || name.replace(/\.md$/i, ''),
          date: resolvedDate,
          time: resolvedTime,
          tags: diary.tags || [],
          companions: diary.companions || [],
        };
      }

      set({
        currentFile: {
          path,
          name,
          type,
          content: parsed.content,
          metadata,
          frontmatterRaw: parsed.hasFrontmatter ? parsed.frontmatterRaw : undefined,
          frontmatterBlock: parsed.hasFrontmatter ? parsed.frontmatterBlock ?? undefined : undefined,
          metadataDirty: false,
          isDirty: false,
          hasFrontmatter: parsed.hasFrontmatter,
          hasBom: parsed.hasBom,
          lineEnding: parsed.lineEnding,
        },
        isLoading: false,
      });
    } catch (error) {
      console.error('打开文件失败:', error);
      set({ error: `打开文件失败: ${error}`, isLoading: false });
    }
  },

  closeFile: () => {
    set({ currentFile: null, error: null });
  },

  updateContent: (content) => {
    const { currentFile } = get();
    if (!currentFile) return;

    set({
      currentFile: {
        ...currentFile,
        content,
        isDirty: true,
      },
    });
  },

  updateMetadata: (partialMetadata) => {
    const { currentFile } = get();
    if (!currentFile) return;

    const nextMetadata = { ...currentFile.metadata, ...partialMetadata } as Metadata;
    if (deepEqual(nextMetadata, currentFile.metadata)) {
      return;
    }

    set({
      currentFile: {
        ...currentFile,
        metadata: nextMetadata,
        isDirty: true,
        metadataDirty: true,
      },
    });
  },

  saveFile: async () => {
    const { currentFile } = get();
    if (!currentFile) return;

    set({ isLoading: true, error: null });

    try {
      let fileContent: string;

      if (currentFile.type === 'doc') {
        // 普通文档：根据 hasFrontmatter 决定是否保留 frontmatter
        const metadata = currentFile.metadata as DocMetadata;
        const shouldIncludeFrontmatter = currentFile.hasFrontmatter || !!metadata.title;
        if (currentFile.hasFrontmatter && currentFile.frontmatterBlock && !currentFile.metadataDirty) {
          // 仅正文变更时，原样复用 frontmatter（保留注释/格式）
          fileContent = `${currentFile.frontmatterBlock}${currentFile.content}`;
        } else {
          fileContent = serializeDocContentPreservingFrontmatter(metadata, currentFile.content, {
            includeFrontmatter: shouldIncludeFrontmatter,
            frontmatterBlock: currentFile.frontmatterBlock,
          });
        }
      } else {
        if (currentFile.hasFrontmatter && currentFile.frontmatterBlock && !currentFile.metadataDirty) {
          // 仅正文变更时，原样复用 frontmatter（保留注释/格式），避免保存产生无意义 diff
          fileContent = `${currentFile.frontmatterBlock}${currentFile.content}`;
        } else {
          // JasBlog 内容类型统一使用 Markdown 序列化
          fileContent = serializeMarkdownContentPreservingFrontmatter(
            currentFile.metadata as NoteMetadata | ProjectMetadata | DiaryMetadata | RoadmapMetadata | GraphMetadata,
            currentFile.content,
            {
              frontmatterBlock: currentFile.frontmatterBlock,
              frontmatterRaw: currentFile.frontmatterRaw,
            }
          );
        }
      }

      // 尽量保持字节一致：保持原文件的换行风格（JasBlog content 多为 CRLF）
      const lineEnding = currentFile.lineEnding || 'lf';
      fileContent = fileContent.replace(/\r\n/g, '\n');
      if (lineEnding === 'crlf') {
        fileContent = fileContent.replace(/\n/g, '\r\n');
      }

      // 尽量保持字节一致：如果原文件带 BOM，则写回时也带 BOM
      if (currentFile.hasBom && fileContent.charCodeAt(0) !== 0xFEFF) {
        fileContent = `\uFEFF${fileContent}`;
      }

      await invokeTauri('write_file', {
        path: currentFile.path,
        content: fileContent,
      });

      // 保存后刷新当前文件的 frontmatterBlock（后续正文改动继续“原样保存”）
      const reparsed = parseMarkdownContent(fileContent, currentFile.type);
      const nextFrontmatterBlock = reparsed.hasFrontmatter ? reparsed.frontmatterBlock ?? undefined : undefined;
      const nextFrontmatterRaw = reparsed.hasFrontmatter ? reparsed.frontmatterRaw : undefined;

      set({
        currentFile: {
          ...currentFile,
          isDirty: false,
          metadataDirty: false,
          hasFrontmatter: reparsed.hasFrontmatter,
          frontmatterBlock: nextFrontmatterBlock,
          frontmatterRaw: nextFrontmatterRaw,
        },
        isLoading: false,
      });
    } catch (error) {
      console.error('保存文件失败:', error);
      set({ error: `保存文件失败: ${error}`, isLoading: false });
    }
  },

  createNewFile: async (workspacePath, type, filename, templateContent) => {
    set({ isLoading: true, error: null });

    try {
      const path = buildJasblogFilePath(workspacePath, type, filename);
      // 优先使用传入的模板内容，否则使用默认生成
      let content = templateContent ?? createNewJasblogMarkdown(type, filename);
      // JasBlog content 目录在 Windows 环境中常见 CRLF + BOM；新建时尽量保持风格一致
      content = content.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');
      content = `\uFEFF${content}`;
      await invokeTauri('create_file', { path, content });
      set({ isLoading: false });
      return path;
    } catch (error) {
      console.error('创建文件失败:', error);
      set({ error: `创建文件失败: ${error}`, isLoading: false });
      throw error;
    }
  },

  createDocFile: async (workspacePath, relativePath) => {
    set({ isLoading: true, error: null });

    try {
      const path = buildDocFilePath(workspacePath, relativePath);
      const content = createNewDocMarkdown(relativePath);

      await invokeTauri('create_file', { path, content });
      set({ isLoading: false });
      return path;
    } catch (error) {
      console.error('创建文档失败:', error);
      set({ error: `创建文档失败: ${error}`, isLoading: false });
      throw error;
    }
  },

  createFolder: async (workspacePath, relativePath) => {
    set({ isLoading: true, error: null });

    try {
      const path = buildDocFolderPath(workspacePath, relativePath);
      await invokeTauri('create_directory', { path });
      set({ isLoading: false });
    } catch (error) {
      console.error('创建文件夹失败:', error);
      set({ error: `创建文件夹失败: ${error}`, isLoading: false });
      throw error;
    }
  },

  deleteCurrentFile: async () => {
    const { currentFile } = get();
    if (!currentFile) return;

    set({ isLoading: true, error: null });

    try {
      await invokeTauri('delete_file', { path: currentFile.path });
      set({ currentFile: null, isLoading: false });
    } catch (error) {
      console.error('删除文件失败:', error);
      set({ error: `删除文件失败: ${error}`, isLoading: false });
      throw error;
    }
  },

  deleteFile: async (path: string) => {
    const { currentFile } = get();

    set({ isLoading: true, error: null });

    try {
      await invokeTauri('delete_file', { path });
      // 如果删除的是当前打开的文件，关闭它
      if (currentFile?.path === path) {
        set({ currentFile: null, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('删除文件失败:', error);
      set({ error: `删除文件失败: ${error}`, isLoading: false });
      throw error;
    }
  },

  renameFile: async (oldPath: string, newPath: string) => {
    const { currentFile } = get();

    set({ isLoading: true, error: null });

    try {
      await invokeTauri('rename_file', { oldPath, newPath });
      // 如果重命名的是当前打开的文件，更新路径和名称
      if (currentFile?.path === oldPath) {
        const newName = newPath.split(/[/\\]/).pop() || '';
        set({
          currentFile: {
            ...currentFile,
            path: newPath,
            name: newName,
          },
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('重命名文件失败:', error);
      set({ error: `重命名文件失败: ${error}`, isLoading: false });
      throw error;
    }
  },

  setViewMode: (mode) => {
    set({ viewMode: mode });
  },

  setPreviewMode: (mode) => {
    set({ previewMode: mode });
  },

  setNotesListTag: (tag) => {
    set({ notesListTag: tag });
  },

  setDiaryTimelineYear: (year) => {
    set({ diaryTimelineYear: year });
  },

  setDiaryTimelineMonth: (month) => {
    set({ diaryTimelineMonth: month });
  },

  toggleAIPanel: () => {
    set((state) => ({ aiPanelVisible: !state.aiPanelVisible }));
  },

  setAIPanelVisible: (visible) => {
    set({ aiPanelVisible: visible });
  },

  clearError: () => {
    set({ error: null });
  },
}));
