import test from "node:test";
import assert from "node:assert/strict";
import { getBrowserHeaders } from "../src/services/llm/apiFormatUtils";

test("模拟浏览器请求头不会包含 fetch forbidden headers", () => {
  const headers = getBrowserHeaders();

  assert.equal(headers.Accept, "application/json, text/plain, */*");
  assert.equal(headers["Accept-Language"], "zh-CN,zh;q=0.9,en;q=0.8");
  assert.ok(!("DNT" in headers));
  assert.ok(!("User-Agent" in headers));
  assert.ok(!("Accept-Encoding" in headers));
  assert.ok(!("Connection" in headers));
  assert.ok(!("Sec-Fetch-Dest" in headers));
  assert.ok(!("Sec-Fetch-Mode" in headers));
  assert.ok(!("Sec-Fetch-Site" in headers));
});
