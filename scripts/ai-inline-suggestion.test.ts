import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  buildPresetPrompt,
  resolveAIApplyTarget,
} from "../src/services/aiComposer";
import {
  buildSuggestionPatchModel,
  buildSuggestionLineChangePlan,
} from "../src/services/aiSuggestionInlineDiff";

const repoRoot = path.resolve(import.meta.dirname, "..");

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function buildSuggestionFixture(
  sourceContent: string,
  selectedText: string,
  generatedText: string
) {
  const selectionStart = sourceContent.indexOf(selectedText);
  assert.notEqual(selectionStart, -1, "选中文本必须存在于原文中");
  const selectionEnd = selectionStart + selectedText.length;

  return {
    mode: "replace" as const,
    sourceContent,
    generatedText,
    selectionStart,
    selectionEnd,
    nextContent: sourceContent.replace(selectedText, generatedText),
    selectedText,
  };
}

test("AI 快捷动作只负责填充输入框提示词，文案会根据是否有选区变化", () => {
  assert.match(buildPresetPrompt("continue", false), /当前文档/);
  assert.match(buildPresetPrompt("polish", true), /选中文本/);
  assert.match(buildPresetPrompt("summary", false), /摘要/);
  assert.match(buildPresetPrompt("translate", true), /翻译/);
});

test("应用范围解析会按选区自动决定替换还是插入", () => {
  assert.deepEqual(resolveAIApplyTarget(10, 6), {
    mode: "replace",
    selectionStart: 6,
    selectionEnd: 10,
  });
});

test("应用范围解析在没有选区且没有明确指令时，会退回光标插入", () => {
  assert.deepEqual(resolveAIApplyTarget(6, 6), {
    mode: "insert",
    selectionStart: 6,
    selectionEnd: 6,
  });
});

test("无选区时只要提示词是在改整篇文档，默认应走整篇替换而不是在光标处插入", () => {
  assert.deepEqual(
    resolveAIApplyTarget(
      0,
      0,
      "请把这篇文档整体优化一下，修正语气并理顺结构。",
      120
    ),
    {
      mode: "replace",
      selectionStart: 0,
      selectionEnd: 120,
    }
  );
});

test("无选区但提示词明显是在当前位置续写时，仍应保留插入模式", () => {
  assert.deepEqual(
    resolveAIApplyTarget(
      18,
      18,
      "请在这里继续写下去，补充下一段正文。",
      120
    ),
    {
      mode: "insert",
      selectionStart: 18,
      selectionEnd: 18,
    }
  );
});

test("无选区但提示词明确要求润色当前文档正文时，会改为整篇替换", () => {
  assert.deepEqual(
    resolveAIApplyTarget(
      0,
      0,
      "请润色当前文档正文，让表达更清晰、准确、自然，保留原意和 Markdown 结构。",
      120
    ),
    {
      mode: "replace",
      selectionStart: 0,
      selectionEnd: 120,
    }
  );
});

test("单行替换 diff 会保留原文位置，并分别产出删除与新增 patch", () => {
  const patch = buildSuggestionPatchModel(
    buildSuggestionFixture(
      "晨读了政治选择题\n晚上状态很差\n整理了英语错题",
      "晚上状态很差",
      "晚上状态一般"
    )
  );

  assert.equal(patch.layout, "inline");
  assert.equal(patch.hunks.length, 1);
  assert.equal(patch.hunks[0].sourceAnchor, "晨读了政治选择题\n".length);
  assert.deepEqual(
    patch.hunks[0].segments.map((segment) => `${segment.kind}:${segment.text}`),
    ["equal:晚上状态", "remove:很差", "add:一般"]
  );
});

test("多行插入会保留原文正文，并在锚点位置插入新增块", () => {
  const sourceContent = ["上午背单词", "晚上复盘"].join("\n");
  const insertionPoint = sourceContent.indexOf("\n");
  const patch = buildSuggestionPatchModel({
    mode: "insert",
    sourceContent,
    generatedText: "\n下午刷数学真题",
    selectionStart: insertionPoint,
    selectionEnd: insertionPoint,
    nextContent: "上午背单词\n下午刷数学真题\n晚上复盘",
    selectedText: "",
  });

  assert.equal(patch.layout, "block");
  assert.equal(patch.hunks.length, 1);
  assert.equal(patch.hunks[0].sourceAnchor, insertionPoint);
  assert.deepEqual(
    patch.hunks[0].addedLines,
    ["", "下午刷数学真题"]
  );
  assert.equal(patch.hunks[0].removedLines.length, 0);
});

