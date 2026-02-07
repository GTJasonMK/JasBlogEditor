/**
 * 内容解析服务
 * 处理 Markdown frontmatter 和 JSON 的解析与序列化
 */

import { parse as parseYAML, stringify as stringifyYAML } from 'yaml';
import type {
  ContentType,
  NoteMetadata,
  ProjectMetadata,
  RoadmapMetadata,
  RoadmapItem,
  RoadmapItemStatus,
  RoadmapPriority,
  GraphData,
  GraphMetadata,
  DocMetadata,
} from '@/types';

/**
 * 解析 Markdown 内容
 * 从 raw 文本中提取 YAML frontmatter 和正文内容
 */
export function parseMarkdownContent(
  raw: string,
  type: ContentType
): { metadata: NoteMetadata | ProjectMetadata | RoadmapMetadata | GraphMetadata | DocMetadata; content: string; hasFrontmatter: boolean } {
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
): NoteMetadata | ProjectMetadata | RoadmapMetadata | GraphMetadata | DocMetadata {
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
      date: parsed.date ? String(parsed.date) : undefined,
      status: normalizeRoadmapStatus(parsed.status),
    };
  }

  if (type === 'graph') {
    return {
      name: String(parsed.name || parsed.title || ''),
      description: String(parsed.description || ''),
      date: parsed.date ? String(parsed.date) : undefined,
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
 * 标准化规划状态
 */
function normalizeRoadmapStatus(value: unknown): 'active' | 'completed' | 'paused' {
  if (value === 'completed' || value === 'paused') return value;
  return 'active';
}

/**
 * 从 Markdown 正文解析规划任务列表
 *
 * 支持的格式：
 * - [ ] 任务标题 `priority`
 *   描述文本
 *   截止: 2026-06-01
 *
 * - [-] 进行中的任务 `high`
 * - [x] 已完成的任务
 *
 * 返回任务列表和剩余的非任务内容
 */
function stripTaskListHeading(content: string): string {
  const filteredLines = content
    .split('\n')
    .filter((line) => !/^(#{1,6}\s*)?任务列表[:：]?\s*$/.test(line.trim()));

  return filteredLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

export function parseRoadmapItemsFromContent(content: string): { items: RoadmapItem[]; remainingContent: string } {
  const lines = content.split('\n');
  const items: RoadmapItem[] = [];
  const nonTaskLines: string[] = [];

  let currentItem: RoadmapItem | null = null;
  let currentDescription: string[] = [];
  let currentDetails: string[] = [];
  let isCollectingDetails = false;
  let itemId = 1;

  // 任务行正则：- [ ] 或 - [-] 或 - [x] 开头，后面是标题，可选 `priority`
  const taskRegex = /^-\s*\[([ x\-])\]\s+(.+?)(?:\s+`(high|medium|low)`)?\s*$/;
  // 缩进行正则（至少2个空格）
  const indentRegex = /^(\s{2,})(.+)$/;
  // 截止日期正则
  const deadlineRegex = /^截止[:：]\s*(.+)$/;
  // 完成日期正则
  const completedAtRegex = /^完成[:：]\s*(.+)$/;
  // 描述和详情正则
  const descriptionLabelRegex = /^描述[:：]\s*(.*)$/;
  const detailsLabelRegex = /^详情[:：]\s*(.*)$/;

  const saveCurrentItem = () => {
    if (currentItem) {
      if (currentDescription.length > 0) {
        currentItem.description = currentDescription.join('\n').trim();
      }
      if (currentDetails.length > 0) {
        currentItem.details = currentDetails.join('\n').trim();
      }
      items.push(currentItem);
      currentItem = null;
      currentDescription = [];
      currentDetails = [];
      isCollectingDetails = false;
    }
  };

  for (const line of lines) {
    const taskMatch = line.match(taskRegex);

    if (taskMatch) {
      // 保存之前的任务
      saveCurrentItem();

      // 解析新任务
      const [, checkbox, title, priority] = taskMatch;
      let status: RoadmapItemStatus = 'todo';
      if (checkbox === 'x') status = 'done';
      else if (checkbox === '-') status = 'in_progress';

      currentItem = {
        id: String(itemId++),
        title: title.trim(),
        status,
        priority: (priority as RoadmapPriority) || 'medium',
      };
    } else if (currentItem) {
      // 当前有任务，检查是否是缩进的描述行
      const indentMatch = line.match(indentRegex);
      if (indentMatch) {
        const text = indentMatch[2];
        const deadlineMatch = text.match(deadlineRegex);
        const completedAtMatch = text.match(completedAtRegex);

        if (deadlineMatch) {
          currentItem.deadline = deadlineMatch[1].trim();
          isCollectingDetails = false;
        } else if (completedAtMatch) {
          currentItem.completedAt = completedAtMatch[1].trim();
          isCollectingDetails = false;
        } else {
          const descriptionLabelMatch = text.match(descriptionLabelRegex);
          const detailsLabelMatch = text.match(detailsLabelRegex);

          if (descriptionLabelMatch) {
            const descriptionLine = descriptionLabelMatch[1].trim();
            if (descriptionLine) {
              currentDescription.push(descriptionLine);
            }
            isCollectingDetails = false;
          } else if (detailsLabelMatch) {
            const detailLine = detailsLabelMatch[1].trim();
            if (detailLine) {
              currentDetails.push(detailLine);
            }
            isCollectingDetails = true;
          } else if (isCollectingDetails) {
            currentDetails.push(text);
          } else {
            currentDescription.push(text);
          }
        }
      } else if (line.trim() === '') {
        // 空行，可能是任务之间的分隔
        // 继续保持当前任务状态，允许多段描述
        if (isCollectingDetails && currentDetails.length > 0) {
          currentDetails.push('');
        } else if (currentDescription.length > 0) {
          currentDescription.push('');
        }
      } else {
        // 非缩进的非空行，任务结束
        saveCurrentItem();
        nonTaskLines.push(line);
      }
    } else {
      // 没有当前任务，这是普通内容
      nonTaskLines.push(line);
    }
  }

  // 保存最后一个任务
  saveCurrentItem();

  const rawRemainingContent = nonTaskLines.join('\n').trim();

  return {
    items,
    remainingContent: items.length > 0 ? stripTaskListHeading(rawRemainingContent) : rawRemainingContent,
  };
}

/**
 * 将规划任务列表序列化为 Markdown 正文
 */
export function serializeRoadmapItemsToContent(items: RoadmapItem[]): string {
  const lines: string[] = [];

  for (const item of items) {
    // 构建任务行
    let statusChar = ' ';
    if (item.status === 'done') {
      statusChar = 'x';
    } else if (item.status === 'in_progress') {
      statusChar = '-';
    }

    let taskLine = `- [${statusChar}] ${item.title}`;
    if (item.priority) {
      taskLine += ` \`${item.priority}\``;
    }
    lines.push(taskLine);

    // 添加描述
    if (item.description) {
      const descLines = item.description.split('\n');
      for (const desc of descLines) {
        lines.push(`  ${desc}`);
      }
    }

    // 添加详情（可选）
    if (item.details) {
      const detailLines = item.details.split('\n');
      if (detailLines.length > 0) {
        lines.push(`  详情: ${detailLines[0]}`);
        for (const detail of detailLines.slice(1)) {
          lines.push(`  ${detail}`);
        }
      }
    }


    // 添加截止日期
    if (item.deadline) {
      lines.push(`  截止: ${item.deadline}`);
    }

    // 添加完成日期
    if (item.completedAt) {
      lines.push(`  完成: ${item.completedAt}`);
    }

    // 空行分隔
    lines.push('');
  }

  return lines.join('\n').trim();
}

/**
 * 序列化 Markdown 内容
 * 将元数据和正文组合成完整的 Markdown 文件
 */
export function serializeMarkdownContent(
  metadata: NoteMetadata | ProjectMetadata | RoadmapMetadata | GraphMetadata,
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
 * 从 Markdown 正文中提取 graph 代码块
 * 返回 { graphData, remainingContent }
 * 如果没有找到 graph 代码块，返回空数据
 */
export function extractGraphFromContent(content: string): {
  graphData: GraphData;
  remainingContent: string;
} {
  // 匹配 ```graph ... ``` 代码块
  const graphBlockRegex = /```graph\s*\n([\s\S]*?)\n```/;
  const match = content.match(graphBlockRegex);

  if (!match) {
    // 没有 graph 代码块，返回空数据
    return {
      graphData: { nodes: [], edges: [] },
      remainingContent: content.trim(),
    };
  }

  const jsonStr = match[1].trim();
  let graphData: GraphData;

  try {
    const parsed = JSON.parse(jsonStr);
    graphData = {
      nodes: Array.isArray(parsed.nodes) ? parsed.nodes : [],
      edges: Array.isArray(parsed.edges) ? parsed.edges : [],
    };
  } catch (e) {
    console.error('图谱 graph 代码块 JSON 格式错误:', e);
    graphData = { nodes: [], edges: [] };
  }

  // 移除 graph 代码块，保留其他内容
  const remainingContent = content.replace(graphBlockRegex, '').trim();

  return { graphData, remainingContent };
}

/**
 * 将图谱数据序列化到 Markdown 正文中
 */
export function serializeGraphToContent(
  graphData: GraphData,
  remainingContent: string
): string {
  const graphJson = JSON.stringify(graphData, null, 2);
  const graphBlock = '```graph\n' + graphJson + '\n```';

  if (remainingContent.trim()) {
    return remainingContent.trim() + '\n\n' + graphBlock;
  }
  return graphBlock;
}

/**
 * 获取默认元数据
 */
function getDefaultMetadata(type: ContentType): NoteMetadata | ProjectMetadata | RoadmapMetadata | GraphMetadata | DocMetadata {
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
      status: 'active',
    };
  }

  if (type === 'graph') {
    return {
      name: '',
      description: '',
      date: today,
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
