import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { streamValidatedSuggestion } from "../src/services/aiSuggestionSession";
import {
  createSuggestionRequestManager,
  resolveSuggestionAcceptance,
  resolveSuggestionCompletion,
  resolveSuggestionFailure,
  resolveSuggestionEditorViewState,
} from "../src/services/aiSuggestionWorkflow";
import { LLMClient } from "../src/services/llm";

const repoRoot = path.resolve(import.meta.dirname, "..");

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function createSuggestion(overrides: Partial<ReturnType<typeof buildSuggestionFixture>> = {}) {
  return {
    ...buildSuggestionFixture(),
    ...overrides,
  };
}

function buildSuggestionFixture() {
  const sourceContent = "第一段\n第二段\n第三段";
  const selectedText = "第二段";
  const generatedText = "新的第二段";
  const selectionStart = sourceContent.indexOf(selectedText);

  return {
    mode: "replace" as const,
    sourceContent,
    generatedText,
    selectionStart,
    selectionEnd: selectionStart + selectedText.length,
    nextContent: sourceContent.replace(selectedText, generatedText),
    selectedText,
  };
}

test("编辑器在 AI 生成中即使首个 chunk 尚未到达，也必须保持只读", () => {
  const viewState = resolveSuggestionEditorViewState({
    isGenerating: true,
    pendingSuggestion: null,
    deferredSuggestion: null,
  });

  assert.equal(viewState.readOnly, true);
  assert.equal(viewState.suggestion, null);
});

test("生成中即使已经收到部分 suggestion，也必须继续使用流式原文 diff，而不是切到最终审阅模式", () => {
  const pendingSuggestion = createSuggestion();
  const staleDeferredSuggestion = createSuggestion({ generatedText: "旧候选稿" });

  const viewState = resolveSuggestionEditorViewState({
    isGenerating: true,
    pendingSuggestion,
    deferredSuggestion: staleDeferredSuggestion,
  });

  assert.equal(viewState.readOnly, true);
  assert.equal(viewState.suggestion, staleDeferredSuggestion);
});

test("生成结束后，编辑器 diff 必须立刻跟随即时 suggestion，并继续保留在原文编辑器里审阅", () => {
  const pendingSuggestion = createSuggestion();
  const staleDeferredSuggestion = createSuggestion({ generatedText: "旧候选稿" });

  const viewState = resolveSuggestionEditorViewState({
    isGenerating: false,
    pendingSuggestion,
    deferredSuggestion: staleDeferredSuggestion,
  });

  assert.equal(viewState.readOnly, true);
  assert.equal(viewState.suggestion, pendingSuggestion);
});

test("最终校验失败时必须保留最后一版 patch，并把问题显式暴露出来", () => {
  const lastSuggestion = createSuggestion({ generatedText: "生成中的候选稿" });

  const state = resolveSuggestionCompletion({
    result: { ok: false, message: "本地契约校验未通过。" },
    previousSuggestion: lastSuggestion,
  });

  assert.equal(state.pendingSuggestion, lastSuggestion);
  assert.equal(state.applyIssue, "本地契约校验未通过。");
});

test("如果最终结果被识别为无改动候选稿，必须清掉待接受 suggestion，避免出现空 diff 但仍可接受", () => {
  const lastSuggestion = createSuggestion({ generatedText: "生成中的候选稿" });

  const state = resolveSuggestionCompletion({
    result: {
      ok: false,
      message: "AI 本次输出没有产生任何改动，已忽略该候选稿。",
      discardSuggestion: true,
    },
    previousSuggestion: lastSuggestion,
  });

  assert.equal(state.pendingSuggestion, null);
  assert.equal(state.applyIssue, "AI 本次输出没有产生任何改动，已忽略该候选稿。");
});

test("流式过程中如果底层请求抛错，必须保留最后一版 patch，并阻止用户接受半成品", () => {
  const lastSuggestion = createSuggestion({ generatedText: "生成到一半的候选稿" });

  const state = resolveSuggestionFailure({
    issue: new Error("流式响应中断"),
    previousSuggestion: lastSuggestion,
  });

  assert.equal(state.pendingSuggestion, lastSuggestion);
  assert.equal(state.error, null);
  assert.match(state.applyIssue || "", /流式响应中断/);
  assert.match(state.applyIssue || "", /中断前已收到的部分内容/);

  const acceptance = resolveSuggestionAcceptance(
    lastSuggestion.sourceContent,
    state.pendingSuggestion,
    state.applyIssue
  );

  assert.equal(acceptance.ok, false);
  assert.equal(acceptance.preserveSuggestion, true);
});

