import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildDefaultDiaryRelativePath } from '../src/services/contentTemplates';

const repoRoot = path.resolve(import.meta.dirname, '..');

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

test('考研日志默认相对路径使用创建时间生成 YYYY/MM/YYYY-MM-DD-HH-mm 格式', () => {
  const actual = buildDefaultDiaryRelativePath(new Date('2026-04-03T21:35:00+08:00'));
  assert.equal(actual, '2026/04/2026-04-03-21-35');
});

test('新建考研日志对话框会把默认相对路径填入输入框', () => {
  const source = readRepoFile('src/components/layout/toolbar/TemplatePickerDialog.tsx');

  assert.match(source, /buildDefaultDiaryRelativePath/);
  assert.match(source, /setFilename\(type === 'diary' \? buildDefaultDiaryRelativePath\(\) : ''\)/);
});
