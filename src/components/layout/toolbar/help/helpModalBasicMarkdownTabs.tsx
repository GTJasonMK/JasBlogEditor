import type { HelpTabContentDefinition } from "./helpModalSchema";
import {
  MarkdownPreview,
  Section,
  SideBySideExample,
} from "./helpBlocks";

function createInlineImage(): string {
  return "data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20width%3D%27480%27%20height%3D%27240%27%3E%3Crect%20width%3D%27100%25%27%20height%3D%27100%25%27%20fill%3D%27%23fdf5e8%27%2F%3E%3Ctext%20x%3D%2750%25%27%20y%3D%2750%25%27%20font-size%3D%2724%27%20text-anchor%3D%27middle%27%20fill%3D%27%23333%27%20dy%3D%27.3em%27%3EJasBlogEditor%3C%2Ftext%3E%3C%2Fsvg%3E";
}

const image = createInlineImage();

const markdownExample = [
  "# 标题（H1-H4 会生成锚点）",
  "",
  "这是 **加粗**、*斜体* 与 `行内代码`。",
  "",
  "- 无序列表",
  "  - 二级列表",
  "1. 有序列表",
  "2. 第二项",
  "",
  "> 普通引用块",
  "",
  `![示例图片（点击可放大）](${image})`,
  "",
  "---",
].join("\n");

const linkExample = [
  "站内链接：[状态同步笔记](/notes/react-state-sync)",
  "",
  "外部链接：[React 官网](https://react.dev)",
  "",
  "同一篇文档里最好同时保留链接文字和语义，不要只贴裸 URL。",
].join("\n");

const markdownQuickRef = [
  "| 语法 | 示例 | 备注 |",
  "| --- | --- | --- |",
  "| 标题 | `# 标题` | 仅 H1-H4 会生成锚点 |",
  "| 强调 | `**加粗**` / `*斜体*` | 支持组合嵌套 |",
  "| 行内代码 | `` `code` `` | 不显示复制按钮 |",
  "| 链接 | `[文本](https://example.com)` | 外链自动新窗口打开 |",
  "| 图片 | `![说明](url)` | alt 文本会作为图注显示 |",
  "| 引用 | `> 引用` | 可配合 Alert 扩展语法 |",
].join("\n");

const gfmExample = [
  "| 功能 | 语法 | 说明 |",
  "| --- | --- | --- |",
  "| 表格 | `| a | b |` | 自动包裹横向滚动容器 |",
  "| 任务列表 | `- [ ]` | 仅做 GFM 渲染，不等于 roadmap 任务 |",
  "| 删除线 | `~~text~~` | 支持 |",
  "",
  "- [ ] Todo",
  "- [x] Done",
  "",
  "自动链接：https://example.com",
].join("\n");

const footnoteExample = [
  "结论先写在正文里，补充材料放到脚注。[^reason]",
  "",
  "[^reason]: 这是脚注内容，可以放引用来源、旁注或额外说明。",
].join("\n");

const codeExample = [
  "```ts",
  "type User = { id: string; name: string };",
  "",
  "export function hello(user: User) {",
  "  console.log(`Hello, ${user.name}`);",
  "}",
  "```",
  "",
  "```bash",
  "npm run dev:app",
  "```",
].join("\n");

const codeAdvancedExample = [
  "```json",
  "{",
  '  "name": "JasBlogEditor",',
  '  "scripts": {',
  '    "dev": "npm run dev:app"',
  "  }",
  "}",
  "```",
  "",
  "```",
  "无语言标签代码块（仍会按代码块样式显示）",
  "```",
].join("\n");

