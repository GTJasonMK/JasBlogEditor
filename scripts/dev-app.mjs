import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { spawn } from "node:child_process";
import { pickDevPorts, resolveLocalBin, getRepoRoot } from "./dev-port.mjs";

const repoRoot = getRepoRoot();
const tauriConfigPath = path.join(repoRoot, "src-tauri", "tauri.conf.json");
const devConfigPath = path.join(
  repoRoot,
  "src-tauri",
  `tauri.conf.dev.${process.pid}.json`,
);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function cleanupDevConfig() {
  try {
    fs.unlinkSync(devConfigPath);
  } catch {
    // ignore
  }
}

function httpPing(url, timeoutMs) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      res.resume();
      resolve(true);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForDevServer(port, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  const urls = [`http://127.0.0.1:${port}/`, `http://localhost:${port}/`];

  while (Date.now() < deadline) {
    const results = await Promise.all(urls.map((u) => httpPing(u, 500)));
    if (results.some(Boolean)) return;
    await new Promise((r) => setTimeout(r, 200));
  }

  throw new Error(`等待 Vite 开发服务器超时（${timeoutMs}ms）：端口 ${port}`);
}

function killChild(child) {
  if (!child || child.killed) return;
  if (process.platform === "win32") {
    child.kill();
    return;
  }
  child.kill("SIGINT");
}

const forwardedTauriArgs = process.argv.slice(2);
const { port, hmrPort, fallback } = await pickDevPorts({ needsHmrPort: true });

if (fallback) {
  console.warn(`[Dev] 端口探测失败/受限，仍尝试使用默认端口：${port}`);
} else if (port !== 1422) {
  console.log(`[Dev] 端口 1422 被占用，自动切换到：${port}`);
} else {
  console.log(`[Dev] 使用开发端口：${port}`);
}

const env = {
  ...process.env,
  JAS_DEV_PORT: String(port),
  JAS_HMR_PORT: String(hmrPort),
};

const tauriConfig = readJson(tauriConfigPath);
tauriConfig.build = tauriConfig.build ?? {};
tauriConfig.build.devUrl = `http://localhost:${port}`;
tauriConfig.build.beforeDevCommand = null;
writeJson(devConfigPath, tauriConfig);

let vite;
let tauri;

function shutdown(exitCode = 0) {
  cleanupDevConfig();
  killChild(tauri);
  killChild(vite);
  process.exit(exitCode);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
process.on("exit", () => cleanupDevConfig());

vite = spawn(resolveLocalBin("vite"), [], { stdio: "inherit", env });

vite.on("exit", (code) => {
  if (tauri && !tauri.killed) killChild(tauri);
  cleanupDevConfig();
  process.exit(code ?? 0);
});

try {
  await waitForDevServer(port);
} catch (err) {
  console.error(`[Dev] ${err?.message || err}`);
  shutdown(1);
}

tauri = spawn(resolveLocalBin("tauri"), ["dev", "--config", devConfigPath, ...forwardedTauriArgs], {
  stdio: "inherit",
  env,
});

tauri.on("exit", (code) => {
  if (vite && !vite.killed) killChild(vite);
  cleanupDevConfig();
  process.exit(code ?? 0);
});
