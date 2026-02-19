/**
 * 内容模板与路径构建
 * - 统一管理"新建文件"的默认内容和内置模板注册表
 * - 避免在 store / 组件中散落 hardcode 字符串与目录映射
 */

import type { JasBlogContentType } from '@/types';
import { CONTENT_DIRS } from '@/types';

// ============================================
// 内置模板注册表
// ============================================

export interface BuiltinTemplate {
  id: string;
  name: string;
  description?: string;
  type: JasBlogContentType;
  buildContent: (filename: string) => string;
}

// 所有内置模板（按类型分组，每组第一个为默认模板）
export const BUILTIN_TEMPLATES: BuiltinTemplate[] = [
  // ── 笔记 ──
  {
    id: 'note-standard',
    name: '标准笔记',
    description: '含摘要和标签字段',
    type: 'note',
    buildContent: buildNoteStandard,
  },
  {
    id: 'note-tutorial',
    name: '教程笔记',
    description: '前言 → 环境准备 → 分步操作 → 常见问题 → 总结',
    type: 'note',
    buildContent: buildNoteTutorial,
  },
  {
    id: 'note-reading',
    name: '读书笔记',
    description: '书籍信息、核心观点、章节摘录、个人感悟',
    type: 'note',
    buildContent: buildNoteReading,
  },
  {
    id: 'note-research',
    name: '技术调研',
    description: '背景、方案对比、选型结论、落地建议',
    type: 'note',
    buildContent: buildNoteResearch,
  },
  // ── 项目 ──
  {
    id: 'project-opensource',
    name: '开源项目',
    description: '含 GitHub、技术栈、功能特性、快速开始',
    type: 'project',
    buildContent: buildProjectOpensource,
  },
  {
    id: 'project-personal',
    name: '个人项目',
    description: '轻量版，项目介绍、动机、技术选型',
    type: 'project',
    buildContent: buildProjectPersonal,
  },
  // ── 日记 ──
  {
    id: 'diary-standard',
    name: '标准日记',
    description: '含心情、天气、地点等完整字段',
    type: 'diary',
    buildContent: buildDiaryStandard,
  },
  {
    id: 'diary-simple',
    name: '简单日记',
    description: '仅标题、日期、时间、摘要',
    type: 'diary',
    buildContent: buildDiarySimple,
  },
  {
    id: 'diary-travel',
    name: '旅行日记',
    description: '旅行路线、见闻、美食、花费记录',
    type: 'diary',
    buildContent: buildDiaryTravel,
  },
  {
    id: 'diary-weekly',
    name: '周记',
    description: '本周回顾、收获反思、下周计划',
    type: 'diary',
    buildContent: buildDiaryWeekly,
  },
  // ── 规划 ──
  {
    id: 'roadmap-standard',
    name: '标准规划',
    description: '分阶段任务列表，含优先级标注',
    type: 'roadmap',
    buildContent: buildRoadmapStandard,
  },
  {
    id: 'roadmap-learning',
    name: '学习计划',
    description: '基础 → 进阶 → 实战的学习路线规划',
    type: 'roadmap',
    buildContent: buildRoadmapLearning,
  },
  // ── 图谱 ──
  {
    id: 'graph-standard',
    name: '空白图谱',
    description: '空白知识图谱，从零开始',
    type: 'graph',
    buildContent: buildGraphStandard,
  },
  {
    id: 'graph-example',
    name: '示例图谱',
    description: '包含示例节点和连线，快速上手',
    type: 'graph',
    buildContent: buildGraphExample,
  },
];

/** 按内容类型过滤内置模板 */
export function getBuiltinTemplates(type: JasBlogContentType): BuiltinTemplate[] {
  return BUILTIN_TEMPLATES.filter((t) => t.type === type);
}

/**
 * 将用户模板内容应用到新文件名：
 * 替换 frontmatter 中的 title/name 和 date 字段，其余字段原样保留
 */
export function applyTemplateToFilename(templateContent: string, filename: string): string {
  const baseName = normalizeTitleFromPath(filename);
  const today = getToday();

  return templateContent
    .replace(/^(title:)\s*.*$/m, `$1 ${baseName}`)
    .replace(/^(name:)\s*.*$/m, `$1 ${baseName}`)
    .replace(/^(date:)\s*.*$/m, `$1 ${today}`);
}

