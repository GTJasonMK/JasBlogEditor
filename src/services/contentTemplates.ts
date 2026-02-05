/**
 * 内容模板与路径构建
 * - 统一管理“新建文件”的默认内容
 * - 避免在 store / 组件中散落 hardcode 字符串与目录映射
 */

import type { JasBlogContentType } from '@/types';
import { CONTENT_DIRS } from '@/types';

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function ensureMdExtension(filePath: string): string {
  const trimmed = filePath.trim();
  if (!trimmed) return 'untitled.md';
  return trimmed.toLowerCase().endsWith('.md') ? trimmed : `${trimmed}.md`;
}

function normalizeBaseName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return 'untitled';
  return trimmed.replace(/\.md$/i, '');
}

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
 * 生成 JasBlog 四类内容的默认 Markdown 模板
 */
export function createNewJasblogMarkdown(type: JasBlogContentType, filename: string): string {
  const baseName = normalizeBaseName(filename);
  const today = getToday();

  if (type === 'note') {
    return `---
title: ${baseName}
date: ${today}
excerpt:
tags: []
---

`;
  }

  if (type === 'project') {
    return `---
title: ${baseName}
description:
github:
tags: []
status: active
---

## 项目介绍

`;
  }

  if (type === 'roadmap') {
    return `---
title: ${baseName}
description:
status: active
---

- [ ] 示例任务
`;
  }

  // graph 类型：使用 Markdown + graph 代码块格式
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

