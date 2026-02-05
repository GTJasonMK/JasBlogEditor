import { create } from 'zustand';
import { invokeTauri } from '@/platform/tauri';
import { CONTENT_DIRS, JASBLOG_CONTENT_TYPES } from '@/types';
import type { ContentType, WorkspaceType, JasBlogContentType } from '@/types';

export interface FileTreeNode {
  name: string;
  path: string;
  isDir: boolean;
  children?: FileTreeNode[];
  contentType?: ContentType;
}

interface FileState {
  workspacePath: string | null;
  workspaceType: WorkspaceType | null;
  fileTree: FileTreeNode[];
  isLoading: boolean;
  error: string | null;

  setWorkspacePath: (path: string) => void;
  setWorkspaceType: (type: WorkspaceType) => void;
  initWorkspace: (path: string, preferredType?: WorkspaceType | null) => Promise<WorkspaceType>;
  detectWorkspaceType: () => Promise<WorkspaceType>;
  loadFileTree: () => Promise<void>;
  refreshFileTree: () => Promise<void>;
}

// 内容目录映射（JasBlog 模式）：目录名 -> ContentType
const JASBLOG_DIR_TO_TYPE = Object.fromEntries(
  Object.entries(CONTENT_DIRS).map(([type, dir]) => [dir, type])
) as Record<string, JasBlogContentType>;

// JasBlog 目录排序顺序（与站点一致）
const JASBLOG_DIR_ORDER = JASBLOG_CONTENT_TYPES.map((type) => CONTENT_DIRS[type]);

// 最大递归深度
const MAX_DEPTH = 10;

/**
 * 递归加载文件树（普通文档模式）
 */
async function loadDocsFileTree(dirPath: string, depth = 0): Promise<FileTreeNode[]> {
  if (depth > MAX_DEPTH) return [];

  const files = await invokeTauri('read_directory', { path: dirPath });
  const nodes: FileTreeNode[] = [];

  for (const file of files) {
    // 跳过隐藏文件
    if (file.name.startsWith('.')) continue;

    if (file.is_dir) {
      // 递归加载子目录
      const children = await loadDocsFileTree(file.path, depth + 1);
      // 只添加包含 .md 文件的目录
      if (children.length > 0 || depth === 0) {
        nodes.push({
          name: file.name,
          path: file.path,
          isDir: true,
          children,
        });
      }
    } else if (file.name.endsWith('.md')) {
      // 只处理 .md 文件
      nodes.push({
        name: file.name,
        path: file.path,
        isDir: false,
        contentType: 'doc',
      });
    }
  }

  // 排序：目录在前，文件在后，各自按名称排序
  nodes.sort((a, b) => {
    if (a.isDir !== b.isDir) {
      return a.isDir ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  return nodes;
}

/**
 * 加载 JasBlog 文件树
 */
async function loadJasBlogFileTree(workspacePath: string): Promise<FileTreeNode[]> {
  const contentPath = `${workspacePath}/content`;
  const contentDirs = await invokeTauri('read_directory', { path: contentPath });
  const tree: FileTreeNode[] = [];

  for (const dir of contentDirs) {
    if (dir.is_dir && JASBLOG_DIR_TO_TYPE[dir.name]) {
      const contentType = JASBLOG_DIR_TO_TYPE[dir.name];
      const files = await invokeTauri('read_directory', { path: dir.path });

      const children: FileTreeNode[] = files
        .filter(f => !f.is_dir && !f.name.startsWith('.'))
        .map(f => ({
          name: f.name,
          path: f.path,
          isDir: false,
          contentType,
        }));

      tree.push({
        name: dir.name,
        path: dir.path,
        isDir: true,
        children,
        contentType,
      });
    }
  }

  // 按特定顺序排序
  tree.sort((a, b) => JASBLOG_DIR_ORDER.indexOf(a.name) - JASBLOG_DIR_ORDER.indexOf(b.name));

  return tree;
}

export const useFileStore = create<FileState>((set, get) => ({
  workspacePath: null,
  workspaceType: null,
  fileTree: [],
  isLoading: false,
  error: null,

  setWorkspacePath: (path) => {
    set({ workspacePath: path, fileTree: [], error: null });
  },

  setWorkspaceType: (type) => {
    set({ workspaceType: type });
  },

  initWorkspace: async (path, preferredType = null) => {
    // 先写入路径，确保 detectWorkspaceType 使用的是最新值
    set({ workspacePath: path, fileTree: [], error: null });

    // 优先使用外部传入的类型，否则自动检测
    const workspaceType = preferredType || await get().detectWorkspaceType();
    set({ workspaceType });

    // 加载文件树
    await get().loadFileTree();
    return workspaceType;
  },

  detectWorkspaceType: async () => {
    const { workspacePath } = get();
    if (!workspacePath) return 'docs';

    try {
      // 检查是否有 content/notes 目录（JasBlog 项目标志）
      const contentPath = `${workspacePath}/content`;
      const notesPath = `${contentPath}/${CONTENT_DIRS.note}`;

      const hasContent = await invokeTauri('path_exists', { path: contentPath });
      if (!hasContent) return 'docs';

      const hasNotes = await invokeTauri('path_exists', { path: notesPath });
      return hasNotes ? 'jasblog' : 'docs';
    } catch {
      return 'docs';
    }
  },

  loadFileTree: async () => {
    const { workspacePath, workspaceType } = get();
    if (!workspacePath) return;

    set({ isLoading: true, error: null });

    try {
      if (workspaceType === 'jasblog') {
        // JasBlog 模式：检查 content 目录
        const contentPath = `${workspacePath}/content`;
        const contentExists = await invokeTauri('path_exists', { path: contentPath });

        if (!contentExists) {
          set({ error: '未找到 content 目录，请确认选择的是 JasBlog 项目目录', isLoading: false });
          return;
        }

        const tree = await loadJasBlogFileTree(workspacePath);
        set({ fileTree: tree, isLoading: false });
      } else {
        // 普通文档模式：递归加载
        const tree = await loadDocsFileTree(workspacePath);
        set({ fileTree: tree, isLoading: false });
      }
    } catch (error) {
      console.error('加载文件树失败:', error);
      set({ error: `加载文件树失败: ${error}`, isLoading: false });
    }
  },

  refreshFileTree: async () => {
    await get().loadFileTree();
  },
}));
