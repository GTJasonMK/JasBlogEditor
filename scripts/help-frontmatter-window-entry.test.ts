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

  assert.match(source, /在新窗口中查看/);
  assert.match(source, /openExamplePreviewWindow/);
});
