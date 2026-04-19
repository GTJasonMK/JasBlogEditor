import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { parseMarkdownContent } from "../src/services/contentParser";
import { prepareDocumentSave } from "../src/services/documentPersistence";
import { streamValidatedSuggestion } from "../src/services/aiSuggestionSession";
import {
  buildRenderableSuggestionPatchModel,
  buildSuggestionLineChangePlan,
  resolveStreamingFrontierPosition,
  resolveStreamingProgressLineStarts,
  resolveStreamingProgressRange,
} from "../src/services/aiSuggestionInlineDiff";
import { createSuggestionDecorations } from "../src/services/codeMirrorSuggestionDecorations";
import { LLMClient } from "../src/services/llm";
import type { DocMetadata, EditorFile } from "../src/types/content";

const repoRoot = path.resolve(import.meta.dirname, "..");

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function createDocFile(content: string): EditorFile {
  const metadata: DocMetadata = {
    title: "测试文档",
    date: "2026-04-05",
  };

  return {
    path: "E:/Code/Jas/JasBlog/docs/test.md",
    name: "test.md",
    type: "doc",
    content,
    metadata,
    issues: [],
    frontmatterRaw: {
      title: metadata.title,
      date: metadata.date,
    },
    frontmatterBlock: "---\ntitle: 测试文档\ndate: 2026-04-05\n---\n",
    metadataDirty: false,
    isDirty: false,
    hasFrontmatter: true,
    hasBom: false,
    lineEnding: "lf",
  };
}

function collectSuggestionDecorations(
  suggestion: Parameters<typeof createSuggestionDecorations>[0],
  isGenerating = false
) {
  const state = EditorState.create({
    doc: suggestion?.sourceContent ?? "",
    extensions: [createSuggestionDecorations(suggestion, isGenerating)],
  });
  const [decorations] = state.facet(EditorView.decorations);
  const entries: Array<{
    from: number;
    to: number;
    className: string | null;
    widgetName: string | null;
  }> = [];

  if (!decorations) {
    return entries;
  }

  for (let iter = decorations.iter(); iter.value; iter.next()) {
    entries.push({
      from: iter.from,
      to: iter.to,
      className:
        typeof iter.value.spec.class === "string" ? iter.value.spec.class : null,
      widgetName: iter.value.spec.widget?.constructor?.name ?? null,
    });
  }

  return entries;
}

test("CRLF 正文在编辑器内存态必须统一为 LF，避免 CodeMirror 坐标与 AI patch 锚点错位", () => {
  const parsed = parseMarkdownContent("前言\r\n第二行\r\n第三行", "doc");
  const state = EditorState.create({ doc: parsed.content });

  assert.equal(parsed.content, "前言\n第二行\n第三行");
  assert.equal(state.doc.toString(), parsed.content);
  assert.equal(state.doc.length, parsed.content.length);
});

test("保存 CRLF 文档时只恢复磁盘行尾，不应把 CRLF 再带回编辑器内存态", () => {
  const currentFile = {
    ...createDocFile("第一行\n第二行"),
    lineEnding: "crlf" as const,
    isDirty: true,
  };

  const prepared = prepareDocumentSave(currentFile);

  assert.equal(prepared.fileContent.includes("\r\n"), true);
  assert.equal(/(^|[^\r])\n/.test(prepared.fileContent), false);
  assert.equal(prepared.nextFile.content, "第一行\n第二行");
  assert.equal(prepared.nextFile.lineEnding, "crlf");
});