export const HELP_MODAL_BASIC_MARKDOWN_TABS: HelpTabContentDefinition[] = [
  {
    id: "markdown",
    label: "基础 Markdown",
    keywords: ["markdown", "md", "标题", "列表", "链接", "图片"],
    sectionLinks: [
      { id: "markdown-support", title: "支持范围" },
      { id: "markdown-comprehensive-example", title: "综合示例" },
      { id: "markdown-links-example", title: "站内链接与外链" },
      { id: "markdown-quick-reference", title: "语法速查表" },
      { id: "markdown-faq", title: "常见问题" },
    ],
    content: (
      <>
        <Section id="markdown-support" title="支持范围">
          <ul className="break-words text-sm text-[var(--color-text)] list-disc pl-5 space-y-1">
            <li>标题、列表、引用、分隔线、加粗、斜体、行内代码</li>
            <li>链接与图片，图片支持放大查看，alt 文本会作为图注</li>
            <li>标题锚点覆盖 H1-H4；右侧目录只收录 H2-H4</li>
          </ul>
        </Section>
        <SideBySideExample id="markdown-comprehensive-example" title="综合示例" description="该预览直接复用编辑器当前 Markdown 渲染器。" code={markdownExample} preview={<MarkdownPreview content={markdownExample} />} />
        <SideBySideExample id="markdown-links-example" title="站内链接与外链" description="站内链接更适合引用站点内容，外链用于跳转到仓库、文档或资料页。" code={linkExample} preview={<MarkdownPreview content={linkExample} />} />
        <SideBySideExample id="markdown-quick-reference" title="语法速查表" description="按当前渲染器的真实行为整理，适合作为日常写作对照。" code={markdownQuickRef} preview={<MarkdownPreview content={markdownQuickRef} />} previewTitle="表格渲染" />
        <Section id="markdown-faq" title="常见问题">
          <ul className="break-words text-sm text-[var(--color-text)] list-disc pl-5 space-y-1">
            <li>只有 H1-H4 会生成锚点；目录只收录 H2-H4，H5/H6 只渲染标题文本，不参与目录。</li>
            <li>重复标题会自动追加 `-1`、`-2`，避免多个锚点冲突。</li>
            <li>代码块里的伪标题不会进入目录，例如 fenced code block 内的 `## 示例` 只会按代码显示。</li>
            <li>原生 HTML 标签默认不会按 HTML 执行，复杂布局建议改用 Markdown、roadmap 或 graph。</li>
            <li>站内链接适合引用 `/notes`、`/graphs` 等站点内容，外链会自动使用新窗口打开。</li>
          </ul>
        </Section>
      </>
    ),
  },
  {
    id: "gfm",
    label: "GFM 扩展",
    keywords: ["gfm", "表格", "脚注", "任务列表", "删除线"],
    sectionLinks: [
      { id: "gfm-support", title: "支持范围" },
      { id: "gfm-example", title: "GFM 示例" },
      { id: "gfm-footnote-example", title: "脚注完整示例" },
      { id: "gfm-tips", title: "使用建议" },
    ],
    content: (
      <>
        <Section id="gfm-support" title="支持范围">
          <ul className="break-words text-sm text-[var(--color-text)] list-disc pl-5 space-y-1">
            <li>表格、任务列表、删除线、自动链接、脚注</li>
            <li>表格会自动包裹横向滚动容器，适合窄屏浏览</li>
          </ul>
        </Section>
        <SideBySideExample id="gfm-example" title="GFM 示例" code={gfmExample} preview={<MarkdownPreview content={gfmExample} />} />
        <SideBySideExample id="gfm-footnote-example" title="脚注完整示例" description="脚注更适合放旁注、来源或补充说明，不要把正文主信息都塞进去。" code={footnoteExample} preview={<MarkdownPreview content={footnoteExample} />} />
        <Section id="gfm-tips" title="使用建议">
          <ul className="break-words text-sm text-[var(--color-text)] list-disc pl-5 space-y-1">
            <li>GFM 任务列表只负责 Markdown 渲染，不会自动变成 roadmap 任务卡片。</li>
            <li>脚注编号会按正文顺序生成，建议同一文档避免重复定义同名脚注。</li>
          </ul>
        </Section>
      </>
    ),
  },
  {
    id: "code",
    label: "代码块",
    keywords: ["代码块", "syntax highlight", "复制", "code"],
    sectionLinks: [
      { id: "code-support", title: "支持范围" },
      { id: "code-basic-example", title: "代码块示例" },
      { id: "code-advanced-example", title: "高级代码块示例" },
      { id: "code-notes", title: "注意事项" },
    ],
    content: (
      <>
        <Section id="code-support" title="支持范围">
          <ul className="break-words text-sm text-[var(--color-text)] list-disc pl-5 space-y-1">
            <li>围栏代码块（```lang）与语法高亮</li>
            <li>鼠标悬停时显示复制按钮</li>
            <li>无语言标签代码块仍会使用代码块样式渲染</li>
          </ul>
        </Section>
        <SideBySideExample id="code-basic-example" title="代码块示例" code={codeExample} preview={<MarkdownPreview content={codeExample} />} />
        <SideBySideExample id="code-advanced-example" title="高级代码块示例" description="同时覆盖 JSON 和无语言标签代码块，便于判断实际显示效果。" code={codeAdvancedExample} preview={<MarkdownPreview content={codeAdvancedExample} />} />
        <Section id="code-notes" title="注意事项">
          <ul className="break-words text-sm text-[var(--color-text)] list-disc pl-5 space-y-1">
            <li>行内代码和代码块是两条不同渲染路径，只有代码块会显示复制按钮。</li>
            <li>语言标签写错不会阻止渲染，但可能导致高亮效果不理想。</li>
          </ul>
        </Section>
      </>
    ),
  },
];
