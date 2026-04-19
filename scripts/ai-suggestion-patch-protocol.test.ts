import test from "node:test";
import assert from "node:assert/strict";
import {
  extractPatchEntries,
  applyPatches,
  isPatchFormatBody,
} from "../src/services/aiSuggestionPatchProtocol";

test("extractPatchEntries 能从完整 body 中解析出多个 FIND/REPLACE 对", () => {
  const body = [
    "<<<FIND>>>",
    "旧的表达方式",
    "<<<REPLACE>>>",
    "更清晰的表达",
    "<<<FIND>>>",
    "另一段旧文字",
    "<<<REPLACE>>>",
    "润色后的文字",
  ].join("\n");

  const result = extractPatchEntries(body, true);

  assert.equal(result.patches.length, 2);
  assert.equal(result.patches[0].find, "旧的表达方式");
  assert.equal(result.patches[0].replace, "更清晰的表达");
  assert.equal(result.patches[1].find, "另一段旧文字");
  assert.equal(result.patches[1].replace, "润色后的文字");
});

test("extractPatchEntries 能处理 FIND/REPLACE 中包含多行文本", () => {
  const body = [
    "<<<FIND>>>",
    "第一行旧文字",
    "第二行旧文字",
    "<<<REPLACE>>>",
    "第一行新文字",
    "第二行新文字",
  ].join("\n");

  const result = extractPatchEntries(body, true);

  assert.equal(result.patches.length, 1);
  assert.equal(result.patches[0].find, "第一行旧文字\n第二行旧文字");
  assert.equal(result.patches[0].replace, "第一行新文字\n第二行新文字");
});

test("extractPatchEntries 在只收到 FIND 还没收到 REPLACE 时标记为未完成", () => {
  const body = "<<<FIND>>>\n旧文字";

  const result = extractPatchEntries(body);

  assert.equal(result.patches.length, 0);
  assert.equal(result.lastPairCompleted, false);
});

test("extractPatchEntries 空 body 返回空列表", () => {
  const result = extractPatchEntries("");

  assert.equal(result.patches.length, 0);
});

test("流式场景下最后一个 REPLACE 内容不完整时不返回该对，避免 diff 闪烁", () => {
  const body = [
    "<<<FIND>>>",
    "旧文字",
    "<<<REPLACE>>>",
    "新文字",
    "<<<FIND>>>",
    "另一段旧文字",
    "<<<REPLACE>>>",
    "正在输出的不完整内容",
  ].join("\n");

  const streamingResult = extractPatchEntries(body, false);
  assert.equal(streamingResult.patches.length, 1, "流式场景只返回已确认完整的对");
  assert.equal(streamingResult.patches[0].find, "旧文字");

  const completedResult = extractPatchEntries(body, true);
  assert.equal(completedResult.patches.length, 2, "完成后返回全部对");
  assert.equal(completedResult.patches[1].find, "另一段旧文字");
  assert.equal(completedResult.patches[1].replace, "正在输出的不完整内容");
});

test("流式场景下只有一个 FIND/REPLACE 对且未关闭时不返回任何 patch", () => {
  const body = "<<<FIND>>>\n旧文字\n<<<REPLACE>>>\n新文字正在生";

  const streamingResult = extractPatchEntries(body, false);
  assert.equal(streamingResult.patches.length, 0);
  assert.equal(streamingResult.lastPairCompleted, false);

  const completedResult = extractPatchEntries(body, true);
  assert.equal(completedResult.patches.length, 1);
});

test("extractPatchEntries 跳过 FIND 为空的对", () => {
  const body = [
    "<<<FIND>>>",
    "<<<REPLACE>>>",
    "新文字",
    "<<<FIND>>>",
    "有内容的旧文字",
    "<<<REPLACE>>>",
    "有内容的新文字",
  ].join("\n");

  const result = extractPatchEntries(body, true);

  assert.equal(result.patches.length, 1);
  assert.equal(result.patches[0].find, "有内容的旧文字");
});

test("applyPatches 按位置顺序应用多个 patch", () => {
  const source = "今天天气很好。我去公园散步了。晚上吃了面条。";

  const result = applyPatches(source, [
    { find: "今天天气很好", replace: "今日天气晴朗" },
    { find: "晚上吃了面条", replace: "傍晚享用了一碗热汤面" },
  ]);

  assert.equal(result.content, "今日天气晴朗。我去公园散步了。傍晚享用了一碗热汤面。");
  assert.equal(result.appliedCount, 2);
  assert.equal(result.failedFinds.length, 0);
});

test("applyPatches 在源文中找不到 FIND 时记录失败", () => {
  const source = "今天天气很好。";

  const result = applyPatches(source, [
    { find: "明天天气不好", replace: "明日风和日丽" },
  ]);

  assert.equal(result.content, "今天天气很好。");
  assert.equal(result.appliedCount, 0);
  assert.equal(result.failedFinds.length, 1);
});

test("applyPatches 空 patch 列表返回原文", () => {
  const source = "原文内容。";

  const result = applyPatches(source, []);

  assert.equal(result.content, "原文内容。");
  assert.equal(result.appliedCount, 0);
});

test("applyPatches 可以将 FIND 文本替换为空（删除片段）", () => {
  const source = "保留部分。需要删除的内容。保留尾部。";

  const result = applyPatches(source, [
    { find: "需要删除的内容。", replace: "" },
  ]);

  assert.equal(result.content, "保留部分。保留尾部。");
  assert.equal(result.appliedCount, 1);
});

test("isPatchFormatBody 正确识别包含 FIND 标记的 body", () => {
  assert.equal(isPatchFormatBody("<<<FIND>>>\n旧\n<<<REPLACE>>>\n新"), true);
  assert.equal(isPatchFormatBody("这是普通的全文替换内容"), false);
  assert.equal(isPatchFormatBody(""), false);
});

test("applyPatches 处理相邻 patch 不会互相干扰", () => {
  const source = "AABBCC";

  const result = applyPatches(source, [
    { find: "AA", replace: "XX" },
    { find: "BB", replace: "YY" },
    { find: "CC", replace: "ZZ" },
  ]);

  assert.equal(result.content, "XXYYZZ");
  assert.equal(result.appliedCount, 3);
});

test("applyPatches 处理跨行 Markdown 内容", () => {
  const source = [
    "## 今日复习目标",
    "",
    "- [ ] 复习英语单词",
    "",
    "今天的进度不太好，需要加快步伐。",
    "",
    "## 完成情况",
  ].join("\n");

  const result = applyPatches(source, [
    {
      find: "今天的进度不太好，需要加快步伐。",
      replace: "今日复习进度略有滞后，需调整节奏、加快推进。",
    },
  ]);

  assert.equal(result.appliedCount, 1);
  assert.ok(result.content.includes("## 今日复习目标"));
  assert.ok(result.content.includes("- [ ] 复习英语单词"));
  assert.ok(result.content.includes("今日复习进度略有滞后"));
  assert.ok(result.content.includes("## 完成情况"));
});
