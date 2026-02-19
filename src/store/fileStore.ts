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
  fileTreeVersion: number;
  isLoading: boolean;
  error: string | null;

  setWorkspacePath: (path: string) => void;
  setWorkspaceType: (type: WorkspaceType) => void;
  initWorkspace: (path: string) => Promise<{ workspacePath: string; workspaceType: WorkspaceType }>;
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

function trimTrailingSeparators(value: string): string {
  return value.replace(/[\\/]+$/, '');
}

function getParentPath(value: string): string {
  const trimmed = trimTrailingSeparators(value);
  if (!trimmed) return value;

  const slashIndex = Math.max(trimmed.lastIndexOf('/'), trimmed.lastIndexOf('\\'));
  if (slashIndex === -1) return trimmed;

  const parent = trimmed.slice(0, slashIndex);
  if (!parent) {
    return trimmed[0] === '/' ? '/' : trimmed;
  }

  return parent;
}

async function isJasBlogWorkspaceRoot(path: string): Promise<boolean> {
  const workspacePath = trimTrailingSeparators(path);
  if (!workspacePath) return false;

  const contentPath = `${workspacePath}/content`;
  const hasContent = await invokeTauri('path_exists', { path: contentPath });
  if (!hasContent) return false;

  const moduleDirs = Object.values(CONTENT_DIRS).map((dir) => `${contentPath}/${dir}`);
  const exists = await Promise.all(
    moduleDirs.map(async (dirPath) => {
      try {
        return await invokeTauri('path_exists', { path: dirPath });
      } catch {
        return false;
      }
    })
  );

  // 只要存在任意一个模块目录，就认为是 JasBlog 工作区
  return exists.some(Boolean);
}

async function resolveWorkspacePath(inputPath: string): Promise<string> {
  const normalized = trimTrailingSeparators(inputPath);
  if (!normalized) return inputPath;

  let current = normalized;
  // 向上最多尝试 6 层，覆盖常见的选择：root / content / content/<module> / content/<module>/YYYY/MM...
  for (let i = 0; i < 6; i += 1) {
    if (await isJasBlogWorkspaceRoot(current)) {
      return current;
    }

    const parent = getParentPath(current);
    if (parent === current) break;
    current = parent;
  }

  return normalized;
}

async function detectWorkspaceTypeByPath(path: string): Promise<WorkspaceType> {
  try {
    return await isJasBlogWorkspaceRoot(path) ? 'jasblog' : 'docs';
  } catch {
    return 'docs';
  }
}

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
 * 递归加载 JasBlog 内容文件树（content/<type>/...）
 * - 仅收集 .md 文件
 * - 允许内容目录下存在子目录（Diary 默认就是 YYYY/MM 结构）
 */
async function loadJasBlogContentTree(
  dirPath: string,
  contentType: JasBlogContentType,
  depth = 0
): Promise<FileTreeNode[]> {
  if (depth > MAX_DEPTH) return [];

  const files = await invokeTauri('read_directory', { path: dirPath });
  const nodes: FileTreeNode[] = [];

  for (const file of files) {
    // 跳过隐藏文件/目录
    if (file.name.startsWith('.')) continue;

    if (file.is_dir) {
      const children = await loadJasBlogContentTree(file.path, contentType, depth + 1);
      if (children.length > 0) {
        nodes.push({
          name: file.name,
          path: file.path,
          isDir: true,
          children,
        });
      }
      continue;
    }

    if (!file.name.toLowerCase().endsWith('.md')) continue;

    nodes.push({
      name: file.name,
      path: file.path,
      isDir: false,
      contentType,
    });
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
      const children = await loadJasBlogContentTree(dir.path, contentType);

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

export const useFileStore = create<FileState>((set, get) => {
  let loadRequestId = 0;
  let initRequestId = 0;

  return {
    workspacePath: null,
    workspaceType: null,
    fileTree: [],
    fileTreeVersion: 0,
    isLoading: false,
    error: null,

    setWorkspacePath: (path) => {
      set({ workspacePath: path, fileTree: [], fileTreeVersion: 0, error: null });
    },

    setWorkspaceType: (type) => {
      set({ workspaceType: type });
    },

    initWorkspace: async (path) => {
      const requestId = ++initRequestId;

      const resolvedPath = await resolveWorkspacePath(path);
      const detectedType = await detectWorkspaceTypeByPath(resolvedPath);

      const workspaceType = detectedType;

      if (requestId !== initRequestId) {
        return { workspacePath: resolvedPath, workspaceType };
      }

      const current = get();
      if (
        current.workspacePath === resolvedPath &&
        current.workspaceType === workspaceType &&
        current.fileTreeVersion > 0 &&
        !current.isLoading
      ) {
        return { workspacePath: resolvedPath, workspaceType };
      }

      // 先写入路径，确保后续 loadFileTree 使用的是最新值
      set({ workspacePath: resolvedPath, workspaceType, fileTree: [], fileTreeVersion: 0, error: null });

      // 加载文件树
      await get().loadFileTree();
      return { workspacePath: resolvedPath, workspaceType };
    },

    detectWorkspaceType: async () => {
      const { workspacePath } = get();
      if (!workspacePath) return 'docs';

      return await detectWorkspaceTypeByPath(workspacePath);
    },

    loadFileTree: async () => {
      const { workspacePath, workspaceType } = get();
      if (!workspacePath) return;

      const requestId = ++loadRequestId;
      const startWorkspacePath = workspacePath;
      const startWorkspaceType = workspaceType;

      set({ isLoading: true, error: null });

      try {
        if (workspaceType === 'jasblog') {
          // JasBlog 模式：检查 content 目录
          const contentPath = `${workspacePath}/content`;
          const contentExists = await invokeTauri('path_exists', { path: contentPath });

          if (!contentExists) {
            if (requestId === loadRequestId) {
              set({ error: '未找到 content 目录，请确认选择的是 JasBlog 项目目录', isLoading: false });
            }
            return;
          }

          const tree = await loadJasBlogFileTree(workspacePath);
          if (requestId !== loadRequestId) return;
          if (get().workspacePath !== startWorkspacePath || get().workspaceType !== startWorkspaceType) return;
          set((state) => ({ fileTree: tree, fileTreeVersion: state.fileTreeVersion + 1, isLoading: false }));
          return;
        }

        // 普通文档模式：递归加载
        const tree = await loadDocsFileTree(workspacePath);
        if (requestId !== loadRequestId) return;
        if (get().workspacePath !== startWorkspacePath || get().workspaceType !== startWorkspaceType) return;
        set((state) => ({ fileTree: tree, fileTreeVersion: state.fileTreeVersion + 1, isLoading: false }));
      } catch (error) {
        console.error('加载文件树失败:', error);
        if (requestId !== loadRequestId) return;
        if (get().workspacePath !== startWorkspacePath || get().workspaceType !== startWorkspaceType) return;
        set({ error: `加载文件树失败: ${error}`, isLoading: false });
      }
    },

    refreshFileTree: async () => {
      await get().loadFileTree();
    },
  };
});