test("流式建议在最终校验前也会提供可预览的 nextContent", async () => {
  const file = createDocFile("第一段\n第二段\n第三段");
  const selectionStart = file.content.indexOf("第二段");
  const selectionEnd = selectionStart + "第二段".length;
  const seenNextContents: string[] = [];
  const originalFactory = LLMClient.createFromConfig;

  LLMClient.createFromConfig = (() => ({
    async *streamChat() {
      yield { content: "<<<JASBLOG_BODY_START>>>新的", finishReason: null };
      yield { content: "第二段<<<JASBLOG_BODY_END>>>", finishReason: "stop" };
    },
  })) as typeof LLMClient.createFromConfig;

  try {
    const result = await streamValidatedSuggestion({
      file,
      prompt: "把第二段改写得更准确",
      promptSelectionText: "第二段",
      sourceContent: file.content,
      selectedText: "第二段",
      selectionStart,
      selectionEnd,
      mode: "replace",
      clientConfig: {
        apiKey: "test-key",
        model: "gpt-4o-mini",
      },
      isCancelled: () => false,
      onReasoning: () => {},
      onSuggestion: (suggestion) => {
        seenNextContents.push(suggestion.nextContent);
      },
    });

    assert.equal(result.ok, true);
  } finally {
    LLMClient.createFromConfig = originalFactory;
  }

  assert.equal(seenNextContents.length, 2);
  assert.ok(seenNextContents.every((value) => value.length > 0));
  assert.ok(seenNextContents.every((value) => value.includes("第一段")));
  assert.ok(seenNextContents.every((value) => value.includes("第三段")));
  assert.ok(seenNextContents.some((value) => value.includes("新的")));
});

test("起始正文边界后如果暂时只有空白，不应提前产出空白 patch", async () => {
  const file = createDocFile("# 旧标题\n\n旧段落");
  const seenGeneratedTexts: string[] = [];
  const originalFactory = LLMClient.createFromConfig;

  LLMClient.createFromConfig = (() => ({
    async *streamChat() {
      yield { content: "<<<JASBLOG_BODY_START>>>\n", finishReason: null };
      yield { content: "# 新标题", finishReason: null };
      yield { content: "\n\n新段落<<<JASBLOG_BODY_END>>>", finishReason: "stop" };
    },
  })) as typeof LLMClient.createFromConfig;

  try {
    const result = await streamValidatedSuggestion({
      file,
      prompt: "请整体润色正文",
      promptSelectionText: "",
      sourceContent: file.content,
      selectedText: file.content,
      selectionStart: 0,
      selectionEnd: file.content.length,
      mode: "replace",
      clientConfig: {
        apiKey: "test-key",
        model: "gpt-4o-mini",
      },
      isCancelled: () => false,
      onReasoning: () => {},
      onSuggestion: (suggestion) => {
        seenGeneratedTexts.push(suggestion.generatedText);
      },
    });

    assert.equal(result.ok, true);
  } finally {
    LLMClient.createFromConfig = originalFactory;
  }

  assert.deepEqual(seenGeneratedTexts, ["# 新标题", "# 新标题\n\n新段落"]);
});

test("流式建议只会对边界标记内部的正文做预览，忽略解释前缀与结尾说明", async () => {
  const file = createDocFile("第一段\n第二段\n第三段");
  const selectionStart = file.content.indexOf("第二段");
  const selectionEnd = selectionStart + "第二段".length;
  const seenGeneratedTexts: string[] = [];
  const originalFactory = LLMClient.createFromConfig;

  LLMClient.createFromConfig = (() => ({
    async *streamChat() {
      yield { content: "好的，我已理解。\n<<<JASBLOG_BODY_START>>>", finishReason: null };
      yield { content: "新的", finishReason: null };
      yield { content: "第二段", finishReason: null };
      yield {
        content: "<<<JASBLOG_BODY_END>>>\n以上是修改后内容。",
        finishReason: "stop",
      };
    },
  })) as typeof LLMClient.createFromConfig;

  try {
    const result = await streamValidatedSuggestion({
      file,
      prompt: "把第二段改写得更准确",
      promptSelectionText: "第二段",
      sourceContent: file.content,
      selectedText: "第二段",
      selectionStart,
      selectionEnd,
      mode: "replace",
      clientConfig: {
        apiKey: "test-key",
        model: "gpt-4o-mini",
      },
      isCancelled: () => false,
      onReasoning: () => {},
      onSuggestion: (suggestion) => {
        seenGeneratedTexts.push(suggestion.generatedText);
      },
    });

    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.suggestion.generatedText, "新的第二段");
    }
  } finally {
    LLMClient.createFromConfig = originalFactory;
  }

  assert.deepEqual(seenGeneratedTexts, ["新的", "新的第二段"]);
});

