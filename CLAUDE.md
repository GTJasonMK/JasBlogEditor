# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

JasBlogEditor 是一个桌面博客内容编辑器，基于 Tauri 2 (Rust 后端) + React 19 (TypeScript 前端) 构建。核心功能是 Markdown 文本编辑 + 实时预览，支持两种工作区模式和六种内容类型。所有内容类型本质上都是 Markdown 文件（包括知识图谱，数据存储在 ` ```graph``` ` 代码块中），编辑器不应将数据变成可视化卡片界面。

## 开发命令

```bash
# 开发
npm run dev          # 启动 Vite 开发服务器（默认从 1422 起自动找空闲端口）
npm run dev:app      # 启动桌面应用（自动找空闲端口并同步给 Tauri）
npm run tauri dev    # 等价于 dev:app

# 构建
npm run build        # 仅构建前端（tsc -b && vite build）
npm run build:app    # 构建桌面应用（生成 NSIS 安装包，输出到 src-tauri/target/release/bundle/nsis/）

# 测试
npm test             # 运行 Node.js 内置测试（scripts/dev-port.test.mjs）

# Windows 批处理
start.bat            # 一键启动开发环境（自动安装依赖）
build.bat            # 一键构建
```

## 技术栈

- **前端**: React 19 + TypeScript 5.7 + Tailwind CSS 4 + Zustand 5
- **后端**: Rust + Tauri 2
- **构建**: Vite 6
- **路径别名**: `@/` → `src/`（配置在 `vite.config.ts` 和 `tsconfig.json`）
- **界面语言**: 中文（硬编码，无国际化）

## 架构

### 目录结构
```
src/
├── config/contentTypeUi.tsx    # 【核心】内容类型 UI 注册表（MetaForm + Preview 统一注册）
├── components/
│   ├── editors/                # MarkdownEditor（统一编辑器，支持 edit/preview/split）
│   ├── forms/                  # 元数据表单（每种内容类型对应一个 MetaForm）
│   ├── graph/                  # 知识图谱可视化（@xyflow/react）
│   ├── layout/                 # Sidebar, EditorArea, MetadataPanel, Toolbar
│   │   ├── sidebar/            # FileContextMenu, RenameDialog
│   │   └── toolbar/            # ErrorToast, HelpModal, SearchModal, NewMenu 等
│   └── preview/                # 预览组件
│       └── previews/           # 各内容类型详情页预览（NotePreview, ProjectPreview 等）
├── hooks/                      # 副作用 hooks（均以 Effect 结尾，不返回状态）
├── platform/                   # Tauri API 封装和运行环境检测
├── services/                   # 业务逻辑（解析、模板、日记工具）
├── store/                      # Zustand 状态管理（editor, file, settings, window）
├── types/content.ts            # 全部类型定义
└── utils/                      # 公共工具函数（text, path, debounce, theme, fileTree, confirmDialog）

src-tauri/                      # Rust 后端
├── src/lib.rs                  # Tauri 命令定义
└── tauri.conf.json             # 应用配置（最小 900x600，默认 1280x800）
```

### 两种工作区模式

`WorkspaceType = 'jasblog' | 'docs'`

| 模式 | 检测逻辑 | 文件树 | 侧边栏 | 内容类型 |
|------|----------|--------|--------|---------|
| `jasblog` | 路径下存在 `content/` 目录且含 notes/projects/diary/graphs/roadmaps 子目录 | 固定扫描 `content/<type>/`，按预设顺序排列 | `JasBlogSidebar`（按类型分组） | note/project/diary/roadmap/graph |
| `docs` | 其他情况 | 递归扫描任意目录的 `.md` 文件 | `DocsSidebar`（递归文件树） | doc |

检测函数 `isJasBlogWorkspaceRoot()` 在 `fileStore.ts` 中，`resolveWorkspacePath()` 会向上最多 6 层回溯（兼容用户选中子目录）。

### 内容类型系统

所有内容文件扩展名均为 `.md`：

