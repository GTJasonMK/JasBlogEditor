/**
 * 内容解析服务
 * 处理 Markdown frontmatter 和 JSON 的解析与序列化
 */

import { parse as parseYAML, parseDocument as parseYamlDocument, stringify as stringifyYAML } from 'yaml';
import type {
  ContentType,
  NoteMetadata,
  ProjectMetadata,
  DiaryMetadata,
  RoadmapMetadata,
  RoadmapItem,
  RoadmapItemStatus,
  RoadmapPriority,
  GraphData,
  GraphMetadata,
  DocMetadata,
  TechStackItem,
  LineEnding,
} from '@/types';

function getLocalDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 解析 Markdown 内容
 * 从 raw 文本中提取 YAML frontmatter 和正文内容
 */
export function parseMarkdownContent(
  raw: string,
  type: ContentType
): {
  metadata: NoteMetadata | ProjectMetadata | DiaryMetadata | RoadmapMetadata | GraphMetadata | DocMetadata;
  frontmatterRaw: Record<string, unknown>;
  frontmatterBlock: string | null;
  content: string;
  hasFrontmatter: boolean;
  hasBom: boolean;
  lineEnding: LineEnding;
} {
  // 兼容 Windows/部分编辑器写入的 UTF-8 BOM（JasBlog content 示例文件中存在）
  const hasBom = raw.charCodeAt(0) === 0xFEFF;
  const rawText = hasBom ? raw.slice(1) : raw;
  const lineEnding: LineEnding = rawText.includes('\r\n') ? 'crlf' : 'lf';

  // 匹配 YAML frontmatter: --- ... ---
  // - frontmatterBlock：尽量保留原始文本（含注释/缩进/空行），用于“原样保存”
  // - yamlContent：仅用于解析出 metadata（不做格式化）
  const frontmatterMatch = rawText.match(/^(---\r?\n)([\s\S]*?)(\r?\n---\r?\n?)([\s\S]*)$/);

  if (!frontmatterMatch) {
    // 没有 frontmatter，返回默认元数据
    const defaultMetadata = getDefaultMetadata(type);
    return { metadata: defaultMetadata, frontmatterRaw: {}, frontmatterBlock: null, content: rawText, hasFrontmatter: false, hasBom, lineEnding };
  }

  const frontmatterBlock = frontmatterMatch[1] + frontmatterMatch[2] + frontmatterMatch[3];
  const yamlContent = frontmatterMatch[2];
  const bodyContent = frontmatterMatch[4];

  let parsed: Record<string, unknown> = {};
  try {
    parsed = parseYAML(yamlContent) || {};
  } catch (error) {
    console.error('YAML 解析失败:', error);
    return { metadata: getDefaultMetadata(type), frontmatterRaw: {}, frontmatterBlock, content: bodyContent, hasFrontmatter: true, hasBom, lineEnding };
  }

  // 根据类型构建元数据
  const metadata = buildMetadata(parsed, type);
  return { metadata, frontmatterRaw: parsed, frontmatterBlock, content: bodyContent, hasFrontmatter: true, hasBom, lineEnding };
}

/**
 * 根据解析结果和类型构建元数据对象
 */
