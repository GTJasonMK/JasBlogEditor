# 仓库指南（Repository Guidelines）

## 项目结构与模块组织
- `src/`：React 19 + TypeScript 前端代码。
- `src/components/`：界面组件（编辑器、布局、表单、预览）。
- `src/store/`：Zustand 状态管理（如 `editorStore.ts`、`fileStore.ts`）。
- `src/services/`：内容解析与序列化等业务逻辑。
- `src/platform/`：Tauri 运行时与 IPC 封装。
- `src-tauri/`：Rust 后端（`src/lib.rs` 命令、`src/main.rs` 入口）。
- `scripts/`：本地开发辅助脚本与 Node 测试。

## 构建、测试与开发命令
- `npm install`：按 `package-lock.json` 安装依赖。
- `npm run dev`：启动 Vite 开发服务（从 `1422` 自动找可用端口）。
- `npm run dev:app` 或 `npm run tauri dev`：启动 Tauri 桌面开发模式。
- `npm run build`：执行 TypeScript 检查并构建前端。
- `npm run build:app`：打包桌面应用。
- `npm test`：运行 Node 测试（`scripts/dev-port.test.mjs`）。
- `cd src-tauri && cargo test`：后端改动时执行 Rust 测试。

## 编码风格与命名约定
- 保持与现有文件一致：常见为 2 空格缩进、保留分号。
- 优先使用 `@/` 路径别名引用 `src/` 下模块。
- 组件使用 `PascalCase`（如 `MarkdownEditor.tsx`）。
- Hook 使用 `useXxx`，Store 使用 `xxxStore.ts`。
- 职责分层清晰：UI 在 `components`，状态在 `store`，解析在 `services`。

## 开发阶段变更策略
- 当前处于开发阶段，默认采用“彻底修复优先”策略。
- 修改时不以“最小改动”为目标，优先根因修复与结构优化。
- 允许激进重构、批量清理冗余实现、统一历史不一致行为。
- 若发现缺陷链路，要求一次性修到位，并同步更新相关测试与文档。

## 测试要求
- 任何行为变更都必须补充或更新测试。
- JS 测试放在 `scripts/*.test.mjs`，使用 `npm test` 运行。
- Rust 改动需补充/更新单元测试并执行 `cargo test`。
- 提交 PR 前至少运行相关测试，并执行 `npm run build`。

## 提交与 PR 规范
- Commit 保持单一主题、粒度清晰。
- 标题沿用历史风格：中文动词开头，如 `添加...`、`优化...`、`修复...`。
- PR 需包含：变更内容与原因、已执行命令（如 `npm test`、`npm run build`）、UI 变更截图/GIF、必要的 `README.md`/`ARCHITECTURE.md` 更新。

## 配置提示
- 常用环境变量：`JAS_DEV_PORT`、`JAS_HMR_PORT`、`JAS_STRICT_PORT=1`。
- Notes 评论预览需配置 `VITE_GISCUS_*` 环境变量。