test("如果模型没有返回正文边界标记，流式建议会显式报协议错误", async () => {
  const file = createDocFile("第一段\n第二段\n第三段");
  const selectionStart = file.content.indexOf("第二段");
  const selectionEnd = selectionStart + "第二段".length;
  const originalFactory = LLMClient.createFromConfig;

  LLMClient.createFromConfig = (() => ({
    async *streamChat() {
      yield { content: "好的，我来帮你润色。\n新的第二段", finishReason: "stop" };
    },
  })) as typeof LLMClient.createFromConfig;

  try {
    const result = await streamValidatedSuggestion({
      file,
      prompt: "把第二段改写得更准确",
      promptSelectionText: "第二段",
      sourceContent: file.content,
      selectedText: "第二段",
      selectionStart,
      selectionEnd,
      mode: "replace",
      clientConfig: {
        apiKey: "test-key",
        model: "gpt-4o-mini",
      },
      isCancelled: () => false,
      onReasoning: () => {},
      onSuggestion: () => {
        throw new Error("缺少协议边界时不应生成正文 diff");
      },
    });

    assert.equal(result.ok, false);
    assert.match(result.message || "", /正文边界标记|JASBLOG_BODY_START/);
  } finally {
    LLMClient.createFromConfig = originalFactory;
  }
});

test("hunk 规划不会因为首个粗粒度块替换而吞掉后续仍可做行内 diff 的行", () => {
  const selectedText = [
    "完全旧的一行",
    "第二行轻微修改前",
    "第三行轻微修改前",
  ].join("\n");
  const generatedText = [
    "彻底重写的新段落内容很多很多",
    "第二行轻微修改后",
    "第三行轻微修改后",
  ].join("\n");

  const plan = buildSuggestionLineChangePlan({
    mode: "replace",
    sourceContent: selectedText,
    generatedText,
    selectionStart: 0,
    selectionEnd: selectedText.length,
    nextContent: generatedText,
    selectedText,
  });

  assert.equal(plan.hunks[0]?.layout, "block");
  assert.ok(
    plan.hunks.some(
      (hunk) =>
        hunk.layout === "inline" &&
        hunk.removedLines[0]?.text.includes("第二行轻微修改前")
    )
  );
  assert.ok(
    plan.hunks.some(
      (hunk) =>
        hunk.layout === "inline" &&
        hunk.removedLines[0]?.text.includes("第三行轻微修改前")
    )
  );
});

test("完成态规划不能把逐行改写的低相似度正文塌缩成整段块替换", () => {
  const selectedText = [
    "甲甲甲甲甲",
    "乙乙乙乙乙",
    "丙丙丙丙丙",
  ].join("\n");
  const generatedText = [
    "今天复盘英语错题",
    "重写数学思路总结",
    "补上政治整理计划",
  ].join("\n");

  const plan = buildSuggestionLineChangePlan({
    mode: "replace",
    sourceContent: selectedText,
    generatedText,
    selectionStart: 0,
    selectionEnd: selectedText.length,
    nextContent: generatedText,
    selectedText,
  });

  assert.equal(plan.hunks.length, 3);
  assert.deepEqual(
    plan.hunks.map((hunk) => hunk.addedLines),
    [
      ["今天复盘英语错题"],
      ["重写数学思路总结"],
      ["补上政治整理计划"],
    ]
  );
});

test("MarkdownEditor 对流式 suggestion 使用 deferred 更新，避免每个 chunk 都立即重算 patch", () => {
  const editorSource = readRepoFile("src/components/editors/MarkdownEditor.tsx");

  assert.match(editorSource, /useDeferredValue/);
  assert.match(
    editorSource,
    /const deferredSuggestion = useDeferredValue\(aiAssistant\.pendingSuggestion\)/
  );
  assert.match(editorSource, /resolveSuggestionEditorViewState/);
  assert.match(editorSource, /deferredSuggestion,/);
  assert.match(editorSource, /suggestion=\{suggestionViewState\.suggestion\}/);
  assert.match(editorSource, /const bodyContent = aiAssistant\.pendingSuggestion/);
});

