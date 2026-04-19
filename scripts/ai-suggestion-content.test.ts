import test from "node:test";
import assert from "node:assert/strict";
import { buildSuggestionNextContent } from "../src/services/aiSuggestionContent";

test("整篇替换时会保留原文已有的单个末尾换行，避免审阅区出现伪空白删除", () => {
  const sourceContent = "标题\n\n正文段落\n";
  const generatedText = "标题\n\n润色后的正文段落";

  const nextContent = buildSuggestionNextContent({
    mode: "replace",
    sourceContent,
    generatedText,
    selectionStart: 0,
    selectionEnd: sourceContent.length,
  });

  assert.equal(nextContent, "标题\n\n润色后的正文段落\n");
});

test("局部替换不应额外篡改选区外的结尾换行", () => {
  const sourceContent = "标题\n\n旧段落\n";
  const selectionStart = sourceContent.indexOf("旧段落");
  const selectionEnd = selectionStart + "旧段落".length;

  const nextContent = buildSuggestionNextContent({
    mode: "replace",
    sourceContent,
    generatedText: "新段落",
    selectionStart,
    selectionEnd,
  });

  assert.equal(nextContent, "标题\n\n新段落\n");
});

test("整篇替换时也不会让 AI 额外带入单个末尾换行，避免审阅区出现伪空白新增", () => {
  const sourceContent = "标题\n\n正文段落";
  const generatedText = "标题\n\n润色后的正文段落\n";

  const nextContent = buildSuggestionNextContent({
    mode: "replace",
    sourceContent,
    generatedText,
    selectionStart: 0,
    selectionEnd: sourceContent.length,
  });

  assert.equal(nextContent, "标题\n\n润色后的正文段落");
});

test("整篇替换时会保留原文已有的多个结尾换行，避免底部出现成组空白删除", () => {
  const sourceContent = "标题\n\n正文段落\n\n";
  const generatedText = "标题\n\n润色后的正文段落";

  const nextContent = buildSuggestionNextContent({
    mode: "replace",
    sourceContent,
    generatedText,
    selectionStart: 0,
    selectionEnd: sourceContent.length,
  });

  assert.equal(nextContent, "标题\n\n润色后的正文段落\n\n");
});

test("整篇替换时会保留原文已有的前导空行，避免顶部出现伪空白新增", () => {
  const sourceContent = "\n标题\n正文段落";
  const generatedText = "标题\n润色后的正文段落";

  const nextContent = buildSuggestionNextContent({
    mode: "replace",
    sourceContent,
    generatedText,
    selectionStart: 0,
    selectionEnd: sourceContent.length,
  });

  assert.equal(nextContent, "\n标题\n润色后的正文段落");
});

test("整篇替换时会忽略 AI 额外带入的前导空格空白行，避免顶部出现视觉空白新增", () => {
  const sourceContent = "标题\n正文段落";
  const generatedText = "  \n标题\n润色后的正文段落";

  const nextContent = buildSuggestionNextContent({
    mode: "replace",
    sourceContent,
    generatedText,
    selectionStart: 0,
    selectionEnd: sourceContent.length,
  });

  assert.equal(nextContent, "标题\n润色后的正文段落");
});

test("整篇替换时会忽略 AI 额外带入的尾部空白行缩进，避免底部出现视觉空白新增", () => {
  const sourceContent = "标题\n正文段落";
  const generatedText = "标题\n润色后的正文段落\n\t";

  const nextContent = buildSuggestionNextContent({
    mode: "replace",
    sourceContent,
    generatedText,
    selectionStart: 0,
    selectionEnd: sourceContent.length,
  });

  assert.equal(nextContent, "标题\n润色后的正文段落");
});
