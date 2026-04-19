import test from "node:test";
import assert from "node:assert/strict";
import { extractSuggestionBody } from "../src/services/aiSuggestionResponseProtocol";

test("协议提取会忽略仅用于包裹正文的首尾换行，不把它们算进真实正文", () => {
  const extracted = extractSuggestionBody(
    [
      "前置说明",
      "<<<JASBLOG_BODY_START>>>",
      "## 第一阶段：奠定基础",
      "正文段落",
      "<<<JASBLOG_BODY_END>>>",
      "结尾说明",
    ].join("\n")
  );

  assert.deepEqual(extracted, {
    body: "## 第一阶段：奠定基础\n正文段落",
    started: true,
    completed: true,
  });
});

test("如果模型确实想在正文开头保留一个空行，仍可通过额外空行显式表达", () => {
  const extracted = extractSuggestionBody(
    "<<<JASBLOG_BODY_START>>>\n\n正文段落\n<<<JASBLOG_BODY_END>>>"
  );

  assert.deepEqual(extracted, {
    body: "\n正文段落",
    started: true,
    completed: true,
  });
});