test("行级 hunk 规划不会把纯空白行插入渲染成独立的大块空面板", () => {
  const selectedText = [
    "## 第一阶段：奠定基础",
    "",
    "旧段落",
  ].join("\n");
  const generatedText = [
    "## 第一阶段：奠定基础与准备",
    "",
    "新段落",
  ].join("\n");

  const plan = buildSuggestionLineChangePlan({
    mode: "replace",
    sourceContent: selectedText,
    generatedText,
    selectionStart: 0,
    selectionEnd: selectedText.length,
    nextContent: generatedText,
    selectedText,
  });

  assert.equal(
    plan.hunks.some(
      (hunk) =>
        hunk.layout === "block" &&
        hunk.addedLines.length > 0 &&
        hunk.addedLines.every((line) => line.trim() === "")
    ),
    false
  );
});

test("block widget 会把混合块里的前后空白行并入 unified diff，保证空白改动也可见", () => {
  const decorationsSource = readRepoFile("src/services/codeMirrorSuggestionDecorations.ts");

  assert.match(decorationsSource, /UnifiedDiffBlockWidget/);
});

test("block widget 会显式渲染新增标记，避免看起来只有删除没有新增", () => {
  const widgetSource = readRepoFile("src/services/codeMirrorSuggestionWidgets.ts");
  const styleSource = readRepoFile("src/editor-ai-diff.css");

  assert.match(widgetSource, /cm-ai-diff-line-add/);
  assert.match(styleSource, /\.editor-codemirror \.cm-ai-diff-line-add/);
});

test("纯空白新增行也必须保留可见 diff，避免右下角有接受拒绝但正文没有任何改动标记", () => {
  const selectedText = [
    "## 第一阶段：奠定基础",
    "",
    "本阶段先完成基础搭建。",
    "",
    "- [ ] 实现核心任务 `high`",
  ].join("\n");
  const generatedText = `${selectedText}\n\n`;
  const suggestion = {
    mode: "replace" as const,
    sourceContent: selectedText,
    generatedText,
    selectionStart: 0,
    selectionEnd: selectedText.length,
    nextContent: generatedText,
    selectedText,
  };

  const patch = buildRenderableSuggestionPatchModel(suggestion, false);
  assert.equal(
    patch.hunks.some(
      (hunk) =>
        hunk.layout === "block" &&
        hunk.sourceLength === 0 &&
        hunk.addedLines.length === 2 &&
        hunk.addedLines.every((line) => line === "")
    ),
    true
  );

  const decorations = collectSuggestionDecorations(suggestion, false);
  assert.equal(
    decorations.some((entry) => entry.widgetName === "UnifiedDiffBlockWidget"),
    true
  );
});

test("整篇改写在生成中不会把未生成尾部提前标成整片删除", () => {
  const selectedText = [
    "## 第一阶段：奠定基础",
    "",
    "第一段旧正文",
    "",
    "## 第二阶段：功能扩展与优化",
    "",
    "第二段旧正文",
  ].join("\n");
  const generatedText = [
    "## 第一阶段：奠定基础与准备",
    "",
    "第一段新正文",
  ].join("\n");

  const patch = buildRenderableSuggestionPatchModel(
    {
      mode: "replace",
      sourceContent: selectedText,
      generatedText,
      selectionStart: 0,
      selectionEnd: selectedText.length,
      nextContent: generatedText,
      selectedText,
    },
    true
  );

  assert.equal(
    patch.hunks.some(
      (hunk) =>
        hunk.layout === "block" &&
        hunk.addedLines.length === 0 &&
        hunk.removedLines.some((line) => line.text.includes("第二阶段"))
    ),
    false
  );
});

test("MarkdownCodeEditor 会把生成中状态传给 suggestion decorations，避免流式整篇改写提前显示尾部删除", () => {
  const source = readRepoFile("src/components/editors/MarkdownCodeEditor.tsx");

  assert.match(source, /isGenerating: boolean/);
  assert.match(source, /createSuggestionDecorations\(suggestion,\s*isGenerating\)/);
});

test("生成文本仅因末尾换行产生伪空行时，不会把下一行原文提前标成删除", () => {
  const selectedText = [
    "# 标题",
    "",
    "旧段1",
    "",
    "旧段2",
    "",
    "旧段3",
    "",
    "旧段4",
  ].join("\n");
  const generatedText = [
    "# 全新标题",
    "",
    "新段1",
    "",
    "新段2",
    "",
    "新段3",
    "",
  ].join("\n");

  const patch = buildRenderableSuggestionPatchModel(
    {
      mode: "replace",
      sourceContent: selectedText,
      generatedText,
      selectionStart: 0,
      selectionEnd: selectedText.length,
      nextContent: generatedText,
      selectedText,
    },
    true
  );

  assert.equal(
    patch.hunks.some((hunk) =>
      hunk.removedLines.some((line) => line.text.includes("旧段4"))
    ),
    false
  );
});