function buildMetadata(
  parsed: Record<string, unknown>,
  type: ContentType
): NoteMetadata | ProjectMetadata | DiaryMetadata | RoadmapMetadata | GraphMetadata | DocMetadata {
  const today = getLocalDateString();

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
      name: String(parsed.name || parsed.title || ''),
      description: String(parsed.description || ''),
      github: String(parsed.github || ''),
      demo: parsed.demo ? String(parsed.demo) : undefined,
      date: parsed.date ? String(parsed.date) : undefined,
      tags: normalizeStringArray(parsed.tags),
      techStack: normalizeTechStack(parsed.techStack),
      status: normalizeStatus(parsed.status),
    };
  }

  if (type === 'diary') {
    return {
      title: String(parsed.title || ''),
      // 与 JasBlog 行为对齐：date/time 缺失时可从文件名推断（推断逻辑在 openFile 侧做）
      date: parsed.date ? String(parsed.date) : '',
      time: normalizeTime(parsed.time),
      excerpt: String(parsed.excerpt || ''),
      tags: normalizeStringArray(parsed.tags),
      mood: parsed.mood ? String(parsed.mood) : undefined,
      weather: parsed.weather ? String(parsed.weather) : undefined,
      location: parsed.location ? String(parsed.location) : undefined,
      companions: normalizeStringArray(parsed.companions),
    };
  }

  if (type === 'roadmap') {
    return {
      title: String(parsed.title || parsed.name || ''),
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
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean);
  }

  // 兼容 `tags: a, b, c` 或 `companions: A、B、C` 等写法（与 JasBlog diary.ts 行为一致）
  if (typeof value === 'string') {
    return value
      .split(/[,\uFF0C\u3001]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

/**
 * 标准化 techStack 数组
 */
function normalizeTechStack(value: unknown): TechStackItem[] | undefined {
  if (!value) return undefined;

  // 兼容 JasBlog projects.ts：techStack 既可能是数组，也可能是逗号分隔字符串
  if (typeof value === 'string') {
    const names = normalizeStringArray(value);
    if (names.length === 0) return [];
    return names.map((name) => ({ name }));
  }

  if (!Array.isArray(value)) return undefined;

  return value
    .map((item): TechStackItem | null => {
      if (typeof item === 'string') {
        const name = item.trim();
        return name ? { name } : null;
      }

      if (typeof item !== 'object' || item === null) {
        return null;
      }

      const obj = item as Record<string, unknown>;
      const name = String(obj.name || '').trim();
      if (!name) return null;

      return {
        name,
        icon: obj.icon ? String(obj.icon) : undefined,
        color: obj.color ? String(obj.color) : undefined,
      };
    })
    .filter((item): item is TechStackItem => item !== null);
}

/**
 * 标准化时间（HH:MM）
 * 兼容：9:00、0900、09:00 等写法（与 JasBlog diary.ts 行为一致）
 */
function normalizeTime(value: unknown): string {
  if (!value) return '';

  const raw = String(value).trim();
  const colonMatch = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (colonMatch) {
    const hour = Number(colonMatch[1]);
    const minute = Number(colonMatch[2]);
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    }
  }

  const compactMatch = raw.match(/^(\d{2})(\d{2})$/);
  if (compactMatch) {
    const hour = Number(compactMatch[1]);
    const minute = Number(compactMatch[2]);
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return `${compactMatch[1]}:${compactMatch[2]}`;
    }
  }

  return '';
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
    .split(/\r?\n/)
    .filter((line) => !/^(#{1,6}\s*)?任务列表[:：]?\s*$/.test(line.trim()));

  return filteredLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

export function parseRoadmapItemsFromContent(content: string): { items: RoadmapItem[]; remainingContent: string } {
  const lines = content.split(/\r?\n/);
  const items: RoadmapItem[] = [];
  const nonTaskLines: string[] = [];

  let currentItem: RoadmapItem | null = null;
  let currentDescription: string[] = [];
  let currentDetails: string[] = [];
  let isCollectingDetails = false;
  let inFence = false;
  let fenceChar = '';
  let itemId = 1;

  // 任务行正则：- [ ] 或 - [-] 或 - [x] 开头，后面是标题，可选 `priority`
  const taskRegex = /^-\s*\[([ xX\-])\]\s+(.+?)(?:\s+`(high|medium|low)`)?\s*$/;
  // 缩进行正则（至少2个空格或1个 Tab）
  const indentRegex = /^(?:\t| {2,})(.+)$/;
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

  const appendNonTaskLine = (line: string) => {
    if (currentItem) {
      saveCurrentItem();
    }
    nonTaskLines.push(line);
  };

  for (const line of lines) {
    const trimmedLine = line.trimStart();
    const fenceMatch = trimmedLine.match(/^(`{3,}|~{3,})/);

    if (fenceMatch) {
      const currentFenceChar = fenceMatch[1][0];
      if (!inFence) {
        inFence = true;
        fenceChar = currentFenceChar;
      } else if (currentFenceChar === fenceChar) {
        inFence = false;
        fenceChar = '';
      }

      appendNonTaskLine(line);
      continue;
    }

    if (inFence) {
      appendNonTaskLine(line);
      continue;
    }

    const taskMatch = line.match(taskRegex);

    if (taskMatch) {
      // 保存之前的任务
      saveCurrentItem();

      // 解析新任务
      const [, checkbox, title, priority] = taskMatch;
      const normalizedCheckbox = checkbox.toLowerCase();
      let status: RoadmapItemStatus = 'todo';
      if (normalizedCheckbox === 'x') status = 'done';
      else if (normalizedCheckbox === '-') status = 'in_progress';

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
        const text = indentMatch[1];
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
  metadata: NoteMetadata | ProjectMetadata | DiaryMetadata | RoadmapMetadata | GraphMetadata,
  content: string,
  frontmatterRaw?: Record<string, unknown>
): string {
  // 尽量保留原始 frontmatter 的未知字段与顺序（避免保存后产生无意义 diff）
  const mergedMetadata: Record<string, unknown> = frontmatterRaw ? { ...frontmatterRaw } : {};
  for (const [key, value] of Object.entries(metadata as unknown as Record<string, unknown>)) {
    mergedMetadata[key] = value;
  }

  // 清理元数据，移除 undefined 和不需要的字段
  const cleanedMetadata = cleanMetadataForYaml(mergedMetadata);

  // 使用 yaml 库序列化
  const yaml = stringifyYAML(cleanedMetadata, {
    lineWidth: 0, // 禁用自动换行
    defaultStringType: 'PLAIN', // 简单字符串不加引号
    defaultKeyType: 'PLAIN',
  });

  // 不强行插入额外空行：正文是否以空行开头由编辑器内容决定（更利于“最小 diff”）
  return `---\n${yaml}---\n${content}`;
}

const FRONTMATTER_BLOCK_REGEX = /^(---\r?\n)([\s\S]*?)(\r?\n---\r?\n?)$/;

/**
 * 在“已存在 frontmatter”的基础上尽量做“最小变更”序列化：
 * - 保留原始 key 顺序与注释（取决于 yaml 文档是否可解析）
 * - 仅更新元数据中出现的字段
 *
 * 失败时返回 null，调用方应回退到完整序列化（serializeMarkdownContent）。
 */
function patchFrontmatterBlock(
  frontmatterBlock: string,
  metadata: Record<string, unknown>
): string | null {
  const match = frontmatterBlock.match(FRONTMATTER_BLOCK_REGEX);
  if (!match) return null;

  const [, start, yamlContent, end] = match;

  // 使用 yaml Document：尽量保留注释与原始结构
  const doc = parseYamlDocument(yamlContent, { keepCstNodes: true, keepNodeTypes: true } as any);
  if (doc.errors.length > 0) {
    return null;
  }

  // 对齐 serializeMarkdownContent 的输出习惯：禁用自动换行，尽量用 plain string
  const docOptions = doc.options as any;
  docOptions.lineWidth = 0;
  docOptions.defaultStringType = 'PLAIN';
  docOptions.defaultKeyType = 'PLAIN';

  // 只更新“元数据对象中出现过的字段”，不动未知字段（从而尽量保留原样）
  const cleanedMetadata = cleanMetadataForYaml(metadata);

  for (const key of Object.keys(metadata)) {
    if (!(key in cleanedMetadata)) {
      doc.delete(key);
    }
  }

  for (const [key, value] of Object.entries(cleanedMetadata)) {
    doc.set(key, value);
  }

  // doc.toString() 默认会带一个末尾换行；而 frontmatterBlock 的 end 本身以换行开头（\n---）
  // 为避免在 closing --- 前多出一行空行，这里去掉最后一个 \n。
  const nextYaml = doc.toString().replace(/\n$/, '');
  return `${start}${nextYaml}${end}`;
}

/**
 * 序列化 Markdown 内容（优先尝试“保留原始 frontmatter 样式”）
 */
export function serializeMarkdownContentPreservingFrontmatter(
  metadata: NoteMetadata | ProjectMetadata | DiaryMetadata | RoadmapMetadata | GraphMetadata,
  content: string,
  options: {
    frontmatterBlock?: string | null;
    frontmatterRaw?: Record<string, unknown>;
  } = {}
): string {
  const { frontmatterBlock, frontmatterRaw } = options;
  if (frontmatterBlock) {
    const patched = patchFrontmatterBlock(frontmatterBlock, metadata as unknown as Record<string, unknown>);
    if (patched) {
      return `${patched}${content}`;
    }
  }

  // 回退：完整序列化（会丢失注释，但能保证 YAML 规范）
  return serializeMarkdownContent(metadata, content, frontmatterRaw);
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
    if (Array.isArray(value) && value.length === 0) {
      // 与 JasBlog content 模板更一致：保留常见空数组字段，避免保存后产生无意义 diff
      const shouldKeepEmptyArray =
        key === 'tags' ||
        key === 'companions' ||
        key === 'techStack';
      if (!shouldKeepEmptyArray) continue;
    }

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
  hasGraphBlock: boolean;
  error: string | null;
} {
  // 匹配 ```graph ... ``` 代码块
  const graphBlockRegex = /```graph\s*\r?\n([\s\S]*?)\r?\n```/;
  const match = content.match(graphBlockRegex);

  if (!match) {
    // 没有 graph 代码块，返回空数据
    return {
      graphData: { nodes: [], edges: [] },
      remainingContent: content.trim(),
      hasGraphBlock: false,
      error: '缺少 ```graph 代码块：知识图谱文件必须包含 graph 数据',
    };
  }

  const jsonStr = match[1].trim();
  let graphData: GraphData;

  try {
    const parsed = JSON.parse(jsonStr) as unknown;

    if (!isValidGraphData(parsed)) {
      return {
        graphData: { nodes: [], edges: [] },
        // 无效数据时保留原文，方便在预览中直接看到 graph 代码块内容
        remainingContent: content.trim(),
        hasGraphBlock: true,
        error: 'graph 数据格式无效：需要包含 nodes/edges 数组，且节点需包含 id/position/data',
      };
    }

    graphData = parsed;
  } catch (e) {
    console.error('图谱 graph 代码块 JSON 格式错误:', e);
    return {
      graphData: { nodes: [], edges: [] },
      // JSON 错误时保留原文，避免预览“吞掉”用户正在编辑的 graph 代码块
      remainingContent: content.trim(),
      hasGraphBlock: true,
      error: `graph 代码块 JSON 解析失败：${String(e)}`,
    };
  }

  // 移除 graph 代码块，保留其他内容
  const remainingContent = content.replace(graphBlockRegex, '').trim();

  return { graphData, remainingContent, hasGraphBlock: true, error: null };
}

function isValidGraphData(value: unknown): value is GraphData {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;

  if (!Array.isArray(obj.nodes) || !Array.isArray(obj.edges)) return false;

  return obj.nodes.every((node) => {
    if (!node || typeof node !== 'object') return false;
    const n = node as Record<string, unknown>;
    return 'id' in n && 'position' in n && 'data' in n;
  });
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
function getDefaultMetadata(type: ContentType): NoteMetadata | ProjectMetadata | DiaryMetadata | RoadmapMetadata | GraphMetadata | DocMetadata {
  const today = getLocalDateString();

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
      name: '',
      description: '',
      github: '',
      tags: [],
      status: 'active',
    };
  }

  if (type === 'diary') {
    return {
      title: '',
      date: today,
      time: '00:00',
      excerpt: '',
      tags: [],
      companions: [],
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

  // 不强行插入额外空行：正文是否以空行开头由编辑器内容决定（更利于“最小 diff”）
  return `---\n${yaml}---\n${content}`;
}

/**
 * 序列化普通文档（优先尝试“保留原始 frontmatter 样式”）
 */
export function serializeDocContentPreservingFrontmatter(
  metadata: DocMetadata,
  content: string,
  options: {
    includeFrontmatter: boolean;
    frontmatterBlock?: string | null;
  }
): string {
  const { includeFrontmatter, frontmatterBlock } = options;

  if (!includeFrontmatter) {
    return content;
  }

  // 没有旧 frontmatter：按最小规则生成新的即可
  if (!frontmatterBlock) {
    return serializeDocContent(metadata, content, true);
  }

  const patched = patchFrontmatterBlock(frontmatterBlock, metadata as unknown as Record<string, unknown>);
  if (patched) {
    return `${patched}${content}`;
  }

  return serializeDocContent(metadata, content, true);
}
