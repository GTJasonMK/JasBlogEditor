/**
 * 内容解析服务
 * 处理 Markdown frontmatter 和 JSON 的解析与序列化
 */

import { parse as parseYAML, stringify as stringifyYAML } from 'yaml';
import type { ContentType, NoteMetadata, ProjectMetadata, RoadmapMetadata, GraphData, DocMetadata } from '@/types';

/**
 * 解析 Markdown 内容
 * 从 raw 文本中提取 YAML frontmatter 和正文内容
 */
export function parseMarkdownContent(
  raw: string,
  type: ContentType
): { metadata: NoteMetadata | ProjectMetadata | RoadmapMetadata | DocMetadata; content: string; hasFrontmatter: boolean } {
  // 匹配 YAML frontmatter: --- ... ---
  const frontmatterMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);

  if (!frontmatterMatch) {
    // 没有 frontmatter，返回默认元数据
    const defaultMetadata = getDefaultMetadata(type);
    return { metadata: defaultMetadata, content: raw, hasFrontmatter: false };
  }

  const yamlContent = frontmatterMatch[1];
  const bodyContent = frontmatterMatch[2];

  let parsed: Record<string, unknown> = {};
  try {
    parsed = parseYAML(yamlContent) || {};
  } catch (error) {
    console.error('YAML 解析失败:', error);
    return { metadata: getDefaultMetadata(type), content: bodyContent, hasFrontmatter: true };
  }

  // 根据类型构建元数据
  const metadata = buildMetadata(parsed, type);
  return { metadata, content: bodyContent, hasFrontmatter: true };
}

/**
 * 根据解析结果和类型构建元数据对象
 */
function buildMetadata(
  parsed: Record<string, unknown>,
  type: ContentType
): NoteMetadata | ProjectMetadata | RoadmapMetadata | DocMetadata {
  const today = new Date().toISOString().split('T')[0];

  if (type === 'note') {
    return {
      title: String(parsed.title || ''),
      date: String(parsed.date || today),
      excerpt: String(parsed.excerpt || ''),
      tags: normalizeStringArray(parsed.tags),
    };
  }

  if (type === 'project') {
    return {
      title: String(parsed.title || ''),
      description: String(parsed.description || ''),
      github: String(parsed.github || ''),
      demo: parsed.demo ? String(parsed.demo) : undefined,
      date: parsed.date ? String(parsed.date) : undefined,
      tags: normalizeStringArray(parsed.tags),
      techStack: normalizeTechStack(parsed.techStack),
      status: normalizeStatus(parsed.status),
    };
  }

  if (type === 'roadmap') {
    return {
      title: String(parsed.title || ''),
      description: String(parsed.description || ''),
      items: normalizeRoadmapItems(parsed.items),
    };
  }

  // doc 类型（普通文档）
  return {
    title: String(parsed.title || ''),
    date: parsed.date ? String(parsed.date) : undefined,
  };
}

/**
 * 标准化字符串数组
 */
function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

/**
 * 标准化 techStack 数组
 */
function normalizeTechStack(value: unknown): { name: string; icon?: string }[] | undefined {
  if (!Array.isArray(value)) return undefined;

  return value
    .filter((item): item is Record<string, unknown> =>
      typeof item === 'object' && item !== null
    )
    .map(item => ({
      name: String(item.name || ''),
      icon: item.icon ? String(item.icon) : undefined,
    }))
    .filter(item => item.name !== '');
}

/**
 * 标准化项目状态
 */
function normalizeStatus(value: unknown): 'active' | 'archived' | 'wip' {
  if (value === 'archived' || value === 'wip') return value;
  return 'active';
}

/**
 * 标准化 roadmap items 数组
 */
function normalizeRoadmapItems(value: unknown): RoadmapMetadata['items'] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is Record<string, unknown> =>
      typeof item === 'object' && item !== null
    )
    .map(item => ({
      title: String(item.title || ''),
      status: normalizeItemStatus(item.status),
      description: item.description ? String(item.description) : undefined,
    }));
}

