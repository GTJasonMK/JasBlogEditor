import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

test("独立示例预览窗口为双栏滚动布局保留完整高度约束", () => {
  const paneSource = readRepoFile(
    "src/features/examplePreview/ExamplePreviewPane.tsx"
  );
  const windowSource = readRepoFile(
    "src/features/examplePreview/ExamplePreviewWindow.tsx"
  );

  assert.match(
    paneSource,
    /className="[^"]*min-w-0[^"]*flex[^"]*h-full[^"]*min-h-0[^"]*flex-col[^"]*overflow-hidden/
  );
  assert.match(
    paneSource,
    /<div className="[^"]*min-w-0[^"]*min-h-0[^"]*flex[^"]*flex-1[^"]*flex-col[^"]*overflow-hidden"/
  );
  assert.match(
    paneSource,
    /<header className="[^"]*min-w-0[^"]*flex[^"]*items-center[^"]*justify-between/
  );
  assert.match(
    paneSource,
    /<h2 className="[^"]*min-w-0[^"]*break-words[^"]*text-sm[^"]*font-semibold/
  );
  assert.match(
    windowSource,
    /<main className="[^"]*min-w-0[^"]*min-h-0[^"]*flex-1[^"]*overflow-hidden[^"]*lg:grid-cols-2"/
  );
  assert.match(
    windowSource,
    /className="[^"]*min-w-0[^"]*min-h-0[^"]*flex-1[^"]*overflow-auto[^"]*p-4"/
  );
});

test("独立示例预览窗口使用窗口版真实预览而不是帮助页截断预览", () => {
  const previewSource = readRepoFile(
    "src/features/examplePreview/FrontmatterHelpExamplePreview.tsx"
  );
  const windowSource = readRepoFile(
    "src/features/examplePreview/ExamplePreviewWindow.tsx"
  );

  assert.match(
    windowSource,
    /<FrontmatterHelpExamplePreview[\s\S]*example=\{currentExample\}[\s\S]*variant="window"[\s\S]*\/>/
  );
  assert.match(
    previewSource,
    /variant\?: "help" \| "window"/
  );
  assert.match(
    previewSource,
    /const frameClassName =[\s\S]*variant === "window" \? "min-w-0 min-h-full" : HELP_FRAME_CLASS/
  );
  assert.match(previewSource, /const HELP_FRAME_CLASS = "min-w-0 min-h-0"/);
  assert.match(
    previewSource,
    /const HELP_GRAPH_FRAME_CLASS = "min-w-0 min-h-\[420px\]"/
  );
  assert.doesNotMatch(
    previewSource,
    /max-h-\[520px\] overflow-auto/
  );
  assert.doesNotMatch(
    previewSource,
    /h-\[680px\] overflow-hidden/
  );
});

test("独立示例预览窗口工具条按浏览、操作、窗口分组，避免窄宽度下整排平铺", () => {
  const toolbarSource = readRepoFile(
    "src/features/examplePreview/ExamplePreviewToolbar.tsx"
  );

  assert.match(toolbarSource, /浏览示例/);
  assert.match(toolbarSource, /查看操作/);
  assert.match(toolbarSource, /窗口控制/);
  assert.match(toolbarSource, /sm:grid-cols-2/);
  assert.match(toolbarSource, /xl:grid-cols-\[minmax\(0,1\.6fr\)_minmax\(0,1fr\)_auto\]/);
  assert.doesNotMatch(
    toolbarSource,
    /<div className="flex flex-wrap items-center gap-2">/
  );
});

