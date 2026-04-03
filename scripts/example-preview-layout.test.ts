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
    /className="[^"]*flex[^"]*h-full[^"]*min-h-0[^"]*flex-col[^"]*overflow-hidden/
  );
  assert.match(
    paneSource,
    /<div className="[^"]*min-h-0[^"]*flex[^"]*flex-1[^"]*flex-col[^"]*overflow-hidden"/
  );
  assert.match(
    windowSource,
    /<main className="[^"]*min-h-0[^"]*flex-1[^"]*overflow-hidden[^"]*lg:grid-cols-2"/
  );
  assert.match(
    windowSource,
    /className="[^"]*min-h-0[^"]*flex-1[^"]*overflow-auto[^"]*p-4"/
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
    /const frameClassName = variant === "window"/
  );
  assert.match(
    previewSource,
    /max-h-\[520px\] overflow-auto/
  );
});
