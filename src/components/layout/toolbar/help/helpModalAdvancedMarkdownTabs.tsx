import type { HelpTabContentDefinition } from "./helpModalSchema";
import {
  MarkdownPreview,
  Section,
  SideBySideExample,
} from "./helpBlocks";

const mathExample = [
  "行内公式：$E = mc^2$",
  "",
  "块级公式：",
  "",
  "$$",
  "\\int_0^1 x^2 \\, dx = \\frac{1}{3}",
  "$$",
].join("\n");

const mathAdvancedExample = [
  "二次方程求根公式：",
  "",
  "$$",
  "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}",
  "$$",
  "",
  "矩阵示例：",
  "",
  "$$",
  "\\begin{bmatrix}",
  "a & b \\\\",
  "c & d",
  "\\end{bmatrix}",
  "$$",
].join("\n");

const mermaidExample = [
  "```mermaid",
  "flowchart TD",
  "  A[开始] --> B{条件?}",
  "  B -- 是 --> C[执行]",
  "  B -- 否 --> D[跳过]",
  "  C --> E[结束]",
  "  D --> E",
  "```",
].join("\n");

const mermaidSequenceExample = [
  "```mermaid",
  "sequenceDiagram",
  "  participant U as 用户",
  "  participant E as Editor",
  "  participant R as Renderer",
  "  U->>E: 编辑 Markdown",
  "  E->>R: 实时更新内容",
  "  R-->>U: 返回渲染结果",
  "```",
].join("\n");

const mermaidDiagramTypes = [
  "```mermaid",
  "classDiagram",
  "  class HelpModal",
  "  class FrontmatterHelpTab",
  "  HelpModal --> FrontmatterHelpTab",
  "```",
  "",
  "```mermaid",
  "stateDiagram-v2",
  "  [*] --> 编辑中",
  "  编辑中 --> 预览中: 打开预览",
  "  预览中 --> 编辑中: 返回编辑",
  "```",
].join("\n");

const alertExample = [
  "> [!NOTE]",
  "> 这是 Note 提示",
  "",
  "> [!TIP]",
  "> 这是 Tip 提示",
  "",
  "> [!WARNING]",
  "> 这是 Warning 提示",
].join("\n");

const alertAdvancedExample = [
  "> [!WARNING]",
  "> 保存前请先检查 YAML。",
  ">",
  "> - 建议先执行一次 `Ctrl+S`",
  "> - 再检查 frontmatter 是否完整",
  "> - 确认 roadmap 优先级写在行尾",
  "",
  "> [!IMPORTANT]",
  "> Alert 标记必须写在引用块第一行。",
].join("\n");

