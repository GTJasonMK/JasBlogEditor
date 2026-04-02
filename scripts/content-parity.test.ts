import test from 'node:test';
import assert from 'node:assert/strict';
import { getBuiltinTemplates } from '../src/services/contentTemplates';
import { parseMarkdownContent, parseRoadmapItemsFromContent } from '../src/services/contentParser';
import { resolveImageDimensions } from '../src/components/preview/imageDimensions';

test('roadmap 内置模板生成的任务优先级语法可被解析器正确识别', () => {
  const template = getBuiltinTemplates('roadmap')[0].buildContent('一致性修复');
  const parsed = parseMarkdownContent(template, 'roadmap');
  const { items } = parseRoadmapItemsFromContent(parsed.content);

  assert.equal(items.length >= 3, true);
  assert.equal(items[0].title, '核心任务一');
  assert.equal(items[0].priority, 'high');
  assert.equal(items[1].title, '核心任务二');
  assert.equal(items[1].priority, 'high');
  assert.equal(items[2].title, '辅助任务');
  assert.equal(items[2].priority, 'medium');
});

test('roadmap 解析器与 JasBlog 对齐，接受 -, *, + 三种任务前缀', () => {
  const content = [
    '- [ ] 默认列表 `high`',
    '* [-] 星号列表 `medium`',
    '+ [x] 加号列表 `low`',
  ].join('\n');

  const { items } = parseRoadmapItemsFromContent(content);

  assert.equal(items.length, 3);
  assert.deepEqual(
    items.map((item) => ({
      title: item.title,
      status: item.status,
      priority: item.priority,
    })),
    [
      { title: '默认列表', status: 'todo', priority: 'high' },
      { title: '星号列表', status: 'in_progress', priority: 'medium' },
      { title: '加号列表', status: 'done', priority: 'low' },
    ]
  );
});

test('project 内置模板不再写入站点未消费的 status 字段', () => {
  const templates = getBuiltinTemplates('project');

  for (const template of templates) {
    const content = template.buildContent('契约清理');
    assert.doesNotMatch(content, /^status:/m);
  }
});

test('project 解析结果不暴露单边 status 字段', () => {
  const raw = `---
name: 契约清理
description: 清理单边字段
github: https://github.com/example/repo
status: archived
tags: [契约]
---

正文
`;

  const parsed = parseMarkdownContent(raw, 'project');
  const metadata = parsed.metadata as Record<string, unknown>;

  assert.equal('status' in metadata, false);
  assert.deepEqual(metadata, {
    name: '契约清理',
    description: '清理单边字段',
    github: 'https://github.com/example/repo',
    tags: ['契约'],
    techStack: undefined,
    demo: undefined,
    date: undefined,
  });
});

test('编辑器图片尺寸解析与 JasBlog 对齐', () => {
  assert.deepEqual(resolveImageDimensions({ width: '640', height: 480 }), {
    width: 640,
    height: 480,
  });

  assert.deepEqual(resolveImageDimensions({ width: '0', height: 'bad' }), {
    width: 1200,
    height: 675,
  });
});