| 类型 | 目录 | 元数据接口 | 特殊说明 |
|------|------|-----------|---------|
| note | `content/notes/` | `NoteMetadata` (title, date, excerpt, tags) | |
| project | `content/projects/` | `ProjectMetadata` (name, description, github, techStack, status) | |
| diary | `content/diary/YYYY/MM/` | `DiaryMetadata` (title, date, time, companions) | 文件名格式 `YYYY-MM-DD-HH-mm-title.md`，可推断 date/time |
| roadmap | `content/roadmaps/` | `RoadmapMetadata` (title, description, date, status) | 任务在正文用 `- [ ]/-[-]/- [x]` 语法，优先级用行内代码 `` `high` `` |
| graph | `content/graphs/` | `GraphMetadata` (name, description) | 图数据存在正文的 ` ```graph``` ` 代码块中（JSON 格式） |
| doc | 任意目录 | `DocMetadata` (title) | 仅 docs 模式 |

### contentTypeUi 注册表模式

`src/config/contentTypeUi.tsx` 是内容类型扩展的核心入口。新增内容类型只需 3 处修改：
1. `src/types/content.ts` — 添加类型字符串和元数据接口
2. `src/services/contentParser.ts` — 添加解析/序列化逻辑
3. `src/config/contentTypeUi.tsx` — 注册 MetaForm 和 renderPreview

注册后 `MetadataPanel`、`ContentPreview`、`EditorArea` 等组件自动适配，无需修改。

### 数据流

```
文件打开:
  editorStore.openFile() → invokeTauri('read_file') → contentParser.parseMarkdownContent()
  → 返回 { metadata, content(正文), frontmatterBlock(原始块), hasBom, lineEnding }
  → 存入 editorStore.currentFile

编辑渲染:
  MarkdownEditor 根据 viewMode 渲染：
  ├── 编辑侧: textarea → updateContent() → currentFile.content
  ├── 详情预览: ContentPreview → CONTENT_TYPE_UI[type].renderPreview()
  └── 列表预览: JasBlogListPreview（读取同类型全部文件）

文件保存:
  Ctrl+S → saveFile() → serializeMarkdownContentPreservingFrontmatter()
  → 优先 patch 原始 frontmatter（保留注释和键顺序），失败则 fallback 完整序列化
  → 保持原始 BOM 和换行风格（CRLF/LF）→ invokeTauri('write_file')
```

### 预览系统

两个维度：
- **viewMode** (`edit`/`preview`/`split`): 控制编辑区布局
- **previewMode** (`detail`/`list`，仅 JasBlog 模式): `detail` 渲染单篇文章预览，`list` 渲染栏目列表页

### 状态管理

Zustand store 使用异步命令模式调用 Tauri，不可变更新：
- `editorStore` — 当前文件状态（打开/保存/编辑/新建/删除）
- `fileStore` — 工作区路径、类型、文件树
- `settingsStore` — 持久化设置（`%APPDATA%/JasBlogEditor/settings.json`）
- `windowStore` — 迷你写作模式窗口管理

### Tauri 命令（前后端接口）

定义在 `src-tauri/src/lib.rs`，通过 `src/platform/tauri.ts` 的 `invokeTauri()` 调用：
- `read_directory(path)` / `read_file(path)` / `write_file(path, content)`
- `create_file(path, content)` / `delete_file(path)` / `path_exists(path)`
- `get_settings()` / `save_settings(settings)`

### Hooks 命名约定

所有 hooks 以 `Effect` 结尾，只含副作用逻辑，不返回状态（状态全在 Zustand store 中）：
- `useWorkspaceInitEffect` — 应用启动时初始化工作区
- `useSaveShortcutEffect` — Ctrl+S 保存
- `useGlobalShortcutsEffect` — Tauri 全局快捷键（Ctrl+Alt+X 切换迷你模式）
- `useThemeEffect` — 主题切换副作用

### 主题系统

使用 CSS 变量实现深色/浅色主题，定义在 `src/index.css`。组件中使用 `var(--color-*)` 而非 `bg-white`/`text-black` 等硬编码值。从其他项目复制组件时务必检查硬编码颜色。

