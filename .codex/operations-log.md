# operations-log.md

日期：2026-02-05  
执行者：Codex  

## 记录说明

- 目标：修复开发端口冲突并提升代码质量（可复用性/可读性/可扩展性/低耦合）。
- 备注：本文件创建之前已执行过若干只读命令（ls/rg/cat/sed/find），这里做摘要记录。

## 工具调用日志（摘要）

### 2026-02-05

- `shell_command`: `ls`（项目根目录）——确认为 Vite + Tauri 项目，存在 `scripts/`、`src-tauri/`、`vite.config.ts`。
- `shell_command`: `rg "1422|strictPort|beforeDevCommand"` ——定位端口与 Tauri 配置相关位置：`vite.config.ts`、`src-tauri/tauri.conf.json`、`scripts/dev-app.mjs` 等。
- `shell_command`: `cat package.json` ——确认脚本：`dev`/`dev:app`（端口探测）、`dev:tauri`（固定 1422 + strictPort）、`tauri`（直通）。
- `shell_command`: `cat src-tauri/tauri.conf.json` ——确认 `beforeDevCommand: npm run dev:tauri` 与 `devUrl: http://localhost:1422`。
- `shell_command`: 读取关键源码（`src/App.tsx`、`src/store/*`、`src/components/layout/*`、`src/services/*`）——识别重复与耦合点，为后续重构提供依据。

### 2026-02-05（实现与验证）

- `apply_patch`: 端口体验优化
  - 新增 `scripts/tauri.mjs`：拦截 `npm run tauri dev`，改走 `dev:app` 的自动端口探测流程
  - 更新 `vite.config.ts`：`strictPort` 改为由 `JAS_STRICT_PORT` 控制，默认允许自动切换端口
  - 更新 `scripts/dev-app.mjs` / `scripts/dev-web.mjs`：注入 `JAS_STRICT_PORT`（桌面端严格、Web 端非严格）
- `shell_command`: `npx tsc -b --pretty false` ——通过（修复了 App 内部函数名遮蔽导致的编译错误）。
- `apply_patch`: 架构重构
  - 新增 `src/hooks/*`：抽离主题/工作区初始化/快捷键/保存热键逻辑
  - 新增 `src/store/windowStore.ts`：从 `editorStore` 中拆出迷你模式窗口管理，降低耦合
  - 新增 `src/components/layout/sidebar/*` 与 `src/utils/path.ts`：复用右键菜单与重命名弹窗，减少重复
  - 新增 `src/platform/tauriTypes.ts`，并增强 `invokeTauri` 的命令映射类型
  - 新增 `src/config/contentTypeUi.tsx`：集中管理内容类型的 MetaForm/Preview 渲染，提升可扩展性
- `apply_patch`: 新增基础单测
  - `scripts/dev-port.test.mjs`（`node:test`）
  - `package.json` 新增 `test` 脚本
- `shell_command`: `npm test` ——通过（2/2）。
- `shell_command`: `npm run build` ——通过（Vite 构建成功；仅有 chunk 体积提示警告）。

### 2026-02-05（遇到的限制）

- `shell_command`: `node scripts/tauri.mjs --help` ——在 WSL/Linux 环境下因 `@tauri-apps/cli` 缺少 native binding 而失败；已在 `verification.md` 记录原因与影响范围。
- `shell_command`: `npm install -D vitest` ——在本环境下耗时过长多次超时，改用 Node 内置 `node:test` 实现基础单测（无额外依赖）。

### 2026-02-05（问题修复：Windows spawn EINVAL）

- 背景：用户在 Windows 通过 `start.bat` 启动时，`scripts/dev-app.mjs` 在启动 Vite 阶段出现 `Error: spawn EINVAL`（通常与直接 spawn `.cmd` 有关）。
- `apply_patch`：
  - `scripts/dev-port.mjs` 新增 `resolveLocalBinCommand()`，优先用 `process.execPath` 直接执行 Node 入口脚本（`vite.js` / `tauri.js`），规避 `.cmd`。
  - `scripts/dev-app.mjs` / `scripts/dev-web.mjs` / `scripts/tauri.mjs` 改用 `resolveLocalBinCommand()` 启动。
