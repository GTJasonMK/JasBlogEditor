import { create } from 'zustand';
import { invokeTauri } from '@/platform/tauri';
import type { ContentType } from '@/types';

interface FileTreeNode {
  name: string;
  path: string;
  isDir: boolean;
  children?: FileTreeNode[];
  contentType?: ContentType;
}

interface FileState {
  workspacePath: string | null;
  fileTree: FileTreeNode[];
  isLoading: boolean;
  error: string | null;

  setWorkspacePath: (path: string) => void;
  loadFileTree: () => Promise<void>;
  refreshFileTree: () => Promise<void>;
}

// Rust 返回的 FileInfo 使用 snake_case
interface RustFileInfo {
  name: string;
  path: string;
  is_dir: boolean;
}

// 内容目录映射
const CONTENT_DIR_MAP: Record<string, ContentType> = {
  notes: 'note',
  projects: 'project',
  roadmaps: 'roadmap',
  graphs: 'graph',
};

export const useFileStore = create<FileState>((set, get) => ({
  workspacePath: null,
  fileTree: [],
  isLoading: false,
  error: null,

  setWorkspacePath: (path) => {
    set({ workspacePath: path, fileTree: [], error: null });
  },

  loadFileTree: async () => {
    const { workspacePath } = get();
    if (!workspacePath) return;

    set({ isLoading: true, error: null });

    try {
      // 读取 content 目录
      const contentPath = `${workspacePath}/content`;
      const contentExists = await invokeTauri<boolean>('path_exists', { path: contentPath });

      if (!contentExists) {
        set({ error: '未找到 content 目录，请确认选择的是 JasBlog 项目目录', isLoading: false });
        return;
      }

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

      set({ fileTree: tree, isLoading: false });
    } catch (error) {
      console.error('加载文件树失败:', error);
      set({ error: `加载文件树失败: ${error}`, isLoading: false });
    }
  },

  refreshFileTree: async () => {
    await get().loadFileTree();
  },
}));
