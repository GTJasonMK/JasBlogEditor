import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { resolveDiaryDisplay } from '../src/services/displayMetadata';
import { supportsNestedJasBlogContent } from '../src/services/jasblogContentPolicy';

const repoRoot = path.resolve(import.meta.dirname, '..');
const workspaceRoot = path.resolve(repoRoot, '..');

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function readWorkspaceFile(relativePath: string): string {
  return fs.readFileSync(path.join(workspaceRoot, relativePath), 'utf8');
}

test('JasBlog 只有 diary 允许递归子目录，其他发布模块只读取一级目录', () => {
  assert.equal(supportsNestedJasBlogContent('diary'), true);
  assert.equal(supportsNestedJasBlogContent('note'), false);
  assert.equal(supportsNestedJasBlogContent('project'), false);
  assert.equal(supportsNestedJasBlogContent('graph'), false);
  assert.equal(supportsNestedJasBlogContent('roadmap'), false);
});

test('diary 显示元数据会对空白标题做 trim fallback，并回退到文件名推断的日期和时间', () => {
  assert.deepEqual(
    resolveDiaryDisplay(
      '2026-04-03-09-30-mock-exam.md',
      {
        title: '   ',
        date: '',
        time: '',
        excerpt: '',
        tags: [],
        companions: [],
      },
      { date: '2026-04-03', time: '09:30', title: 'mock exam' }
    ),
    {
      title: 'mock exam',
      date: '2026-04-03',
      time: '09:30',
    }
  );
});