test("独立示例预览窗口工具条里的长标题选择器不会把分组撑坏", () => {
  const toolbarSource = readRepoFile(
    "src/features/examplePreview/ExamplePreviewToolbar.tsx"
  );

  assert.match(
    toolbarSource,
    /<div className="[^"]*min-w-0[^"]*grid[^"]*gap-3[^"]*sm:grid-cols-2/
  );
  assert.match(
    toolbarSource,
    /className=\{`[^`"]*min-w-0[^`"]*rounded-xl[^`"]*border/
  );
  assert.match(
    toolbarSource,
    /<p className="[^"]*break-words[^"]*text-\[11px\][^"]*uppercase/
  );
  assert.match(
    toolbarSource,
    /min-w-\[11rem\][^"]*max-w-full[^"]*rounded-md border[^"]*sm:flex-1/
  );
  assert.match(
    toolbarSource,
    /<span className="[^"]*break-words[^"]*text-xs[^"]*text-\[var\(--color-text-muted\)\]"/
  );
});

test("独立示例预览窗口错误态会对长报错和长示例标题换行，避免弹层被顶坏", () => {
  const boundarySource = readRepoFile(
    "src/features/examplePreview/ExamplePreviewBoundary.tsx"
  );

  assert.match(
    boundarySource,
    /className="[^"]*min-w-0[^"]*break-words[^"]*rounded-lg[^"]*text-sm/
  );
  assert.match(
    boundarySource,
    /<p className="[^"]*break-words[^"]*text-\[var\(--color-text-muted\)\]">/
  );
  assert.match(
    boundarySource,
    /className="[^"]*min-w-0[^"]*w-full[^"]*max-w-xl[^"]*rounded-2xl/
  );
  assert.match(
    boundarySource,
    /<p className="[^"]*break-words[^"]*text-sm[^"]*text-\[var\(--color-text-muted\)\]">\{reason\}<\/p>/
  );
  assert.match(
    boundarySource,
    /<ul className="[^"]*break-words[^"]*text-sm[^"]*text-\[var\(--color-text\)\]"/
  );
});

test("独立示例预览窗口的渲染结果会切到 pane 布局，避免站点页 max-width 和 TOC 占掉右半边", () => {
  const previewSource = readRepoFile(
    "src/features/examplePreview/FrontmatterHelpExamplePreview.tsx"
  );
  const noteSource = readRepoFile(
    "src/components/preview/previews/NotePreview.tsx"
  );
  const docSource = readRepoFile(
    "src/components/preview/previews/DocPreview.tsx"
  );
  const projectSource = readRepoFile(
    "src/components/preview/previews/ProjectPreview.tsx"
  );
  const roadmapSource = readRepoFile(
    "src/components/preview/previews/RoadmapPreview.tsx"
  );
  const graphSource = readRepoFile(
    "src/components/preview/previews/GraphPreview.tsx"
  );
  const diarySource = readRepoFile(
    "src/components/preview/previews/DiaryPreview.tsx"
  );
  const diaryDayViewSource = readRepoFile(
    "src/components/preview/previews/diary/DiaryDayView.tsx"
  );

  assert.match(previewSource, /const layout: PreviewLayout = "pane"/);
  assert.match(noteSource, /layout\?: PreviewLayout/);
  assert.match(noteSource, /const showToc = hasTocCandidates && layout === 'page'/);
  assert.match(noteSource, /layout === 'pane' \? 'min-w-0 py-6' : 'max-w-6xl mx-auto px-6 py-12'/);
  assert.match(noteSource, /layout === 'pane'[\s\S]*'flex min-w-0 flex-col gap-8'/);
  assert.match(docSource, /layout\?: PreviewLayout/);
  assert.match(docSource, /const showToc = hasVisibleTocHeadings\(content\) && layout === 'page'/);
  assert.match(docSource, /layout === 'pane' \? 'min-w-0 py-6' : 'max-w-6xl mx-auto px-6 py-12'/);
  assert.match(docSource, /layout === 'pane'[\s\S]*'flex min-w-0 flex-col gap-8'/);
  assert.match(projectSource, /layout\?: PreviewLayout/);
  assert.match(projectSource, /layout === 'pane' \? 'min-w-0 py-6' : 'max-w-4xl mx-auto px-6 py-12'/);
  assert.match(roadmapSource, /layout\?: PreviewLayout/);
  assert.match(roadmapSource, /layout === 'pane' \? 'min-w-0 py-6' : 'max-w-4xl mx-auto px-6 py-12'/);
  assert.match(graphSource, /layout\?: PreviewLayout/);
  assert.match(graphSource, /layout === 'pane' \? 'min-w-0 py-6' : 'max-w-6xl mx-auto px-6 py-12'/);
  assert.match(diarySource, /layout\?: PreviewLayout/);
  assert.match(diaryDayViewSource, /layout = 'page'/);
  assert.match(diaryDayViewSource, /layout === 'pane'/);
});

test("帮助页内联示例同样使用 pane 布局，避免窄卡片内复用站点整页布局导致标题竖排和右侧留白", () => {
  const previewSource = readRepoFile(
    "src/features/examplePreview/FrontmatterHelpExamplePreview.tsx"
  );
  const sectionSource = readRepoFile(
    "src/components/layout/toolbar/help/FrontmatterHelpExampleSection.tsx"
  );

  assert.match(
    sectionSource,
    /preview=\{<FrontmatterHelpExamplePreview example=\{example\} \/>\}/
  );
  assert.match(previewSource, /variant\?: "help" \| "window"/);
  assert.match(previewSource, /const layout: PreviewLayout = "pane"/);
  assert.doesNotMatch(
    previewSource,
    /const layout = variant === "window" \? "pane" : "page"/
  );
});