test("整篇改写生成中不会在已生成区间里出现只有删除没有新增的中间 hunk", () => {
  const selectedText = [
    "# 标题",
    "",
    "旧段1",
    "",
    "旧段2",
    "",
    "旧段3",
    "",
    "旧段4",
  ].join("\n");
  const generatedText = "# 全新标题\n\n新段1\n\n新段2\n\n新段3\n";

  const patch = buildRenderableSuggestionPatchModel(
    {
      mode: "replace",
      sourceContent: selectedText,
      generatedText,
      selectionStart: 0,
      selectionEnd: selectedText.length,
      nextContent: generatedText,
      selectedText,
    },
    true
  );

  assert.equal(
    patch.hunks.some((hunk, index) => (
      index < patch.hunks.length - 1 &&
      hunk.removedLines.length > 0 &&
      hunk.addedLines.length === 0
    )),
    false
  );
});

test("整篇改写生成中的最后一行如果仍是半成品，不应退化成只有删除的行内 diff", () => {
  const selectedText = "# 旧标题\n\n旧段落";
  const generatedText = "# 旧";

  const patch = buildRenderableSuggestionPatchModel(
    {
      mode: "replace",
      sourceContent: selectedText,
      generatedText,
      selectionStart: 0,
      selectionEnd: selectedText.length,
      nextContent: generatedText,
      selectedText,
    },
    true
  );

  assert.equal(patch.hunks[0]?.layout, "block");
  assert.deepEqual(patch.hunks[0]?.addedLines, ["# 旧"]);
  assert.equal(patch.hunks[0]?.removedLines[0]?.text, "# 旧标题");
});

test("当流式输出暂时只覆盖到原文前缀时，仍应保留一个可见的流式前沿位置", () => {
  const selectedText = "# 标题\n\n旧段1\n\n旧段2";
  const generatedText = "# 标题\n";
  const suggestion = {
    mode: "replace" as const,
    sourceContent: selectedText,
    generatedText,
    selectionStart: 0,
    selectionEnd: selectedText.length,
    nextContent: generatedText,
    selectedText,
  };
  const patch = buildRenderableSuggestionPatchModel(suggestion, true);

  assert.equal(patch.hunks.length, 0);
  assert.equal(resolveStreamingFrontierPosition(suggestion, patch, true), generatedText.length);
});

test("当流式输出暂时只覆盖到原文前缀时，应返回已生成区间用于稳定高亮", () => {
  const selectedText = "# 标题\n\n旧段1\n\n旧段2";
  const generatedText = "# 标题\n";
  const suggestion = {
    mode: "replace" as const,
    sourceContent: selectedText,
    generatedText,
    selectionStart: 0,
    selectionEnd: selectedText.length,
    nextContent: generatedText,
    selectedText,
  };
  const patch = buildRenderableSuggestionPatchModel(suggestion, true);

  assert.deepEqual(resolveStreamingProgressRange(suggestion, patch, true), {
    from: 0,
    to: generatedText.length,
  });
});

test("当流式输出暂时只覆盖到原文前缀时，应返回已生成行起点用于整行高亮", () => {
  const selectedText = "# 标题\n\n旧段1\n\n旧段2";
  const generatedText = "# 标题\n\n旧段1\n";
  const suggestion = {
    mode: "replace" as const,
    sourceContent: selectedText,
    generatedText,
    selectionStart: 0,
    selectionEnd: selectedText.length,
    nextContent: generatedText,
    selectedText,
  };
  const patch = buildRenderableSuggestionPatchModel(suggestion, true);

  assert.deepEqual(resolveStreamingProgressLineStarts(suggestion, patch, true), [0, 5, 6]);
});

