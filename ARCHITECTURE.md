# JasBlogEditor 架构协作文档

## 一、整体协作架构图

```
                           +-----------+
                           |  Tauri    |
                           |  Rust     |
                           |  Backend  |
                           +-----+-----+
                                 |
                          Tauri Commands
                          (IPC 跨进程调用)
                                 |
                           +-----+-----+
                           |  platform |
                           |  /tauri.ts|  <-- 前后端桥梁
                           +-----+-----+
                                 |
                    invokeTauri() / openFolderDialog()
                                 |
          +----------------------+----------------------+
          |                      |                      |
   +------+------+     +--------+-------+     +--------+-------+
   | settingsStore|     |   fileStore    |     |  editorStore   |
   | (设置持久化) |     | (文件树管理)  |     | (编辑器状态)   |
   +------+------+     +--------+-------+     +--------+-------+
          |                      |                      |
          +----------+-----------+----------+-----------+
                     |                      |
              (Zustand 订阅)          (Zustand 订阅)
                     |                      |
         +-----------+-----------+----------+-----------+
         |           |           |                      |
    +----+---+  +----+----+ +---+-------+  +-----------+----------+
    | Toolbar|  | Sidebar | | EditorArea|  |   MetadataPanel      |
    +--------+  +---------+ +-----+-----+  +----------+-----------+
                                  |                    |
                          +-------+------+    +--------+---------+
                          |              |    |        |         |
                     Markdown编辑器  JSON编辑器  各类元数据表单
```

## 二、启动流程

应用启动时各部分的初始化顺序：

```
App 组件挂载
  |
  +--[1]--> settingsStore.loadSettings()
  |           |
  |           +--> Tauri: get_settings
  |           |        读取 %APPDATA%/JasBlogEditor/settings.json
  |           |
  |           +--> 返回 { workspacePath, lastOpenedFile }
  |
  +--[2]--> fileStore.setWorkspacePath(path)
  |           设置工作区路径
  |
  +--[3]--> fileStore.loadFileTree()
  |           |
  |           +--> Tauri: path_exists  检查 content/ 目录
  |           +--> Tauri: read_directory  读取 content/ 下的子目录
  |           +--> Tauri: read_directory  逐个读取 notes/projects/diary/roadmaps/graphs/ 下的文件（diary 支持递归子目录）
  |           |
  |           +--> 构建 fileTree 数据结构
  |
  +--[4]--> 注册全局快捷键 (Ctrl+S)
  |
  +--[5]--> 渲染 UI 布局
              Toolbar + Sidebar + EditorArea + MetadataPanel
```

## 三、三大 Store 的职责与协作

### 3.1 settingsStore -- 全局设置管理

```
职责：持久化用户设置（工作区路径、上次打开的文件）

对外接口：
  loadSettings()       --> Tauri: get_settings       从磁盘读取
  saveSettings(patch)  --> Tauri: save_settings      写入磁盘
  setWorkspacePath(p)  --> 内部调用 saveSettings     快捷方法

被谁消费：
  - Toolbar          读取 settings.workspacePath 显示工作区名称
  - App              启动时调用 loadSettings() 获取初始设置
```

### 3.2 fileStore -- 文件树管理

```
职责：管理工作区的文件目录树

对外接口：
  setWorkspacePath(path)  --> 重置文件树状态
  loadFileTree()          --> Tauri: path_exists + read_directory  构建文件树
  refreshFileTree()       --> 重新加载文件树（创建/删除文件后调用）

数据结构：
  fileTree: FileTreeNode[]
    FileTreeNode {
      name: "notes"           // 目录名
      path: "C:/.../notes"    // 绝对路径
      isDir: true
      contentType: "note"     // 目录对应的内容类型
      children: [             // 目录下的文件
        { name: "xxx.md", path: "...", isDir: false, contentType: "note" }
      ]
    }

被谁消费：
  - Sidebar     遍历 fileTree 渲染文件导航树
  - Toolbar     创建/删除文件后调用 refreshFileTree()
```

### 3.3 editorStore -- 编辑器核心状态

