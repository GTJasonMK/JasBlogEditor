import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CONTENT_TYPE_LABELS,
  JASBLOG_SECTION_LABELS,
} from '../src/types/content';
import { getBuiltinTemplates } from '../src/services/contentTemplates';

test('diary 的显示标签改为考研日志', () => {
  assert.equal(CONTENT_TYPE_LABELS.diary, '考研日志');
  assert.equal(JASBLOG_SECTION_LABELS.diary, '考研日志');
});

test('diary 的内置模板改为考研日志语义', () => {
  const templates = getBuiltinTemplates('diary');

  assert.deepEqual(
    templates.map((template) => template.name),
    ['标准考研日志', '简单考研日志', '模考复盘', '周复盘']
  );

  const standardTemplate = templates[0].buildContent('2026/12/政治晨读');

  assert.match(standardTemplate, /## 今日复习目标/);
  assert.match(standardTemplate, /## 完成情况/);
  assert.match(standardTemplate, /## 问题复盘/);
  assert.match(standardTemplate, /## 明日计划/);
});
