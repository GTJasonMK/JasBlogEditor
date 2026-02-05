import { spawn } from "node:child_process";
import { pickDevPorts, resolveLocalBin } from "./dev-port.mjs";

const forwardedArgs = process.argv.slice(2);
const { port, hmrPort, fallback } = await pickDevPorts({ needsHmrPort: false });

if (fallback) {
  console.warn(`[Dev] 端口探测失败/受限，仍尝试使用默认端口：${port}`);
} else {
  console.log(`[Dev] 使用开发端口：${port}`);
}

const env = {
  ...process.env,
  JAS_DEV_PORT: String(port),
  JAS_HMR_PORT: String(hmrPort),
};

const vite = spawn(resolveLocalBin("vite"), forwardedArgs, {
  stdio: "inherit",
  env,
});

vite.on("exit", (code) => process.exit(code ?? 0));
