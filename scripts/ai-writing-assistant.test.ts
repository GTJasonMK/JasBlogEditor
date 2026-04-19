import test from "node:test";
import assert from "node:assert/strict";
import type {
  DiaryMetadata,
  EditorFile,
  GraphMetadata,
  RoadmapMetadata,
} from "../src/types/content";
import {
  buildAIAssistantMessages,
  validateGeneratedTextApplication,
} from "../src/services/aiWritingAssistant";

function createRoadmapFile(content: string): EditorFile {
  const metadata: RoadmapMetadata = {
    title: "帮助页升级计划",
    description: "补齐示例和规范",
    status: "active",
    date: "2026-04-05",
  };

  return {
    path: "E:/Code/Jas/JasBlog/content/roadmaps/help-upgrade.md",
    name: "help-upgrade.md",
    type: "roadmap",
    content,
    metadata,
    issues: [],
    frontmatterRaw: {
      title: metadata.title,
      description: metadata.description,
      status: metadata.status,
      date: metadata.date,
    },
    frontmatterBlock:
      "---\n" +
      "title: 帮助页升级计划\n" +
      "description: 补齐示例和规范\n" +
      "status: active\n" +
      "date: 2026-04-05\n" +
      "---\n",
    metadataDirty: false,
    isDirty: false,
    hasFrontmatter: true,
    hasBom: false,
    lineEnding: "lf",
  };
}

function createGraphFile(content: string): EditorFile {
  const metadata: GraphMetadata = {
    name: "状态流转图谱",
    description: "梳理编辑器渲染和发布契约",
    date: "2026-04-05",
  };

  return {
    path: "E:/Code/Jas/JasBlog/content/graphs/state-flow.md",
    name: "state-flow.md",
    type: "graph",
    content,
    metadata,
    issues: [],
    frontmatterRaw: {
      name: metadata.name,
      description: metadata.description,
      date: metadata.date,
    },
    frontmatterBlock:
      "---\n" +
      "name: 状态流转图谱\n" +
      "description: 梳理编辑器渲染和发布契约\n" +
      "date: 2026-04-05\n" +
      "---\n",
    metadataDirty: false,
    isDirty: false,
    hasFrontmatter: true,
    hasBom: false,
    lineEnding: "lf",
  };
}

function createDiaryFile(content: string): EditorFile {
  const metadata: DiaryMetadata = {
    title: "状态同步复盘",
    date: "2026-04-05",
    time: "21:30",
    excerpt: "记录渲染问题排查过程",
    tags: ["复盘"],
  };

  return {
    path: "E:/Code/Jas/JasBlog/content/diary/2026/04/2026-04-05-21-30-review.md",
    name: "2026-04-05-21-30-review.md",
    type: "diary",
    content,
    metadata,
    issues: ["diary frontmatter YAML 解析失败：bad indent"],
    frontmatterRaw: {},
    frontmatterBlock:
      "---\n" +
      "title: 状态同步复盘\n" +
      "date: 2026-04-05\n" +
      "time: 21:30\n" +
      "---\n",
    metadataDirty: false,
    isDirty: false,
    hasFrontmatter: true,
    hasBom: false,
    lineEnding: "lf",
  };
}

test("AI 写作提示词复用帮助页里的 roadmap 契约，并保留完整文档上下文", () => {
  const content =
    "开头锚点：这里先说明帮助页为什么要重构。\n\n" +
    "## 第一阶段\n\n" +
    "- [ ] 梳理帮助结构 `high`\n" +
    "  描述: 先收拢问题\n\n" +
    "中间填充".repeat(220) +
    "\n结尾锚点：这里是最后的收口段落。";
  const file = createRoadmapFile(content);

  const messages = buildAIAssistantMessages({
    action: "continue",
    file,
    selectedText: "",
    customPrompt: "",
    mode: "insert",
    selectionStart: file.content.length,
    selectionEnd: file.content.length,
  });

  assert.equal(messages[0]?.role, "system");
  assert.match(messages[0]?.content || "", /优先级只能写在标题尾部的反引号里/);
  assert.match(messages[0]?.content || "", /描述.*详情.*截止.*完成/);
  assert.doesNotMatch(messages[0]?.content || "", /project\.techStack/);
  assert.doesNotMatch(messages[0]?.content || "", /diary\.time/);
  assert.doesNotMatch(messages[0]?.content || "", /帮助页完整示例：/);
  assert.match(messages[1]?.content || "", /开头锚点：这里先说明帮助页为什么要重构/);
  assert.match(messages[1]?.content || "", /结尾锚点：这里是最后的收口段落/);
});

