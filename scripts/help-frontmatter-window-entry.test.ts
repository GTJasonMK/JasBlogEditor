import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

test("frontmatter 帮助页提供独立示例窗口入口", () => {
  const source = readRepoFile(
    "src/components/layout/toolbar/help/FrontmatterHelpTab.tsx"
  );
  const sectionSource = readRepoFile(
    "src/components/layout/toolbar/help/FrontmatterHelpExampleSection.tsx"
  );

  assert.match(source, /FrontmatterHelpExampleSection/);
  assert.match(sectionSource, /在新窗口中查看/);
  assert.match(source, /openExamplePreviewWindow/);
});

test("帮助页的双栏示例卡片为长内容提供收缩边界，避免预览与代码区互相挤压", () => {
  const blocksSource = readRepoFile(
    "src/components/layout/toolbar/help/helpBlocks.tsx"
  );

  assert.match(
    blocksSource,
    /className="min-w-0 flex flex-col rounded-lg border border-\[var\(--color-border\)\]/
  );
  assert.match(
    blocksSource,
    /className="min-w-0 flex flex-col overflow-hidden rounded-lg border border-\[var\(--color-border\)\]/
  );
  assert.match(
    blocksSource,
    /className="grid grid-cols-1[^"]*gap-3[^"]*lg:grid-cols-\[minmax\(0,0\.94fr\)_minmax\(0,1\.06fr\)\]"/
  );
});
