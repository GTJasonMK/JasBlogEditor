# Diary Default Relative Path Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让新建考研日志对话框默认填入基于创建时间的相对路径。

**Architecture:** 在内容服务层提供一个纯逻辑 helper，统一生成 `YYYY/MM/YYYY-MM-DD-HH-mm` 格式的默认相对路径；新建对话框仅在 `diary` 类型下调用该 helper 预填输入框，其他类型保持原样。

**Tech Stack:** React 19, TypeScript, node:test

---

### Task 1: 锁定默认路径契约

**Files:**
- Create: `scripts/diary-default-path.test.ts`
- Modify: `package.json`

- [ ] **Step 1: 写失败测试，覆盖 helper 输出 `YYYY/MM/YYYY-MM-DD-HH-mm`**
- [ ] **Step 2: 写失败测试，覆盖 `TemplatePickerDialog` 对 `diary` 使用该 helper 预填输入框**
- [ ] **Step 3: 运行 `node --loader ./scripts/ts-loader.mjs --test scripts/diary-default-path.test.ts`，确认失败**

### Task 2: 实现最小逻辑

**Files:**
- Modify: `src/services/contentTemplates.ts`
- Modify: `src/components/layout/toolbar/TemplatePickerDialog.tsx`

- [ ] **Step 1: 在 `contentTemplates.ts` 中新增 `buildDefaultDiaryRelativePath(date?: Date)`**
- [ ] **Step 2: 让 `TemplatePickerDialog` 在 `type === 'diary'` 时打开即预填默认相对路径**
- [ ] **Step 3: 保持 `note / project / graph / roadmap` 仍使用空输入值**
- [ ] **Step 4: 重新运行 `node --loader ./scripts/ts-loader.mjs --test scripts/diary-default-path.test.ts`，确认通过**

### Task 3: 完整验证

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 运行 `npm test`**
- [ ] **Step 2: 运行 `cmd.exe /c "cd /d E:\\Code\\Jas\\JasBlogEditor && npm run build"`**
- [ ] **Step 3: 检查新建考研日志输入框默认值示例是否为 `2026/04/2026-04-03-21-35` 这种形式**