test("AI 写作提示词包含当前文档的路径、规范化 metadata 与现有 issues，避免脱离真实契约", () => {
  const file = createDiaryFile("## 今日复盘\n\n今天主要修了帮助页和 diary 预览。");
  const selectedText = "今天主要修了帮助页和 diary 预览。";
  const selectionStart = file.content.indexOf(selectedText);

  const messages = buildAIAssistantMessages({
    action: "custom",
    file,
    selectedText,
    customPrompt: "改成更清晰的复盘口吻",
    mode: "replace",
    selectionStart,
    selectionEnd: selectionStart + selectedText.length,
  });

  const userMessage = messages[1]?.content || "";

  assert.match(userMessage, /E:\/Code\/Jas\/JasBlog\/content\/diary\/2026\/04\/2026-04-05-21-30-review\.md/);
  assert.match(userMessage, /diary frontmatter YAML 解析失败：bad indent/);
  assert.match(userMessage, /"title": "状态同步复盘"/);
  assert.doesNotMatch(userMessage, /当前 frontmatter 原文/);
  assert.match(userMessage, /当前选中片段/);
});

test("AI 提示词会按当前文档类型裁剪规则，graph 不再混入 roadmap 和 diary 的无关约束", () => {
  const file = createGraphFile(
    "图谱说明。\n\n```graph\n{\n  \"nodes\": [],\n  \"edges\": []\n}\n```"
  );

  const messages = buildAIAssistantMessages({
    action: "polish",
    file,
    selectedText: "",
    customPrompt: "",
    mode: "replace",
    selectionStart: 0,
    selectionEnd: file.content.length,
  });

  const systemMessage = messages[0]?.content || "";

  assert.match(systemMessage, /graph.*代码块|graph.*类型优先读取 `name`/);
  assert.doesNotMatch(systemMessage, /roadmap\.status/);
  assert.doesNotMatch(systemMessage, /diary\.time/);
  assert.doesNotMatch(systemMessage, /project\.techStack/);
});

test("AI 提示词会明确 frontmatter 只读，输出只能用于正文编辑区", () => {
  const file = createRoadmapFile(
    "## 第一阶段\n\n- [ ] 梳理帮助结构 `high`\n  描述: 先收拢问题"
  );

  const messages = buildAIAssistantMessages({
    action: "custom",
    file,
    selectedText: "",
    customPrompt: "补一段阶段说明",
    mode: "replace",
    selectionStart: 0,
    selectionEnd: file.content.length,
  });

  const systemMessage = messages[0]?.content || "";

  assert.match(systemMessage, /frontmatter.*只读|只作为只读上下文/);
  assert.match(systemMessage, /右侧栏|侧边栏/);
  assert.match(systemMessage, /只输出最终可写回编辑器的 Markdown 正文/);
  assert.match(systemMessage, /好的，我已理解|下面是修改后内容|我做了这些调整/);
  assert.doesNotMatch(systemMessage, /帮助页完整示例：/);
});

test("AI 提示词会显式告诉模型：插入模式只能返回新增片段，不能把整篇正文重新回传", () => {
  const file = createRoadmapFile(
    "## 第一阶段\n\n- [ ] 梳理帮助结构 `high`\n  描述: 先收拢问题"
  );

  const messages = buildAIAssistantMessages({
    action: "custom",
    file,
    selectedText: "",
    customPrompt: "请在这里补一段阶段说明",
    mode: "insert",
    selectionStart: 10,
    selectionEnd: 10,
  });

  const systemMessage = messages[0]?.content || "";

  assert.match(systemMessage, /本次操作类型：插入/);
  assert.match(systemMessage, /只输出要插入当前位置的新文本片段/);
  assert.match(systemMessage, /不要回传整篇文档|不要重复任何已有正文/);
});

