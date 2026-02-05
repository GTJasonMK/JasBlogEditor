import { create } from 'zustand';
import { invokeTauri, getWindowState, setMiniModeWindow, restoreNormalWindow, getCurrentMiniModeSettings } from '@/platform/tauri';
import { parseMarkdownContent, serializeMarkdownContent, serializeDocContent } from '@/services/contentParser';
import type { ContentType, EditorFile, NoteMetadata, ProjectMetadata, RoadmapMetadata, GraphMetadata, DocMetadata, WindowState } from '@/types';

type Metadata = NoteMetadata | ProjectMetadata | RoadmapMetadata | GraphMetadata | DocMetadata;

// 迷你模式默认配置
const DEFAULT_MINI_MODE = { width: 450, height: 350 };

interface EditorState {
  currentFile: EditorFile | null;
  isLoading: boolean;
  error: string | null;
  viewMode: 'edit' | 'preview' | 'split';
  miniMode: boolean;
  savedWindowState: WindowState | null;

  openFile: (path: string, type: ContentType) => Promise<void>;
  closeFile: () => void;
  updateContent: (content: string) => void;
  updateMetadata: (metadata: Partial<Metadata>) => void;
  saveFile: () => Promise<void>;
  createNewFile: (workspacePath: string, type: Exclude<ContentType, 'doc'>, filename: string) => Promise<string>;
  createDocFile: (workspacePath: string, relativePath: string) => Promise<string>;
  createFolder: (workspacePath: string, relativePath: string) => Promise<void>;
  deleteCurrentFile: () => Promise<void>;
  deleteFile: (path: string) => Promise<void>;
  renameFile: (oldPath: string, newPath: string) => Promise<void>;
  setViewMode: (mode: 'edit' | 'preview' | 'split') => void;
  clearError: () => void;
  enterMiniMode: () => Promise<void>;
  exitMiniMode: () => Promise<void>;
  toggleMiniMode: () => Promise<void>;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  currentFile: null,
  isLoading: false,
  error: null,
  viewMode: 'edit',
  miniMode: false,
  savedWindowState: null,

  openFile: async (path, type) => {
    set({ isLoading: true, error: null });

    try {
      const content = await invokeTauri<string>('read_file', { path });
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
      const dirMap: Record<Exclude<ContentType, 'doc'>, string> = {
        note: 'notes',
        project: 'projects',
        roadmap: 'roadmaps',
        graph: 'graphs',
      };

      const dir = dirMap[type];
      const path = `${workspacePath}/content/${dir}/${filename}.md`;

      let content: string;
      const today = new Date().toISOString().split('T')[0];

      if (type === 'note') {
        content = `---
title: ${filename}
date: ${today}
excerpt:
tags: []
---

`;
      } else if (type === 'project') {
        content = `---
title: ${filename}
description:
github:
tags: []
status: active
---

## 项目介绍

`;
      } else if (type === 'roadmap') {
        content = `---
title: ${filename}
description:
status: active
---

- [ ] 示例任务
`;
      } else {
        // graph 类型：使用 Markdown + graph 代码块格式
        content = `---
name: ${filename}
description:
date: ${today}
---

\`\`\`graph
{
  "nodes": [],
  "edges": []
}
\`\`\`
`;
      }

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
      // 确保路径以 .md 结尾
      const filePath = relativePath.endsWith('.md') ? relativePath : `${relativePath}.md`;
      const path = `${workspacePath}/${filePath}`;
      const filename = filePath.split(/[/\\]/).pop()?.replace('.md', '') || 'untitled';
      const today = new Date().toISOString().split('T')[0];

      const content = `---
title: ${filename}
date: ${today}
---

`;

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

  enterMiniMode: async () => {
    const { currentFile, miniMode } = get();
    if (!currentFile || miniMode) return;

    try {
      // 保存当前窗口状态
      const windowState = await getWindowState();
      set({ savedWindowState: windowState });

      // 获取用户上次保存的迷你模式设置
      const { useSettingsStore } = await import('./settingsStore');
      const savedSettings = useSettingsStore.getState().settings.miniModeSettings;

      // 验证保存的设置是否合理（宽度应小于 1000，位置应小于 5000）
      let miniModeSettings = DEFAULT_MINI_MODE;
      if (savedSettings && savedSettings.width < 1000 && savedSettings.height < 1000) {
        if (savedSettings.positionX === undefined || savedSettings.positionX < 5000) {
          miniModeSettings = savedSettings;
        }
      }

      // 设置迷你模式窗口
      await setMiniModeWindow(miniModeSettings);
      set({ miniMode: true });
    } catch (error) {
      console.error('[MiniMode] 进入迷你模式失败:', error);
      set({ error: `进入迷你模式失败: ${error}` });
    }
  },

  exitMiniMode: async () => {
    const { miniMode, savedWindowState } = get();
    if (!miniMode || !savedWindowState) return;

    try {
      // 保存当前迷你模式的位置和大小
      const currentMiniSettings = await getCurrentMiniModeSettings();
      const { useSettingsStore } = await import('./settingsStore');
      await useSettingsStore.getState().saveMiniModeSettings(currentMiniSettings);

      // 恢复正常窗口
      await restoreNormalWindow(savedWindowState);
      set({ miniMode: false, savedWindowState: null });
    } catch (error) {
      console.error('退出迷你模式失败:', error);
      set({ error: `退出迷你模式失败: ${error}` });
    }
  },

  toggleMiniMode: async () => {
    const { miniMode, enterMiniMode, exitMiniMode } = get();
    if (miniMode) {
      await exitMiniMode();
    } else {
      await enterMiniMode();
    }
  },
}));