test("整篇替换会生成分散在真实变更点的 patch hunk", () => {
  const selectedText = [
    "## 第一阶段",
    "",
    "- [ ] `high` 核心任务一",
    "- [ ] `medium` 辅助任务",
  ].join("\n");
  const generatedText = [
    "## 第一阶段",
    "",
    "- [ ] `high` 完成核心功能模块一的开发与基础测试",
    "- [ ] `medium` 搭建辅助工具链，为后续开发提供支持",
  ].join("\n");
  const patch = buildSuggestionPatchModel({
    mode: "replace",
    sourceContent: selectedText,
    generatedText,
    selectionStart: 0,
    selectionEnd: selectedText.length,
    nextContent: generatedText,
    selectedText,
  });

  assert.ok(patch.hunks.length >= 2);
  assert.ok(
    patch.hunks.some(
      (hunk) =>
        hunk.removedLines[0]?.text.includes("核心任务一") &&
        hunk.addedLines[0]?.includes("完成核心功能模块一的开发与基础测试")
    )
  );
  assert.ok(
    patch.hunks.some(
      (hunk) =>
        hunk.removedLines[0]?.text.includes("辅助任务") &&
        hunk.addedLines[0]?.includes("搭建辅助工具链，为后续开发提供支持")
    )
  );
});

