import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { DIARY_TIMELINE_LABEL } from '../src/types/content';

const repoRoot = path.resolve(import.meta.dirname, '..');
const workspaceRoot = path.resolve(repoRoot, '..');

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function readWorkspaceFile(relativePath: string): string {
  return fs.readFileSync(path.join(workspaceRoot, relativePath), 'utf8');
}

test('diary 预览使用中文筛选与计数文案', () => {
  const listSource = readRepoFile('src/components/preview/JasBlogListPreview.tsx');
  const detailSource = readRepoFile('src/components/preview/previews/DiaryPreview.tsx');

  assert.equal(DIARY_TIMELINE_LABEL, '考研日志时间线');
  assert.match(listSource, /全部年份/);
  assert.match(listSource, /全部月份/);
  assert.match(listSource, /条记录/);
  assert.match(listSource, /当前筛选条件下没有考研日志条目/);
  assert.match(detailSource, /DIARY_TIMELINE_LABEL/);
});

test('站点与编辑器的文档预览 UI 文案统一为中文', () => {
  const siteNotePage = readWorkspaceFile('JasBlog/src/app/notes/[slug]/page.tsx');
  const editorNotePreview = readRepoFile('src/components/preview/previews/NotePreview.tsx');
  const siteDiaryDayView = readWorkspaceFile('JasBlog/src/components/diary/DiaryDayView.tsx');
  const siteToc = readWorkspaceFile('JasBlog/src/components/TableOfContents.tsx');
  const editorToc = readRepoFile('src/components/preview/TableOfContents.tsx');
  const siteMarkdownPrimitives = readWorkspaceFile('JasBlog/src/components/markdown/MarkdownPrimitives.tsx');
  const editorMarkdownRenderer = readRepoFile('src/components/preview/MarkdownRenderer.tsx');
  const siteGraphPanel = readWorkspaceFile('JasBlog/src/components/graph/NodeDetailPanel.tsx');
  const siteProjectPage = readWorkspaceFile('JasBlog/src/app/projects/[slug]/page.tsx');

  assert.match(siteNotePage, /评论与讨论/);
  assert.match(editorNotePreview, /评论与讨论/);
  assert.doesNotMatch(siteDiaryDayView, /Study Journal/);
  assert.match(siteDiaryDayView, /考研日志/);
  assert.doesNotMatch(siteToc, /\bTop\b|\bBottom\b/);
  assert.match(siteToc, /顶部/);
  assert.match(siteToc, /底部/);
  assert.match(editorToc, /顶部/);
  assert.match(editorToc, /底部/);
  assert.doesNotMatch(siteMarkdownPrimitives, /"Copy"|"Copied"|"Copy code"|Link to/);
  assert.doesNotMatch(editorMarkdownRenderer, /"Copy"|"Copied"|"Copy code"|Link to/);
  assert.match(siteMarkdownPrimitives, /复制代码/);
  assert.match(editorMarkdownRenderer, /复制代码/);
  assert.doesNotMatch(siteGraphPanel, /\bClose\b|\bPriority\b|\bTags\b|\bContent\b|\bTime\b|Created:|Updated:/);
  assert.match(siteGraphPanel, /关闭/);
  assert.match(siteGraphPanel, /重要程度/);
  assert.match(siteGraphPanel, /标签/);
  assert.match(siteGraphPanel, /内容/);
  assert.match(siteGraphPanel, /时间/);
  assert.doesNotMatch(siteProjectPage, /杩|鍦ㄧ嚎|椤圭洰|鍒楄〃/);
  assert.match(siteProjectPage, /返回项目列表/);
  assert.match(siteProjectPage, /在线演示/);
});