// ============================================
// 内置模板内容构建函数
// ============================================

function buildNoteStandard(filename: string): string {
  const baseName = normalizeTitleFromPath(filename);
  const today = getToday();

  return `---
title: ${baseName}
date: ${today}
excerpt:
tags: []
---

`;
}

function buildNoteTutorial(filename: string): string {
  const baseName = normalizeTitleFromPath(filename);
  const today = getToday();

  return `---
title: ${baseName}
date: ${today}
excerpt:
tags: [教程]
---

## 前言

<!-- 简要说明本教程的目标和适用场景 -->

## 环境准备

<!-- 列出所需工具、依赖版本、前置知识等 -->

## 步骤

### 1. 第一步

### 2. 第二步

### 3. 第三步

## 常见问题

### Q: 问题描述？

A: 解答内容。

## 总结

<!-- 回顾要点，提供延伸阅读链接 -->
`;
}

function buildNoteReading(filename: string): string {
  const baseName = normalizeTitleFromPath(filename);
  const today = getToday();

  return `---
title: 《${baseName}》读书笔记
date: ${today}
excerpt:
tags: [读书笔记]
---

## 书籍信息

- **书名**：
- **作者**：
- **出版年份**：
- **阅读日期**：${today}
- **推荐指数**：⭐⭐⭐⭐⭐

## 核心观点

1.
2.
3.

## 章节摘录

### 第一章

> 摘录内容

个人理解：

### 第二章

> 摘录内容

个人理解：

## 个人感悟

<!-- 这本书对你的启发，以及如何应用到实际中 -->

## 延伸阅读

- 相关书籍或文章链接
`;
}

function buildNoteResearch(filename: string): string {
  const baseName = normalizeTitleFromPath(filename);
  const today = getToday();

  return `---
title: ${baseName}
date: ${today}
excerpt:
tags: [技术调研]
---

## 背景

<!-- 为什么需要做这次调研？要解决什么问题？ -->

## 需求与约束

- **核心需求**：
- **性能要求**：
- **兼容性**：
- **团队现状**：

## 方案对比

| 维度 | 方案 A | 方案 B | 方案 C |
|------|--------|--------|--------|
| 简介 | | | |
| 优点 | | | |
| 缺点 | | | |
| 社区活跃度 | | | |
| 学习成本 | | | |
| 性能 | | | |

## 选型结论

<!-- 推荐哪个方案，为什么 -->

**推荐方案**：

**理由**：

## 落地建议

1. **第一阶段**：
2. **第二阶段**：
3. **第三阶段**：

## 参考资料

- [链接描述](url)
`;
}

function buildProjectOpensource(filename: string): string {
  const baseName = normalizeTitleFromPath(filename);
  const today = getToday();

  return `---
name: ${baseName}
description:
github:
date: ${today}
tags: []
techStack: []
status: active
---

## 项目介绍

<!-- 一两句话说清楚这个项目是什么、解决什么问题 -->

## 功能特性

- 特性一
- 特性二
- 特性三

## 快速开始

\`\`\`bash
# 安装
npm install ${baseName.toLowerCase()}

# 使用
\`\`\`

## 项目结构

\`\`\`
src/
├── index.ts          # 入口文件
├── core/             # 核心逻辑
├── utils/            # 工具函数
└── types/            # 类型定义
\`\`\`

## 开发计划

- [ ] 功能一
- [ ] 功能二
- [ ] 完善文档
`;
}

function buildProjectPersonal(filename: string): string {
  const baseName = normalizeTitleFromPath(filename);
  const today = getToday();

  return `---
name: ${baseName}
description:
date: ${today}
tags: []
status: active
---

## 项目介绍

<!-- 用一段话描述这个项目的目标和用途 -->

## 动机

<!-- 为什么要做这个项目？解决了什么痛点？ -->

## 技术选型

| 领域 | 选择 | 原因 |
|------|------|------|
| 语言 | | |
| 框架 | | |
| 数据库 | | |

## 进展记录

### ${today}

- 项目初始化
`;
}

