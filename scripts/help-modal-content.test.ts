import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");
const helpRoot = path.join(
  repoRoot,
  "src/components/layout/toolbar/help"
);

function readFile(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function readDirectoryText(directoryPath: string): string {
  const chunks: string[] = [];

  for (const entry of fs.readdirSync(directoryPath, { withFileTypes: true })) {
    const fullPath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      chunks.push(readDirectoryText(fullPath));
      continue;
    }

    if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      chunks.push(fs.readFileSync(fullPath, "utf8"));
    }
  }

  return chunks.join("\n");
}

function readHelpSources(): string {
  return [
    readFile("src/components/layout/toolbar/HelpModal.tsx"),
    readDirectoryText(helpRoot),
  ].join("\n");
}

test("帮助页补齐正文 Markdown 常见写法与真实场景示例", () => {
  const source = readHelpSources();

  assert.match(source, /站内链接与外链/);
  assert.match(source, /脚注完整示例/);
  assert.match(source, /Mermaid 常见图种/);
  assert.match(source, /多段 Alert 与列表混排/);
  assert.match(source, /目录只收录 H2-H4/);
  assert.match(source, /重复标题会自动追加 `-1`、`-2`/);
  assert.match(source, /代码块里的伪标题不会进入目录/);
});

test("帮助页补齐 roadmap 与 graph 的契约边界和错误写法", () => {
  const source = readHelpSources();
  const structuredSource = readFile(
    "src/components/layout/toolbar/help/helpModalStructuredTabs.tsx"
  );

  assert.match(source, /前缀兼容写法/);
  assert.match(source, /错误缩进与优先级/);
  assert.match(source, /完成:\s*2026-04-06/);
  assert.match(source, /完成:\s*只在已完成任务的合法缩进行里生效/);
  assert.match(source, /第一个有效 graph 代码块/);
  assert.match(source, /错误 JSON 与错误结构/);
  assert.match(
    source,
    /data\.color[\s\S]*default \/ red \/ orange \/ yellow \/ green \/ blue \/ purple \/ pink/
  );
  assert.match(source, /data\.edgeColor[\s\S]*default \/ p0-p9/);
  assert.match(
    source,
    /data\.content[\s\S]*节点详情 HTML[\s\S]*locked[\s\S]*锁定标记/
  );
  assert.match(
    source,
    /createdAt[\s\S]*updatedAt[\s\S]*毫秒时间戳/
  );
  assert.match(structuredSource, /<div className="min-w-0 min-h-0">/);
  assert.match(structuredSource, /<div className="min-w-0 min-h-\[420px\]">/);
  assert.match(
    structuredSource,
    /className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-2"/
  );
});

test("帮助页的说明段落、FAQ 和注意事项列表对长路径与长命令提供换行保护", () => {
  const frontmatterSource = readFile(
    "src/components/layout/toolbar/help/FrontmatterHelpTab.tsx"
  );
  const basicSource = readFile(
    "src/components/layout/toolbar/help/helpModalBasicMarkdownTabs.tsx"
  );
  const advancedSource = readFile(
    "src/components/layout/toolbar/help/helpModalAdvancedMarkdownTabs.tsx"
  );
  const structuredSource = readFile(
    "src/components/layout/toolbar/help/helpModalStructuredTabs.tsx"
  );

  assert.match(frontmatterSource, /<p className="[^"]*break-words[^"]*text-sm[^"]*leading-relaxed/);
  assert.match(frontmatterSource, /<ul className="[^"]*break-words[^"]*list-disc[^"]*text-sm/);
  assert.match(basicSource, /<ul className="[^"]*break-words[^"]*text-sm[^"]*list-disc/);
  assert.match(advancedSource, /<ul className="[^"]*break-words[^"]*text-sm[^"]*list-disc/);
  assert.match(advancedSource, /<p className="[^"]*break-words[^"]*text-sm[^"]*leading-relaxed/);
  assert.match(structuredSource, /<ul className="[^"]*break-words[^"]*text-sm[^"]*list-disc/);
});

test("帮助页搜索和侧栏摘要能直接暴露 frontmatter 下的文档类型，而不是只剩抽象入口名", () => {
  const tabsSource = readFile(
    "src/components/layout/toolbar/help/helpModalTabs.tsx"
  );
  const sidebarSource = readFile(
    "src/components/layout/toolbar/help/helpModalSidebar.tsx"
  );

  assert.match(tabsSource, /const FRONTMATTER_RELATED_TOPICS = \[/);
  assert.match(tabsSource, /学习笔记/);
  assert.match(tabsSource, /考研日志/);
  assert.match(tabsSource, /项目卡片/);
  assert.match(tabsSource, /Roadmap 规划/);
  assert.match(tabsSource, /知识图谱/);
  assert.match(tabsSource, /普通文档/);
  assert.match(sidebarSource, /relatedTopics/);
  assert.match(sidebarSource, /slice\(0, 4\)/);
});
