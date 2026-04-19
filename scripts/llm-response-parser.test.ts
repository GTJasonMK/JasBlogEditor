import test from "node:test";
import assert from "node:assert/strict";
import { parseChatResponseText } from "../src/services/llm/responseParser";

test("OpenAI JSON 响应也能被解析为可用内容，而不是只接受 SSE", () => {
  const result = parseChatResponseText(
    JSON.stringify({
      choices: [
        {
          message: { content: "连接成功" },
          finish_reason: "stop",
        },
      ],
    }),
    "openai"
  );

  assert.equal(result.content, "连接成功");
  assert.deepEqual(result.chunks, [
    { content: "连接成功", reasoningContent: null, finishReason: "stop" },
  ]);
});

test("OpenAI NDJSON 流式文本能被顺序合并", () => {
  const result = parseChatResponseText(
    [
      '{"choices":[{"delta":{"content":"你好"},"finish_reason":null}]}',
      '{"choices":[{"delta":{"content":"世界"},"finish_reason":"stop"}]}',
    ].join("\n"),
    "openai"
  );

  assert.equal(result.content, "你好世界");
  assert.deepEqual(result.chunks, [
    { content: "你好", reasoningContent: null, finishReason: null },
    { content: "世界", reasoningContent: null, finishReason: "stop" },
  ]);
});

test("Anthropic 非流式 JSON 响应能提取 text block", () => {
  const result = parseChatResponseText(
    JSON.stringify({
      content: [
        { type: "text", text: "第一段" },
        { type: "text", text: "第二段" },
      ],
      stop_reason: "end_turn",
    }),
    "anthropic"
  );

  assert.equal(result.content, "第一段第二段");
  assert.deepEqual(result.chunks, [
    { content: "第一段第二段", reasoningContent: null, finishReason: "end_turn" },
  ]);
});
