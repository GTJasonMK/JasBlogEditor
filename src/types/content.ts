/**
 * 内容类型定义
 */

// 工作区类型
export type WorkspaceType = 'jasblog' | 'docs';

// 主题模式
export type ThemeMode = 'light' | 'dark' | 'system';

// 内容类型枚举
export type ContentType = 'note' | 'project' | 'roadmap' | 'graph' | 'doc';

// JasBlog 内容类型（content/ 下的固定四类）
export const JASBLOG_CONTENT_TYPES = ['note', 'project', 'roadmap', 'graph'] as const;
export type JasBlogContentType = (typeof JASBLOG_CONTENT_TYPES)[number];

// 内容类型中文标签（用于 UI 显示）
export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  note: '笔记',
  project: '项目',
  roadmap: '规划',
  graph: '图谱',
  doc: '文档',
};

// JasBlog 左侧栏分组名称（比内容类型标签更贴近站点语义）
export const JASBLOG_SECTION_LABELS: Record<JasBlogContentType, string> = {
  note: '学习笔记',
  project: '开源项目',
  roadmap: '我的规划',
  graph: '知识图谱',
};

// JasBlog 左侧栏分组图标（Heroicons path）
export const JASBLOG_SECTION_ICONS: Record<JasBlogContentType, string> = {
  note: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  project: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z',
  roadmap: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
  graph: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1',
};

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

// 规划文档元数据（frontmatter 部分）
export interface RoadmapMetadata {
  title: string;
  description: string;
  date?: string;
  status?: RoadmapStatus;
}

// 规划状态
export type RoadmapStatus = 'active' | 'completed' | 'paused';

// 任务优先级
export type RoadmapPriority = 'high' | 'medium' | 'low';

// 任务状态
export type RoadmapItemStatus = 'todo' | 'in_progress' | 'done';

// 规划任务项（从正文 Markdown 解析）
export interface RoadmapItem {
  id: string;
  title: string;
  description?: string;
  status: RoadmapItemStatus;
  details?: string;
  priority: RoadmapPriority;  // 必填，默认 medium
  deadline?: string;
  completedAt?: string;
}

// 普通文档元数据（简化版）
export interface DocMetadata {
  title: string;
  date?: string;
}

// ============================================
// 知识图谱相关类型（与 JasBlog 保持一致）
// ============================================

// 节点颜色类型
export type NodeColor = "default" | "red" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink";

// 节点颜色配置（与 GraphAndTable 一致）
export const nodeColorConfig: Record<NodeColor, { bg: string; border: string; text: string }> = {
  default: { bg: "#FDFBF8", border: "#DDD5CB", text: "#3D3329" },
  red: { bg: "#FEF2F2", border: "#FCA5A5", text: "#991B1B" },
  orange: { bg: "#FFF7ED", border: "#FDBA74", text: "#9A3412" },
  yellow: { bg: "#FEFCE8", border: "#FDE047", text: "#854D0E" },
  green: { bg: "#F0FDF4", border: "#86EFAC", text: "#166534" },
  blue: { bg: "#EFF6FF", border: "#93C5FD", text: "#1E40AF" },
  purple: { bg: "#FAF5FF", border: "#C4B5FD", text: "#6B21A8" },
  pink: { bg: "#FDF2F8", border: "#F9A8D4", text: "#9D174D" },
};

// 连线重要程度等级（与 GraphAndTable 一致）
export const EDGE_IMPORTANCE_RANKS = [
  "p0", "p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8", "p9",
] as const;

export type EdgeImportance = (typeof EDGE_IMPORTANCE_RANKS)[number];

// 连线颜色类型
export type EdgeColor = "default" | EdgeImportance;

// 连线颜色配置（与 GraphAndTable 一致）
export const edgeColorConfig: Record<EdgeColor, { stroke: string; label: string; description: string }> = {
  default: { stroke: "#64748B", label: "默认", description: "未设置重要度" },
  p0: { stroke: "#DC2626", label: "P0 核心", description: "核心知识点" },
  p1: { stroke: "#F97316", label: "P1 极重要", description: "非常关键的知识点" },
  p2: { stroke: "#F59E0B", label: "P2 很重要", description: "较关键的知识点" },
  p3: { stroke: "#EAB308", label: "P3 重要", description: "重要知识点" },
  p4: { stroke: "#84CC16", label: "P4 较重要", description: "较重要知识点" },
  p5: { stroke: "#22C55E", label: "P5 一般", description: "一般知识点" },
  p6: { stroke: "#10B981", label: "P6 次要", description: "次要知识点" },
  p7: { stroke: "#06B6D4", label: "P7 延伸", description: "延伸/补充知识点" },
  p8: { stroke: "#3B82F6", label: "P8 参考", description: "参考信息/旁支内容" },
  p9: { stroke: "#8B5CF6", label: "P9 可忽略", description: "低优先级内容" },
};

// 获取边颜色的 stroke 值
export function getEdgeStroke(color?: EdgeColor): string {
  if (!color || !edgeColorConfig[color]) {
    return edgeColorConfig.default.stroke;
  }
  return edgeColorConfig[color].stroke;
}

// 边关系类型
export type EdgeRelation = "related" | "prerequisite" | "extends" | "custom";

// 锁定模式（与 GraphAndTable 一致）
export type LockMode = "direct" | "transitive";

// 知识节点数据类型
export interface KnowledgeNodeData {
  label: string;
  content?: string; // TipTap HTML 内容
  tags?: string[];
  color?: NodeColor;
  edgeColor?: EdgeColor;
  locked?: boolean;
  lockMode?: LockMode;
  createdAt?: number;
  updatedAt?: number;
  // 索引签名，兼容 React Flow 的 Record<string, unknown>
  [key: string]: unknown;
}

// 边数据类型
export interface KnowledgeEdgeData {
  relation?: EdgeRelation;
  label?: string;
  color?: EdgeColor;
  [key: string]: unknown;
}

// 图节点
export interface GraphNode {
  id: string;
  type?: string;
  position: { x: number; y: number };
  data: KnowledgeNodeData;
}

// 图边
export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  data?: KnowledgeEdgeData;
  label?: string;
}

// 完整的图数据（仅包含节点和边）
export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// 图谱元数据（frontmatter 部分）
export interface GraphMetadata {
  name: string;
  description: string;
  date?: string;
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
  metadata: NoteMetadata | ProjectMetadata | RoadmapMetadata | GraphMetadata | DocMetadata;
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
export const CONTENT_DIRS: Record<JasBlogContentType, string> = {
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
  graph: '.md',
  doc: '.md',
};
