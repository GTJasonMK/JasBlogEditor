# Site Editor Alignment Followups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 对齐 JasBlogEditor 与 JasBlog 在新建路径、diary YAML 错误回退、diary 标题 fallback、roadmap 缩进、Markdown 扩展名大小写、roadmap 日期展示上的剩余契约差异。

**Architecture:** 先用编辑器侧回归测试锁定契约，再分别在编辑器与站点的最小边界处修复根因。创建路径问题在编辑器入口与路径构建边界双重拦截；渲染与解析问题优先复用已有 display helper 和站点现有读取契约；扩展名大小写和 roadmap 日期展示直接在站点读取/页面层对齐。

**Tech Stack:** React 19, TypeScript, node:test, Next.js 15, Tauri 2

---

### Task 1: 锁定跨项目契约测试

**Files:**
- Create: `scripts/alignment-followups.test.ts`
- Modify: `package.json`

- [ ] **Step 1: 写失败测试，覆盖非 diary 模块拒绝子路径创建**
- [ ] **Step 2: 写失败测试，覆盖 diary YAML 解析失败不再回退到今天**
- [ ] **Step 3: 写失败测试，覆盖 DiaryPreview 复用 `resolveDiaryDisplay()`**
- [ ] **Step 4: 写失败测试，覆盖 roadmap 单个 Tab 不再被当作详情缩进**
- [ ] **Step 5: 写失败测试，覆盖 JasBlog 读取器接受 `.MD` / `.md`**
- [ ] **Step 6: 写失败测试，覆盖 roadmap 列表页仅在有日期时显示“创建于”**
- [ ] **Step 7: 运行 `node --loader ./scripts/ts-loader.mjs --test scripts/alignment-followups.test.ts`，确认失败**

### Task 2: 修编辑器侧根因

**Files:**
- Modify: `src/services/contentTemplates.ts`
- Modify: `src/components/layout/toolbar/TemplatePickerDialog.tsx`
- Modify: `src/services/contentParser.ts`
- Modify: `src/services/displayMetadata.ts`
- Modify: `src/components/preview/previews/DiaryPreview.tsx`
- Modify: `src/store/editorStore.ts`

- [ ] **Step 1: 为 JasBlog 新建路径增加显式校验，非 diary 子路径直接报错**
- [ ] **Step 2: 在新建对话框中展示该校验错误，并禁用创建按钮**
- [ ] **Step 3: 让 diary YAML 解析失败返回空日期/空时间，而不是今天**
- [ ] **Step 4: 让 editorStore 的 diary 打开逻辑不再用今天兜底**
- [ ] **Step 5: 让 DiaryPreview 当前条目和同日条目统一走 `resolveDiaryDisplay()`**
- [ ] **Step 6: 让 roadmap 缩进规则与站点统一为至少两个空白字符**
- [ ] **Step 7: 重新运行 `node --loader ./scripts/ts-loader.mjs --test scripts/alignment-followups.test.ts`，确认通过**

### Task 3: 修站点侧剩余分叉

**Files:**
- Create: `../JasBlog/src/lib/markdown-file.ts`
- Modify: `../JasBlog/src/lib/posts.ts`
- Modify: `../JasBlog/src/lib/projects.ts`
- Modify: `../JasBlog/src/lib/graphs.ts`
- Modify: `../JasBlog/src/lib/roadmap.ts`
- Modify: `../JasBlog/src/lib/diary.ts`
- Modify: `../JasBlog/src/app/roadmap/page.tsx`

- [ ] **Step 1: 提取站点侧 Markdown 文件名判断 helper，统一接受 `.md` / `.MD`**
- [ ] **Step 2: 让 `notes / projects / graphs / roadmap / diary` 全部复用该 helper 与大小写无关的扩展名移除**
- [ ] **Step 3: 让 `/roadmap` 列表页只在 `roadmap.date` 存在时显示“创建于 …”**
- [ ] **Step 4: 重新运行 `node --loader ./scripts/ts-loader.mjs --test scripts/alignment-followups.test.ts`，确认站点源码契约通过**

### Task 4: 完整验证

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 运行 `cd /mnt/e/code/jas/JasBlogEditor && npm test`**
- [ ] **Step 2: 运行 `cmd.exe /c "cd /d E:\\Code\\Jas\\JasBlogEditor && npm run build"`**
- [ ] **Step 3: 运行 `cd /mnt/e/code/jas/JasBlog && npm run build`**
