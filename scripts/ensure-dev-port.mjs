import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const tauriConfigPath = path.join(repoRoot, "src-tauri", "tauri.conf.json");

function readDevPortFromTauriConfig() {
  try {
    const raw = fs.readFileSync(tauriConfigPath, "utf8");
    const config = JSON.parse(raw);
    const devUrl = config?.build?.devUrl;
    if (!devUrl || typeof devUrl !== "string") return null;
    const url = new URL(devUrl);
    if (!url.port) return null;
    const port = Number(url.port);
    return Number.isFinite(port) ? port : null;
  } catch {
    return null;
  }
}

function tryExecFile(cmd, args) {
  try {
    return execFileSync(cmd, args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    return null;
  }
}

function uniqSortedNumbers(list) {
  return [...new Set(list)].filter(Number.isFinite).sort((a, b) => a - b);
}

function getListeningPids(port) {
  if (process.platform === "win32") {
    const out = tryExecFile("netstat", ["-ano", "-p", "tcp"]);
    if (!out) return [];
    const pids = [];
    for (const line of out.split(/\r?\n/)) {
      const cols = line.trim().split(/\s+/);
      if (cols.length < 5) continue;
      if (cols[0].toUpperCase() !== "TCP") continue;
      const localAddr = cols[1];
      const state = cols[3]?.toUpperCase();
      const pidText = cols[4];
      if (state !== "LISTENING") continue;
      if (!localAddr.endsWith(`:${port}`) && !localAddr.endsWith(`]:${port}`)) continue;
      const pid = Number(pidText);
      if (Number.isFinite(pid)) pids.push(pid);
    }
    return uniqSortedNumbers(pids);
  }

  const lsofOut = tryExecFile("lsof", ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-t"]);
  if (lsofOut) {
    const pids = lsofOut
      .split(/\r?\n/)
      .map((s) => Number(s.trim()))
      .filter(Number.isFinite);
    return uniqSortedNumbers(pids);
  }

  const fuserOut = tryExecFile("fuser", ["-n", "tcp", String(port)]);
  if (!fuserOut) return [];
  const pids = (fuserOut.match(/\b\d+\b/g) ?? []).map((s) => Number(s));
  return uniqSortedNumbers(pids);
}

function printManualHelp(port) {
  const lines =
    process.platform === "win32"
      ? [
          `- 查看占用: netstat -ano | findstr :${port}`,
          `- 结束进程: taskkill /PID <PID> /T /F`,
          `- PowerShell: Get-NetTCPConnection -LocalPort ${port} | Select OwningProcess -Unique | Stop-Process -Force`,
        ]
      : [
          `- 查看占用: lsof -nP -iTCP:${port} -sTCP:LISTEN`,
          `- 结束进程: kill <PID> (必要时 kill -9 <PID>)`,
        ];

  console.error("\n[Dev] 手动处理方式：");
  for (const line of lines) console.error(line);
  console.error(`- 一键结束(谨慎): npm run kill:devport\n`);
}

function killPids(port, pids) {
  if (!pids.length) return;

  if (process.platform === "win32") {
    for (const pid of pids) {
      tryExecFile("taskkill", ["/PID", String(pid), "/T", "/F"]);
    }
    return;
  }

  for (const pid of pids) {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      // ignore
    }
  }
}

function canListen(port, host) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();

    server.on("error", (err) => {
      const code = err?.code;
      if (code === "EADDRNOTAVAIL" || code === "EAFNOSUPPORT") return resolve(true);
      if (code === "EADDRINUSE") return resolve(false);
      if (code === "EPERM" || code === "EACCES") return resolve(null);
      return resolve(null);
    });

    server.listen({ port, host }, () => {
      server.close(() => resolve(true));
    });
  });
}

async function isPortAvailable(port) {
  const okV4 = await canListen(port, "127.0.0.1");
  const okV6 = await canListen(port, "::1");
  if (okV4 === false || okV6 === false) return false;
  if (okV4 === true) return true;
  if (okV6 === true) return true;
  return null;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseArgs(argv) {
  const args = new Set(argv);
  return {
    autoKill: args.has("--kill") || process.env.JAS_KILL_PORT === "1",
    noPrompt: args.has("--no-prompt") || process.env.JAS_NO_PROMPT === "1",
    checkOnly: args.has("--check-only"),
  };
}

const { autoKill, noPrompt, checkOnly } = parseArgs(process.argv.slice(2));

const port = readDevPortFromTauriConfig();
if (!port) process.exit(0);

const pids = getListeningPids(port);
if (!pids.length) {
  const available = await isPortAvailable(port);
  if (available === true) process.exit(0);
  if (available === null) {
    console.warn(`[Dev] 当前环境无法检测端口 ${port} 是否被占用（listen 权限受限），跳过检查。`);
    process.exit(0);
  }
}

console.error(`\n[Dev] 端口 ${port} 已被占用，开发服务器无法启动。`);
if (pids.length) console.error(`[Dev] 监听端口的 PID: ${pids.join(", ")}`);
printManualHelp(port);

if (checkOnly) process.exit(1);

const interactive = process.stdin.isTTY && process.stdout.isTTY;
if (noPrompt || !interactive) process.exit(1);

let shouldKill = autoKill;
if (!shouldKill) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`[Dev] 是否结束占用端口 ${port} 的进程并继续？(y/N) `);
  rl.close();
  shouldKill = /^y(es)?$/i.test(answer.trim());
}

if (!shouldKill) process.exit(1);
if (!pids.length) process.exit(1);

killPids(port, pids);
await sleep(600);

const pidsAfterKill = getListeningPids(port);
if (!pidsAfterKill.length) process.exit(0);

const availableAfterKill = await isPortAvailable(port);
if (availableAfterKill === true) process.exit(0);

console.error(`\n[Dev] 端口 ${port} 仍被占用：${pidsAfterKill.join(", ")}`);
process.exit(1);
