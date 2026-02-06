import { useEffect, useMemo, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { MarkdownRenderer } from '@/components/preview';
import { RoadmapPreview } from '@/components/preview/previews/RoadmapPreview';
import { GraphPreview } from '@/components/preview/previews/GraphPreview';
import { NotePreview } from '@/components/preview/previews/NotePreview';
import { ProjectPreview } from '@/components/preview/previews/ProjectPreview';
import { DocPreview } from '@/components/preview/previews/DocPreview';
import { parseMarkdownContent } from '@/services/contentParser';
import type {
  ContentType,
  DocMetadata,
  GraphMetadata,
  NoteMetadata,
  ProjectMetadata,
  RoadmapMetadata,
} from '@/types';

interface HelpModalProps {
  open: boolean;
  onClose: () => void;
}

type HelpTabId =
  | 'markdown'
  | 'gfm'
  | 'code'
  | 'math'
  | 'mermaid'
  | 'alert'
  | 'roadmap'
  | 'graph'
  | 'frontmatter';

interface HelpTab {
  id: HelpTabId;
  label: string;
  keywords: string[];
  render: () => ReactElement;
}

function Section({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="mb-8 scroll-mt-4">
      <h3 className="text-base font-semibold text-[var(--color-text)] mb-3">{title}</h3>
      {children}
    </section>
  );
}

function CodeCard({ title, code }: { title: string; code: string }) {
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg overflow-hidden">
      <div className="px-3 py-2 text-xs text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
        {title}
      </div>
      <pre className="p-3 text-xs overflow-auto leading-relaxed">
        <code className="font-mono whitespace-pre">{code}</code>
      </pre>
    </div>
  );
}

function PreviewCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bg-[var(--color-paper)] border border-[var(--color-border)] rounded-lg overflow-hidden">
      <div className="px-3 py-2 text-xs text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
        {title}
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  );
}

function SideBySideExample({
  title,
  description,
  codeTitle = '语法示例',
  previewTitle = '渲染效果',
  id,
  code,
  preview,
}: {
  title: string;
  description?: string;
  codeTitle?: string;
  previewTitle?: string;
  id?: string;
  code: string;
  preview: ReactNode;
}) {
  return (
    <div id={id} className="mb-6 scroll-mt-4">
      <div className="mb-2">
        <h4 className="text-sm font-medium text-[var(--color-text)]">{title}</h4>
        {description && <p className="text-xs text-[var(--color-text-muted)] mt-1">{description}</p>}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <CodeCard title={codeTitle} code={code} />
        <PreviewCard title={previewTitle}>{preview}</PreviewCard>
      </div>
    </div>
  );
}

function MarkdownPreview({ content }: { content: string }) {
  return (
    <article className="prose-chinese">
      <MarkdownRenderer content={content} />
    </article>
  );
}

function DataUriImage(): string {
  // 纯内联 SVG，避免依赖网络
  return 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20width%3D%27480%27%20height%3D%27240%27%3E%3Crect%20width%3D%27100%25%27%20height%3D%27100%25%27%20fill%3D%27%23fdf5e8%27%2F%3E%3Ctext%20x%3D%2750%25%27%20y%3D%2750%25%27%20font-size%3D%2724%27%20text-anchor%3D%27middle%27%20fill%3D%27%23333%27%20dy%3D%27.3em%27%3EJasBlogEditor%3C%2Ftext%3E%3C%2Fsvg%3E';
}

const tabSectionMap: Record<HelpTabId, { id: string; title: string }[]> = {
  markdown: [
    { id: 'markdown-support', title: '支持范围' },
    { id: 'markdown-comprehensive-example', title: '综合示例' },
    { id: 'markdown-quick-reference', title: '语法速查表' },
    { id: 'markdown-faq', title: '常见问题' },
  ],
  gfm: [
    { id: 'gfm-support', title: '支持范围' },
    { id: 'gfm-example', title: 'GFM 示例' },
    { id: 'gfm-tips', title: '使用建议' },
  ],
  code: [
    { id: 'code-support', title: '支持范围' },
    { id: 'code-basic-example', title: '代码块示例' },
    { id: 'code-advanced-example', title: '高级代码块示例' },
    { id: 'code-notes', title: '注意事项' },
  ],
  math: [
    { id: 'math-support', title: '支持范围' },
    { id: 'math-basic-example', title: '公式示例' },
    { id: 'math-advanced-example', title: '进阶公式示例' },
    { id: 'math-faq', title: '常见问题' },
  ],
  mermaid: [
    { id: 'mermaid-support', title: '支持范围' },
    { id: 'mermaid-basic-example', title: 'Mermaid 示例' },
    { id: 'mermaid-sequence-example', title: '时序图示例' },
    { id: 'mermaid-faq', title: '常见问题' },
  ],
  alert: [
    { id: 'alert-support', title: '支持范围' },
    { id: 'alert-basic-example', title: 'Alert 示例' },
    { id: 'alert-advanced-example', title: '多行与列表 Alert' },
    { id: 'alert-rules', title: '书写规范' },
  ],
  roadmap: [
    { id: 'roadmap-support', title: '渲染规则' },
    { id: 'roadmap-example', title: '任务语法示例' },
    { id: 'roadmap-fallback', title: '解析细节与回退行为' },
  ],
  graph: [
    { id: 'graph-support', title: '渲染规则' },
    { id: 'graph-example', title: 'graph 代码块示例' },
    { id: 'graph-schema', title: 'JSON 字段速查' },
    { id: 'graph-faq', title: '常见问题' },
  ],
  frontmatter: [
    { id: 'frontmatter-support', title: '说明' },
    { id: 'frontmatter-fields', title: '字段矩阵速查' },
    { id: 'frontmatter-note', title: 'note 示例' },
    { id: 'frontmatter-project', title: 'project 示例' },
    { id: 'frontmatter-roadmap', title: 'roadmap 示例' },
    { id: 'frontmatter-graph', title: 'graph 示例' },
    { id: 'frontmatter-doc', title: 'doc 示例' },
    { id: 'frontmatter-faq', title: '解析注意事项' },
  ],
};