## 关键约束

- **软件定位**: 这是 Markdown 博客内容编辑器，编辑器负责文本编辑体验，元数据面板负责 frontmatter 字段编辑，预览还原 JasBlog 网站发布效果。不要将编辑器变成可视化管理工具。
- **JasBlog 同步**: 预览渲染必须与 JasBlog 网站保持一致，同步时应逐行对比而非仅对比功能点。
- **frontmatter 保留**: 保存时使用 `serializeMarkdownContentPreservingFrontmatter` 最小化 diff，保留注释和键顺序。
- **BOM/换行**: 读取时检测 BOM 和换行风格（CRLF/LF），写入时保持原样。
- **工作区初始化**: 添加新的 store 状态后，必须检查 `useWorkspaceInitEffect` 中的恢复路径是否也正确设置了该状态。

## 问题解决日志

### 2026-02-04: 预览渲染与 JasBlog 不一致

**问题**: 预览效果与 JasBlog 网站不一致，遗漏 Alert 语法预处理、代码块复制按钮、图片缩放、标题锚点等功能。
**方案**: 完全同步 `MarkdownRenderer.tsx` 与 JasBlog 实现。
**教训**: 同步两个项目代码时，应逐行对比而非仅对比功能点。

### 2026-02-04: 项目代码质量优化

**问题**: 自实现 YAML 解析器缺陷、JSON 编辑器无错误反馈、状态管理反模式、性能问题等。
**方案**: 使用 `yaml` 库替换自实现解析；添加输入防抖（300ms）；stores 添加 error 状态；提取公共函数到 `src/utils/`。
**教训**: 优先使用成熟库；错误处理必须用户可见；公共函数尽早提取到 utils。

### 2026-02-04: 应用重启后无法识别 JasBlog 工作区

**问题**: 添加 `workspaceType` 状态后，应用重启时未恢复该状态，所有目录都被当作普通文档模式。
**方案**: 在 `loadFileTree` 之前先从 settings 恢复 `workspaceType`，否则调用 `detectWorkspaceType()` 重新检测。
**教训**: 添加新 store 状态后，必须检查所有初始化路径（用户交互 + 应用启动恢复）。

### 2026-02-04: 回退 RoadmapEditor 可视化编辑器

**问题**: 错误地为规划类型创建了独立的可视化任务卡片编辑器，偏离软件定位。
**方案**: 删除 RoadmapEditor，规划类型使用 MarkdownEditor。
**教训**: 功能设计前必须先明确软件定位，编辑器不能越界变成专用管理工具。

### 2026-02-04: 预览显示 frontmatter 原始内容

**问题**: 预览直接传递完整文件内容（含 frontmatter）给渲染器。
**方案**: 添加 `extractBodyContent` 函数，预览时只传递正文。
**教训**: 同步项目时不仅对比组件实现，还要对比数据流。JasBlog 的 `post.content` 是解析后的纯正文。

### 2026-02-04: 预览需要还原完整博客页面效果

**问题**: 用户期望预览区域完整还原 JasBlog 网站页面效果，包括元数据渲染。
**方案**: 创建 `ContentPreview` 组件，根据文件类型渲染不同布局。
**教训**: 编辑器预览目标是"所见即所得"，应完整还原发布后效果。

### 2026-02-05: 同步 JasBlog 规划任务格式重构

**问题**: JasBlog 将规划任务从 frontmatter 移到了 Markdown 正文（复选框语法）。
**方案**: 更新 contentParser 解析逻辑、类型定义、MetaForm 和 Preview 组件。
**教训**: 编辑器与目标网站的数据格式和渲染逻辑必须完全一致。

### 2026-02-05: 深色主题 - 图谱组件硬编码白色背景

**问题**: 知识图谱组件使用 `bg-white` 硬编码，深色主题下显示异常。
**方案**: 替换为 `bg-[var(--color-paper)]`。
**教训**: 所有组件必须使用 CSS 变量，从其他项目复制的组件要检查硬编码颜色。
