# verification.md

日期：2026-02-05  
执行者：Codex  

## 验证范围

- 开发端口自动选择（脚本与配置层面的改动）
- 架构重构（hooks 拆分、store 拆分、复用组件/工具）
- 构建与基础单测

## 已执行验证

- `npm test`：通过
- `npx tsc -b --pretty false`：通过
- `npm run build`：通过（仅有 chunk 体积提示警告）

## 额外修复验证（2026-02-05）

- 修复 Windows 下 `spawn EINVAL`（改为用 `process.execPath` 执行 Vite/Tauri 的 Node 入口脚本）。
- 变更后回归执行：
  - `npm test`：通过
  - `npx tsc -b --pretty false`：通过

## 未在当前环境执行的验证与原因

- `tauri` CLI 相关命令（例如 `tauri --help` / `tauri dev`）：
  - 原因：当前运行环境为 WSL/Linux，但仓库的 `node_modules` 更偏向 Windows 安装形态，`@tauri-apps/cli` 在本环境缺少 native binding，导致无法运行。
  - 影响：无法在本环境直接验证 `scripts/tauri.mjs` 对 `tauri dev` 的拦截逻辑是否生效；但脚本实现为纯 Node 包装与参数转发，Windows 环境下应可正常工作。

## 额外同步验证（2026-02-18）

验证目标：同步 `E:\\Code\\JasBlog` 的内容结构与渲染能力（新增 diary 模块、修复 BOM frontmatter 解析等）。

### 已执行验证

- `npm test`：通过
- `npx tsc -b`：通过

### 未在当前环境执行的验证与原因

- `npm run build`（`vite build`）：失败
  - 现象：Rollup 报错缺少 `@rollup/rollup-linux-x64-gnu`
  - 推测原因：当前运行环境为 WSL/Linux，但仓库 `node_modules` 更偏向 Windows 安装形态（跨平台 optional dependency 未正确安装）
  - 建议：在对应平台删除 `node_modules/` 并重新 `npm install` 后再执行构建

### 交互同步补充（2026-02-18）

- Notes 预览同步了目录（ToC）与返回顶部（BackToTop）交互，并将滚动监听绑定到编辑器预览滚动容器（非 window）。
- Projects 预览同步了 BackToTop 交互，同样绑定到预览滚动容器。
- Diary 预览支持“同日聚合”：当 `content/diary/` 下存在同一天多条 entry（多个 .md 文件）时，会在预览中按时间排序并一起渲染（可在 HelpModal 示例中关闭该行为）。
- Notes 预览补充评论区（Giscus）：使用 `mapping=specific` + `term=/notes/<slug>`，需配置 `VITE_GISCUS_*` 环境变量；未配置时开发环境会提示。
- Graph 预览增强错误提示：缺少/非法 ` ```graph ` 代码块时会显示错误信息，并保留原 Markdown 便于直接定位与修复。
- 预览区新增“详情/列表”切换：同步 Notes/Projects/Diary/Graphs/Roadmap 列表页布局（其中 Notes/Diary 支持筛选交互）。
- 新增全局搜索弹窗：支持 `/` 打开、ESC 关闭，按标题/摘要/标签检索并跳转打开文件（对齐 JasBlog Header 搜索体验）。

### 回归验证（2026-02-18）

- `npm test`：通过
- `npx tsc -b --pretty false`：通过
