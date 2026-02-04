# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

JasBlogEditor 是一个桌面博客内容编辑器，基于 Tauri 2 (Rust 后端) + React 19 (TypeScript 前端) 构建。支持编辑四种内容类型：笔记、项目、规划（Markdown + YAML frontmatter）和知识图谱（JSON）。

## 开发命令

```bash
# 开发
npm run dev:app      # 启动桌面应用开发模式（首次运行需编译 Rust）
npm run dev          # 仅启动 Vite 开发服务器（端口 1422）

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
│   └── layout/                # Sidebar, EditorArea, MetadataPanel, Toolbar
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
