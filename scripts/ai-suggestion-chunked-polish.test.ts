import test from "node:test";
import assert from "node:assert/strict";
import {
  splitDocumentIntoChunks,
  runWithConcurrency,
  type DocumentChunk,
} from "../src/services/aiSuggestionChunkedPolish";

test("splitDocumentIntoChunks 按 ## 标题正确分块", () => {
  const content = [
    "## 今日复习目标与任务规划",
    "",
    "- [ ] 复习英语单词，背诵两百个高频词汇",
    "",
    "## 完成情况与回顾总结",
    "",
    "今天的进度不太好，需要反思并调整策略。",
    "",
    "## 明日计划与展望未来",
    "",
    "继续加油，争取完成本周全部目标。",
  ].join("\n");

  const chunks = splitDocumentIntoChunks(content);

  assert.equal(chunks.length, 3);
  assert.ok(chunks[0].text.startsWith("## 今日复习目标"));
  assert.ok(chunks[1].text.startsWith("## 完成情况"));
  assert.ok(chunks[2].text.startsWith("## 明日计划"));
});

test("splitDocumentIntoChunks 按 ### 标题分块", () => {
  const content = [
    "### 第一节：基础知识回顾",
    "这一部分回顾了基础知识的核心要点和关键概念。",
    "### 第二节：进阶实践指南",
    "这一部分介绍了进阶的实践方法和常见应用场景。",
  ].join("\n");

  const chunks = splitDocumentIntoChunks(content);

  assert.equal(chunks.length, 2);
  assert.ok(chunks[0].text.includes("第一节"));
  assert.ok(chunks[1].text.includes("第二节"));
});

test("splitDocumentIntoChunks 对无标题文档返回单个块", () => {
  const content = "这是一段没有标题的普通文本。\n\n第二段内容。\n\n第三段。";

  const chunks = splitDocumentIntoChunks(content);

  assert.equal(chunks.length, 1);
  assert.equal(chunks[0].text, content);
  assert.equal(chunks[0].startOffset, 0);
  assert.equal(chunks[0].endOffset, content.length);
});

test("splitDocumentIntoChunks 合并过短的块", () => {
  const content = [
    "## A",
    "## B",
    "这是一段正常长度的内容，足够长了。",
  ].join("\n");

  const chunks = splitDocumentIntoChunks(content);

  // "## A" 只有 4 字符（< 20），应合并到下一块
  assert.ok(chunks.length < 3, `期望块数 < 3，实际 ${chunks.length}`);
  // 最终内容包含所有文本
  const allText = chunks.map((c) => c.text).join("\n");
  assert.ok(allText.includes("## A"));
  assert.ok(allText.includes("## B"));
});

test("splitDocumentIntoChunks 空内容返回空数组", () => {
  assert.deepEqual(splitDocumentIntoChunks(""), []);
  assert.deepEqual(splitDocumentIntoChunks("   \n  \n  "), []);
});

test("splitDocumentIntoChunks 标题前有前言时前言为独立块", () => {
  const content = [
    "这是一段足够长的前言内容，用于介绍整篇文档的主题和背景。",
    "",
    "## 第一章：详细论述与分析讨论",
    "第一章的内容包括多个方面的详细讨论。",
  ].join("\n");

  const chunks = splitDocumentIntoChunks(content);

  assert.equal(chunks.length, 2);
  assert.ok(chunks[0].text.includes("这是一段足够长的前言"));
  assert.ok(chunks[1].text.startsWith("## 第一章"));
});

test("splitDocumentIntoChunks 偏移量正确覆盖全文", () => {
  const content = [
    "## 标题一",
    "内容一",
    "## 标题二",
    "内容二",
  ].join("\n");

  const chunks = splitDocumentIntoChunks(content);

  assert.equal(chunks[0].startOffset, 0);
  assert.equal(chunks[chunks.length - 1].endOffset, content.length);

  // 相邻块偏移量连续（无间隙、无重叠）
  for (let i = 1; i < chunks.length; i++) {
    assert.equal(
      chunks[i].startOffset,
      chunks[i - 1].endOffset,
      `块 ${i} 的起始偏移应紧接块 ${i - 1} 的结束偏移`
    );
  }
});

test("splitDocumentIntoChunks 不受 # 一级标题影响", () => {
  const content = [
    "# 一级标题：文档概要介绍",
    "这里有一些关于文档概要的介绍内容。",
    "## 二级标题：详细展开说明",
    "这里有关于细节展开的更多内容。",
  ].join("\n");

  const chunks = splitDocumentIntoChunks(content);

  // # 不是分块锚点，只有 ## 和 ### 才是
  assert.equal(chunks.length, 2);
  assert.ok(chunks[0].text.includes("# 一级标题"));
  assert.ok(chunks[1].text.startsWith("## 二级标题"));
});

// ===== runWithConcurrency 测试 =====

test("runWithConcurrency 限制最大并发数", async () => {
  let running = 0;
  let maxRunning = 0;

  const tasks = Array.from({ length: 6 }, (_, i) => async () => {
    running++;
    maxRunning = Math.max(maxRunning, running);
    await new Promise((resolve) => setTimeout(resolve, 10));
    running--;
    return i;
  });

  const results = await runWithConcurrency(tasks, 3, () => false);

  assert.ok(maxRunning <= 3, `最大并发 ${maxRunning} 超过限制 3`);
  assert.equal(results.length, 6);
  // 所有任务都有返回值
  for (let i = 0; i < 6; i++) {
    assert.equal(results[i], i);
  }
});

test("runWithConcurrency 取消后不启动新任务", async () => {
  let started = 0;
  let cancelled = false;

  const tasks = Array.from({ length: 5 }, () => async () => {
    started++;
    await new Promise((resolve) => setTimeout(resolve, 10));
    if (started >= 2) {
      cancelled = true;
    }
    return started;
  });

  await runWithConcurrency(tasks, 1, () => cancelled);

  assert.ok(started < 5, `取消后仍启动了 ${started} 个任务（应远少于 5）`);
});

test("runWithConcurrency 单个任务失败不阻断其他任务", async () => {
  const tasks = [
    async () => 1,
    async () => { throw new Error("boom"); },
    async () => 3,
  ];

  const results = await runWithConcurrency(tasks, 3, () => false);

  assert.equal(results[0], 1);
  assert.equal(results[1], undefined);
  assert.equal(results[2], 3);
});

test("runWithConcurrency 任务数小于并发限制时正常执行", async () => {
  const tasks = [async () => "a", async () => "b"];

  const results = await runWithConcurrency(tasks, 10, () => false);

  assert.deepEqual(results, ["a", "b"]);
});
