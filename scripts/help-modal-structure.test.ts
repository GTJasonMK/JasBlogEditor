import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");
const helpDir = path.join(
  repoRoot,
  "src/components/layout/toolbar/help"
);
const MAX_HELP_MODAL_FILE_LINES = 300;

function countLines(filePath: string): number {
  const content = fs.readFileSync(filePath, "utf8");
  return content.split("\n").length;
}

test("帮助页 helpModal 数据文件保持可维护大小", () => {
  const filePaths = [
    path.join(repoRoot, "src/components/layout/toolbar/HelpModal.tsx"),
    ...fs
      .readdirSync(helpDir)
      .filter((name) => /^helpModal.*\.(ts|tsx)$/.test(name))
      .sort()
      .map((fileName) => path.join(helpDir, fileName)),
  ];

  assert.ok(filePaths.length > 0);

  for (const filePath of filePaths) {
    const lineCount = countLines(filePath);

    assert.equal(
      lineCount <= MAX_HELP_MODAL_FILE_LINES,
      true,
      `${path.basename(filePath)} 超过 ${MAX_HELP_MODAL_FILE_LINES} 行，当前 ${lineCount} 行`
    );
  }
});

test("帮助弹窗使用 flex 剩余高度和分组侧栏布局，而不是顶部 tabs 挤压正文", () => {
  const modalSource = fs.readFileSync(
    path.join(repoRoot, "src/components/layout/toolbar/HelpModal.tsx"),
    "utf8"
  );
  const activePanelSource = fs.readFileSync(
    path.join(repoRoot, "src/components/layout/toolbar/help/helpModalActivePanel.tsx"),
    "utf8"
  );

  assert.match(
    modalSource,
    /className="w-full max-w-5xl h-\[85vh\] max-h-\[85vh\] min-h-0 flex flex-col/
  );
  assert.match(
    modalSource,
    /className="min-h-0 flex flex-1 flex-col lg:grid lg:grid-cols-\[300px_minmax\(0,1fr\)\]"/
  );
  assert.match(
    activePanelSource,
    /className="min-w-0 min-h-0 flex flex-1 flex-col overflow-hidden"/
  );
  assert.doesNotMatch(modalSource, /h-\[calc\(85vh-11rem\)\]/);
  assert.doesNotMatch(modalSource, /lg:grid-cols-\[minmax\(0,1fr\)_230px\]/);
});

test("帮助弹窗主内容列与侧栏导航项为长文案提供收缩边界和换行能力", () => {
  const sidebarSource = fs.readFileSync(
    path.join(repoRoot, "src/components/layout/toolbar/help/helpModalSidebar.tsx"),
    "utf8"
  );
  const activePanelSource = fs.readFileSync(
    path.join(repoRoot, "src/components/layout/toolbar/help/helpModalActivePanel.tsx"),
    "utf8"
  );

  assert.match(
    activePanelSource,
    /ref=\{contentRef\} className="[^"]*min-w-0[^"]*min-h-0[^"]*flex-1[^"]*overflow-y-auto/
  );
  assert.match(
    sidebarSource,
    /className=\{`w-full min-w-0 rounded-xl border[^`"]*text-left/
  );
  assert.match(sidebarSource, /tab\.summary/);
});

test("帮助弹窗改为按类别分组的侧栏导航，并在正文顶部提供当前分类概览与章节快跳", () => {
  const modalSource = fs.readFileSync(
    path.join(repoRoot, "src/components/layout/toolbar/HelpModal.tsx"),
    "utf8"
  );
  const sidebarSource = fs.readFileSync(
    path.join(repoRoot, "src/components/layout/toolbar/help/helpModalSidebar.tsx"),
    "utf8"
  );
  const activePanelSource = fs.readFileSync(
    path.join(repoRoot, "src/components/layout/toolbar/help/helpModalActivePanel.tsx"),
    "utf8"
  );
  const schemaSource = fs.readFileSync(
    path.join(repoRoot, "src/components/layout/toolbar/help/helpModalSchema.ts"),
    "utf8"
  );

  assert.match(schemaSource, /export type HelpTabGroupId =/);
  assert.match(schemaSource, /groupId: HelpTabGroupId;/);
  assert.match(schemaSource, /summary: string;/);
  assert.match(schemaSource, /export const HELP_TAB_GROUPS = \[/);
  assert.match(schemaSource, /基础写作/);
  assert.match(schemaSource, /增强表达/);
  assert.match(schemaSource, /结构化内容/);
  assert.match(schemaSource, /元数据契约/);
  assert.match(schemaSource, /export function groupHelpTabs\(/);

  assert.match(modalSource, /groupHelpTabs/);
  assert.match(sidebarSource, /分类导航/);
  assert.match(sidebarSource, /tab\.summary/);
  assert.match(activePanelSource, /HELP_TAB_GROUPS/);
  assert.match(modalSource, /groupHelpTabs/);
  assert.match(
    modalSource,
    /className="min-h-0 flex flex-1 flex-col lg:grid lg:grid-cols-\[300px_minmax\(0,1fr\)\]"/
  );
  assert.match(
    sidebarSource,
    /className="min-w-0 shrink-0 border-b border-\[var\(--color-border\)\][^"]*max-h-\[38vh\][^"]*overflow-y-auto[^"]*lg:border-r/
  );
  assert.match(
    activePanelSource,
    /className="border-b border-\[var\(--color-border\)\] bg-\[var\(--color-paper\)\]"/
  );
  assert.doesNotMatch(modalSource, /function HelpModalTabs/);
  assert.doesNotMatch(modalSource, /function HelpModalSectionNav/);
});
