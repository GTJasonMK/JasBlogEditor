import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");

function readDevPortFromTauriConfig() {
  try {
    const tauriConfigPath = path.join(repoRoot, "src-tauri", "tauri.conf.json");
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

async function isPortFree(port) {
  const okV4 = await canListen(port, "127.0.0.1");
  const okV6 = await canListen(port, "::1");
  if (okV4 === false || okV6 === false) return false;
  if (okV4 === true || okV6 === true) return true;
  return null;
}

export async function pickDevPorts(options = {}) {
  const basePort =
    Number(process.env.JAS_DEV_PORT) ||
    Number(options.basePort) ||
    readDevPortFromTauriConfig() ||
    1422;

  const needsHmrPort = options.needsHmrPort ?? true;
  const scanLimit = Number.isFinite(options.scanLimit) ? options.scanLimit : 200;
  const step = Number.isFinite(options.step) ? options.step : 2;

  for (let port = basePort; port < basePort + scanLimit; port += step) {
    const httpFree = await isPortFree(port);
    if (httpFree !== true) continue;

    const hmrPort = port + 1;
    if (!needsHmrPort) return { port, hmrPort };

    const hmrFree = await isPortFree(hmrPort);
    if (hmrFree === true) return { port, hmrPort };
  }

  return { port: basePort, hmrPort: basePort + 1, fallback: true };
}

export function resolveLocalBin(binName) {
  const ext = process.platform === "win32" ? ".cmd" : "";
  const localBin = path.join(repoRoot, "node_modules", ".bin", `${binName}${ext}`);
  return fs.existsSync(localBin) ? localBin : binName;
}

export function getRepoRoot() {
  return repoRoot;
}
