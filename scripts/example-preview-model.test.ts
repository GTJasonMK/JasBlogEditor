import test from "node:test";
import assert from "node:assert/strict";
import {
  buildExamplePreviewUrl,
  getAdjacentExampleId,
  getFrontmatterHelpExampleById,
  getFrontmatterHelpExamplesByType,
  parseRootViewFromSearch,
} from "../src/features/examplePreview/examplePreviewModel";

test("示例窗口路由可从 URL search 正确解析", () => {
  assert.deepEqual(parseRootViewFromSearch(""), {
    kind: "editor",
  });

  assert.deepEqual(
    parseRootViewFromSearch("?view=example-preview&exampleId=frontmatter-note"),
    {
      kind: "example-preview",
      exampleId: "frontmatter-note",
    }
  );

  assert.deepEqual(
    parseRootViewFromSearch("?view=example-preview"),
    {
      kind: "example-preview",
      exampleId: null,
    }
  );
});

test("示例窗口 URL 构造会清理旧参数并写入 example-preview 视图", () => {
  const nextUrl = buildExamplePreviewUrl(
    "http://localhost:1422/?foo=bar#hash",
    "frontmatter-roadmap"
  );

  assert.equal(
    nextUrl,
    "http://localhost:1422/?view=example-preview&exampleId=frontmatter-roadmap"
  );
});

test("示例数据选择支持按 id、类型和前后导航读取", () => {
  assert.equal(
    getFrontmatterHelpExampleById("frontmatter-graph")?.type,
    "graph"
  );
  assert.equal(getFrontmatterHelpExampleById("missing-id"), null);

  assert.deepEqual(
    getFrontmatterHelpExamplesByType("roadmap").map((example) => example.id),
    ["frontmatter-roadmap"]
  );

  assert.equal(
    getAdjacentExampleId("frontmatter-note", 1),
    "frontmatter-diary"
  );
  assert.equal(
    getAdjacentExampleId("frontmatter-note", -1),
    "frontmatter-doc"
  );
});
