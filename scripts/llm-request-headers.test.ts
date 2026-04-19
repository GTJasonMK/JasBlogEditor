import test from "node:test";
import assert from "node:assert/strict";
import {
  buildAnthropicStreamHeaders,
  buildOpenAIStreamHeaders,
} from "../src/services/llm/requestHeaders";

test("OpenAI 流式请求头显式声明 text/event-stream", () => {
  const headers = buildOpenAIStreamHeaders("sk-test", true);

  assert.equal(headers.Accept, "text/event-stream");
  assert.equal(headers.Authorization, "Bearer sk-test");
  assert.equal(headers["Content-Type"], "application/json");
  assert.ok(!("DNT" in headers));
  assert.ok(!("User-Agent" in headers));
});

test("Anthropic 流式请求头显式声明 text/event-stream", () => {
  const headers = buildAnthropicStreamHeaders("sk-test", true);

  assert.equal(headers.Accept, "text/event-stream");
  assert.equal(headers.Authorization, "Bearer sk-test");
  assert.equal(headers["Content-Type"], "application/json");
  assert.equal(headers["anthropic-version"], "2023-06-01");
  assert.ok(!("DNT" in headers));
  assert.ok(!("User-Agent" in headers));
});
