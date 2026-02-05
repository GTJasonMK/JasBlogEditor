# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

JasBlogEditor 是一个桌面博客内容编辑器，基于 Tauri 2 (Rust 后端) + React 19 (TypeScript 前端) 构建。支持编辑四种内容类型：笔记、项目、规划（Markdown + YAML frontmatter）和知识图谱（JSON）。

## 开发命令

```bash
# 开发
npm run dev          # 启动 Vite 开发服务器（默认从 1422 起自动找空闲端口）
npm run dev:app      # 启动桌面应用（自动找空闲端口并同步给 Tauri）
npm run tauri dev    # 等价于 dev:app（拦截 dev 子命令，自动找空闲端口）
npm run kill:devport # 结束占用默认开发端口的监听进程（谨慎）

# 构建
npm run build:app    # 构建桌面应用（生成 NSIS 安装包）
npm run build        # 仅构建前端

# Windows 批处理脚本
start.bat            # 一键启动开发环境（自动安装依赖）
build.bat            # 一键构建（输出到 src-tauri/target/release/bundle/nsis/）
```

## 架构

### 技术栈
- **前端**: React 19 + TypeScript + Tailwind CSS 4 + Zustand 5
- **后端**: Rust + Tauri 2
- **构建**: Vite 6

### 目录结构
```
src/                           # 前端代码
├── components/
│   ├── editors/               # MarkdownEditor, JsonEditor
│   ├── forms/                 # 元数据表单（NoteMetaForm, ProjectMetaForm 等）
│   ├── graph/                 # 知识图谱可视化（GraphViewer, GraphCanvas 等）
│   ├── layout/                # Sidebar, EditorArea, MetadataPanel, Toolbar
│   └── preview/               # ContentPreview, MarkdownRenderer, MermaidDiagram
├── store/                     # Zustand 状态管理
│   ├── editorStore.ts         # 当前文件状态和操作
│   ├── fileStore.ts           # 工作区和文件树
│   └── settingsStore.ts       # 持久化用户设置
├── services/
│   └── contentParser.ts       # YAML frontmatter 和 JSON 解析（自实现，无外部库）
├── platform/
│   ├── runtime.ts             # 运行环境检测
│   └── tauri.ts               # Tauri API 封装
└── types/
    └── content.ts             # 内容类型定义

src-tauri/                     # 后端代码（Rust）
├── src/
│   ├── lib.rs                 # Tauri 命令（文件读写、设置）
│   └── main.rs                # 入口点
└── tauri.conf.json            # 应用配置
```

### 内容类型
文件按 `content/<类型>/` 目录组织：

| 类型 | 扩展名 | 目录 | 元数据字段 |
|------|--------|------|-----------|
| note | .md | notes/ | title, date, excerpt, tags |
| project | .md | projects/ | title, description, github, techStack, status |
| roadmap | .md | roadmaps/ | title, description, items[] |
| graph | .json | graphs/ | name, description, nodes[], edges[] |

### Tauri 命令（前后端接口契约）
定义在 `src-tauri/src/lib.rs`，通过 `src/platform/tauri.ts` 的 `invokeTauri()` 调用：

- `read_directory(path)` - 读取目录内容
- `read_file(path)` - 读取文件内容
- `write_file(path, content)` - 写入文件
- `create_file(path, content)` - 创建新文件
- `delete_file(path)` - 删除文件
- `path_exists(path)` - 检查路径是否存在
- `get_settings()` / `save_settings(settings)` - 持久化设置

### 状态管理模式
Zustand store 使用异步命令模式调用 Tauri。文件操作流程：
1. UI 操作触发 store 方法
2. Store 调用 Tauri 命令
3. 成功后更新 store 状态
4. 组件响应状态变化

### 路径别名
`@/` 映射到 `src/`（配置在 `vite.config.ts`）

## 关键实现细节

- **YAML 解析器**: `contentParser.ts` 使用 `yaml` 库解析 frontmatter
- **快捷键**: `Ctrl+S` 保存（在 `App.tsx` 中处理）
- **窗口配置**: 最小 900x600，默认 1280x800
- **设置存储**: `%APPDATA%/JasBlogEditor/settings.json`
- **界面语言**: 中文（硬编码，无国际化）

## 问题解决日志

### 2026-02-04: 预览渲染与 JasBlog 不一致

**问题描述**: JasBlogEditor 的 Markdown 预览效果与 JasBlog 网站渲染效果不一致