test("CodeMirror 装饰层会把流式前沿位置渲染成独立标记，避免 diff 临时为空时完全消失", () => {
  const decorationsSource = readRepoFile("src/services/codeMirrorSuggestionDecorations.ts");
  const widgetSource = readRepoFile("src/services/codeMirrorSuggestionWidgets.ts");

  assert.match(decorationsSource, /resolveStreamingFrontierPosition/);
  assert.match(decorationsSource, /resolveStreamingProgressRange/);
  assert.match(decorationsSource, /resolveStreamingProgressLineStarts/);
  assert.match(decorationsSource, /Decoration\.line/);
  assert.match(decorationsSource, /cm-ai-streaming-progress-line/);
  assert.match(decorationsSource, /cm-ai-streaming-progress/);
  assert.match(decorationsSource, /pushStreamingFrontierWidget/);
  assert.match(widgetSource, /StreamingFrontierWidget/);
  assert.match(widgetSource, /cm-ai-streaming-frontier/);
});

test("完成态 patch 不应把仅因末行换行位置变化的相同行保留成不可见 hunk", () => {
  const suggestion = {
    mode: "replace" as const,
    sourceContent: "第一行\n第二行旧内容\n第三行",
    generatedText: "第一行\n第二行新内容\n第三行\n第四行",
    selectionStart: 0,
    selectionEnd: "第一行\n第二行旧内容\n第三行".length,
    nextContent: "第一行\n第二行新内容\n第三行\n第四行",
    selectedText: "第一行\n第二行旧内容\n第三行",
  };

  const patch = buildRenderableSuggestionPatchModel(suggestion, false);

  assert.equal(
    patch.hunks.some(
      (hunk) =>
        hunk.layout === "inline" &&
        hunk.removedLines.length === 1 &&
        hunk.addedLines.length === 1 &&
        hunk.removedLines[0]?.text === "第三行" &&
        hunk.addedLines[0] === "第三行"
    ),
    false
  );
});

test("删除尾部空白行时也必须保留可见 diff，避免按钮存在但对应删除完全不可见", () => {
  const suggestion = {
    mode: "replace" as const,
    sourceContent: "第一行\n第二行\n",
    generatedText: "第一行\n第二行",
    selectionStart: 0,
    selectionEnd: "第一行\n第二行\n".length,
    nextContent: "第一行\n第二行",
    selectedText: "第一行\n第二行\n",
  };

  const patch = buildRenderableSuggestionPatchModel(suggestion, false);
  assert.equal(
    patch.hunks.some(
      (hunk) =>
        hunk.layout === "block" &&
        hunk.sourceLength === 0 &&
        hunk.removedLines.length === 1 &&
        hunk.removedLines[0]?.text === "" &&
        hunk.addedLines.length === 0
    ),
    true
  );

  const decorations = collectSuggestionDecorations(suggestion, false);
  assert.equal(
    decorations.some((entry) => entry.widgetName === "UnifiedDiffBlockWidget"),
    true
  );
});

test("块级新增前导空白行与正文并存时，空白行也必须保留可见标记", () => {
  const suggestion = {
    mode: "replace" as const,
    sourceContent: "第一行\n第二行",
    generatedText: "第一行\n\n新增段落\n第二行",
    selectionStart: 0,
    selectionEnd: "第一行\n第二行".length,
    nextContent: "第一行\n\n新增段落\n第二行",
    selectedText: "第一行\n第二行",
  };

  const decorations = collectSuggestionDecorations(suggestion, false);
  assert.equal(
    decorations.some((entry) => entry.widgetName === "UnifiedDiffBlockWidget"),
    true
  );
});

test("块级新增尾部空白行与正文并存时，空白行也必须保留可见标记", () => {
  const suggestion = {
    mode: "replace" as const,
    sourceContent: "第一行\n第二行",
    generatedText: "第一行\n新增段落\n\n第二行",
    selectionStart: 0,
    selectionEnd: "第一行\n第二行".length,
    nextContent: "第一行\n新增段落\n\n第二行",
    selectedText: "第一行\n第二行",
  };

  const decorations = collectSuggestionDecorations(suggestion, false);
  assert.equal(
    decorations.some((entry) => entry.widgetName === "UnifiedDiffBlockWidget"),
    true
  );
});