test('列表预览会复用显示 helper，并把 graph frontmatter issues 与 graph block 错误一起展示', () => {
  const listSource = readRepoFile('src/components/preview/JasBlogListPreview.tsx');

  assert.match(listSource, /resolveNoteDisplay\(/);
  assert.match(listSource, /resolveProjectDisplay\(/);
  assert.match(listSource, /resolveRoadmapDisplay\(/);
  assert.match(listSource, /resolveGraphDisplay\(/);
  assert.match(listSource, /combineIssueMessages\(activeFile\.issues,\s*activeGraphInfo\.error\)/);
  assert.match(listSource, /combineIssueMessages\(parsed\.issues,\s*extracted\.error\)/);
  assert.doesNotMatch(listSource, /meta\.title \|\| inferred\?\.title \|\| baseName/);
});

test('diary 详情预览会暴露按天聚合错误和单条 entry 错误', () => {
  const diarySource = readRepoFile('src/components/preview/previews/DiaryPreview.tsx');
  const dayViewSource = readRepoFile('src/components/preview/previews/diary/DiaryDayView.tsx');
  const entrySource = readRepoFile('src/components/preview/previews/diary/DiaryEntryArticle.tsx');

  assert.match(diarySource, /error\?: string/);
  assert.match(diarySource, /const error = sortedEntries\.map\(\(entry\) => entry\.error\)\.find\(Boolean\)/);
  assert.match(dayViewSource, /day\.error/);
  assert.match(entrySource, /entry\.error/);
});

test('diary 详情预览对齐 JasBlog 简化布局，使用 Tailwind 类和标准 MarkdownRenderer', () => {
  const diarySource = readRepoFile('src/components/preview/previews/DiaryPreview.tsx');
  const dayViewSource = readRepoFile('src/components/preview/previews/diary/DiaryDayView.tsx');
  const entrySource = readRepoFile('src/components/preview/previews/diary/DiaryEntryArticle.tsx');

  assert.match(diarySource, /DiaryDayView/);
  assert.match(dayViewSource, /divider-cloud/);
  assert.match(dayViewSource, /timelineBackLabel/);
  assert.match(entrySource, /MarkdownRenderer/);
  assert.match(entrySource, /prose-chinese/);
  assert.doesNotMatch(diarySource, /buildDiaryReferencePreviewMap/);
  assert.doesNotMatch(dayViewSource, /DiaryReferenceModal/);
  assert.doesNotMatch(entrySource, /diary-journal-entry-order/);
  assert.doesNotMatch(entrySource, /diary-journal-entry-surface/);
  assert.doesNotMatch(diarySource, /card-hover rounded-lg p-6/);
});

test('doc 预览会为长文档提供目录与回顶导航', () => {
  const docSource = readRepoFile('src/components/preview/previews/DocPreview.tsx');

  assert.match(docSource, /TableOfContents/);
  assert.match(docSource, /BackToTop/);
  assert.match(docSource, /hasVisibleTocHeadings/);
});

test('project 详情和列表预览会对 description/github/demo 做非空字符串归一化', () => {
  const projectPreviewSource = readRepoFile('src/components/preview/previews/ProjectPreview.tsx');
  const listSource = readRepoFile('src/components/preview/JasBlogListPreview.tsx');

  assert.match(projectPreviewSource, /readFrontmatterString\(/);
  assert.doesNotMatch(projectPreviewSource, /metadata\.github &&/);
  assert.doesNotMatch(projectPreviewSource, /metadata\.demo &&/);
  assert.doesNotMatch(projectPreviewSource, /text=\{metadata\.description\}/);
  assert.match(listSource, /readFrontmatterString\(activeMeta\.description\)/);
  assert.match(listSource, /readFrontmatterString\(meta\.description\)/);
});

test('graph 查看器在站点和编辑器里都提供窄屏响应式布局', () => {
  const siteGraphViewer = readWorkspaceFile('JasBlog/src/components/graph/GraphViewer.tsx');
  const editorGraphViewer = readRepoFile('src/components/graph/GraphViewer.tsx');

  assert.match(siteGraphViewer, /flex-col .*xl:flex-row|flex-col .*lg:flex-row/);
  assert.match(editorGraphViewer, /flex-col .*xl:flex-row|flex-col .*lg:flex-row/);
  assert.match(siteGraphViewer, /w-full .*xl:w-\[320px\]|w-full .*lg:w-\[320px\]/);
  assert.match(editorGraphViewer, /w-full .*xl:w-\[320px\]|w-full .*lg:w-\[320px\]/);
});

test('站点与编辑器的 Markdown 预览样式都会对长链接、长行内代码和表格单元格做换行保护', () => {
  const siteStyles = readWorkspaceFile('JasBlog/src/app/globals.css');
  const editorStyles = readRepoFile('src/preview.css');

  assert.match(siteStyles, /\.prose-chinese a \{[\s\S]*overflow-wrap:\s*anywhere;/);
  assert.match(editorStyles, /\.prose-chinese a \{[\s\S]*overflow-wrap:\s*anywhere;/);
  assert.match(siteStyles, /\.prose-chinese code \{[\s\S]*word-break:\s*break-word;/);
  assert.match(editorStyles, /\.prose-chinese code \{[\s\S]*word-break:\s*break-word;/);
  assert.match(siteStyles, /\.prose-chinese th \{[\s\S]*overflow-wrap:\s*anywhere;/);
  assert.match(editorStyles, /\.prose-chinese th \{[\s\S]*overflow-wrap:\s*anywhere;/);
  assert.match(siteStyles, /\.prose-chinese td \{[\s\S]*overflow-wrap:\s*anywhere;/);
  assert.match(editorStyles, /\.prose-chinese td \{[\s\S]*overflow-wrap:\s*anywhere;/);
});

test('编辑器表单不再把站点可 fallback 字段标为必填，也不做绝对 URL 校验', () => {
  const noteForm = readRepoFile('src/components/forms/NoteMetaForm.tsx');
  const diaryForm = readRepoFile('src/components/forms/DiaryMetaForm.tsx');
  const projectForm = readRepoFile('src/components/forms/ProjectMetaForm.tsx');

  assert.doesNotMatch(noteForm, /标题不能为空|required/);
  assert.doesNotMatch(diaryForm, /标题不能为空|日期不能为空|required/);
  assert.doesNotMatch(projectForm, /new URL\(|GitHub 地址不能为空|请输入有效的 URL|required/);
});
