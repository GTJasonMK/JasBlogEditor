import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildJasblogFilePath } from '../src/services/contentTemplates';
import { parseMarkdownContent, parseRoadmapItemsFromContent } from '../src/services/contentParser';

const editorRoot = path.resolve(import.meta.dirname, '..');
const workspaceRoot = path.resolve(editorRoot, '..');

function readEditorFile(relativePath: string): string {
  return fs.readFileSync(path.join(editorRoot, relativePath), 'utf8');
}

function readWorkspaceFile(relativePath: string): string {
  return fs.readFileSync(path.join(workspaceRoot, relativePath), 'utf8');
}

test('非 diary 模块的新建路径会显式拒绝子目录输入', () => {
  assert.throws(
    () => buildJasblogFilePath('/workspace', 'note', 'nested/path'),
    /一级|子目录|嵌套/i
  );

  assert.equal(
    buildJasblogFilePath('/workspace', 'diary', '2026/04/2026-04-03-09-30'),
    '/workspace/content/diary/2026/04/2026-04-03-09-30.md'
  );
});

test('diary frontmatter YAML 解析失败时不再错误回退到今天日期', () => {
  const parsed = parseMarkdownContent(`---
title: [broken
---

正文
`, 'diary');

  assert.equal((parsed.metadata as { date?: string }).date, '');
  assert.equal((parsed.metadata as { time?: string }).time, '');
  assert.match(parsed.issues.join('\n'), /frontmatter|YAML/i);
});

test('roadmap 单个 Tab 缩进不会再被解析成任务详情', () => {
  const { items, remainingContent } = parseRoadmapItemsFromContent([
    '- [ ] 核心任务 `high`',
    '\t截止: 2026-06-01',
  ].join('\n'));

  assert.equal(items.length, 1);
  assert.equal(items[0].deadline, undefined);
  assert.match(remainingContent, /截止: 2026-06-01/);
});

test('DiaryPreview 详情预览复用 resolveDiaryDisplay，避免空白标题分叉', () => {
  const source = readEditorFile('src/components/preview/previews/DiaryPreview.tsx');

  assert.match(source, /resolveDiaryDisplay\(/);
  assert.doesNotMatch(source, /metadata\.title \|\| inferred\?\.title \|\| fileBaseName/);
});

test('新建对话框会对非 diary 子路径输入做显式校验', () => {
  const source = readEditorFile('src/components/layout/toolbar/TemplatePickerDialog.tsx');

  assert.match(source, /getJasBlogRelativePathError\(/);
  assert.match(source, /disabled=\{Boolean\(pathError\) \|\| !filename\.trim\(\) \|\| !selectedId \|\| isSubmitting\}/);
});

test('JasBlog 读取器统一接受大小写不同的 Markdown 扩展名，roadmap 列表日期按存在性渲染', () => {
  const helperSource = readWorkspaceFile('JasBlog/src/lib/markdown-file.ts');
  const postsSource = readWorkspaceFile('JasBlog/src/lib/posts.ts');
  const projectsSource = readWorkspaceFile('JasBlog/src/lib/projects.ts');
  const graphsSource = readWorkspaceFile('JasBlog/src/lib/graphs.ts');
  const roadmapSource = readWorkspaceFile('JasBlog/src/lib/roadmap.ts');
  const diarySource = readWorkspaceFile('JasBlog/src/lib/diary.ts');
  const roadmapPageSource = readWorkspaceFile('JasBlog/src/app/roadmap/page.tsx');

  assert.match(helperSource, /export function isMarkdownFileName/);
  assert.match(helperSource, /export function stripMarkdownExtension/);
  assert.match(postsSource, /isMarkdownFileName/);
  assert.match(projectsSource, /isMarkdownFileName/);
  assert.match(graphsSource, /isMarkdownFileName/);
  assert.match(roadmapSource, /isMarkdownFileName/);
  assert.match(diarySource, /isMarkdownFileName/);
  assert.match(roadmapPageSource, /\{roadmap\.date && \(/);
});
