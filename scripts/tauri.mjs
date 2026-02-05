/**
 * tauri 命令包装器
 *
 * 目标：
 * - `npm run tauri dev` 默认走 `dev:app` 的端口探测逻辑，避免 1422 被占用时报错
 * - 其他子命令（build/info/icon/...）保持与原 tauri CLI 一致
 */

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolveLocalBinCommand } from "./dev-port.mjs";

function spawnAndExit(cmd, args, env) {
  const child = spawn(cmd, args, { stdio: "inherit", env });
  child.on("exit", (code) => process.exit(code ?? 0));
}

const args = process.argv.slice(2);
const subcommand = args[0];

// `tauri dev`：切换到带端口同步的开发入口
if (subcommand === "dev") {
  const devAppPath = fileURLToPath(new URL("./dev-app.mjs", import.meta.url));
  const forwardedArgs = args.slice(1);
  spawnAndExit(process.execPath, [devAppPath, ...forwardedArgs], process.env);
} else {
  const { cmd, args: prefixArgs } = resolveLocalBinCommand("tauri");
  spawnAndExit(cmd, [...prefixArgs, ...args], process.env);
}