/**
 * 标准化 roadmap item 状态
 */
function normalizeItemStatus(value: unknown): 'completed' | 'in-progress' | 'planned' {
  if (value === 'completed' || value === 'done') return 'completed';
  if (value === 'in-progress') return value;
  return 'planned';
}

/**
 * 序列化 Markdown 内容
 * 将元数据和正文组合成完整的 Markdown 文件
 */
export function serializeMarkdownContent(
  metadata: NoteMetadata | ProjectMetadata | RoadmapMetadata,
  content: string
): string {
  // 清理元数据，移除 undefined 和空数组
  const cleanedMetadata = cleanMetadataForYaml(metadata as unknown as Record<string, unknown>);

  // 使用 yaml 库序列化
  const yaml = stringifyYAML(cleanedMetadata, {
    lineWidth: 0, // 禁用自动换行
    defaultStringType: 'PLAIN', // 简单字符串不加引号
    defaultKeyType: 'PLAIN',
  });

  return `---\n${yaml}---\n\n${content}`;
}

/**
 * 清理元数据对象，移除不需要序列化的字段
 */
function cleanMetadataForYaml(metadata: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(metadata)) {
    // 跳过 undefined 和 null
    if (value === undefined || value === null) continue;

    // 跳过空数组（可选，根据需求决定是否保留）
    if (Array.isArray(value) && value.length === 0) continue;

    // 跳过空字符串的可选字段
    if (value === '' && (key === 'demo' || key === 'icon')) continue;

    result[key] = value;
  }

  return result;
}

/**
 * 解析 JSON 内容（用于 graph 类型）
 */
export function parseJsonContent(raw: string): GraphData {
  try {
    const data = JSON.parse(raw);
    return {
      name: String(data.name || ''),
      description: String(data.description || ''),
      nodes: Array.isArray(data.nodes) ? data.nodes : [],
      edges: Array.isArray(data.edges) ? data.edges : [],
    };
  } catch (error) {
    console.error('JSON 解析失败:', error);
    return {
      name: '',
      description: '',
      nodes: [],
      edges: [],
    };
  }
}

/**
 * 序列化 JSON 内容
 */
export function serializeJsonContent(data: GraphData): string {
  return JSON.stringify(data, null, 2);
}

/**
 * 获取默认元数据
 */
function getDefaultMetadata(type: ContentType): NoteMetadata | ProjectMetadata | RoadmapMetadata | DocMetadata {
  const today = new Date().toISOString().split('T')[0];

  if (type === 'note') {
    return {
      title: '',
      date: today,
      excerpt: '',
      tags: [],
    };
  }

  if (type === 'project') {
    return {
      title: '',
      description: '',
      github: '',
      tags: [],
      status: 'active',
    };
  }

  if (type === 'roadmap') {
    return {
      title: '',
      description: '',
      items: [],
    };
  }

  // doc 类型
  return {
    title: '',
    date: undefined,
  };
}

/**
 * 序列化普通文档内容
 */
export function serializeDocContent(
  metadata: DocMetadata,
  content: string,
  includeFrontmatter: boolean
): string {
  if (!includeFrontmatter) {
    return content;
  }

  const cleanedMetadata: Record<string, unknown> = {};
  if (metadata.title) {
    cleanedMetadata.title = metadata.title;
  }
  if (metadata.date) {
    cleanedMetadata.date = metadata.date;
  }

  // 如果清理后没有任何元数据，就不添加 frontmatter
  if (Object.keys(cleanedMetadata).length === 0) {
    return content;
  }

  const yaml = stringifyYAML(cleanedMetadata, {
    lineWidth: 0,
    defaultStringType: 'PLAIN',
    defaultKeyType: 'PLAIN',
  });

  return `---\n${yaml}---\n\n${content}`;
}