function buildDiaryStandard(filename: string): string {
  const baseName = normalizeTitleFromPath(filename);
  const today = getToday();

  return `---
title: ${baseName}
date: ${today}
time: 09:00
excerpt:
tags: []
mood:
weather:
location:
companions: []
---

`;
}

function buildDiarySimple(filename: string): string {
  const baseName = normalizeTitleFromPath(filename);
  const today = getToday();

  return `---
title: ${baseName}
date: ${today}
time: 09:00
excerpt:
---

`;
}

function buildDiaryTravel(filename: string): string {
  const baseName = normalizeTitleFromPath(filename);
  const today = getToday();

  return `---
title: ${baseName}
date: ${today}
time: 09:00
excerpt:
tags: [旅行]
mood:
weather:
location:
companions: []
---

## 今日路线

<!-- 出发地 → 途经 → 目的地 -->

## 见闻

<!-- 记录旅途中印象深刻的人、事、景 -->

## 美食

<!-- 今天吃了什么好吃的 -->

## 花费

| 项目 | 金额 |
|------|------|
| 交通 | |
| 住宿 | |
| 餐饮 | |
| 门票 | |
| 其他 | |
| **合计** | |

## 随想

<!-- 旅途感悟 -->
`;
}

function buildDiaryWeekly(filename: string): string {
  const baseName = normalizeTitleFromPath(filename);
  const today = getToday();

  return `---
title: ${baseName}
date: ${today}
time: 20:00
excerpt:
tags: [周记]
mood:
---

## 本周回顾

### 工作

-

### 学习

-

### 生活

-

## 收获与反思

<!-- 这周做得好的、做得不好的、学到了什么 -->

**做得好的**：

**需要改进的**：

**学到了什么**：

## 下周计划

- [ ] 计划一
- [ ] 计划二
- [ ] 计划三
`;
}

function buildRoadmapStandard(filename: string): string {
  const baseName = normalizeTitleFromPath(filename);
  const today = getToday();

  return `---
title: ${baseName}
description:
date: ${today}
status: active
---

## 第一阶段

- [ ] \`high\` 核心任务一
- [ ] \`high\` 核心任务二
- [ ] \`medium\` 辅助任务

## 第二阶段

- [ ] \`medium\` 扩展任务一
- [ ] \`medium\` 扩展任务二
- [ ] \`low\` 优化项
`;
}

function buildRoadmapLearning(filename: string): string {
  const baseName = normalizeTitleFromPath(filename);
  const today = getToday();

  return `---
title: ${baseName}
description: 系统学习计划，从基础到实战
date: ${today}
status: active
---

## 基础入门

- [ ] \`high\` 阅读官方文档，了解核心概念
- [ ] \`high\` 搭建本地开发环境
- [ ] \`medium\` 完成官方入门教程

## 进阶提升

- [ ] \`high\` 深入理解核心原理
- [ ] \`medium\` 阅读源码关键模块
- [ ] \`medium\` 学习最佳实践和设计模式

## 实战应用

- [ ] \`high\` 完成一个完整的练手项目
- [ ] \`medium\` 总结踩坑经验，输出笔记
- [ ] \`low\` 参与社区讨论或贡献 PR
`;
}

function buildGraphStandard(filename: string): string {
  const baseName = normalizeTitleFromPath(filename);
  const today = getToday();

  return `---
name: ${baseName}
description:
date: ${today}
---

\`\`\`graph
{
  "nodes": [],
  "edges": []
}
\`\`\`
`;
}

