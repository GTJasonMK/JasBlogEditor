import test from "node:test";
import assert from "node:assert/strict";
import { pickDevPorts, resolveLocalBin } from "./dev-port.mjs";

test("resolveLocalBin returns a usable string", () => {
  const viteBin = resolveLocalBin("vite");
  assert.equal(typeof viteBin, "string");
  assert.ok(viteBin.length > 0);
  assert.ok(viteBin.toLowerCase().includes("vite"));
});

test("pickDevPorts returns a port + hmrPort pair", async () => {
  const basePort = 65000;
  const result = await pickDevPorts({ basePort, scanLimit: 20, step: 2, needsHmrPort: true });

  assert.equal(typeof result.port, "number");
  assert.equal(typeof result.hmrPort, "number");
  assert.ok(Number.isFinite(result.port));
  assert.ok(Number.isFinite(result.hmrPort));
  assert.equal(result.hmrPort, result.port + 1);

  // 端口扫描失败时会回退到 basePort；成功则应 >= basePort
  assert.ok(result.port >= basePort);
});

