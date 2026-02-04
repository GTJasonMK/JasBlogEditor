import { create } from 'zustand';
import { invokeTauri, getWindowState, setMiniModeWindow, restoreNormalWindow, getCurrentMiniModeSettings } from '@/platform/tauri';
import { parseMarkdownContent, serializeMarkdownContent, parseJsonContent, serializeJsonContent } from '@/services/contentParser';
import type { ContentType, EditorFile, NoteMetadata, ProjectMetadata, RoadmapMetadata, GraphData, WindowState } from '@/types';

type Metadata = NoteMetadata | ProjectMetadata | RoadmapMetadata | GraphData;

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
  createNewFile: (workspacePath: string, type: ContentType, filename: string) => Promise<string>;
  deleteCurrentFile: () => Promise<void>;
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

      let metadata: Metadata;
      let bodyContent: string;

      if (type === 'graph') {
        const parsed = parseJsonContent(content);
        metadata = parsed;
        bodyContent = content;
      } else {
        const parsed = parseMarkdownContent(content, type);
        metadata = parsed.metadata;
        bodyContent = parsed.content;
      }

      set({
        currentFile: {
          path,
          name,
          type,
          content: bodyContent,
          metadata,
          isDirty: false,
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

      if (currentFile.type === 'graph') {
        fileContent = serializeJsonContent(currentFile.metadata as GraphData);
      } else {
        fileContent = serializeMarkdownContent(
          currentFile.metadata as NoteMetadata | ProjectMetadata | RoadmapMetadata,
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
      const dirMap: Record<ContentType, string> = {
        note: 'notes',
        project: 'projects',
        roadmap: 'roadmaps',
        graph: 'graphs',
      };

      const ext = type === 'graph' ? '.json' : '.md';
      const dir = dirMap[type];
      const path = `${workspacePath}/content/${dir}/${filename}${ext}`;

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
items: []
---

## 规划详情

`;
      } else {
        content = JSON.stringify(
          {
            name: filename,
            description: '',
            nodes: [],
            edges: [],
          },
          null,
          2
        );
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