test("已结束的 suggestion 被清空后，滞后的 deferred diff 也必须立即消失", () => {
  const staleDeferredSuggestion = createSuggestion();
  const viewState = resolveSuggestionEditorViewState({
    isGenerating: false,
    pendingSuggestion: null,
    deferredSuggestion: staleDeferredSuggestion,
  });

  assert.equal(viewState.readOnly, false);
  assert.equal(viewState.suggestion, null);
});

test("接受 suggestion 前如果正文已经变化，必须显式阻止覆盖旧快照", () => {
  const result = resolveSuggestionAcceptance(
    "第一段\n第二段（人工改动）\n第三段",
    createSuggestion()
  );

  assert.equal(result.ok, false);
  assert.match(result.message, /旧版本|重新发起/);
});

test("存在 applyIssue 时必须阻止接受 suggestion，避免把非法候选稿写回正文", () => {
  const result = resolveSuggestionAcceptance(
    "第一段\n第二段\n第三段",
    createSuggestion(),
    "本地契约校验未通过。"
  );

  assert.equal(result.ok, false);
  assert.match(result.message, /本地契约校验未通过/);
});

test("请求管理器在开始新请求时会中止旧请求，并且只认当前会话", () => {
  const manager = createSuggestionRequestManager();
  const first = manager.start();
  const second = manager.start();

  assert.equal(first.signal.aborted, true);
  assert.equal(manager.isCurrent(first.id), false);
  assert.equal(manager.isCurrent(second.id), true);
});

test("请求管理器取消后，当前请求必须立刻失效并触发 abort", () => {
  const manager = createSuggestionRequestManager();
  const request = manager.start();

  manager.cancel();

  assert.equal(request.signal.aborted, true);
  assert.equal(manager.isCurrent(request.id), false);
});

test("流式 suggestion 会把请求级 signal 继续传给 LLMClient，以便真正中止底层请求", async () => {
  const originalFactory = LLMClient.createFromConfig;
  const controller = new AbortController();
  let receivedSignal: AbortSignal | undefined;

  LLMClient.createFromConfig = (() => ({
    async *streamChat(params: { signal?: AbortSignal }) {
      receivedSignal = params.signal;
      yield {
        content:
          "<<<JASBLOG_BODY_START>>>新的第二段<<<JASBLOG_BODY_END>>>",
        finishReason: "stop",
      };
    },
  })) as typeof LLMClient.createFromConfig;

  try {
    const suggestion = createSuggestion();
    const result = await streamValidatedSuggestion({
      file: {
        path: "E:/Code/Jas/JasBlogEditor/docs/test.md",
        name: "test.md",
        type: "doc",
        content: suggestion.sourceContent,
        metadata: { title: "测试", date: "2026-04-05" },
        issues: [],
        metadataDirty: false,
        isDirty: false,
        hasFrontmatter: false,
        hasBom: false,
        lineEnding: "lf",
      },
      prompt: "请改写第二段",
      promptSelectionText: suggestion.selectedText,
      sourceContent: suggestion.sourceContent,
      selectedText: suggestion.selectedText,
      selectionStart: suggestion.selectionStart,
      selectionEnd: suggestion.selectionEnd,
      mode: suggestion.mode,
      clientConfig: {
        apiKey: "test-key",
        model: "gpt-4o-mini",
      },
      signal: controller.signal,
      isCancelled: () => false,
      onReasoning: () => {},
      onSuggestion: () => {},
    });

    assert.equal(result.ok, true);
  } finally {
    LLMClient.createFromConfig = originalFactory;
  }

  assert.equal(receivedSignal, controller.signal);
});

test("MarkdownEditor 必须使用统一的展示态解析，而不是直接把 pendingSuggestion 和 deferredSuggestion 分开消费", () => {
  const source = readRepoFile("src/components/editors/MarkdownEditor.tsx");

  assert.match(source, /resolveSuggestionEditorViewState/);
  assert.match(source, /const suggestionViewState = resolveSuggestionEditorViewState/);
  assert.match(source, /readOnly=\{suggestionViewState\.readOnly\}/);
  assert.match(source, /suggestion=\{suggestionViewState\.suggestion\}/);
  assert.match(source, /onClose=\{aiAssistant\.handleCloseComposer\}/);
});

test("useInlineAIAssistant 在接受前必须校验当前正文是否仍等于 suggestion 的源快照，并为流式请求传递独立 signal", () => {
  const source = readRepoFile("src/hooks/useInlineAIAssistant.ts");

  assert.match(source, /resolveSuggestionCompletion/);
  assert.match(source, /resolveSuggestionFailure/);
  assert.match(source, /resolveSuggestionAcceptance/);
  assert.match(source, /currentFile\.content/);
  assert.match(source, /applyIssue/);
  assert.match(source, /requestManagerRef/);
  assert.match(source, /signal:\s*request\.signal/);
});
