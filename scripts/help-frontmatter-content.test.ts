import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  FRONTMATTER_FAQ,
  FRONTMATTER_FIELD_TABLE,
  FRONTMATTER_HELP_EXAMPLES,
  FRONTMATTER_SECTION_LINKS,
  FRONTMATTER_WRITING_RULES,
} from "../src/components/layout/toolbar/help/frontmatterHelpData";

const repoRoot = path.resolve(import.meta.dirname, "..");

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function getExample(type: (typeof FRONTMATTER_HELP_EXAMPLES)[number]["type"]) {
  return FRONTMATTER_HELP_EXAMPLES.find((example) => example.type === type);
}

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
  const note = getExample("note");
  const diary = getExample("diary");
  const project = getExample("project");
  const roadmap = getExample("roadmap");
  const graph = getExample("graph");
  const doc = getExample("doc");

  assert.ok(note);
  assert.ok(diary);
  assert.ok(project);
  assert.ok(roadmap);
  assert.ok(graph);
  assert.ok(doc);

  assert.match(note.raw, /## 核心结论/);
  assert.match(diary.raw, /\[React 状态同步排查笔记\]\(\/notes\/react-state-sync\)/);
  assert.match(diary.raw, /\[状态流转图谱\]\(\/graphs\/state-flow\)/);
  assert.match(diary.raw, /## 明日安排/);
  assert.equal((diary.scenarioExamples?.length ?? 0) >= 5, true);
  assert.equal(diary.scenarioExamples?.[0]?.title, "文件路径与文件名");
  assert.equal(diary.scenarioExamples?.[1]?.title, "同一天多条记录");
  assert.equal(diary.scenarioExamples?.[2]?.title, "引用笔记与图谱");
  assert.match(
    diary.scenarioExamples?.[0]?.code ?? "",
    /content\/diary\/2026\/04\/2026-04-03-09-00-morning-plan\.md/
  );
  assert.match(
    diary.scenarioExamples?.[1]?.code ?? "",
    /time: 21:30/
  );
  assert.match(project.raw, /## 功能亮点/);
  assert.match(roadmap.raw, /- \[-\] 明确帮助页结构 `high`/);
  assert.doesNotMatch(roadmap.raw, /- \[ \] `high`/);
  assert.match(graph.raw, /```graph/);
  assert.match(doc.raw, /## 操作步骤/);
});

test("frontmatter 帮助为每类文档提供场景化写法示例，而不只是单篇演示文档", () => {
  const note = getExample("note");
  const diary = getExample("diary");
  const project = getExample("project");
  const roadmap = getExample("roadmap");
  const graph = getExample("graph");
  const doc = getExample("doc");

  assert.equal((note?.scenarioExamples?.length ?? 0) >= 3, true);
  assert.equal((project?.scenarioExamples?.length ?? 0) >= 4, true);
  assert.equal((roadmap?.scenarioExamples?.length ?? 0) >= 4, true);
  assert.equal((graph?.scenarioExamples?.length ?? 0) >= 6, true);
  assert.equal((doc?.scenarioExamples?.length ?? 0) >= 3, true);
  assert.equal((diary?.scenarioExamples?.length ?? 0) >= 5, true);

  assert.equal(note?.scenarioExamples?.[0]?.title, "结论先行的排查笔记");
  assert.equal(note?.scenarioExamples?.[1]?.title, "步骤型学习笔记");
  assert.match(note?.scenarioExamples?.[0]?.code ?? "", /## 核心结论/);
  assert.match(note?.scenarioExamples?.[1]?.code ?? "", /## 操作步骤/);
  assert.match(
    note?.scenarioExamples?.map((scenario) => scenario.title).join("\n") ?? "",
    /什么时候该改写成 doc/
  );

  assert.equal(project?.scenarioExamples?.[0]?.title, "最小项目卡片");
  assert.equal(project?.scenarioExamples?.[1]?.title, "结构化技术栈");
  assert.match(project?.scenarioExamples?.[0]?.code ?? "", /github:/);
  assert.match(project?.scenarioExamples?.[1]?.code ?? "", /techStack:/);
  assert.match(
    project?.scenarioExamples?.map((scenario) => scenario.title).join("\n") ?? "",
    /无 demo 的项目写法/
  );
  assert.match(
    project?.scenarioExamples?.map((scenario) => scenario.title).join("\n") ?? "",
    /逗号分隔技术栈/
  );
  assert.match(
    project?.scenarioExamples?.find(
      (scenario) => scenario.title === "逗号分隔技术栈"
    )?.code ?? "",
    /techStack: React, Tauri, TypeScript/
  );

  assert.equal(roadmap?.scenarioExamples?.[0]?.title, "最小任务语法");
  assert.equal(roadmap?.scenarioExamples?.[1]?.title, "带描述与截止的任务");
  assert.match(roadmap?.scenarioExamples?.[0]?.code ?? "", /- \[ \] 任务标题 `high`/);
  assert.match(roadmap?.scenarioExamples?.[1]?.code ?? "", /  截止: 2026-04-05/);
  assert.match(
    roadmap?.scenarioExamples?.map((scenario) => scenario.title).join("\n") ?? "",
    /前缀兼容写法/
  );
  assert.match(
    roadmap?.scenarioExamples?.map((scenario) => scenario.title).join("\n") ?? "",
    /错误缩进与优先级/
  );

  assert.equal(graph?.scenarioExamples?.[0]?.title, "最小可渲染图谱");
  assert.equal(graph?.scenarioExamples?.[1]?.title, "图谱前后的说明正文");
  assert.match(graph?.scenarioExamples?.[0]?.code ?? "", /```graph/);
  assert.match(graph?.scenarioExamples?.[1]?.code ?? "", /## 阅读提示/);
  assert.match(
    graph?.scenarioExamples?.map((scenario) => scenario.title).join("\n") ?? "",
    /第一个有效 graph 代码块/
  );
  assert.match(
    graph?.scenarioExamples?.map((scenario) => scenario.title).join("\n") ?? "",
    /错误 JSON 与错误结构/
  );
  assert.match(
    graph?.scenarioExamples?.map((scenario) => scenario.title).join("\n") ?? "",
    /节点颜色与详情字段/
  );
  assert.match(
    graph?.scenarioExamples?.map((scenario) => scenario.title).join("\n") ?? "",
    /节点时间字段/
  );

  assert.equal(doc?.scenarioExamples?.[0]?.title, "无 frontmatter 的普通文档");
  assert.equal(doc?.scenarioExamples?.[1]?.title, "带 frontmatter 的说明文档");
  assert.doesNotMatch(doc?.scenarioExamples?.[0]?.code ?? "", /^---/);
  assert.match(doc?.scenarioExamples?.[1]?.code ?? "", /^---\ntitle:/);
  assert.match(
    doc?.scenarioExamples?.map((scenario) => scenario.title).join("\n") ?? "",
    /什么时候该改写成 note/
  );

  assert.equal(diary?.scenarioExamples?.[0]?.title, "文件路径与文件名");
  assert.equal(diary?.scenarioExamples?.[1]?.title, "同一天多条记录");
  assert.equal(diary?.scenarioExamples?.[2]?.title, "引用笔记与图谱");
  assert.match(
    diary?.scenarioExamples?.map((scenario) => scenario.title).join("\n") ?? "",
    /复盘上下文字段/
  );
  assert.match(
    diary?.scenarioExamples?.map((scenario) => scenario.title).join("\n") ?? "",
    /什么时候不该写成 diary/
  );
});

test("frontmatter 帮助文案描述的是当前真实契约，而不是旧的必填/默认日期规则", () => {
  assert.doesNotMatch(FRONTMATTER_FIELD_TABLE, /date` 默认为当天/);
  assert.doesNotMatch(FRONTMATTER_FIELD_TABLE, /`name\/description\/github`/);
  assert.doesNotMatch(FRONTMATTER_FIELD_TABLE, /\| diary（考研日志） \| `title\/date` \|/);
  assert.match(FRONTMATTER_FIELD_TABLE, /\| note \| 无强制 \|/);
  assert.match(FRONTMATTER_FIELD_TABLE, /\| project \| 无强制 \|/);
  assert.match(FRONTMATTER_FIELD_TABLE, /\| diary（考研日志） \| 无强制 \|/);
  assert.match(FRONTMATTER_FAQ.join("\n"), /YAML 语法错误会显式暴露/);
  assert.match(
    FRONTMATTER_FAQ.join("\n"),
    /diary 正文里可以继续用标准 Markdown 链接引用学习笔记和知识图谱/
  );
  assert.match(
    FRONTMATTER_FAQ.join("\n"),
    /站点 diary 详情页会在当前页面弹出预览/
  );
  assert.match(
    FRONTMATTER_FAQ.join("\n"),
    /`tags`、`companions`、`techStack` 既可以写 YAML 数组/
  );
  assert.match(
    FRONTMATTER_FAQ.join("\n"),
    /`diary\.time` 支持 `9:00`、`09:00`、`0900`/
  );
  assert.doesNotMatch(FRONTMATTER_FAQ.join("\n"), /回退到默认元数据/);
});

test("frontmatter 帮助页会把 diary 的场景化写法示例渲染出来", () => {
  const source = readRepoFile(
    "src/components/layout/toolbar/help/FrontmatterHelpTab.tsx"
  );
  const sectionSource = readRepoFile(
    "src/components/layout/toolbar/help/FrontmatterHelpExampleSection.tsx"
  );

  assert.match(source, /FrontmatterHelpExampleSection/);
  assert.match(sectionSource, /常见场景示例/);
  assert.match(sectionSource, /scenarioExamples/);
  assert.match(sectionSource, /CodeCard title="写法示例"/);
});

test("frontmatter 帮助页使用二级分类切换而不是把所有类型完整平铺", () => {
  const source = readRepoFile(
    "src/components/layout/toolbar/help/FrontmatterHelpTab.tsx"
  );
  const browserSource = readRepoFile(
    "src/components/layout/toolbar/help/FrontmatterHelpTypeBrowser.tsx"
  );
  const tabsSource = readRepoFile(
    "src/components/layout/toolbar/help/helpModalTabs.tsx"
  );
  const dataSource = readRepoFile(
    "src/components/layout/toolbar/help/frontmatterHelpData.ts"
  );

  assert.match(source, /FrontmatterHelpTypeBrowser/);
  assert.match(source, /const activeExample =/);
  assert.match(browserSource, /frontmatter-type-browser/);
  assert.match(browserSource, /切换到该文档类型示例/);
  assert.match(tabsSource, /sectionLinks: FRONTMATTER_SECTION_LINKS/);
  assert.match(dataSource, /frontmatter-type-browser/);
  assert.match(dataSource, /frontmatter-selected-example/);
  assert.match(source, /return \(\s*<div className="min-w-0">/);
  assert.match(
    source,
    /className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-2"/
  );
});

test("frontmatter 帮助页的类型卡片、场景卡片和示例说明条不会被长标题撑坏布局", () => {
  const browserSource = readRepoFile(
    "src/components/layout/toolbar/help/FrontmatterHelpTypeBrowser.tsx"
  );
  const sectionSource = readRepoFile(
    "src/components/layout/toolbar/help/FrontmatterHelpExampleSection.tsx"
  );
  const blocksSource = readRepoFile(
    "src/components/layout/toolbar/help/helpBlocks.tsx"
  );

  assert.match(
    browserSource,
    /className=\{`min-w-0 rounded-xl border[^`"]*text-left/
  );
  assert.match(browserSource, /text-sm font-semibold[^"]*break-words/);
  assert.match(browserSource, /text-sm leading-relaxed[^"]*break-words/);
  assert.match(sectionSource, /className="mt-4 min-w-0 flex flex-col gap-3/);
  assert.match(sectionSource, /className="shrink-0 rounded-md border/);
  assert.match(sectionSource, /className="min-w-0 rounded-xl border/);
  assert.match(blocksSource, /className="mb-8 min-w-0 scroll-mt-4"/);
  assert.match(blocksSource, /text-xs[^"]*break-words[^"]*border-b/);
  assert.match(blocksSource, /text-xs[^"]*break-words[^"]*mt-1/);
});

test("frontmatter 帮助页的概览说明、场景说明和类型浏览器文案对长路径与长词条换行", () => {
  const browserSource = readRepoFile(
    "src/components/layout/toolbar/help/FrontmatterHelpTypeBrowser.tsx"
  );
  const sectionSource = readRepoFile(
    "src/components/layout/toolbar/help/FrontmatterHelpExampleSection.tsx"
  );

  assert.match(browserSource, /<h3 className="[^"]*break-words[^"]*text-base[^"]*font-semibold/);
  assert.match(browserSource, /<p className="[^"]*break-words[^"]*text-sm[^"]*text-\[var\(--color-text-muted\)\]/);
  assert.match(browserSource, /<p className="[^"]*break-words[^"]*text-\[11px\][^"]*uppercase/);
  assert.match(sectionSource, /<p className="[^"]*break-words[^"]*text-sm[^"]*leading-relaxed[^"]*text-\[var\(--color-text\)\]">/);
  assert.match(sectionSource, /<ul className="[^"]*break-words[^"]*list-disc[^"]*text-sm[^"]*text-\[var\(--color-text\)\]">/);
});