test("AI 提示词会显式告诉模型：整篇改写必须返回完整正文，而不是只回局部片段", () => {
  const file = createRoadmapFile(
    "## 第一阶段\n\n- [ ] 梳理帮助结构 `high`\n  描述: 先收拢问题"
  );

  const messages = buildAIAssistantMessages({
    action: "translate",
    file,
    selectedText: "",
    customPrompt: "",
    mode: "replace",
    selectionStart: 0,
    selectionEnd: file.content.length,
  });

  const systemMessage = messages[0]?.content || "";

  assert.match(systemMessage, /本次操作类型：整篇改写/);
  assert.match(systemMessage, /必须输出修改后的完整正文/);
  assert.match(systemMessage, /不能只返回一段摘要或局部片段/);
});

test("AI 提示词会要求模型把最终正文包在显式边界标记里，避免解释前缀污染 diff", () => {
  const file = createRoadmapFile(
    "## 第一阶段\n\n- [ ] 梳理帮助结构 `high`\n  描述: 先收拢问题"
  );

  const messages = buildAIAssistantMessages({
    action: "custom",
    file,
    selectedText: "",
    customPrompt: "请润色当前文档正文，让表达更清晰、准确、自然，保留原意和 Markdown 结构。",
    mode: "replace",
    selectionStart: 0,
    selectionEnd: file.content.length,
  });

  const systemMessage = messages[0]?.content || "";

  assert.match(systemMessage, /JASBLOG_BODY_START/);
  assert.match(systemMessage, /JASBLOG_BODY_END/);
  assert.match(systemMessage, /最终正文必须严格包在/);
});

test("AI 结果插入后如果引入 roadmap 旧优先级语法，会被本地契约校验显式拦下", () => {
  const file = createRoadmapFile(
    "## 第一阶段\n\n- [ ] 梳理帮助结构 `high`\n  描述: 先收拢问题"
  );

  const result = validateGeneratedTextApplication({
    file,
    mode: "insert",
    generatedText: "\n- [ ] `high` 错误写法\n\t截止: 2026-04-30",
    selectionStart: file.content.length,
    selectionEnd: file.content.length,
  });

  assert.equal(result.ok, false);
  assert.match(result.message || "", /优先级必须尾置|单个 Tab/);
});

test("AI 结果如果包含 frontmatter 块，会因为正文区不允许编辑 frontmatter 而被拦下", () => {
  const file = createRoadmapFile(
    "## 第一阶段\n\n- [ ] 梳理帮助结构 `high`\n  描述: 先收拢问题"
  );

  const result = validateGeneratedTextApplication({
    file,
    mode: "insert",
    generatedText:
      "\n---\ntitle: 改成新的标题\ndate: 2026-04-06\n---\n\n补充一段阶段说明。",
    selectionStart: file.content.length,
    selectionEnd: file.content.length,
  });

  assert.equal(result.ok, false);
  assert.match(result.message || "", /frontmatter|右侧栏|侧边栏/);
});

test("整篇改写如果最终没有产生任何改动，会被显式识别为无效候选稿", () => {
  const file = createRoadmapFile(
    "## 第一阶段\n\n- [ ] 梳理帮助结构 `high`\n  描述: 先收拢问题"
  );

  const result = validateGeneratedTextApplication({
    file,
    mode: "replace",
    generatedText: file.content,
    selectionStart: 0,
    selectionEnd: file.content.length,
  });

  assert.equal(result.ok, false);
  assert.match(result.message || "", /没有产生任何改动|无改动/);
  assert.equal(result.nextContent, file.content);
});

