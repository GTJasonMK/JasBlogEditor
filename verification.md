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

## 冗余重构验证（2026-02-19）

验证目标：下沉重复工具函数（diary 推断、路径比较、文件树遍历），并减少预览层重复逻辑。

### 已执行验证

- `npm test`：通过
- `npx tsc -b`：通过

### 未在当前环境执行的验证与原因

- `npm run build`：失败
  - 现象：Rollup 报错缺少 `@rollup/rollup-linux-x64-gnu`
  - 原因：当前运行环境缺失该 optional dependency，与本次重构代码逻辑无关
  - 建议：在对应平台重新安装依赖后执行构建验证

### 第二阶段补充（2026-02-19）

- `JasBlogListPreview` 进一步抽取通用缓存加载 hook，统一 notes/projects/diary/graphs/roadmaps 的“读取 + 缓存 + 错误处理”流程。
- 变更后回归执行：
  - `npm test`：通过
  - `npx tsc -b`：通过
  - `npm run build`：失败（环境缺失 `@rollup/rollup-linux-x64-gnu`，与本次重构逻辑无关）

### 第三阶段补充（2026-02-19）

- `JasBlogListPreview` 抽取并复用以下通用逻辑，进一步降低重复实现：
  - `useMergedActiveItemList`：统一 notes/projects/graphs/roadmaps 的“磁盘列表 + 当前活跃文件合并并按日期排序”流程。
  - `useOpenDetailByPath`：统一 notes/projects/graphs/roadmaps 的“同路径直接切详情 / 异路径先打开再切详情”流程。
- 量化变化（基于 `rg` 统计）：
  - `const merged = [...diskItems.filter(...), activeItem]`：4 处 -> 1 处（仅保留在通用 hook 内）。
  - `await openFile(path, '<type>'); setPreviewMode('detail');`：4 组 -> 1 处（仅保留在通用 hook 内）。
- 变更后回归执行：
  - `npm test`：通过
  - `npx tsc -b`：通过
  - `npm run build`：失败（仍为环境缺失 `@rollup/rollup-linux-x64-gnu`，与本次重构逻辑无关）

### 第四阶段补充（2026-02-19）

- `JasBlogListPreview` 抽取 `PreviewLoadState`，统一 notes/projects/diary/graphs/roadmaps 的“加载中 / 失败 / 成功”渲染分支，避免后续改动时出现状态处理不一致。
- 量化变化（基于 `rg` 统计）：
  - `loading && ...` / `!loading && error && ...` / `!loading && !error && ...`：5 组 -> 0 组（统一替换为 `PreviewLoadState` 组件调用）。
- 变更后回归执行：
  - `npm test`：通过
  - `npx tsc -b`：通过

### 第五阶段补充（2026-02-19）

- `DiaryPreview` 修复同日聚合竞态下的加载状态残留问题：
  - 在每次 `loadExtraEntries` 开始时先重置 `extraLoading=false`，避免上一次请求取消后无法回落，导致“正在加载同日条目...”常驻。
- 抽取并复用 `PreviewBackButton`：
  - 统一 Note/Project/Diary/Graph/Roadmap 预览页的“返回列表”交互与样式，移除 5 处重复按钮模板。
- `MarkdownRenderer` 的 `CopyButton` 增加定时器清理：
  - 组件卸载时清理未触发的 `setTimeout`，避免潜在状态更新残留。
- 量化变化（基于 `rg` 统计）：
  - `onClick={() => setPreviewMode('list')}`：5 处 -> 0 处（改为 `PreviewBackButton` 统一处理）。
- 变更后回归执行：
  - `npm test`：通过
  - `npx tsc -b`：通过
  - `npm run build`：失败（环境缺失 `@rollup/rollup-linux-x64-gnu`，与本次重构逻辑无关）

### 第六阶段补充（2026-02-19）

- `RoadmapPreview` 抽取 `RoadmapItemGroup`，统一“进行中/计划中/已完成”三段分组渲染模板，降低后续改样式/结构时的漏改风险。
- 量化变化：
  - 分组区块模板：3 组重复 JSX -> 1 个复用组件 + 3 次参数化调用。
- 变更后回归执行：
  - `npm test`：通过
  - `npx tsc -b`：通过

### 第七阶段补充（2026-02-19）

- 新增 `PreviewMeta`（`PreviewDate` / `PreviewDescription` / `PreviewTagList`）并在多个预览头部复用：
  - 覆盖 Note/Project/Diary/Graph/Roadmap/Doc 的日期、描述、标签渲染，减少重复样板代码。
- 稳定性修复：
  - `PreviewTagList` 统一使用 `${tag}-${index}` 作为 key，规避重复标签值导致的 React key 冲突告警风险。
- 量化变化：
  - 预览页内 `key={tag}` 标签渲染：已清零（统一改为 `PreviewTagList` 处理）。
- 变更后回归执行：
  - `npm test`：通过
  - `npx tsc -b`：通过
  - `npm run build`：失败（环境缺失 `@rollup/rollup-linux-x64-gnu`，与本次重构逻辑无关）

### 第八阶段补充（2026-02-19）

- `NotePreview` 的 `graph` 代码块解析增加结构校验（`nodes`/`edges`）：
  - 对于“JSON 可解析但结构不合法”的图谱块，不再直接渲染 `GraphViewer`，改为降级展示原始 JSON 代码块，避免运行时风险。
- 变更后回归执行：
  - `npm test`：通过
  - `npx tsc -b`：通过
  - `npm run build`：失败（环境缺失 `@rollup/rollup-linux-x64-gnu`，与本次重构逻辑无关）