export const HELP_MODAL_ADVANCED_MARKDOWN_TABS: HelpTabContentDefinition[] = [
  {
    id: "math",
    label: "数学公式",
    keywords: ["katex", "公式", "latex", "数学"],
    sectionLinks: [
      { id: "math-support", title: "支持范围" },
      { id: "math-basic-example", title: "公式示例" },
      { id: "math-advanced-example", title: "进阶公式示例" },
      { id: "math-faq", title: "常见问题" },
    ],
    content: (
      <>
        <Section id="math-support" title="支持范围">
          <ul className="break-words text-sm text-[var(--color-text)] list-disc pl-5 space-y-1">
            <li>行内公式：<code className="font-mono">$...$</code></li>
            <li>块级公式：<code className="font-mono">$$...$$</code></li>
          </ul>
        </Section>
        <SideBySideExample id="math-basic-example" title="公式示例" code={mathExample} preview={<MarkdownPreview content={mathExample} />} />
        <SideBySideExample id="math-advanced-example" title="进阶公式示例" description="覆盖常见的求根公式与矩阵排版。" code={mathAdvancedExample} preview={<MarkdownPreview content={mathAdvancedExample} />} />
        <Section id="math-faq" title="常见问题">
          <ul className="break-words text-sm text-[var(--color-text)] list-disc pl-5 space-y-1">
            <li>块级公式最好使用独立行的 <code className="font-mono">$$</code> 包裹，避免和正文挤在一起。</li>
            <li>公式语法错误会原样显示或渲染失败，建议先用小公式验证再扩展。</li>
          </ul>
        </Section>
      </>
    ),
  },
  {
    id: "mermaid",
    label: "Mermaid 图表",
    keywords: ["mermaid", "流程图", "时序图", "classDiagram", "stateDiagram"],
    sectionLinks: [
      { id: "mermaid-support", title: "支持范围" },
      { id: "mermaid-basic-example", title: "Mermaid 示例" },
      { id: "mermaid-sequence-example", title: "时序图示例" },
      { id: "mermaid-common-types", title: "Mermaid 常见图种" },
      { id: "mermaid-faq", title: "常见问题" },
    ],
    content: (
      <>
        <Section id="mermaid-support" title="支持范围">
          <ul className="break-words text-sm text-[var(--color-text)] list-disc pl-5 space-y-1">
            <li>必须使用 <code className="font-mono">```mermaid</code> 围栏代码块</li>
            <li>渲染结果会跟随浅色/深色主题切换</li>
          </ul>
        </Section>
        <SideBySideExample id="mermaid-basic-example" title="Mermaid 示例" code={mermaidExample} preview={<MarkdownPreview content={mermaidExample} />} />
        <SideBySideExample id="mermaid-sequence-example" title="时序图示例" description="除了流程图，也适合表示编辑器和渲染器之间的交互顺序。" code={mermaidSequenceExample} preview={<MarkdownPreview content={mermaidSequenceExample} />} />
        <SideBySideExample id="mermaid-common-types" title="Mermaid 常见图种" description="`classDiagram` 和 `stateDiagram-v2` 都是当前帮助页和编辑器常见用法。" code={mermaidDiagramTypes} preview={<MarkdownPreview content={mermaidDiagramTypes} />} />
        <Section id="mermaid-faq" title="常见问题">
          <ul className="break-words text-sm text-[var(--color-text)] list-disc pl-5 space-y-1">
            <li>只有 <code className="font-mono">```mermaid</code> 才会触发图表渲染，普通代码块只会显示源码。</li>
            <li>Mermaid 语法错误会显式显示 <code className="font-mono">Diagram Error</code>，不会静默吞掉。</li>
          </ul>
        </Section>
      </>
    ),
  },
  {
    id: "alert",
    label: "提示块 Alert",
    keywords: ["alert", "提示块", "note", "warning", "tip"],
    sectionLinks: [
      { id: "alert-support", title: "支持范围" },
      { id: "alert-basic-example", title: "Alert 示例" },
      { id: "alert-advanced-example", title: "多段 Alert 与列表混排" },
      { id: "alert-rules", title: "书写规范" },
    ],
    content: (
      <>
        <Section id="alert-support" title="支持范围">
          <p className="break-words text-sm text-[var(--color-text)] leading-relaxed">
            支持 GitHub 风格提示块语法：
            <code className="font-mono ml-1">&gt; [!NOTE|TIP|IMPORTANT|WARNING|CAUTION]</code>
          </p>
        </Section>
        <SideBySideExample id="alert-basic-example" title="Alert 示例" code={alertExample} preview={<MarkdownPreview content={alertExample} />} />
        <SideBySideExample id="alert-advanced-example" title="多段 Alert 与列表混排" description="同一个 Alert 里可以继续写空行、列表和行内代码，只要每行都保留 `>` 前缀。" code={alertAdvancedExample} preview={<MarkdownPreview content={alertAdvancedExample} />} />
        <Section id="alert-rules" title="书写规范">
          <ul className="break-words text-sm text-[var(--color-text)] list-disc pl-5 space-y-1">
            <li>Alert 标记必须写在引用块首行：<code className="font-mono">&gt; [!TYPE]</code>。</li>
            <li>同一 Alert 内的每一行都要保留 <code className="font-mono">&gt;</code>，包括空行。</li>
            <li>支持类型：<code className="font-mono">NOTE / TIP / IMPORTANT / WARNING / CAUTION</code>。</li>
          </ul>
        </Section>
      </>
    ),
  },
];
