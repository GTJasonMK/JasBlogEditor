import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

test("Tailwind 样式入口显式限制扫描范围，避免构建时遍历整个仓库", () => {
  const source = readRepoFile("src/index.css");

  assert.match(source, /@import "tailwindcss" source\(none\);/);
  assert.match(source, /@source "\.\/";/);
});

test("package.json 顶层显式声明关键原生可选依赖，避免 Windows 漏装 Rollup 平台包", () => {
  const packageJson = JSON.parse(readRepoFile("package.json")) as {
    optionalDependencies?: Record<string, string>;
  };

  assert.equal(
    packageJson.optionalDependencies?.["./dummy"] ?? null,
    null
  );
  assert.match(
    packageJson.optionalDependencies?.["@rollup/rollup-win32-x64-msvc"] ?? "",
    /^\d/
  );
  assert.match(
    packageJson.optionalDependencies?.["@rollup/rollup-linux-x64-gnu"] ?? "",
    /^\d/
  );
  assert.match(
    packageJson.optionalDependencies?.["@tailwindcss/oxide-win32-x64-msvc"] ??
      "",
    /^\d/
  );
  assert.match(
    packageJson.optionalDependencies?.["@tailwindcss/oxide-linux-x64-gnu"] ??
      "",
    /^\d/
  );
});

test("package.json 显式声明 Markdown 编辑器所需的 CodeMirror 依赖", () => {
  const packageJson = JSON.parse(readRepoFile("package.json")) as {
    dependencies?: Record<string, string>;
  };

  assert.match(packageJson.dependencies?.["@codemirror/state"] ?? "", /^\^?\d/);
  assert.match(packageJson.dependencies?.["@codemirror/view"] ?? "", /^\^?\d/);
  assert.match(packageJson.dependencies?.["@codemirror/commands"] ?? "", /^\^?\d/);
  assert.match(packageJson.dependencies?.["@codemirror/lang-markdown"] ?? "", /^\^?\d/);
  assert.equal(packageJson.dependencies?.["codemirror"] ?? null, null);
  assert.equal(packageJson.dependencies?.["@codemirror/language"] ?? null, null);
});