**根本原因**: 初始实现遗漏了多个关键功能：
1. Alert 语法预处理 (`preprocessAlerts`) - JasBlog 使用预处理将 `> [!TYPE]` 转换为 `___ALERT_TYPE___` 标记
2. 代码块复制按钮 (`CopyButton`) - 鼠标悬停时显示
3. 图片缩放功能 (`ImageZoom`) - 点击图片全屏查看
4. 标题锚点平滑滚动 - `onClick` 事件处理器
5. Alert 类型键名大小写 - 应为小写 (note, tip...) 而非大写

**解决方案**: 完全同步 `src/components/preview/MarkdownRenderer.tsx` 与 JasBlog 实现

**修改文件**:
- `src/components/preview/MarkdownRenderer.tsx` - 添加所有遗漏功能
- `src/components/preview/MermaidDiagram.tsx` - 已一致，无需修改
- `src/index.css` - 已一致，无需修改

**经验教训**: 同步两个项目代码时，应逐行对比而非仅对比功能点，避免遗漏细节实现

### 2026-02-04: 项目代码质量优化

**问题描述**: 代码审查发现多个问题影响项目质量评分（可读性 4.2, 复用性 3.8, 可扩展性 3.5, 耦合性 3.6）

**发现的问题**:
1. **P0 - YAML 解析器缺陷**: 自实现的正则解析无法正确处理 URL、多行内容
2. **P0 - JSON 编辑器无反馈**: 用户编辑无效 JSON 时没有任何错误提示
3. **P1 - 状态管理反模式**: App.tsx 在 async 回调中使用 `getState()`
4. **P1 - 性能问题**: MarkdownEditor 每次按键都触发 store 更新
5. **P1 - 错误处理不完善**: 多处错误仅 console.error，用户不可见
6. **P2 - 代码复用差**: extractText、generateId 等函数散落在组件内
7. **P2 - 类型不一致**: RoadmapItem.status 类型定义与 contentParser 返回值不匹配
8. **P2 - 缺少表单验证**: 必填字段和 URL 格式无验证

**解决方案**:
- P0: 使用 `yaml` 库替换自实现解析；JsonEditor 添加本地状态和验证反馈
- P1: 修复 hooks 依赖；添加 300ms 输入防抖；stores 添加 error 状态，Toolbar 显示错误
- P2: 创建 `src/utils/` 目录提取公共函数；统一类型定义；添加表单验证

**修改文件**:
- `package.json` - 添加 yaml 依赖
- `src/services/contentParser.ts` - 使用 yaml 库重写
- `src/components/editors/JsonEditor.tsx` - 添加验证和错误显示
- `src/components/editors/MarkdownEditor.tsx` - 添加输入防抖
- `src/App.tsx` - 修复 hooks 模式
- `src/store/settingsStore.ts` - 添加 error 状态
- `src/store/editorStore.ts` - 添加 error 状态和 clearError
- `src/components/layout/Toolbar.tsx` - 添加 try-catch 和错误提示 UI
- `src/utils/text.ts` - 新建，提取文本处理函数
- `src/utils/debounce.ts` - 新建，防抖工具函数
- `src/utils/index.ts` - 新建，统一导出
- `src/components/preview/MarkdownRenderer.tsx` - 使用公共工具函数
- `src/components/forms/NoteMetaForm.tsx` - 添加必填验证
- `src/components/forms/ProjectMetaForm.tsx` - 添加必填和 URL 验证

**经验教训**:
1. 自实现解析器容易有边界情况 bug，优先使用成熟库
2. 错误处理应该用户可见，不能只依赖 console
3. 公共函数应该尽早提取到 utils 目录避免重复

### 2026-02-04: 应用重启后无法识别 JasBlog 工作区

**问题描述**: 添加普通文档目录支持后，应用重启时无法识别已有的 JasBlog 工作区，所有目录都被当作普通文档模式处理

**根本原因**: `App.tsx` 初始化工作区时，只设置了 `fileStore.workspacePath` 并调用 `loadFileTree()`，但没有设置 `fileStore.workspaceType`。由于 `workspaceType` 默认为 `null`，`loadFileTree` 中 `workspaceType === 'jasblog'` 永远不成立，始终进入普通文档模式的 else 分支

**解决方案**: 修改 `App.tsx` 初始化逻辑，在 `loadFileTree` 之前先恢复 `workspaceType`：优先从 `settings.workspaceType` 恢复，否则调用 `detectWorkspaceType()` 重新检测

**修改文件**:
- `src/App.tsx` - 初始化工作区时先设置 workspaceType

**经验教训**: 添加新的 store 状态（workspaceType）后，必须检查所有初始化路径是否都正确设置了该状态，不能只关注用户交互路径（Toolbar 选择工作区），还要关注应用启动的恢复路径

