# JasBlogEditor

一个基于 Tauri 2 + React 19 的桌面博客内容编辑器。

## 功能特性

- **多内容类型支持**: 笔记 (notes)、项目 (projects)、日记 (diary)、规划 (roadmaps)、知识图谱 (graphs)
- **JasBlog 日记支持**: 支持 `content/diary/YYYY/MM/*.md` 结构的日记条目编辑与预览
- **Diary 同日聚合预览**: 自动加载同一天的其他条目并按时间排序渲染（对齐 JasBlog `/diary/[slug]` 展示）
- **Markdown 编辑**: 支持 YAML frontmatter、GFM 语法、数学公式 (KaTeX)、Mermaid 图表
- **实时预览**: 编辑/预览/分屏三种视图模式
- **列表页预览**: 预览区支持“详情/列表”切换，展示与 JasBlog 列表页一致的布局与筛选交互（Notes 标签筛选、Diary 年/月筛选时间线等）
- **JasBlog 全局搜索**: 支持 `/` 快捷键打开搜索弹窗，按标题/摘要/标签等检索并跳转打开文件
- **Notes 评论区预览（可选）**: 支持通过 Giscus 嵌入评论区（需配置 `VITE_GISCUS_*` 环境变量）
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
# 启动桌面应用开发模式（自动从 1422 起寻找空闲端口）
npm run dev:app

# 使用 tauri 子命令启动（等价于 dev:app，自动找空闲端口并同步给 Tauri）
npm run tauri dev

# 仅启动 Vite 开发服务器（自动从 1422 起寻找空闲端口）
npm run dev

# 如需强制释放默认端口(1422)，可尝试结束占用进程（谨慎）
npm run kill:devport
```

### （可选）配置 Giscus 评论

如需在 Notes 预览中显示评论区，请配置以下环境变量（示例）：

```bash
VITE_GISCUS_REPO=owner/repo
VITE_GISCUS_REPO_ID=...
VITE_GISCUS_CATEGORY=...
VITE_GISCUS_CATEGORY_ID=...
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
| diary | .md | diary/ | 日记条目，支持 title, date, time, mood 等字段（支持 YYYY/MM 子目录） |
| roadmap | .md | roadmaps/ | 规划，支持 items 列表 |
| graph | .md | graphs/ | 知识图谱（Markdown + ```graph 代码块），支持 nodes, edges |

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| Ctrl+S | 保存当前文件 |
| Ctrl+Alt+X | 切换迷你写作模式 |
| Ctrl+Alt+S | 进入迷你模式并聚焦到文末 |

## 许可证

MIT