test("多行整篇改写会把 patch 锚定到各自的原文位置，而不是堆到候选稿顶部", () => {
  const selectedText = [
    "## 第一阶段",
    "",
    "- [ ] `high` 核心任务一",
    "- [ ] `medium` 辅助任务",
  ].join("\n");
  const generatedText = [
    "## 第一阶段",
    "",
    "- [ ] `high` 完成核心功能模块一的开发与基础测试",
    "- [ ] `medium` 搭建辅助工具链，为后续开发提供支持",
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

  assert.ok(plan.hunks.length >= 2);
  assert.equal(new Set(plan.hunks.map((hunk) => hunk.sourceAnchor)).size, plan.hunks.length);
  assert.match(plan.hunks[0].removedLines[0]?.text ?? "", /核心任务一/);
  assert.match(plan.hunks[1].removedLines[0]?.text ?? "", /辅助任务/);
  assert.ok(plan.hunks.some((hunk) => hunk.addedLines.some((line) => line.length > 0)));
});

test("整篇改写里的长句字段应降级为整行替换块，避免字词级噪声 diff", () => {
  const selectedText = [
    "- [ ] 实现核心功能模块一 `high`",
    "描述: 开发系统不可或缺的核心功能组件。",
    "详情: 此模块是项目的支柱，需优先保证其逻辑正确性与接口稳定性。",
  ].join("\n");
  const generatedText = [
    "- [ ] 实现核心功能模块一 `high`",
    "描述: 构建与模块一紧密协作的关键子系统。",
    "详情: 该模块负责支撑核心业务流程，其设计需与模块一保持高度一致，确保数据流与业务逻辑顺畅。",
  ].join("\n");

  const patch = buildSuggestionPatchModel({
    mode: "replace",
    sourceContent: selectedText,
    generatedText,
    selectionStart: 0,
    selectionEnd: selectedText.length,
    nextContent: generatedText,
    selectedText,
  });

  assert.ok(
    patch.hunks.some(
      (hunk) =>
        hunk.layout === "block" &&
        hunk.removedLines[0]?.text.startsWith("描述:") &&
        hunk.addedLines[0]?.startsWith("描述:")
    )
  );
  assert.ok(
    patch.hunks.some(
      (hunk) =>
        hunk.layout === "block" &&
        hunk.removedLines[0]?.text.startsWith("详情:") &&
        hunk.addedLines[0]?.startsWith("详情:")
    )
  );
});

test("checklist 任务整行被改写为另一项任务时，应保持块级替换，避免完成后退化成碎片化行内 diff", () => {
  const selectedText = [
    "## 第一阶段",
    "",
    "- [ ] 实现核心功能模块一 `high`",
    "描述：开发系统不可或缺的核心功能组件。",
  ].join("\n");
  const generatedText = [
    "## 第一阶段",
    "",
    "- [ ] 搭建基础开发与部署环境 `medium`",
    "描述：配置统一的开发、测试与生产环境，并制定基础规范。",
  ].join("\n");
  const patch = buildSuggestionPatchModel({
    mode: "replace",
    sourceContent: selectedText,
    generatedText,
    selectionStart: 0,
    selectionEnd: selectedText.length,
    nextContent: generatedText,
    selectedText,
  });

  assert.ok(
    patch.hunks.some(
      (hunk) =>
        hunk.layout === "block" &&
        hunk.removedLines.some((line) => line.text.includes("实现核心功能模块一")) &&
        hunk.addedLines.some((line) => line.includes("搭建基础开发与部署环境"))
    )
  );
});

test("字段标签与下一行正文被合并时，应保留单个块级替换，避免新增块和后续删除块在同一锚点打架", () => {
  const selectedText = [
    "详情：",
    "此模块是项目的支柱，需优先保证其逻辑正确性与接口稳定性。",
    "",
    "- [ ] 下一项任务 `medium`",
  ].join("\n");
  const generatedText = [
    "详情：此模块是项目的支柱，需优先保证其逻辑正确性与接口稳定性。",
    "",
    "- [ ] 下一项任务 `medium`",
  ].join("\n");
  const patch = buildSuggestionPatchModel({
    mode: "replace",
    sourceContent: selectedText,
    generatedText,
    selectionStart: 0,
    selectionEnd: selectedText.length,
    nextContent: generatedText,
    selectedText,
  });

  assert.equal(patch.hunks.length, 1);
  assert.equal(patch.hunks[0]?.layout, "block");
  assert.deepEqual(
    patch.hunks[0]?.removedLines.map((line) => line.text),
    [
      "详情：",
      "此模块是项目的支柱，需优先保证其逻辑正确性与接口稳定性。",
    ]
  );
  assert.deepEqual(patch.hunks[0]?.addedLines, [
    "详情：此模块是项目的支柱，需优先保证其逻辑正确性与接口稳定性。",
  ]);
});

test("字段标签与正文合并后如果后面继续追加多行内容，应并入同一个块级 hunk，避免完成后新增块消失", () => {
  const selectedText = [
    "描述：开发系统不可或缺的核心功能组件。",
    "详情：",
    "此模块是项目的支柱，需优先保证其逻辑正确性与接口稳定性。开发时应充分考虑后续模块的接入需求。",
  ].join("\n");
  const generatedText = [
    "描述：构建与模块一紧密协作的关键子系统。",
    "详情：该模块负责支撑核心业务流程，其设计需与模块一保持高度一致，确保数据流与业务逻辑顺畅。",
    "",
    "- [ ] 搭建基础开发与部署环境 `medium`",
    "描述：配置统一的开发、测试与生产环境，并制定基础规范。",
  ].join("\n");
  const patch = buildSuggestionPatchModel({
    mode: "replace",
    sourceContent: selectedText,
    generatedText,
    selectionStart: 0,
    selectionEnd: selectedText.length,
    nextContent: generatedText,
    selectedText,
  });

  assert.equal(patch.hunks.length, 2);
  assert.equal(patch.hunks[1]?.layout, "block");
  assert.deepEqual(
    patch.hunks[1]?.removedLines.map((line) => line.text),
    [
      "详情：",
      "此模块是项目的支柱，需优先保证其逻辑正确性与接口稳定性。开发时应充分考虑后续模块的接入需求。",
    ]
  );
  assert.deepEqual(patch.hunks[1]?.addedLines, [
    "详情：该模块负责支撑核心业务流程，其设计需与模块一保持高度一致，确保数据流与业务逻辑顺畅。",
    "",
    "- [ ] 搭建基础开发与部署环境 `medium`",
    "描述：配置统一的开发、测试与生产环境，并制定基础规范。",
  ]);
});

test("MarkdownEditor 在待接受修改期间保持原文编辑器，只把候选稿交给预览", () => {
  const editorSource = readRepoFile("src/components/editors/MarkdownEditor.tsx");
  const codeEditorSource = readRepoFile("src/components/editors/MarkdownCodeEditor.tsx");
  const composerSource = readRepoFile("src/components/editors/AIAssistantComposer.tsx");
  const suggestionDecorationsSource = readRepoFile(
    "src/services/codeMirrorSuggestionDecorations.ts"
  );

  assert.match(editorSource, /AIAssistantComposer/);
  assert.match(editorSource, /AISuggestionFloatingActions/);
  assert.match(editorSource, /const editorContent = currentFile\.content/);
  assert.match(editorSource, /const bodyContent = aiAssistant\.pendingSuggestion/);
  assert.doesNotMatch(editorSource, /applySuggestionToContent\(aiAssistant\.pendingSuggestion\)/);
  assert.match(editorSource, /MarkdownCodeEditor/);
  assert.match(codeEditorSource, /EditorView/);
  assert.match(codeEditorSource, /markdown\(\)/);
  assert.match(codeEditorSource, /EditorView\.editable\.of\(!readOnly\)/);
  assert.match(suggestionDecorationsSource, /AddedTextWidget/);
  assert.match(suggestionDecorationsSource, /markRemovedRange/);
  assert.doesNotMatch(composerSource, /已选中 .* 字/);
  assert.doesNotMatch(composerSource, /当前没有选区/);
  assert.doesNotMatch(composerSource, /右侧栏编辑/);
  assert.doesNotMatch(composerSource, /如需改写全文，请先全选正文/);
  assert.doesNotMatch(composerSource, /AI 正在生成待接受修改/);
  assert.doesNotMatch(editorSource, /target=/);
  assert.doesNotMatch(editorSource, /onTargetChange=/);
  assert.doesNotMatch(composerSource, /TARGET_LABELS/);
  assert.doesNotMatch(editorSource, /AISuggestionBanner/);
  assert.doesNotMatch(editorSource, /AISuggestionDiffView/);
  assert.doesNotMatch(editorSource, /editorContent = aiAssistant\.pendingSuggestion/);
});
