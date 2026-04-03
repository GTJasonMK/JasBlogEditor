import test from "node:test";
import assert from "node:assert/strict";
import {
  FRONTMATTER_FAQ,
  FRONTMATTER_FIELD_TABLE,
  FRONTMATTER_HELP_EXAMPLES,
  FRONTMATTER_SECTION_LINKS,
  FRONTMATTER_WRITING_RULES,
} from "../src/components/layout/toolbar/help/frontmatterHelpData";

test("frontmatter 帮助包含写作通用规则与六类完整示例文档", () => {
  assert.ok(
    FRONTMATTER_SECTION_LINKS.some(
      (section) => section.id === "frontmatter-writing-rules"
    )
  );
  assert.equal(FRONTMATTER_WRITING_RULES.length >= 4, true);

  assert.deepEqual(
    FRONTMATTER_HELP_EXAMPLES.map((example) => example.type),
    ["note", "diary", "project", "roadmap", "graph", "doc"]
  );

  for (const example of FRONTMATTER_HELP_EXAMPLES) {
    assert.match(example.raw, /^---\n[\s\S]+\n---\n/m);
    assert.equal(example.commonPatterns.length >= 3, true);
    assert.equal(example.writingTips.length >= 2, true);
  }
});

test("frontmatter 帮助示例覆盖各类型最常见写法", () => {
  const note = FRONTMATTER_HELP_EXAMPLES.find((example) => example.type === "note");
  const diary = FRONTMATTER_HELP_EXAMPLES.find((example) => example.type === "diary");
  const project = FRONTMATTER_HELP_EXAMPLES.find(
    (example) => example.type === "project"
  );
  const roadmap = FRONTMATTER_HELP_EXAMPLES.find(
    (example) => example.type === "roadmap"
  );
  const graph = FRONTMATTER_HELP_EXAMPLES.find((example) => example.type === "graph");
  const doc = FRONTMATTER_HELP_EXAMPLES.find((example) => example.type === "doc");

  assert.ok(note);
  assert.ok(diary);
  assert.ok(project);
  assert.ok(roadmap);
  assert.ok(graph);
  assert.ok(doc);

  assert.match(note.raw, /## 核心结论/);
  assert.match(diary.raw, /## 明日安排/);
  assert.match(project.raw, /## 功能亮点/);
  assert.match(roadmap.raw, /- \[-\] 明确帮助页结构 `high`/);
  assert.doesNotMatch(roadmap.raw, /- \[ \] `high`/);
  assert.match(graph.raw, /```graph/);
  assert.match(doc.raw, /## 操作步骤/);
});

test("frontmatter 帮助文案描述的是当前真实契约，而不是旧的必填/默认日期规则", () => {
  assert.doesNotMatch(FRONTMATTER_FIELD_TABLE, /date` 默认为当天/);
  assert.doesNotMatch(FRONTMATTER_FIELD_TABLE, /`name\/description\/github`/);
  assert.doesNotMatch(FRONTMATTER_FIELD_TABLE, /\| diary（考研日志） \| `title\/date` \|/);
  assert.match(FRONTMATTER_FIELD_TABLE, /\| note \| 无强制 \|/);
  assert.match(FRONTMATTER_FIELD_TABLE, /\| project \| 无强制 \|/);
  assert.match(FRONTMATTER_FIELD_TABLE, /\| diary（考研日志） \| 无强制 \|/);
  assert.match(FRONTMATTER_FAQ.join("\n"), /YAML 语法错误会显式暴露/);
  assert.doesNotMatch(FRONTMATTER_FAQ.join("\n"), /回退到默认元数据/);
});
