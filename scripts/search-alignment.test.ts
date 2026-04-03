import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const editorRoot = path.resolve(import.meta.dirname, "..");
const workspaceRoot = path.resolve(editorRoot, "..");

function readEditorFile(relativePath: string): string {
  return fs.readFileSync(path.join(editorRoot, relativePath), "utf8");
}

function readWorkspaceFile(relativePath: string): string {
  return fs.readFileSync(path.join(workspaceRoot, relativePath), "utf8");
}

async function importSearchService() {
  const servicePath = path.join(editorRoot, "src/services/jasblogSearch.ts");
  assert.equal(fs.existsSync(servicePath), true, "缺少搜索索引服务 src/services/jasblogSearch.ts");
  return import(pathToFileURL(servicePath).href);
}

test("搜索索引服务复用统一 display/fallback 契约，并把 project techStack 纳入搜索", async () => {
  const { buildJasBlogSearchIndex } = await importSearchService();

  const index = buildJasBlogSearchIndex([
    {
      path: "/workspace/content/notes/trimmed-title.md",
      name: "trimmed-title.md",
      type: "note",
      raw: `---
title: "   "
excerpt: "   "
tags: [状态管理]
---

正文`,
    },
    {
      path: "/workspace/content/projects/jasblog-editor.md",
      name: "jasblog-editor.md",
      type: "project",
      raw: `---
name: "   "
description: 桌面编辑器
tags: [桌面端]
techStack:
  - name: React
  - name: Tauri
---

项目正文`,
    },
    {
      path: "/workspace/content/graphs/knowledge-map.md",
      name: "knowledge-map.md",
      type: "graph",
      raw: `---
name: "   "
description: 图谱说明
---

\`\`\`graph
{"nodes":[],"edges":[]}
\`\`\``,
    },
    {
      path: "/workspace/content/roadmaps/editor-alignment.md",
      name: "editor-alignment.md",
      type: "roadmap",
      raw: `---
title: "   "
description: 路线图说明
status: active
---

- [ ] 对齐搜索 \`high\``,
    },
  ]);

  const note = index.find((item) => item.type === "note");
  const project = index.find((item) => item.type === "project");
  const graph = index.find((item) => item.type === "graph");
  const roadmap = index.find((item) => item.type === "roadmap");

  assert.equal(note?.title, "trimmed-title");
  assert.equal(project?.title, "jasblog-editor");
  assert.match(project?.searchText || "", /\breact\b/);
  assert.match(project?.searchText || "", /\btauri\b/);
  assert.equal(graph?.title, "knowledge-map");
  assert.equal(roadmap?.title, "editor-alignment");
});

test("diary 搜索按天聚合，标题与搜索文本对齐站点单日页", async () => {
  const { buildJasBlogSearchIndex } = await importSearchService();

  const index = buildJasBlogSearchIndex([
    {
      path: "/workspace/content/diary/2026/04/2026-04-03-08-00-early-review.md",
      name: "2026-04-03-08-00-early-review.md",
      type: "diary",
      raw: `---
title: 早起复习
date: 2026-04-03
time: 08:00
---

英语阅读`,
    },
    {
      path: "/workspace/content/diary/2026/04/2026-04-03-21-30-night-summary.md",
      name: "2026-04-03-21-30-night-summary.md",
      type: "diary",
      raw: `---
title: 晚上总结
date: 2026-04-03
time: 21:30
---

数学错题`,
    },
    {
      path: "/workspace/content/diary/2026/04/2026-04-04.md",
      name: "2026-04-04.md",
      type: "diary",
      raw: `---
date: 2026-04-04
---

第二天`,
    },
  ]);

  const diaryItems = index.filter((item) => item.type === "diary");
  const target = diaryItems.find((item) => item.date === "2026-04-03");

  assert.equal(diaryItems.length, 2);
  assert.equal(target?.title, "2026-04-03 考研日志");
  assert.equal(target?.path, "/workspace/content/diary/2026/04/2026-04-03-08-00-early-review.md");
  assert.match(target?.searchText || "", /早起复习/);
  assert.match(target?.searchText || "", /晚上总结/);
  assert.match(target?.searchText || "", /英语阅读/);
  assert.match(target?.searchText || "", /数学错题/);
});

test("搜索正文索引包含 fenced code block 文本，避免和站点搜索分叉", async () => {
  const { buildJasBlogSearchIndex } = await importSearchService();

  const index = buildJasBlogSearchIndex([
    {
      path: "/workspace/content/notes/code-search.md",
      name: "code-search.md",
      type: "note",
      raw: `---
title: 代码搜索
---

\`\`\`ts
const total = 42;
pnpm build
\`\`\``,
    },
  ]);

  assert.equal(index.length, 1);
  assert.match(index[0].bodyText, /const total = 42;/);
  assert.match(index[0].searchText, /pnpm build/);
});

test("搜索弹窗委托给搜索服务，而不是在组件内继续手写 metadata fallback", () => {
  const modalSource = readEditorFile("src/components/layout/toolbar/JasBlogSearchModal.tsx");
  const hookSource = readEditorFile("src/hooks/useJasBlogSearchIndex.ts");

  assert.match(modalSource, /useJasBlogSearchIndex/);
  assert.match(hookSource, /buildJasBlogSearchIndex/);
  assert.doesNotMatch(modalSource, /meta\.title \|\| baseSlug/);
  assert.doesNotMatch(modalSource, /meta\.name \|\| \(meta as unknown as \{ title\?: string \}\)\.title \|\| baseSlug/);
});

test("TechStack 颜色表与 TOC 文案/展示门槛在站点与编辑器之间保持一致", () => {
  const siteTechStack = readWorkspaceFile("JasBlog/src/components/TechStack.tsx");
  const editorTechStack = readEditorFile("src/components/preview/TechStack.tsx");
  const notePreview = readEditorFile("src/components/preview/previews/NotePreview.tsx");
  const siteToc = readWorkspaceFile("JasBlog/src/components/TableOfContents.tsx");
  const editorToc = readEditorFile("src/components/preview/TableOfContents.tsx");

  assert.match(siteTechStack, /"Tauri": "#FFC131"/);
  assert.match(editorTechStack, /"Tauri": "#FFC131"/);
  assert.doesNotMatch(notePreview, /clientWidth >= 900/);
  assert.match(siteToc, /目录/);
  assert.match(editorToc, /目录/);
});