test("流式整篇改写在 LLM 插入额外空行导致位置偏移时，仍能正确匹配相同内容", () => {
  const selectedText = [
    "## 今日复习目标\n",
    "\n",
    "- [ ] 复习英语单词\n",
    "\n",
    "## 完成情况\n",
    "\n",
    "今天完成了基本任务。\n",
  ].join("");
  const generatedText = [
    "## 今日复习目标\n",
    "\n",
    "\n",
    "- [ ] 复习英语单词\n",
    "\n",
    "## 完成情况\n",
  ].join("");

  const patch = buildRenderableSuggestionPatchModel(
    {
      mode: "replace",
      sourceContent: selectedText,
      generatedText,
      selectionStart: 0,
      selectionEnd: selectedText.length,
      nextContent: generatedText,
      selectedText,
    },
    true
  );

  assert.equal(
    patch.hunks.some(
      (hunk) =>
        hunk.removedLines.some((line) => line.text.includes("今日复习目标"))
    ),
    false,
    "相同的标题不应显示为变更"
  );
  assert.equal(
    patch.hunks.some(
      (hunk) =>
        hunk.removedLines.some((line) => line.text.includes("复习英语单词"))
    ),
    false,
    "相同的任务行不应显示为变更"
  );
  assert.equal(
    patch.hunks.some(
      (hunk) =>
        hunk.removedLines.some((line) => line.text.includes("完成情况"))
    ),
    false,
    "相同的标题不应显示为变更"
  );
});

test("流式整篇改写在 LLM 少输出一个空行时，后续相同行不应全部错位标红", () => {
  const selectedText = [
    "## 标题\n",
    "\n",
    "第一段旧正文\n",
    "\n",
    "第二段旧正文\n",
  ].join("");
  const generatedText = [
    "## 标题\n",
    "第一段新正文\n",
    "\n",
    "第二段旧正文\n",
  ].join("");

  const patch = buildRenderableSuggestionPatchModel(
    {
      mode: "replace",
      sourceContent: selectedText,
      generatedText,
      selectionStart: 0,
      selectionEnd: selectedText.length,
      nextContent: generatedText,
      selectedText,
    },
    true
  );

  assert.equal(
    patch.hunks.some(
      (hunk) =>
        hunk.removedLines.some((line) => line.text.includes("第二段旧正文"))
    ),
    false,
    "与原文相同的行不应因前面的行偏移而被标红"
  );
});

test("polish patch 模式流式建议会将 FIND/REPLACE 对应用到源文后再生成 diff", async () => {
  const sourceContent = "## 复习\n\n今天的进度不太好，需要加快。\n\n## 完成情况\n\n基本完成。";
  const file = createDocFile(sourceContent);
  const seenGeneratedTexts: string[] = [];
  const originalFactory = LLMClient.createFromConfig;

  LLMClient.createFromConfig = (() => ({
    async *streamChat() {
      yield {
        content: "<<<JASBLOG_BODY_START>>>\n<<<FIND>>>\n今天的进度不太好，需要加快。",
        finishReason: null,
      };
      yield {
        content: "\n<<<REPLACE>>>\n今日复习进度略有滞后，需调整节奏。\n<<<JASBLOG_BODY_END>>>",
        finishReason: "stop",
      };
    },
  })) as typeof LLMClient.createFromConfig;

  try {
    const result = await streamValidatedSuggestion({
      file,
      action: "polish",
      prompt: "请润色当前文档正文",
      promptSelectionText: "",
      sourceContent,
      selectedText: sourceContent,
      selectionStart: 0,
      selectionEnd: sourceContent.length,
      mode: "replace",
      clientConfig: { apiKey: "test-key", model: "gpt-4o-mini" },
      isCancelled: () => false,
      onReasoning: () => {},
      onSuggestion: (suggestion) => {
        seenGeneratedTexts.push(suggestion.generatedText);
      },
    });

    assert.equal(result.ok, true);
    if (result.ok) {
      assert.ok(result.suggestion.generatedText.includes("## 复习"));
      assert.ok(result.suggestion.generatedText.includes("今日复习进度略有滞后"));
      assert.ok(result.suggestion.generatedText.includes("## 完成情况"));
      assert.ok(result.suggestion.generatedText.includes("基本完成。"));
      assert.ok(!result.suggestion.generatedText.includes("<<<FIND>>>"));
    }
  } finally {
    LLMClient.createFromConfig = originalFactory;
  }

  assert.ok(seenGeneratedTexts.length > 0);
});
