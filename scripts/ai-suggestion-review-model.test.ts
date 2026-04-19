import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { createSuggestionDecorations } from "../src/services/codeMirrorSuggestionDecorations";

const repoRoot = path.resolve(import.meta.dirname, "..");

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function collectDecorationEntries() {
  const suggestion = {
    mode: "replace" as const,
    sourceContent: [
      "## 第一阶段",
      "",
      "旧段落",
      "",
      "- [ ] 旧任务 `high`",
    ].join("\n"),
    generatedText: [
      "## 第一阶段：奠定基础",
      "",
      "新段落",
      "",
      "- [ ] 新任务 `high`",
    ].join("\n"),
    selectionStart: 0,
    selectionEnd: [
      "## 第一阶段",
      "",
      "旧段落",
      "",
      "- [ ] 旧任务 `high`",
    ].join("\n").length,
    nextContent: [
      "## 第一阶段：奠定基础",
      "",
      "新段落",
      "",
      "- [ ] 新任务 `high`",
    ].join("\n"),
    selectedText: [
      "## 第一阶段",
      "",
      "旧段落",
      "",
      "- [ ] 旧任务 `high`",
    ].join("\n"),
  };
  const state = EditorState.create({
    doc: suggestion.sourceContent,
    extensions: [createSuggestionDecorations(suggestion, false)],
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

test("完成态 suggestion 也必须继续在原文编辑器里显示删除与新增，不再切换到补丁文档视图", () => {
  const entries = collectDecorationEntries();

  assert.equal(
    entries.some((entry) => entry.className?.includes("cm-ai-removed") ?? false),
    true
  );
  assert.equal(
    entries.some((entry) => entry.widgetName === "UnifiedDiffBlockWidget"),
    true
  );
});

test("MarkdownEditor 始终使用 MarkdownCodeEditor 展示 AI diff，而不是切到独立审阅编辑器", () => {
  const source = readRepoFile("src/components/editors/MarkdownEditor.tsx");

  assert.doesNotMatch(source, /MarkdownSuggestionReviewEditor/);
  assert.doesNotMatch(source, /useReviewEditor/);
  assert.match(source, /<MarkdownCodeEditor/);
  assert.match(source, /isGenerating=\{aiAssistant\.isGenerating\}/);
  assert.match(source, /suggestion=\{suggestionViewState\.suggestion\}/);
});