```
职责：管理当前打开文件的全部状态和增删改查操作

对外接口：
  openFile(path, type)         --> Tauri: read_file + contentParser 解析内容
  closeFile()                  --> 清空当前文件
  updateContent(content)       --> 更新 Markdown 正文，标记 isDirty
  updateMetadata(partial)      --> 更新元数据，标记 isDirty
  saveFile()                   --> contentParser 序列化 + Tauri: write_file
  createNewFile(ws, type, fn)  --> 生成模板 + Tauri: create_file
  deleteCurrentFile()          --> Tauri: delete_file
  setViewMode(mode)            --> 切换 edit/preview/split

核心数据：
  currentFile: EditorFile | null
    EditorFile {
      path: string            // 文件绝对路径
      name: string            // 文件名
      type: ContentType       // note | project | roadmap | graph
      content: string         // Markdown 正文（graph 时为原始 JSON）
      metadata: Metadata      // 解析后的元数据对象
      isDirty: boolean        // 是否有未保存的修改
    }

被谁消费：
  - EditorArea      根据 currentFile.type 决定渲染 MarkdownEditor 或 JsonEditor
  - MetadataPanel   根据 currentFile.type 渲染对应的元数据表单
  - Sidebar         高亮当前打开的文件 (currentFile.path)
  - Toolbar         显示文件名、保存按钮状态、视图模式切换
  - App             快捷键 Ctrl+S 调用 saveFile()
```

## 四、核心用户操作的数据流

### 4.1 打开文件

```
用户点击 Sidebar 中的文件
  |
  Sidebar.handleFileClick(node)
  |
  editorStore.openFile(path, contentType)
  |
  +--> Tauri: read_file(path)             // 读取原始文件内容
  |
  +--> 判断类型
  |      type === 'graph'  --> parseJsonContent(raw)       // JSON.parse
  |      其他              --> parseMarkdownContent(raw, type)  // 分离 frontmatter + body
  |
  +--> set({ currentFile: { path, name, type, content, metadata, isDirty: false } })
  |
  +--> UI 响应
         EditorArea     --> 切换为对应编辑器
         MetadataPanel  --> 渲染对应表单
         Toolbar        --> 显示文件名
         Sidebar        --> 高亮当前文件
```

### 4.2 编辑内容

```
用户在编辑器中输入
  |
  MarkdownEditor: textarea.onChange --> editorStore.updateContent(newContent)
  JsonEditor:     textarea.onChange --> editorStore.updateMetadata(parsed)
  元数据表单:     input.onChange   --> editorStore.updateMetadata({ field: value })
  |
  +--> set({ currentFile: { ...currentFile, content/metadata, isDirty: true } })
  |
  +--> UI 响应
         Toolbar     --> 文件名旁出现 * 号，保存按钮激活
         预览面板    --> Markdown 实时重新渲染
```

### 4.3 保存文件

```
用户点击保存按钮 / Ctrl+S
  |
  editorStore.saveFile()
  |
  +--> 判断类型
  |      type === 'graph'  --> serializeJsonContent(metadata)     // JSON.stringify
  |      其他              --> serializeMarkdownContent(metadata, content)
  |                               // 拼接 ---\nyaml\n---\n\nbody
  |
  +--> Tauri: write_file(path, fileContent)
  |
  +--> set({ currentFile: { ...currentFile, isDirty: false } })
  |
  +--> Toolbar.handleSave() 还会调用 fileStore.refreshFileTree()
```

### 4.4 新建文件

```
用户点击 Toolbar 新建 --> 选择类型 --> 输入文件名 --> 确认
  |
  Toolbar.handleCreateFile()
  |
  +--> editorStore.createNewFile(workspacePath, type, filename)
  |      |
  |      +--> 根据类型生成模板内容
  |      |      note:    ---\ntitle: xxx\ndate: ...\n---\n
  |      |      project: ---\ntitle: xxx\ndescription: ...\n---\n## 项目介绍
  |      |      roadmap: ---\ntitle: xxx\n...\n---\n## 规划详情
  |      |      graph:   { "name": "xxx", "nodes": [], "edges": [] }
  |      |
  |      +--> Tauri: create_file(path, content)
  |      +--> 返回新文件路径
  |
  +--> editorStore.openFile(path, type)     // 打开新创建的文件
  +--> fileStore.refreshFileTree()          // 刷新侧边栏
```

### 4.5 删除文件

```
用户点击 Toolbar 删除 --> confirm 确认
  |
  Toolbar.handleDelete()
  |
  +--> editorStore.deleteCurrentFile()
  |      |
  |      +--> Tauri: delete_file(currentFile.path)
  |      +--> set({ currentFile: null })
  |
  +--> fileStore.refreshFileTree()
  |
  +--> UI 响应
         EditorArea    --> 显示空状态提示
         MetadataPanel --> 显示空状态提示
         Sidebar       --> 文件消失
```

### 4.6 选择工作区

