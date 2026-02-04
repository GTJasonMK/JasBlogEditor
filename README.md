# JasBlogEditor

一个基于 Tauri 2 + React 19 的桌面博客内容编辑器。

## 功能特性

- **多内容类型支持**: 笔记 (notes)、项目 (projects)、规划 (roadmaps)、知识图谱 (graphs)
- **Markdown 编辑**: 支持 YAML frontmatter、GFM 语法、数学公式 (KaTeX)、Mermaid 图表
- **实时预览**: 编辑/预览/分屏三种视图模式
- **迷你写作模式**: 快捷键呼出悬浮小窗口，专注写作
- **全局快捷键**: Ctrl+Alt+X 切换迷你模式，Ctrl+Alt+S 直接进入写作

## 技术栈

- **前端**: React 19 + TypeScript + Tailwind CSS 4 + Zustand 5
- **后端**: Rust + Tauri 2
- **构建**: Vite 6

## 开发

### 环境要求

- Node.js 18+
- Rust 1.70+
- pnpm / npm / yarn

### 安装依赖

```bash
npm install
```

### 启动开发

```bash
# 启动桌面应用开发模式
npm run dev:app

# 仅启动 Vite 开发服务器
npm run dev
```

### 构建

```bash
# 构建桌面应用
npm run build:app

# 仅构建前端
npm run build
```

## 目录结构

```
src/                           # 前端代码
├── components/
│   ├── editors/               # MarkdownEditor, JsonEditor
│   ├── forms/                 # 元数据表单
│   ├── layout/                # Sidebar, EditorArea, MetadataPanel, Toolbar
│   └── preview/               # Markdown 预览渲染
├── store/                     # Zustand 状态管理
├── services/                  # 内容解析服务
├── platform/                  # Tauri API 封装
└── types/                     # TypeScript 类型定义

src-tauri/                     # Rust 后端
├── src/
│   ├── lib.rs                 # Tauri 命令
│   └── main.rs                # 入口点
└── tauri.conf.json            # 应用配置
```

## 内容类型

| 类型 | 扩展名 | 目录 | 说明 |
|------|--------|------|------|
| note | .md | notes/ | 笔记，支持 title, date, excerpt, tags |
| project | .md | projects/ | 项目，支持 techStack, github, status |
| roadmap | .md | roadmaps/ | 规划，支持 items 列表 |
| graph | .json | graphs/ | 知识图谱，支持 nodes, edges |

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| Ctrl+S | 保存当前文件 |
| Ctrl+Alt+X | 切换迷你写作模式 |
| Ctrl+Alt+S | 进入迷你模式并聚焦到文末 |

## 许可证

MIT
