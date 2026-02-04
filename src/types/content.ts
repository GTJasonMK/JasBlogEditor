/**
 * 内容类型定义
 */

// 工作区类型
export type WorkspaceType = 'jasblog' | 'docs';

// 主题模式
export type ThemeMode = 'light' | 'dark' | 'system';

// 内容类型枚举
export type ContentType = 'note' | 'project' | 'roadmap' | 'graph' | 'doc';

// 通用元数据接口
export interface BaseMetadata {
  title: string;
  date: string;
}

// 学习笔记元数据
export interface NoteMetadata extends BaseMetadata {
  excerpt: string;
  tags?: string[];
}

// 开源项目元数据
export interface ProjectMetadata {
  title: string;
  description: string;
  github: string;
  demo?: string;
  date?: string;
  tags?: string[];
  techStack?: TechStackItem[];
  status?: 'active' | 'archived' | 'wip';
}

export interface TechStackItem {
  name: string;
  icon?: string;
}

// 规划文档元数据
export interface RoadmapMetadata {
  title: string;
  description: string;
  items: RoadmapItem[];
}

export interface RoadmapItem {
  title: string;
  status: 'completed' | 'in-progress' | 'planned';
  description?: string;
}

// 普通文档元数据（简化版）
export interface DocMetadata {
  title: string;
  date?: string;
}

// 知识图谱数据
export interface GraphData {
  name: string;
  description: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphNode {
  id: string;
  position: { x: number; y: number };
  data: {
    label: string;
    color?: string;
    tags?: string[];
    content?: string;
  };
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

// 文件信息
export interface FileInfo {
  name: string;
  path: string;
  isDir: boolean;
}

// 编辑器文件
export interface EditorFile {
  path: string;
  name: string;
  type: ContentType;
  content: string;
  metadata: NoteMetadata | ProjectMetadata | RoadmapMetadata | GraphData | DocMetadata;
  isDirty: boolean;
  hasFrontmatter: boolean;  // 标记原文件是否有 frontmatter
}

// 设置
export interface Settings {
  workspacePath: string | null;
  workspaceType?: WorkspaceType;  // 工作区类型
  lastOpenedFile: string | null;
  miniModeSettings?: MiniModeSettings;
  theme?: ThemeMode;  // 主题模式
}

// 迷你写作模式窗口配置
export interface MiniModeSettings {
  width: number;
  height: number;
  positionX?: number;
  positionY?: number;
}

// 窗口状态（用于保存和恢复正常模式窗口）
export interface WindowState {
  width: number;
  height: number;
  x: number;
  y: number;
  isMaximized: boolean;
}

// 目录映射（仅 JasBlog 模式使用）
export const CONTENT_DIRS: Record<Exclude<ContentType, 'doc'>, string> = {
  note: 'notes',
  project: 'projects',
  roadmap: 'roadmaps',
  graph: 'graphs',
};

// 文件扩展名映射
export const FILE_EXTENSIONS: Record<ContentType, string> = {
  note: '.md',
  project: '.md',
  roadmap: '.md',
  graph: '.json',
  doc: '.md',
};
