# Example Preview Window Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 frontmatter 帮助示例增加独立新窗口双栏对照预览。

**Architecture:** 复用现有帮助示例数据作为单一来源，主入口通过查询参数切换到独立预览窗口视图，主窗口使用 Tauri `WebviewWindow` 创建或复用示例窗口。

**Tech Stack:** React 19, TypeScript, Tauri 2, node:test

---

### Task 1: 锁定纯逻辑行为

**Files:**
- Create: `scripts/example-preview-model.test.ts`
- Modify: `package.json`

- [ ] **Step 1: 写失败测试**
- [ ] **Step 2: 运行 `node --loader ./scripts/ts-loader.mjs --test scripts/example-preview-model.test.ts`，确认失败**
- [ ] **Step 3: 实现示例路由与示例选择纯逻辑**
- [ ] **Step 4: 重新运行测试，确认通过**

### Task 2: 锁定帮助页入口

**Files:**
- Create: `scripts/help-frontmatter-window-entry.test.ts`
- Modify: `src/components/layout/toolbar/help/FrontmatterHelpTab.tsx`

- [ ] **Step 1: 写失败测试**
- [ ] **Step 2: 运行 `node --loader ./scripts/ts-loader.mjs --test scripts/help-frontmatter-window-entry.test.ts`，确认失败**
- [ ] **Step 3: 在帮助页示例中接入“在新窗口中查看”入口**
- [ ] **Step 4: 重新运行测试，确认通过**

### Task 3: 实现独立预览窗口

**Files:**
- Create: `src/features/examplePreview/examplePreviewModel.ts`
- Create: `src/features/examplePreview/openExamplePreviewWindow.ts`
- Create: `src/features/examplePreview/ExamplePreviewWindow.tsx`
- Create: `src/features/examplePreview/ExamplePreviewPane.tsx`
- Modify: `src/main.tsx`
- Modify: `src-tauri/capabilities/default.json`

- [ ] **Step 1: 实现查询参数解析与 URL 构造**
- [ ] **Step 2: 实现 Tauri 窗口创建 / 复用逻辑**
- [ ] **Step 3: 实现双栏窗口组件与最小工具栏**
- [ ] **Step 4: 接入主入口视图分流**
- [ ] **Step 5: 配置 preview 窗口权限**

### Task 4: 整体验证

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 运行 `npm test`**
- [ ] **Step 2: 运行 `cmd.exe /c "cd /d E:\\Code\\Jas\\JasBlogEditor && npm run build"`**
- [ ] **Step 3: 人工验证帮助页打开独立窗口与示例切换**
