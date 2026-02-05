import { create } from 'zustand';
import { invokeTauri } from '@/platform/tauri';
import { parseMarkdownContent, serializeMarkdownContent, serializeDocContent } from '@/services/contentParser';
import { buildDocFilePath, buildJasblogFilePath, createNewDocMarkdown, createNewJasblogMarkdown } from '@/services/contentTemplates';
import type { ContentType, EditorFile, NoteMetadata, ProjectMetadata, RoadmapMetadata, GraphMetadata, DocMetadata, JasBlogContentType } from '@/types';

type Metadata = NoteMetadata | ProjectMetadata | RoadmapMetadata | GraphMetadata | DocMetadata;

export type EditorViewMode = 'edit' | 'preview' | 'split';

interface EditorState {
  currentFile: EditorFile | null;
  isLoading: boolean;
  error: string | null;
  viewMode: EditorViewMode;

  openFile: (path: string, type: ContentType) => Promise<void>;
  closeFile: () => void;
  updateContent: (content: string) => void;
  updateMetadata: (metadata: Partial<Metadata>) => void;
  saveFile: () => Promise<void>;
  createNewFile: (workspacePath: string, type: JasBlogContentType, filename: string) => Promise<string>;
  createDocFile: (workspacePath: string, relativePath: string) => Promise<string>;
  createFolder: (workspacePath: string, relativePath: string) => Promise<void>;
  deleteCurrentFile: () => Promise<void>;
  deleteFile: (path: string) => Promise<void>;
  renameFile: (oldPath: string, newPath: string) => Promise<void>;
  setViewMode: (mode: EditorViewMode) => void;
  clearError: () => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  currentFile: null,
  isLoading: false,
  error: null,
  viewMode: 'edit',

  openFile: async (path, type) => {
    set({ isLoading: true, error: null });

    try {
      const content = await invokeTauri('read_file', { path });
      const name = path.split(/[/\\]/).pop() || '';

      // 所有类型都使用 Markdown 解析
      const parsed = parseMarkdownContent(content, type);

      set({
        currentFile: {
          path,
          name,
          type,
          content: parsed.content,
          metadata: parsed.metadata,
          isDirty: false,
          hasFrontmatter: parsed.hasFrontmatter,
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

    set({
      currentFile: {
        ...currentFile,
        metadata: { ...currentFile.metadata, ...partialMetadata } as Metadata,
        isDirty: true,
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
        fileContent = serializeDocContent(metadata, currentFile.content, shouldIncludeFrontmatter);
      } else {
        // note, project, roadmap, graph 都使用统一的 Markdown 序列化
        fileContent = serializeMarkdownContent(
          currentFile.metadata as NoteMetadata | ProjectMetadata | RoadmapMetadata | GraphMetadata,
          currentFile.content
        );
      }

      await invokeTauri('write_file', {
        path: currentFile.path,
        content: fileContent,
      });

      set({
        currentFile: {
          ...currentFile,
          isDirty: false,
        },
        isLoading: false,
      });
    } catch (error) {
      console.error('保存文件失败:', error);
      set({ error: `保存文件失败: ${error}`, isLoading: false });
    }
  },

  createNewFile: async (workspacePath, type, filename) => {
    set({ isLoading: true, error: null });

    try {
      const path = buildJasblogFilePath(workspacePath, type, filename);
      const content = createNewJasblogMarkdown(type, filename);
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
      const path = `${workspacePath}/${relativePath}`;
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

  clearError: () => {
    set({ error: null });
  },
}));
