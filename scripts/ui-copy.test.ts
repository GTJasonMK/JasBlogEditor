import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { DIARY_TIMELINE_LABEL } from '../src/types/content';

const repoRoot = path.resolve(import.meta.dirname, '..');

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
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
  assert.match(detailSource, /条记录/);
});