export function HelpModal({ open, onClose }: HelpModalProps) {
  const [tab, setTab] = useState<HelpTabId>('markdown');
  const [searchKeyword, setSearchKeyword] = useState('');
  const contentRef = useRef<HTMLDivElement>(null);

  // ESC 关闭
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  // 打开时默认回到第一个 tab，避免上次停留在“重资源”的图谱/roadmap 造成卡顿
  useEffect(() => {
    if (open) {
      setTab('markdown');
      setSearchKeyword('');
    }
  }, [open]);

  const tabs: HelpTab[] = useMemo(() => {
    const image = DataUriImage();

    const basicMarkdown = [
      '# 标题（H1-H4 会自动生成锚点）',
      '',
      '这是 **加粗**、*斜体* 与 `行内代码`。',
      '',
      '- 无序列表',
      '  - 二级列表',
      '1. 有序列表',
      '2. 第二项',
      '',
      '> 普通引用块（没有 [!NOTE] 的情况下）',
      '',
      '[外部链接](https://example.com) 与 [相对链接](/docs/intro)',
      '',
      `![示例图片（点击可放大）](${image})`,
      '',
      '---',
      '',
      '提示：标题右侧会出现 `#` 锚点，点击可平滑滚动并更新 URL hash。',
    ].join('\n');

    const gfmExample = [
      '| 功能 | 语法 | 说明 |',
      '| --- | --- | --- |',
      '| 表格 | `| a | b |` | 支持横向滚动 |',
      '| 任务列表 | `- [ ]` | 支持 |',
      '| 删除线 | `~~text~~` | 支持 |',
      '',
      '- [ ] Todo',
      '- [x] Done',
      '',
      '自动链接：https://example.com',
      '',
      '脚注示例[^1]',
      '',
      '[^1]: 这是脚注内容。',
    ].join('\n');

    const codeBlocksExample = [
      '```ts',
      'type User = { id: string; name: string };',
      '',
      'export function hello(user: User) {',
      '  console.log(`Hello, ${user.name}`);',
      '}',
      '```',
      '',
      '```bash',
      'npm run dev:app',
      '```',
    ].join('\n');

    const mathExample = [
      '行内公式：$E = mc^2$',
      '',
      '块级公式：',
      '',
      '$$',
      '\\int_0^1 x^2 \\, dx = \\frac{1}{3}',
      '$$',
    ].join('\n');

    const mermaidExample = [
      '```mermaid',
      'flowchart TD',
      '  A[开始] --> B{条件?}',
      '  B -- 是 --> C[执行]',
      '  B -- 否 --> D[跳过]',
      '  C --> E[结束]',
      '  D --> E',
      '```',
    ].join('\n');

    const alertExample = [
      '> [!NOTE]',
      '> 这是 Note 提示',
      '',
      '> [!TIP]',
      '> 这是 Tip 提示',
      '',
      '> [!IMPORTANT]',
      '> 重要信息',
      '',
      '> [!WARNING]',
      '> 警告信息',
      '',
      '> [!CAUTION]',
      '> 注意事项',
    ].join('\n');

    const markdownQuickRef = [
      '| 语法 | 示例 | 备注 |',
      '| --- | --- | --- |',
      '| 标题 | `# 标题` | H1~H4 会生成锚点 |',
      '| 强调 | `**加粗**` / `*斜体*` | 支持组合嵌套 |',
      '| 行内代码 | `` `code` `` | 不会触发高亮插件 |',
      '| 链接 | `[文本](https://example.com)` | 外链自动新窗口打开 |',
      '| 图片 | `![说明](url)` | alt 文本会作为图注显示 |',
      '| 引用 | `> 引用` | 可配合 Alert 扩展语法 |',
      '| 分隔线 | `---` | 常用于章节分隔 |',
      '',
      '提示：原生 HTML 标签默认不会当作 HTML 渲染。',
    ].join('\n');

    const codeAdvancedExample = [
      '```json',
      '{',
      '  "name": "JasBlogEditor",',
      '  "scripts": {',
      '    "dev": "npm run dev:app"',
      '  }',
      '}',
      '```',
      '',
      '```',
      '无语言标签代码块（仍会按代码块样式显示）',
      '```',
    ].join('\n');

    const mathAdvancedExample = [
      '二次方程求根公式：',
      '',
      '$$',
      'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}',
      '$$',
      '',
      '矩阵示例：',
      '',
      '$$',
      '\\begin{bmatrix}',
      'a & b \\\\',
      'c & d',
      '\\end{bmatrix}',
      '$$',
    ].join('\n');

    const mermaidSequenceExample = [
      '```mermaid',
      'sequenceDiagram',
      '  participant U as 用户',
      '  participant E as Editor',
      '  participant R as Renderer',
      '  U->>E: 编辑 Markdown',
      '  E->>R: 实时更新内容',
      '  R-->>U: 返回渲染结果',
      '```',
    ].join('\n');

    const alertAdvancedExample = [
      '> [!WARNING]',
      '> 请先保存再批量重命名。',
      '>',
      '> - 建议先执行一次 `Ctrl+S`',
      '> - 再执行批量操作',
      '',
      '> [!IMPORTANT]',
      '> Alert 标记必须出现在引用块第一行。',
    ].join('\n');

    const frontmatterFieldTable = [
      '| 类型 | 必填字段 | 可选字段 | 默认/回退行为 |',
      '| --- | --- | --- | --- |',
      '| note | `title` | `date/excerpt/tags` | `date` 默认为当天 |',
      '| project | `title/description/github` | `demo/date/tags/techStack/status` | `status` 非法值回退 `active` |',
      '| roadmap | `title/description` | `date/status` | `status` 非法值回退 `active` |',
      '| graph | `name` | `description/date` | 若无 `name` 会尝试读取 `title` |',
      '| doc | 无强制 | `title/date` | 无 frontmatter 也可渲染正文 |',
      '',
      '序列化时会跳过 `undefined/null/空数组`，避免写入冗余字段。',
    ].join('\n');

    const graphSchemaExample = [
      '{',
      '  "nodes": [',
      '    {',
      '      "id": "node-1",',
      '      "position": { "x": 120, "y": 80 },',
      '      "data": {',
      '        "label": "核心概念",',
      '        "color": "blue",',
      '        "edgeColor": "p1",',
      '        "tags": ["基础"]',
      '      }',
      '    }',
      '  ],',
      '  "edges": [',
      '    {',
      '      "id": "edge-1",',
      '      "source": "node-1",',
      '      "target": "node-2",',
      '      "label": "依赖"',
      '    }',
      '  ]',
      '}',
    ].join('\n');

    const roadmapBodyExample = [
      '这里是规划说明（非任务内容，会按 Markdown 渲染）。',
      '',
      '- [-] 搭建编辑器骨架 `high`',
      '  支持打开/保存',
      '  截止: 2026-06-01',
      '',
      '- [ ] 增加帮助文档面板 `medium`',
      '  需要分 Tab 展示',
      '',
      '- [x] 修复端口冲突 `low`',
      '  完成: 2026-02-05',
    ].join('\n');

    const graphBodyExample = [
      '```graph',
      '{',
      '  "nodes": [',
      '    {',
      '      "id": "n1",',
      '      "position": { "x": 0, "y": 0 },',
      '      "data": { "label": "A", "color": "blue", "edgeColor": "p2", "tags": ["demo"] }',
      '    },',
      '    {',
      '      "id": "n2",',
      '      "position": { "x": 260, "y": 140 },',
      '      "data": { "label": "B", "color": "green" }',
      '    }',
      '  ],',
      '  "edges": [',
      '    { "id": "e1", "source": "n1", "target": "n2", "label": "相关" }',
      '  ]',
      '}',
      '```',
      '',
      '这里是图谱说明：',
      '',
      '- 节点颜色：`default/red/orange/yellow/green/blue/purple/pink`',
      '- 连线颜色：由“源节点”的 `data.edgeColor` 控制（`default` 或 `p0~p9`）',
    ].join('\n');

    function parseForPreview(type: ContentType, raw: string) {
      const parsed = parseMarkdownContent(raw, type);
      return parsed;
    }

    const noteRaw = [
      '---',
      'title: 前端渲染能力一览',
      'date: 2026-02-05',
      'excerpt: 这是摘要（可选）',
      'tags: [markdown, preview]',
      '---',
      '',
      '这里是正文内容，支持 **Markdown 渲染**。',
      '',
      '> [!TIP]',
      '> 你可以在帮助面板里查看完整语法。',
    ].join('\n');

    const projectRaw = [
      '---',
      'title: JasBlogEditor',
      'description: 一个基于 Tauri 2 + React 19 的桌面编辑器',
      'github: https://github.com/your/repo',
      'demo: https://example.com',
      'tags: [tauri, react]',
      'status: active',
      'techStack:',
      '  - name: React',
      '    icon: React',
      '  - name: TypeScript',
      '    icon: TS',
      '  - name: Tauri',
      '    icon: Tauri',
      '---',
      '',
      '## 项目介绍',
      '',
      '- 支持 Markdown + 预览',
      '- 支持 Mermaid / KaTeX',
    ].join('\n');

    const roadmapRaw = [
      '---',
      'title: 我的规划示例',
      'description: 任务项会被解析为卡片并按状态分组',
      'status: active',
      '---',
      '',
      roadmapBodyExample,
    ].join('\n');

    const graphRaw = [
      '---',
      'name: 示例图谱',
      'description: graph 代码块会被解析为交互式图谱',
      'date: 2026-02-05',
      '---',
      '',
      graphBodyExample,
    ].join('\n');

    const docRaw = [
      '---',
      'title: 普通文档',
      'date: 2026-02-05',
      '---',
      '',
      '# 文档标题（正文里的标题）',
      '',
      '普通文档类型同样支持 Mermaid / KaTeX / GFM 等语法。',
    ].join('\n');

    const noteParsed = parseForPreview('note', noteRaw);
    const projectParsed = parseForPreview('project', projectRaw);
    const roadmapParsed = parseForPreview('roadmap', roadmapRaw);
    const graphParsed = parseForPreview('graph', graphRaw);
    const docParsed = parseForPreview('doc', docRaw);

    return [
      {
        id: 'markdown',
        label: '基础 Markdown',
        keywords: ['markdown', 'md', '标题', '列表', '链接', '图片'],
        render: () => (
          <div>
            <Section id="markdown-support" title="支持范围">
              <ul className="text-sm text-[var(--color-text)] list-disc pl-5 space-y-1">
                <li>标题（H1-H4 自动生成锚点，支持平滑滚动）</li>
                <li>加粗 / 斜体 / 行内代码</li>
                <li>有序 / 无序列表</li>
                <li>引用块、分隔线</li>
                <li>链接（外链自动使用新窗口打开）</li>
                <li>图片（点击放大，alt 作为图注）</li>
              </ul>
            </Section>

            <SideBySideExample
              id="markdown-comprehensive-example"
              title="综合示例"
              description="该预览使用应用内同一套渲染器，效果与右侧预览区域一致。"
              code={basicMarkdown}
              preview={<MarkdownPreview content={basicMarkdown} />}
            />

            <SideBySideExample
              id="markdown-quick-reference"
              title="语法速查表"
              description="按当前渲染器的真实行为整理，适合作为日常写作对照。"
              code={markdownQuickRef}
              preview={<MarkdownPreview content={markdownQuickRef} />}
            />

            <Section id="markdown-faq" title="常见问题">
              <ul className="text-sm text-[var(--color-text)] list-disc pl-5 space-y-1">
                <li><code className="font-mono">#~####</code> 会生成锚点，<code className="font-mono">#####/######</code> 不生成锚点。</li>
                <li>链接若包含 <code className="font-mono">http://</code> 或 <code className="font-mono">https://</code>，会自动在新窗口打开。</li>
                <li>图片预览支持点击放大，建议始终补全 alt 文本，便于无障碍阅读。</li>
                <li>原生 HTML 标签会按文本处理，如需复杂布局建议改用 Markdown 原生语法。</li>
              </ul>
            </Section>
          </div>
        ),
      },
      {
        id: 'gfm',
        label: 'GFM 扩展',
        keywords: ['gfm', '表格', '脚注', '任务列表', '删除线'],
        render: () => (
          <div>
            <Section id="gfm-support" title="支持范围（remark-gfm）">
              <ul className="text-sm text-[var(--color-text)] list-disc pl-5 space-y-1">
                <li>表格（自动包裹横向滚动容器）</li>
                <li>任务列表（- [ ] / - [x]）</li>
                <li>删除线（~~text~~）</li>
                <li>自动链接（直接写 URL）</li>
                <li>脚注（[^1]）</li>
              </ul>
            </Section>

            <SideBySideExample
              title="GFM 示例"
              id="gfm-example"
              code={gfmExample}
              preview={<MarkdownPreview content={gfmExample} />}
            />

            <Section id="gfm-tips" title="使用建议">
              <ul className="text-sm text-[var(--color-text)] list-disc pl-5 space-y-1">
                <li>表格列较多时会自动横向滚动，建议列头简短，避免移动端换行过多。</li>
                <li>任务列表只负责渲染勾选状态，不会自动写回 roadmap 任务数据结构。</li>
                <li>脚注编号按正文出现顺序生成，建议同一文档避免重复定义同名脚注。</li>
              </ul>
            </Section>
          </div>
        ),
      },
      {
        id: 'code',
        label: '代码块',
        keywords: ['代码块', 'syntax highlight', 'rehype-highlight', '复制'],
        render: () => (
          <div>
            <Section id="code-support" title="支持范围">
              <ul className="text-sm text-[var(--color-text)] list-disc pl-5 space-y-1">
                <li>围栏代码块（```lang）</li>
                <li>语法高亮（rehype-highlight）</li>
                <li>语言标签 + 复制按钮（鼠标悬停显示）</li>
              </ul>
            </Section>

            <SideBySideExample
              title="代码块示例"
              code={codeBlocksExample}
              id="code-basic-example"
              preview={<MarkdownPreview content={codeBlocksExample} />}
            />

            <SideBySideExample
              title="高级代码块示例"
              description="包含 JSON 与无语言标签代码块，便于验证高亮与复制按钮表现。"
              id="code-advanced-example"
              code={codeAdvancedExample}
              preview={<MarkdownPreview content={codeAdvancedExample} />}
            />

            <Section id="code-notes" title="注意事项">
              <ul className="text-sm text-[var(--color-text)] list-disc pl-5 space-y-1">
                <li>代码块复制按钮在鼠标悬停时出现，点击会复制当前块完整内容。</li>
                <li>未声明语言标签时，仍会按代码块样式渲染，但不会触发特定语言高亮。</li>
                <li>行内代码与代码块分属不同渲染路径，行内代码不会展示复制按钮。</li>
              </ul>
            </Section>
          </div>
        ),
      },
      {
        id: 'math',
        label: '数学公式',
        keywords: ['katex', '公式', 'latex', '数学'],
        render: () => (
          <div>
            <Section id="math-support" title="支持范围（KaTeX）">
              <ul className="text-sm text-[var(--color-text)] list-disc pl-5 space-y-1">
                <li>行内公式：<code className="font-mono">$...$</code></li>
                <li>块级公式：<code className="font-mono">$$...$$</code></li>
              </ul>
            </Section>

            <SideBySideExample
              title="公式示例"
              code={mathExample}
              preview={<MarkdownPreview content={mathExample} />}
              id="math-basic-example"
            />

            <SideBySideExample
              title="进阶公式示例"
              description="涵盖常见的求根公式与矩阵排版，便于验证 KaTeX 复杂表达式。"
              code={mathAdvancedExample}
              id="math-advanced-example"
              preview={<MarkdownPreview content={mathAdvancedExample} />}
            />

            <Section id="math-faq" title="常见问题">
              <ul className="text-sm text-[var(--color-text)] list-disc pl-5 space-y-1">
                <li>块级公式必须使用独立行的 <code className="font-mono">$$</code> 包裹，避免与正文混排。</li>
                <li>KaTeX 语法错误会导致公式原样显示，建议先在简单公式中验证后再扩展。</li>
                <li>公式中的反斜杠需保持完整，例如 <code className="font-mono">\frac</code>、<code className="font-mono">\sqrt</code>。</li>
              </ul>
            </Section>
          </div>
        ),
      },
      {
        id: 'mermaid',
        label: 'Mermaid 图表',
        keywords: ['mermaid', '流程图', '时序图', 'diagram'],
        render: () => (
          <div>
            <Section id="mermaid-support" title="支持范围">
              <ul className="text-sm text-[var(--color-text)] list-disc pl-5 space-y-1">
                <li>围栏代码块：<code className="font-mono">```mermaid</code></li>
                <li>自动渲染为 SVG（主题会跟随浅色/深色切换）</li>
              </ul>
            </Section>

            <SideBySideExample
              title="Mermaid 示例"
              code={mermaidExample}
              preview={<MarkdownPreview content={mermaidExample} />}
            />
              id="mermaid-basic-example"

            <SideBySideExample
              title="时序图示例"
              description="除流程图外，也支持 sequenceDiagram、classDiagram 等 Mermaid 语法。"
              code={mermaidSequenceExample}
              preview={<MarkdownPreview content={mermaidSequenceExample} />}
              id="mermaid-sequence-example"
            />

            <Section id="mermaid-faq" title="常见问题">
              <ul className="text-sm text-[var(--color-text)] list-disc pl-5 space-y-1">
                <li>Mermaid 必须使用 <code className="font-mono">```mermaid</code> 围栏代码块，普通代码块不会渲染图表。</li>
                <li>图表语法错误时会退回代码块展示，便于定位具体出错行。</li>
                <li>主题切换时会重新渲染图表，建议避免在超大图表中频繁切换主题。</li>
              </ul>
            </Section>
          </div>
        ),
      },
      {
        id: 'alert',
        label: '提示块 Alert',
        keywords: ['alert', '提示块', 'note', 'warning', 'tip'],
        render: () => (
          <div>
            <Section id="alert-support" title="支持范围">
              <p className="text-sm text-[var(--color-text)] leading-relaxed">
                支持 GitHub 风格提示块语法（需写在引用块内）：
                <code className="font-mono ml-1">&gt; [!NOTE|TIP|IMPORTANT|WARNING|CAUTION]</code>
              </p>
            </Section>

            <SideBySideExample
              title="Alert 示例"
              code={alertExample}
              preview={<MarkdownPreview content={alertExample} />}
            />

              id="alert-basic-example"
            <SideBySideExample
              title="多行与列表 Alert"
              description="支持在 Alert 内部继续使用空行、列表与行内代码。"
              code={alertAdvancedExample}
              preview={<MarkdownPreview content={alertAdvancedExample} />}
            />
              id="alert-advanced-example"

            <Section id="alert-rules" title="书写规范">
              <ul className="text-sm text-[var(--color-text)] list-disc pl-5 space-y-1">
                <li>Alert 标记必须写在引用块首行：<code className="font-mono">&gt; [!TYPE]</code>。</li>
                <li>同一 Alert 内每一行都需保持 <code className="font-mono">&gt;</code> 前缀，空行也不例外。</li>
                <li>支持类型：<code className="font-mono">NOTE / TIP / IMPORTANT / WARNING / CAUTION</code>。</li>
              </ul>
            </Section>
          </div>
        ),
      },
      {
        id: 'roadmap',
        label: 'Roadmap 任务',
        keywords: ['roadmap', '任务', '规划', '截止', '完成', 'priority'],
        render: () => (
          <div>
            <Section id="roadmap-support" title="渲染规则（仅 roadmap 类型预览生效）">
              <ul className="text-sm text-[var(--color-text)] list-disc pl-5 space-y-1">
                <li>任务行：<code className="font-mono">- [ ]</code>（todo） / <code className="font-mono">- [-]</code>（in progress） / <code className="font-mono">- [x]</code>（done）</li>
                <li>优先级（可选）：行末 <code className="font-mono">`high|medium|low`</code></li>
                <li>描述与字段：缩进（2 个空格或 Tab）行会被视为任务详情</li>
                <li>字段行：<code className="font-mono">截止: ...</code>、<code className="font-mono">完成: ...</code></li>
                <li>不符合任务格式的内容会保留为正文 Markdown 渲染</li>
              </ul>
            </Section>

            <SideBySideExample
              title="任务语法示例"
              id="roadmap-example"
              code={roadmapBodyExample}
              preview={
                <div className="max-h-[520px] overflow-auto">
                  <RoadmapPreview
                    metadata={{ title: '示例规划', description: '任务项解析示例', status: 'active' } as RoadmapMetadata}
                    content={roadmapBodyExample}
                  />
                </div>
              }
              previewTitle="渲染效果（RoadmapPreview）"
            />

            <Section id="roadmap-fallback" title="解析细节与回退行为">
              <ul className="text-sm text-[var(--color-text)] list-disc pl-5 space-y-1">
                <li>任务优先级不写时默认 <code className="font-mono">medium</code>，仅支持 <code className="font-mono">high/medium/low</code>。</li>
                <li>只有缩进行（2 空格或 Tab）才会归属到当前任务描述；未缩进行会被视为普通正文。</li>
                <li><code className="font-mono">截止:</code>、<code className="font-mono">完成:</code> 只在任务缩进内生效，其他位置会按普通文本渲染。</li>
                <li>无法匹配任务格式的内容不会丢失，会保留到正文区域继续 Markdown 渲染。</li>
              </ul>
            </Section>
          </div>
        ),
      },
      {
        id: 'graph',
        label: 'Graph 图谱',
        keywords: ['graph', '图谱', 'nodes', 'edges', 'json'],
        render: () => (
          <div>
            <Section id="graph-support" title="渲染规则（仅 graph 类型预览生效）">
              <ul className="text-sm text-[var(--color-text)] list-disc pl-5 space-y-1">
                <li>使用 <code className="font-mono">```graph</code> 代码块写 JSON（nodes/edges）</li>
                <li>graph 代码块会被解析为交互式图谱，其他正文仍按 Markdown 渲染</li>
                <li>节点颜色：<code className="font-mono">default/red/orange/yellow/green/blue/purple/pink</code></li>
                <li>连线颜色：由源节点 <code className="font-mono">data.edgeColor</code> 控制（<code className="font-mono">default</code> 或 <code className="font-mono">p0~p9</code>）</li>
              </ul>
            </Section>

            <SideBySideExample
              title="graph 代码块示例"
              id="graph-example"
              code={graphBodyExample}
              preview={
                <div className="h-[680px] overflow-hidden">
                  <GraphPreview
                    metadata={{ name: '示例图谱', description: 'graph 代码块解析示例', date: '2026-02-05' } as GraphMetadata}
                    content={graphBodyExample}
                  />
                </div>
              }
              previewTitle="渲染效果（GraphPreview）"
            />

            <Section id="graph-schema" title="JSON 字段速查">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <CodeCard title="graph JSON 示例" code={graphSchemaExample} />
                <PreviewCard title="字段说明">
                  <ul className="text-sm text-[var(--color-text)] list-disc pl-5 space-y-1">
                    <li><code className="font-mono">nodes[].id</code> 与 <code className="font-mono">edges[].id</code> 建议全局唯一。</li>
                    <li><code className="font-mono">position</code> 使用画布坐标，单位为像素。</li>
                    <li><code className="font-mono">data.label</code> 为节点显示文本，<code className="font-mono">data.tags</code> 用于标签展示。</li>
                    <li>连线颜色由源节点 <code className="font-mono">data.edgeColor</code> 控制，而非 edge 自身字段。</li>
                  </ul>
                </PreviewCard>
              </div>
            </Section>

            <Section id="graph-faq" title="常见问题">
              <ul className="text-sm text-[var(--color-text)] list-disc pl-5 space-y-1">
                <li>正文中仅提取第一个 <code className="font-mono">```graph</code> 代码块，其余 graph 代码块会按普通正文保留。</li>
                <li>graph 代码块 JSON 解析失败时会回退为空图（0 nodes / 0 edges），正文内容仍保留。</li>
                <li>graph 区域外的正文仍使用 Markdown 渲染，可用于补充说明与引用资料。</li>
              </ul>
            </Section>
          </div>
        ),
      },
      {
        id: 'frontmatter',
        label: 'Frontmatter 元数据',
        keywords: ['frontmatter', 'yaml', '元数据', 'metadata'],
        render: () => (
          <div>
            <Section id="frontmatter-support" title="说明">
              <p className="text-sm text-[var(--color-text)] leading-relaxed">
                支持 YAML frontmatter（文件开头的 <code className="font-mono">---</code> 区块）。
                应用会将 frontmatter 解析为“元数据”，并在不同内容类型的预览页以不同方式展示；正文部分再进行 Markdown 渲染。
              </p>
            </Section>

            <SideBySideExample
              title="字段矩阵速查"
              id="frontmatter-fields"
              description="按内容类型汇总必填/可选字段与默认回退行为。"
              code={frontmatterFieldTable}
              preview={<MarkdownPreview content={frontmatterFieldTable} />}
              previewTitle="字段说明（表格渲染）"
            />

            <SideBySideExample
              title="note（笔记）"
              description="字段：title/date/excerpt/tags"
              code={noteRaw}
              preview={
                <div className="max-h-[520px] overflow-auto">
                  <NotePreview metadata={noteParsed.metadata as NoteMetadata} content={noteParsed.content} />
                </div>
              }
              id="frontmatter-note"
              previewTitle="渲染效果（NotePreview）"
            />

            <SideBySideExample
              title="project（项目）"
              description="字段：title/description/github/demo/tags/techStack/status"
              code={projectRaw}
              preview={
                <div className="max-h-[520px] overflow-auto">
                  <ProjectPreview metadata={projectParsed.metadata as ProjectMetadata} content={projectParsed.content} />
                </div>
              }
              id="frontmatter-project"
              previewTitle="渲染效果（ProjectPreview）"
            />

            <SideBySideExample
              title="roadmap（规划）"
              description="字段：title/description/status；正文任务会被解析为卡片"
              code={roadmapRaw}
              preview={
                <div className="max-h-[520px] overflow-auto">
                  <RoadmapPreview metadata={roadmapParsed.metadata as RoadmapMetadata} content={roadmapParsed.content} />
                </div>
              }
              id="frontmatter-roadmap"
              previewTitle="渲染效果（RoadmapPreview）"
            />

            <SideBySideExample
              title="graph（图谱）"
              description="字段：name/description/date；正文 graph 代码块会渲染为图谱"
              code={graphRaw}
              preview={
                <div className="h-[680px] overflow-hidden">
                  <GraphPreview metadata={graphParsed.metadata as GraphMetadata} content={graphParsed.content} />
                </div>
              }
              id="frontmatter-graph"
              previewTitle="渲染效果（GraphPreview）"
            />

            <SideBySideExample
              title="doc（普通文档）"
              description="字段：title/date（可选）"
              code={docRaw}
              preview={
                <div className="max-h-[520px] overflow-auto">
                  <DocPreview metadata={docParsed.metadata as DocMetadata} content={docParsed.content} />
                </div>
              }
              id="frontmatter-doc"
              previewTitle="渲染效果（DocPreview）"
            />

            <Section id="frontmatter-faq" title="Frontmatter 解析注意事项">
              <ul className="text-sm text-[var(--color-text)] list-disc pl-5 space-y-1">
                <li>无 frontmatter 时会自动生成类型默认元数据，不影响正文编辑与预览。</li>
                <li>YAML 语法错误时会回退到默认元数据，但正文会继续保留并正常渲染。</li>
                <li><code className="font-mono">project.status</code> 仅支持 <code className="font-mono">active/archived/wip</code>，非法值回退 <code className="font-mono">active</code>。</li>
                <li><code className="font-mono">roadmap.status</code> 仅支持 <code className="font-mono">active/completed/paused</code>，非法值回退 <code className="font-mono">active</code>。</li>
                <li><code className="font-mono">graph</code> 类型优先读取 <code className="font-mono">name</code>，缺失时会回退读取 <code className="font-mono">title</code>。</li>
              </ul>
            </Section>
          </div>
        ),
      },
    ];
  }, []);

  const keyword = searchKeyword.trim().toLowerCase();

  const filteredTabs = useMemo(() => {
    if (!keyword) return tabs;
    return tabs.filter((item) => [item.label, ...item.keywords].join(' ').toLowerCase().includes(keyword));
  }, [tabs, keyword]);

  useEffect(() => {
    if (filteredTabs.length === 0) return;
    const hasCurrent = filteredTabs.some((item) => item.id === tab);
    if (!hasCurrent) {
      setTab(filteredTabs[0].id);
    }
  }, [filteredTabs, tab]);

  useEffect(() => {
    if (!open) return;
    contentRef.current?.scrollTo({ top: 0, behavior: 'auto' });
  }, [open, tab]);

  const active = filteredTabs.find((t) => t.id === tab) ?? filteredTabs[0] ?? null;
  const sectionLinks = active ? tabSectionMap[active.id] ?? [] : [];

  const scrollToSection = (sectionId: string) => {
    const target = contentRef.current?.querySelector<HTMLElement>(`#${sectionId}`);
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40">
      {/* 遮罩 */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* 面板 */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-5xl h-[85vh] bg-[var(--color-paper)] border border-[var(--color-border)] rounded-xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="h-12 px-4 border-b border-[var(--color-border)] flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-[var(--color-text)]">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 14h.01M16 10h.01M9 16h6M12 3a9 9 0 100 18 9 9 0 000-18z" />
              </svg>
              渲染帮助
            </div>
            <div className="flex-1" />
            <button
              onClick={onClose}
              className="px-2 py-1 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] rounded-md transition-colors"
              title="关闭 (Esc)"
              aria-label="关闭帮助面板"
            >
              关闭
            </button>
          </div>

          {/* Tabs */}
          <div className="px-3 py-2 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <label className="relative flex-1">
                  <span className="sr-only">搜索语法分类</span>
                  <input
                    type="text"
                    value={searchKeyword}
                    onChange={(event) => setSearchKeyword(event.target.value)}
                    placeholder="搜索分类或关键字（如：mermaid、frontmatter、公式）"
                    className="w-full h-9 rounded-md border border-[var(--color-border)] bg-[var(--color-paper)] px-3 pr-16 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
                  />
                  {searchKeyword && (
                    <button
                      onClick={() => setSearchKeyword('')}
                      className="absolute right-1 top-1/2 -translate-y-1/2 px-2 py-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] rounded"
                      type="button"
                    >
                      清空
                    </button>
                  )}
                </label>
                <span className="text-xs text-[var(--color-text-muted)]">
                  分类 {filteredTabs.length} / {tabs.length}
                </span>
              </div>

              {filteredTabs.length === 0 ? (
                <div className="text-sm text-[var(--color-text-muted)] py-2">
                  未找到匹配分类，请尝试其他关键字。
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {filteredTabs.map((t) => {
                    const isActive = t.id === tab;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`px-3 py-1.5 text-sm rounded-md transition-colors border ${
                          isActive
                            ? 'bg-[var(--color-paper)] text-[var(--color-text)] border-[var(--color-border)]'
                            : 'bg-transparent text-[var(--color-text-muted)] border-transparent hover:bg-[var(--color-paper)] hover:border-[var(--color-border)] hover:text-[var(--color-text)]'
                        }`}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="h-[calc(85vh-8.75rem)] grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_230px]">
            <div ref={contentRef} className="overflow-y-auto p-4">
              {active ? (
                active.render()
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-[var(--color-text-muted)]">
                  当前筛选没有可展示的帮助内容。
                </div>
              )}
            </div>

            <aside className="hidden lg:flex lg:flex-col border-l border-[var(--color-border)] bg-[var(--color-surface)]">
              <div className="px-3 py-2 text-xs font-medium text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
                当前目录
              </div>
              <div className="p-2 overflow-y-auto space-y-1">
                {sectionLinks.length === 0 ? (
                  <div className="px-2 py-1 text-xs text-[var(--color-text-muted)]">
                    无可跳转章节
                  </div>
                ) : (
                  sectionLinks.map((section) => (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => scrollToSection(section.id)}
                      className="w-full text-left px-2 py-1.5 text-xs rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-paper)] transition-colors"
                    >
                      {section.title}
                    </button>
                  ))
                )}
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