### 2026-02-04: 回退 RoadmapEditor 可视化编辑器

**问题描述**: 错误地为规划（Roadmap）类型创建了独立的可视化任务卡片编辑器 `RoadmapEditor.tsx`，偏离了软件定位

**根本原因**: 对软件定位理解有误。JasBlogEditor 是一个 Markdown 博客内容编辑器，核心功能是 Markdown 文本编辑 + 实时预览。所有内容类型（笔记、项目、规划）本质上都是 Markdown 文件，编辑器不应将数据变成可视化卡片界面

**解决方案**:
1. 删除 `src/components/editors/RoadmapEditor.tsx`
2. `EditorArea.tsx` 移除 RoadmapEditor 引用，规划类型使用 `MarkdownEditor`
3. `editors/index.ts` 移除 RoadmapEditor 导出
4. `RoadmapMetaForm.tsx` 恢复完整的 frontmatter 编辑功能（标题、描述、任务列表）

**修改文件**:
- `src/components/editors/RoadmapEditor.tsx` - 删除
- `src/components/layout/EditorArea.tsx` - 移除 RoadmapEditor 条件分支
- `src/components/editors/index.ts` - 移除导出
- `src/components/forms/RoadmapMetaForm.tsx` - 恢复任务列表编辑功能

**经验教训**: 功能设计前必须先明确软件定位。编辑器的职责是提供良好的 Markdown 编辑体验，元数据面板负责 frontmatter 字段编辑，不能越界变成专用管理工具

### 2026-02-04: 预览显示 frontmatter 原始内容

**问题描述**: Markdown 预览把 YAML frontmatter 当作普通文本渲染，而不是只渲染正文部分

**根本原因**: `MarkdownEditor` 的 `renderPreview` 直接传递 `localContent`（完整文件内容）给 `MarkdownRenderer`，但 JasBlog 网站是先解析 frontmatter，只把正文部分传给渲染器

**解决方案**: 在 `MarkdownEditor.tsx` 中添加 `extractBodyContent` 函数，从完整内容中提取正文部分（去掉 frontmatter），预览时只传递正文

**修改文件**:
- `src/components/editors/MarkdownEditor.tsx` - 添加 extractBodyContent 函数，预览时使用 previewContent

**经验教训**: 同步两个项目时，不仅要对比组件实现，还要对比数据流。JasBlog 的 `post.content` 是经过 gray-matter 解析后的纯正文，而 JasBlogEditor 的 `currentFile.content` 是完整文件内容

### 2026-02-04: 预览需要还原完整博客页面效果

**问题描述**: 用户要求预览区域能完整还原 JasBlog 网站上的博客文章页面效果，包括标题、日期、标签、技术栈等元数据的渲染，而不仅仅是 Markdown 正文

**根本原因**: 之前只传递正文给 MarkdownRenderer，没有渲染元数据部分。用户期望的是"所见即所得"的预览体验

**解决方案**:
1. 创建 `ContentPreview` 组件，根据文件类型渲染不同的页面布局（与 JasBlog 各页面保持一致）
2. 创建 `TechStack` 组件（与 JasBlog 保持一致）
3. 添加 `.divider-cloud` 和 `.tag` CSS 样式
4. 修改 `MarkdownEditor` 使用 `ContentPreview` 替代 `MarkdownRenderer`

**新增文件**:
- `src/components/preview/ContentPreview.tsx` - 内容预览组件，包含 Note/Project/Roadmap/Doc 四种类型的预览
- `src/components/preview/TechStack.tsx` - 技术栈展示组件

**修改文件**:
- `src/components/preview/index.ts` - 导出新组件
- `src/components/editors/MarkdownEditor.tsx` - 使用 ContentPreview
- `src/index.css` - 添加 divider-cloud、tag 样式

**经验教训**: 编辑器预览功能的目标是"所见即所得"，应该完整还原发布后的效果，而不仅仅是渲染正文内容

### 2026-02-04: 知识图谱无可视化预览

**问题描述**: 知识图谱（graph）类型只有 JSON 编辑功能，无法可视化预览图谱效果

**根本原因**: `JsonEditor` 组件只提供 JSON 文本编辑和语法验证，没有集成图谱可视化。JasBlog 网站使用 `@xyflow/react` (React Flow) 渲染交互式知识图谱