```
用户点击 Toolbar 的工作区按钮
  |
  Toolbar.handleSelectWorkspace()
  |
  +--> openFolderDialog()            // Tauri 原生文件夹选择对话框
  |
  +--> settingsStore.setWorkspacePath(path)   // 持久化到磁盘
  +--> fileStore.setWorkspacePath(path)       // 重置文件树状态
  +--> fileStore.refreshFileTree()            // 加载新工作区的文件树
```

## 五、组件与 Store 的依赖关系

```
组件             使用的 Store               调用的方法
-----------      --------------------       ----------------------------
App              settingsStore              loadSettings()
                 fileStore                  setWorkspacePath(), loadFileTree()
                 editorStore                saveFile() (快捷键)

Toolbar          settingsStore              settings, setWorkspacePath()
                 fileStore                  refreshFileTree()
                 editorStore                currentFile, saveFile(), viewMode,
                                            setViewMode(), createNewFile(),
                                            openFile(), deleteCurrentFile()

Sidebar          fileStore                  fileTree, isLoading, error
                 editorStore                currentFile (高亮), openFile()

EditorArea       editorStore                currentFile, isLoading

MarkdownEditor   editorStore                currentFile, updateContent(), viewMode

JsonEditor       editorStore                currentFile, updateMetadata()

MetadataPanel    editorStore                currentFile

NoteMetaForm     editorStore                currentFile, updateMetadata()
ProjectMetaForm  editorStore                currentFile, updateMetadata()
RoadmapMetaForm  editorStore                currentFile, updateMetadata()
GraphMetaForm    editorStore                currentFile, updateMetadata()
```

## 六、前后端通信层

### 6.1 调用链路

```
React 组件
  --> Zustand Store 方法
    --> invokeTauri<T>(cmd, args)       // src/platform/tauri.ts
      --> isTauri()                      // src/platform/runtime.ts 检查环境
      --> @tauri-apps/api/core.invoke()  // Tauri JS API
        --> IPC 消息
          --> Rust #[tauri::command] fn   // src-tauri/src/lib.rs
            --> std::fs 文件系统操作
```

### 6.2 命名约定

前端 TypeScript 使用 camelCase，Rust 后端使用 snake_case。Store 层负责转换：

```
TypeScript (前端)          Rust (后端)
---                        ---
workspacePath       <-->   workspace_path
lastOpenedFile      <-->   last_opened_file
isDir               <-->   is_dir
```

## 七、内容解析层 (contentParser.ts)

负责文件内容与结构化数据之间的双向转换：

```
                      +-----------------------+
    读取文件          |   contentParser.ts     |          Store 使用
                      |                        |
  "---\n              |  parseMarkdownContent() |    { metadata: NoteMetadata,
  title: xxx\n  ----> |  解析 YAML frontmatter  | ---->  content: "正文..." }
  ---\n正文"          |                        |
                      |  serializeMarkdownContent()  <----
  "---\n              |  序列化 YAML frontmatter | <--  { metadata, content }
  title: xxx\n        |                        |
  ---\n正文"          |                        |
                      |  parseJsonContent()     |    { name, description,
  '{"name":...}' --> |  JSON.parse             | ---->  nodes[], edges[] }
                      |                        |
                      |  serializeJsonContent() |
  '{"name":...}' <-- |  JSON.stringify         | <--  GraphData
                      +-----------------------+
```

## 八、视图模式切换

对所有内容类型生效，统一由 `MarkdownEditor` 渲染与切换（graph 也是 Markdown 文件，图谱数据位于 ` ```graph ` 代码块）：

```
Toolbar 视图切换按钮
  |
  editorStore.setViewMode(mode)
  |
  MarkdownEditor 根据 viewMode 渲染
  |
  +--> 'edit'     仅显示 textarea 编辑区
  +--> 'preview'  仅显示预览区（还原 JasBlog 页面渲染效果）
  +--> 'split'    左右分屏，左编辑右预览
```

## 九、文件目录约定

编辑器要求工作区目录下存在以下结构（即 JasBlog 项目的 content 目录）：

```
<工作区>/
  content/
    notes/        --> ContentType: 'note'      (.md 文件)
    projects/     --> ContentType: 'project'   (.md 文件)
    diary/        --> ContentType: 'diary'     (.md 文件，可按 YYYY/MM 分目录)
    roadmaps/     --> ContentType: 'roadmap'   (.md 文件)
    graphs/       --> ContentType: 'graph'     (.md 文件，包含 ```graph 代码块)
```

目录名到 ContentType 的映射定义在 `src/types/content.ts` 的 `CONTENT_DIRS` 中，加载逻辑在 `src/store/fileStore.ts`。
