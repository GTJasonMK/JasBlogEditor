import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { resolveDiaryDisplay } from '../src/services/displayMetadata';
import { supportsNestedJasBlogContent } from '../src/services/jasblogContentPolicy';

const repoRoot = path.resolve(import.meta.dirname, '..');

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
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

  assert.match(diarySource, /error\?: string/);
  assert.match(diarySource, /const error = sortedEntries\.map\(\(entry\) => entry\.error\)\.find\(Boolean\)/);
  assert.match(diarySource, /day\.error/);
  assert.match(diarySource, /entry\.error/);
});

test('编辑器表单不再把站点可 fallback 字段标为必填，也不做绝对 URL 校验', () => {
  const noteForm = readRepoFile('src/components/forms/NoteMetaForm.tsx');
  const diaryForm = readRepoFile('src/components/forms/DiaryMetaForm.tsx');
  const projectForm = readRepoFile('src/components/forms/ProjectMetaForm.tsx');

  assert.doesNotMatch(noteForm, /标题不能为空|required/);
  assert.doesNotMatch(diaryForm, /标题不能为空|日期不能为空|required/);
  assert.doesNotMatch(projectForm, /new URL\(|GitHub 地址不能为空|请输入有效的 URL|required/);
});