function buildGraphExample(filename: string): string {
  const baseName = normalizeTitleFromPath(filename);
  const today = getToday();

  return `---
name: ${baseName}
description: 包含示例节点和连线的知识图谱
date: ${today}
---

\`\`\`graph
{
  "nodes": [
    {
      "id": "core",
      "position": { "x": 300, "y": 200 },
      "data": { "label": "核心概念", "color": "blue", "content": "在这里添加说明" }
    },
    {
      "id": "topic-a",
      "position": { "x": 100, "y": 50 },
      "data": { "label": "主题 A", "color": "green" }
    },
    {
      "id": "topic-b",
      "position": { "x": 500, "y": 50 },
      "data": { "label": "主题 B", "color": "orange" }
    },
    {
      "id": "detail-1",
      "position": { "x": 100, "y": 350 },
      "data": { "label": "细节 1", "color": "default" }
    },
    {
      "id": "detail-2",
      "position": { "x": 500, "y": 350 },
      "data": { "label": "细节 2", "color": "default" }
    }
  ],
  "edges": [
    { "id": "e1", "source": "core", "target": "topic-a", "data": { "relation": "related", "label": "包含", "color": "p3" } },
    { "id": "e2", "source": "core", "target": "topic-b", "data": { "relation": "related", "label": "包含", "color": "p3" } },
    { "id": "e3", "source": "topic-a", "target": "detail-1", "data": { "relation": "extends", "label": "展开", "color": "p5" } },
    { "id": "e4", "source": "topic-b", "target": "detail-2", "data": { "relation": "extends", "label": "展开", "color": "p5" } },
    { "id": "e5", "source": "topic-a", "target": "topic-b", "data": { "relation": "related", "label": "关联", "color": "p7" } }
  ]
}
\`\`\`
`;
}

// ============================================
// 路径工具函数
// ============================================

function getToday(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeRelativePath(input: string): string {
  const trimmed = input.trim().replace(/^[\\/]+/, '');
  if (!trimmed) return '';

  const segments = trimmed
    .split(/[\\/]+/)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0 && segment !== '.' && segment !== '..');

  return segments.join('/');
}

function ensureMdExtension(filePath: string): string {
  const normalized = normalizeRelativePath(filePath);
  if (!normalized) return 'untitled.md';
  return normalized.toLowerCase().endsWith('.md') ? normalized : `${normalized}.md`;
}

function normalizeBaseName(name: string): string {
  const normalized = normalizeRelativePath(name);
  if (!normalized) return 'untitled';

  // 保留子路径（Diary 常用 YYYY/MM/xxx.md），并移除扩展名
  const withoutExt = normalized.replace(/\.md$/i, '');
  return withoutExt || 'untitled';
}

function normalizeTitleFromPath(input: string): string {
  const normalized = normalizeBaseName(input);
  const lastSegment = normalized.split(/[/\\]/).pop() || '';
  return lastSegment || 'untitled';
}

// ============================================
// 路径构建函数
// ============================================

/**
 * 构建 JasBlog 内容文件路径（content/<dir>/<filename>.md）
 */
export function buildJasblogFilePath(workspacePath: string, type: JasBlogContentType, filename: string): string {
  const baseName = normalizeBaseName(filename);
  const dir = CONTENT_DIRS[type];
  return `${workspacePath}/content/${dir}/${baseName}.md`;
}

/**
 * 构建普通文档路径（允许相对路径；自动补全 .md）
 */
export function buildDocFilePath(workspacePath: string, relativePath: string): string {
  const filePath = ensureMdExtension(relativePath);
  return `${workspacePath}/${filePath}`;
}

/**
 * 构建普通文档目录路径（限制在工作区内，不允许 .. 越级）
 */
export function buildDocFolderPath(workspacePath: string, relativePath: string): string {
  const normalized = normalizeRelativePath(relativePath);
  const folderPath = normalized || 'untitled-folder';
  return `${workspacePath}/${folderPath}`;
}

/**
 * 生成 JasBlog 内容的默认 Markdown 模板（向后兼容入口）
 */
export function createNewJasblogMarkdown(type: JasBlogContentType, filename: string): string {
  const templates = getBuiltinTemplates(type);
  if (templates.length > 0) {
    return templates[0].buildContent(filename);
  }
  // 兜底：不应到达此处
  const baseName = normalizeTitleFromPath(filename);
  const today = getToday();
  return `---\ntitle: ${baseName}\ndate: ${today}\n---\n\n`;
}

/**
 * 生成普通文档默认模板（可选 frontmatter，默认带 title/date）
 */
export function createNewDocMarkdown(relativePath: string): string {
  const baseName = normalizeBaseName(relativePath.split(/[/\\]/).pop() || 'untitled');
  const today = getToday();

  return `---
title: ${baseName}
date: ${today}
---

`;
}