test("插入模式下如果 AI 整包回传整篇正文，会被显式识别为范围契约错误", () => {
  const file = createRoadmapFile(
    "## 第一阶段\n\n- [ ] 梳理帮助结构 `high`\n  描述: 先收拢问题"
  );

  const result = validateGeneratedTextApplication({
    file,
    mode: "insert",
    generatedText: file.content,
    selectionStart: 0,
    selectionEnd: 0,
  });

  assert.equal(result.ok, false);
  assert.match(result.message || "", /整篇正文/);
  assert.match(result.message || "", /插入/);
});

test("局部替换模式下如果 AI 回传整篇正文，会被显式识别为范围契约错误", () => {
  const file = createRoadmapFile(
    "## 第一阶段\n\n- [ ] 梳理帮助结构 `high`\n  描述: 先收拢问题"
  );
  const selectedText = "梳理帮助结构";
  const selectionStart = file.content.indexOf(selectedText);

  const result = validateGeneratedTextApplication({
    file,
    mode: "replace",
    generatedText: file.content,
    selectionStart,
    selectionEnd: selectionStart + selectedText.length,
  });

  assert.equal(result.ok, false);
  assert.match(result.message || "", /整篇正文/);
  assert.match(result.message || "", /局部替换|选中片段/);
});

test("AI 结果替换后如果让 graph 代码块结构失效，会被本地契约校验显式拦下", () => {
  const file = createGraphFile(
    "图谱说明。\n\n```graph\n{\n  \"nodes\": [],\n  \"edges\": []\n}\n```"
  );

  const result = validateGeneratedTextApplication({
    file,
    mode: "replace",
    generatedText: "图谱说明。\n\n```graph\n{\n  \"items\": []\n}\n```",
    selectionStart: 0,
    selectionEnd: file.content.length,
  });

  assert.equal(result.ok, false);
  assert.match(result.message || "", /graph 数据格式无效|缺少 `nodes\/edges`/);
});

test("polish 整篇改写使用 patch 模式 scope，要求搜索替换对格式而非完整正文", () => {
  const file = createRoadmapFile(
    "## 第一阶段\n\n- [ ] 梳理帮助结构 `high`\n  描述: 先收拢问题"
  );

  const messages = buildAIAssistantMessages({
    action: "polish",
    file,
    selectedText: "",
    customPrompt: "",
    mode: "replace",
    selectionStart: 0,
    selectionEnd: file.content.length,
  });

  const systemMessage = messages[0]?.content || "";

  assert.match(systemMessage, /本次操作类型：润色/);
  assert.match(systemMessage, /patch/);
  assert.doesNotMatch(systemMessage, /本次操作类型：整篇改写/);
  assert.match(systemMessage, /FIND/);
  assert.match(systemMessage, /REPLACE/);
  assert.match(systemMessage, /搜索替换对/);
  assert.match(systemMessage, /禁止修改 Markdown 结构符号/);
});

test("polish system prompt 包含明确禁令，禁止添加删除段落和修改结构符号", () => {
  const file = createDiaryFile("## 今日复盘\n\n今天主要修了帮助页和 diary 预览。");

  const messages = buildAIAssistantMessages({
    action: "polish",
    file,
    selectedText: "",
    customPrompt: "",
    mode: "replace",
    selectionStart: 0,
    selectionEnd: file.content.length,
  });

  const systemMessage = messages[0]?.content || "";

  assert.match(systemMessage, /严格禁止/);
  assert.match(systemMessage, /添加或删除段落/);
  assert.match(systemMessage, /增减空白行/);
  assert.match(systemMessage, /如果某句已经足够清晰/);
});

test("polish user prompt 要求逐段审阅并输出搜索替换对", () => {
  const file = createDiaryFile("## 今日复盘\n\n今天主要修了帮助页和 diary 预览。");

  const messages = buildAIAssistantMessages({
    action: "polish",
    file,
    selectedText: "",
    customPrompt: "",
    mode: "replace",
    selectionStart: 0,
    selectionEnd: file.content.length,
  });

  const userMessage = messages[1]?.content || "";

  assert.match(userMessage, /逐段审阅/);
  assert.match(userMessage, /搜索替换对/);
});
