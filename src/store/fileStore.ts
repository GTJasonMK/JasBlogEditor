import { create } from 'zustand';
import { invokeTauri } from '@/platform/tauri';
import type { ContentType, WorkspaceType } from '@/types';

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
  detectWorkspaceType: () => Promise<WorkspaceType>;
  loadFileTree: () => Promise<void>;
  refreshFileTree: () => Promise<void>;
}

// Rust 返回的 FileInfo 使用 snake_case
interface RustFileInfo {
  name: string;
  path: string;
  is_dir: boolean;
}

// 内容目录映射（JasBlog 模式）
const CONTENT_DIR_MAP: Record<string, ContentType> = {
  notes: 'note',
  projects: 'project',
  roadmaps: 'roadmap',
  graphs: 'graph',
};

// 最大递归深度
const MAX_DEPTH = 10;

/**
 * 递归加载文件树（普通文档模式）
 */
async function loadDocsFileTree(dirPath: string, depth = 0): Promise<FileTreeNode[]> {
  if (depth > MAX_DEPTH) return [];

  const files = await invokeTauri<RustFileInfo[]>('read_directory', { path: dirPath });
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
  const contentDirs = await invokeTauri<RustFileInfo[]>('read_directory', { path: contentPath });
  const tree: FileTreeNode[] = [];

  for (const dir of contentDirs) {
    if (dir.is_dir && CONTENT_DIR_MAP[dir.name]) {
      const contentType = CONTENT_DIR_MAP[dir.name];
      const files = await invokeTauri<RustFileInfo[]>('read_directory', { path: dir.path });

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
  const order = ['notes', 'projects', 'roadmaps', 'graphs'];
  tree.sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));

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

  detectWorkspaceType: async () => {
    const { workspacePath } = get();
    if (!workspacePath) return 'docs';

    try {
      // 检查是否有 content/notes 目录（JasBlog 项目标志）
      const contentPath = `${workspacePath}/content`;
      const notesPath = `${contentPath}/notes`;

      const hasContent = await invokeTauri<boolean>('path_exists', { path: contentPath });
      if (!hasContent) return 'docs';

      const hasNotes = await invokeTauri<boolean>('path_exists', { path: notesPath });
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
        const contentExists = await invokeTauri<boolean>('path_exists', { path: contentPath });

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
