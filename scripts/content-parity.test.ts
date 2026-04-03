import test from 'node:test';
import assert from 'node:assert/strict';
import { getBuiltinTemplates } from '../src/services/contentTemplates';
import { parseMarkdownContent, parseRoadmapItemsFromContent } from '../src/services/contentParser';
import { prepareDocumentSave } from '../src/services/documentPersistence';
import { resolveImageDimensions } from '../src/components/preview/imageDimensions';
import { combineIssueMessages } from '../src/services/previewIssues';
import type { EditorFile, NoteMetadata, ProjectMetadata } from '../src/types/content';

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

test('frontmatter YAML 语法错误会被显式暴露，且 note 不再偷偷补今天日期', () => {
  const raw = `---
title: [broken
---

正文
`;

  const parsed = parseMarkdownContent(raw, 'note');

  assert.equal(parsed.hasFrontmatter, true);
  assert.equal((parsed.metadata as { date?: string }).date, '');
  assert.equal(Array.isArray((parsed as { issues?: string[] }).issues), true);
  assert.match((parsed as { issues?: string[] }).issues?.[0] || '', /frontmatter|YAML/i);
});

test('无 frontmatter 的 note / graph 不再合成默认发布日期', () => {
  const note = parseMarkdownContent('# 标题\n\n正文', 'note');
  const graph = parseMarkdownContent('```graph\n{"nodes":[],"edges":[]}\n```', 'graph');

  assert.equal((note.metadata as { date?: string }).date, '');
  assert.equal((graph.metadata as { date?: string }).date, undefined);
});

test('roadmap 非法 status 会归一到 active，并明确记录契约错误', () => {
  const raw = `---
title: 契约清理
status: archived
---

- [ ] 检查契约 \`high\`
`;

  const parsed = parseMarkdownContent(raw, 'roadmap');

  assert.equal((parsed.metadata as { status?: string }).status, 'active');
  assert.equal(Array.isArray((parsed as { issues?: string[] }).issues), true);
  assert.match((parsed as { issues?: string[] }).issues?.join('\n') || '', /status/i);
});

test('frontmatter 非字符串文本字段不会被强转为 [object Object]，保存时也不会写回该字符串', () => {
  const noteRaw = `---
title:
  bad: 1
excerpt:
  nested: true
tags: [契约]
---

正文
`;
  const noteParsed = parseMarkdownContent(noteRaw, 'note');
  const noteMetadata = noteParsed.metadata as NoteMetadata;

  assert.equal(noteMetadata.title, '');
  assert.equal(noteMetadata.excerpt, '');

  const prepared = prepareDocumentSave({
    path: '/workspace/content/notes/contract.md',
    name: 'contract.md',
    type: 'note',
    content: noteParsed.content,
    metadata: {
      ...noteMetadata,
      tags: ['契约', '已保存'],
    },
    issues: noteParsed.issues,
    frontmatterRaw: noteParsed.frontmatterRaw,
    frontmatterBlock: noteParsed.frontmatterBlock ?? undefined,
    metadataDirty: true,
    isDirty: true,
    hasFrontmatter: noteParsed.hasFrontmatter,
    hasBom: noteParsed.hasBom,
    lineEnding: noteParsed.lineEnding,
  } satisfies EditorFile);

  assert.doesNotMatch(prepared.fileContent, /\[object Object\]/);
  assert.match(prepared.fileContent, /tags:/);

  const projectRaw = `---
name:
  zh: 项目
description:
  short: 描述
github:
  url: https://github.com/example/repo
demo:
  url: https://example.com
---

正文
`;
  const projectParsed = parseMarkdownContent(projectRaw, 'project');
  const projectMetadata = projectParsed.metadata as ProjectMetadata;

  assert.equal(projectMetadata.name, '');
  assert.equal(projectMetadata.description, '');
  assert.equal(projectMetadata.github, '');
  assert.equal(projectMetadata.demo, undefined);
});

test('prepareDocumentSave 会用重解析后的 project metadata 回写保存态，避免空白 CTA 字段残留在编辑器状态里', () => {
  const prepared = prepareDocumentSave({
    path: '/workspace/content/projects/contract.md',
    name: 'contract.md',
    type: 'project',
    content: '正文\n',
    metadata: {
      name: '契约清理',
      description: '   ',
      github: '   ',
      demo: '   ',
      tags: [],
      techStack: [],
    },
    issues: [],
    metadataDirty: true,
    isDirty: true,
    hasFrontmatter: false,
    hasBom: false,
    lineEnding: 'lf',
  } satisfies EditorFile);

  assert.deepEqual(prepared.nextFile.metadata, {
    name: '契约清理',
    description: '',
    github: '',
    demo: undefined,
    date: undefined,
    tags: [],
    techStack: [],
  } satisfies ProjectMetadata);
});

test('project techStack 解析与 JasBlog 对齐，只接受字符串 icon/color，保留数组字符串项原值', () => {
  const raw = `---
name: JasBlogEditor
techStack:
  - " React "
  - name: Tauri
    icon: 1
    color:
      bad: 1
  - name: TypeScript
    icon: TS
    color: "#3178C6"
---

正文
`;

  const parsed = parseMarkdownContent(raw, 'project');

  assert.deepEqual((parsed.metadata as ProjectMetadata).techStack, [
    { name: ' React ' },
    { name: 'Tauri', icon: undefined, color: undefined },
    { name: 'TypeScript', icon: 'TS', color: '#3178C6' },
  ]);
});

test('预览错误合并会同时保留 frontmatter issues 和内容解析错误', () => {
  assert.equal(
    combineIssueMessages(['note frontmatter 错误'], 'graph 数据格式无效'),
    'note frontmatter 错误\ngraph 数据格式无效'
  );
  assert.equal(combineIssueMessages([], undefined), undefined);
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