**解决方案**:
1. 安装 `@xyflow/react` 依赖
2. 创建图谱组件目录 `src/components/graph/`，从 JasBlog 复制并适配：
   - `GraphCanvas.tsx` - ReactFlow 画布，包含自定义节点/边类型
   - `KnowledgeNode.tsx` - 自定义节点组件，支持颜色、标签、锁定状态
   - `KnowledgeEdge.tsx` - 自定义边组件，贝塞尔曲线 + 流动动画
   - `NodeDetailPanel.tsx` - 节点详情侧边栏
   - `GraphViewer.tsx` - 包装组件，管理选中状态和小地图
3. 更新类型定义 `content.ts`，添加 NodeColor、EdgeColor、KnowledgeNodeData 等类型
4. 修改 `JsonEditor`，支持 edit/preview/split 三种视图模式，预览时渲染 GraphViewer

**新增文件**:
- `src/components/graph/index.ts` - 导出
- `src/components/graph/GraphCanvas.tsx`
- `src/components/graph/KnowledgeNode.tsx`
- `src/components/graph/KnowledgeEdge.tsx`
- `src/components/graph/NodeDetailPanel.tsx`
- `src/components/graph/GraphViewer.tsx`

**修改文件**:
- `src/types/content.ts` - 添加图谱相关类型定义
- `src/components/editors/JsonEditor.tsx` - 添加 GraphViewer 预览

**经验教训**: 所有内容类型都应该提供预览功能，让用户在编辑时就能看到发布后的效果

### 2026-02-05: 同步 JasBlog 规划任务格式重构

**问题描述**: JasBlog 重构了规划（Roadmap）的数据结构，将任务列表从 frontmatter 移到了 Markdown 正文，使用复选框语法表示任务

**根本原因**: JasBlog 提交 `refactor: move roadmap items from frontmatter to body content` 改变了规划文档的数据存储方式

**新格式说明**:
- Frontmatter 只保留: `title`/`name`, `description`, `date`, `status`（active/completed/paused）
- 任务使用 Markdown 复选框语法在正文编写:
  - `- [ ]` 待开始
  - `- [-]` 进行中
  - `- [x]` 已完成
- 优先级使用行内代码（默认 medium）: `` `high` ``, `` `medium` ``, `` `low` ``
- 缩进行为任务描述
- 特殊标记: `截止: date`, `完成: date`

**解决方案**:
1. 更新 `content.ts` 类型定义:
   - `RoadmapMetadata` 移除 `items`，添加 `date` 和 `status`
   - `RoadmapItem` 添加 `id`, `priority`（必填，默认 medium）, `deadline`, `completedAt`
   - 新增 `RoadmapStatus`, `RoadmapPriority`, `RoadmapItemStatus` 类型
2. 更新 `contentParser.ts`:
   - `parseRoadmapItemsFromContent()` 返回 `{ items, remainingContent }`
   - 解析逻辑与 JasBlog `lib/roadmap.ts` 保持一致
3. 更新 `RoadmapMetaForm`:
   - 只保留标题、描述、日期、状态字段
   - 添加任务编写语法提示
4. 更新 `ContentPreview/RoadmapPreview`:
   - 标题旁显示规划状态徽章（roadmapStatusConfig）
   - 任务卡片：左侧优先级圆点 + 标题，右侧状态徽章
   - 渲染剩余正文内容（renderSimpleMarkdown）
   - 完成日期显示绿色
5. 更新 `editorStore` 新文件模板

**修改文件**:
- `src/types/content.ts` - 类型定义重构
- `src/services/contentParser.ts` - 解析和序列化逻辑
- `src/components/forms/RoadmapMetaForm.tsx` - 精简为元数据字段
- `src/components/preview/ContentPreview.tsx` - 与 JasBlog page.tsx 保持一致
- `src/store/editorStore.ts` - 更新新文件模板

**经验教训**:
1. 同步两个项目时必须逐行对比原实现，不能凭记忆或推测
2. 编辑器与目标网站的数据格式和渲染逻辑必须完全一致

### 2026-02-05: 深色主题 - 图谱组件硬编码白色背景

**问题描述**: 深色主题下，知识图谱的节点详情面板和边标签仍显示白色背景

**根本原因**: `NodeDetailPanel.tsx` 和 `KnowledgeEdge.tsx` 使用了硬编码的 `bg-white` 而非 CSS 变量

**解决方案**: 将 `bg-white` 替换为 `bg-[var(--color-paper)]`

**修改文件**:
- `src/components/graph/NodeDetailPanel.tsx` - 面板容器背景
- `src/components/graph/KnowledgeEdge.tsx` - 边标签背景

**经验教训**: 添加深色主题后，所有新增组件都必须使用 CSS 变量而非硬编码颜色。新增组件（尤其是从其他项目复制的）应检查是否使用了 `bg-white`、`text-black` 等硬编码值
