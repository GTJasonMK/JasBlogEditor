import { useEffect, useMemo, useState, type ReactElement, type ReactNode } from 'react';
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
  render: () => ReactElement;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-8">
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
  code,
  preview,
}: {
  title: string;
  description?: string;
  codeTitle?: string;
  previewTitle?: string;
  code: string;
  preview: ReactNode;
}) {
  return (
    <div className="mb-6">
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

export function HelpModal({ open, onClose }: HelpModalProps) {
  const [tab, setTab] = useState<HelpTabId>('markdown');

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
    if (open) setTab('markdown');
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
        render: () => (
          <div>
            <Section title="支持范围">
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
              title="综合示例"
              description="该预览使用应用内同一套渲染器，效果与右侧预览区域一致。"
              code={basicMarkdown}
              preview={<MarkdownPreview content={basicMarkdown} />}
            />
          </div>
        ),
      },
      {
        id: 'gfm',
        label: 'GFM 扩展',
        render: () => (
          <div>
            <Section title="支持范围（remark-gfm）">
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
              code={gfmExample}
              preview={<MarkdownPreview content={gfmExample} />}
            />
          </div>
        ),
      },
      {
        id: 'code',
        label: '代码块',
        render: () => (
          <div>
            <Section title="支持范围">
              <ul className="text-sm text-[var(--color-text)] list-disc pl-5 space-y-1">
                <li>围栏代码块（```lang）</li>
                <li>语法高亮（rehype-highlight）</li>
                <li>语言标签 + 复制按钮（鼠标悬停显示）</li>
              </ul>
            </Section>

            <SideBySideExample
              title="代码块示例"
              code={codeBlocksExample}
              preview={<MarkdownPreview content={codeBlocksExample} />}
            />
          </div>
        ),
      },
      {
        id: 'math',
        label: '数学公式',
        render: () => (
          <div>
            <Section title="支持范围（KaTeX）">
              <ul className="text-sm text-[var(--color-text)] list-disc pl-5 space-y-1">
                <li>行内公式：<code className="font-mono">$...$</code></li>
                <li>块级公式：<code className="font-mono">$$...$$</code></li>
              </ul>
            </Section>

            <SideBySideExample
              title="公式示例"
              code={mathExample}
              preview={<MarkdownPreview content={mathExample} />}
            />
          </div>
        ),
      },
      {
        id: 'mermaid',
        label: 'Mermaid 图表',
        render: () => (
          <div>
            <Section title="支持范围">
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
          </div>
        ),
      },
      {
        id: 'alert',
        label: '提示块 Alert',
        render: () => (
          <div>
            <Section title="支持范围">
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
          </div>
        ),
      },
      {
        id: 'roadmap',
        label: 'Roadmap 任务',
        render: () => (
          <div>
            <Section title="渲染规则（仅 roadmap 类型预览生效）">
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
          </div>
        ),
      },
      {
        id: 'graph',
        label: 'Graph 图谱',
        render: () => (
          <div>
            <Section title="渲染规则（仅 graph 类型预览生效）">
              <ul className="text-sm text-[var(--color-text)] list-disc pl-5 space-y-1">
                <li>使用 <code className="font-mono">```graph</code> 代码块写 JSON（nodes/edges）</li>
                <li>graph 代码块会被解析为交互式图谱，其他正文仍按 Markdown 渲染</li>
                <li>节点颜色：<code className="font-mono">default/red/orange/yellow/green/blue/purple/pink</code></li>
                <li>连线颜色：由源节点 <code className="font-mono">data.edgeColor</code> 控制（<code className="font-mono">default</code> 或 <code className="font-mono">p0~p9</code>）</li>
              </ul>
            </Section>

            <SideBySideExample
              title="graph 代码块示例"
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
          </div>
        ),
      },
      {
        id: 'frontmatter',
        label: 'Frontmatter 元数据',
        render: () => (
          <div>
            <Section title="说明">
              <p className="text-sm text-[var(--color-text)] leading-relaxed">
                支持 YAML frontmatter（文件开头的 <code className="font-mono">---</code> 区块）。
                应用会将 frontmatter 解析为“元数据”，并在不同内容类型的预览页以不同方式展示；正文部分再进行 Markdown 渲染。
              </p>
            </Section>

            <SideBySideExample
              title="note（笔记）"
              description="字段：title/date/excerpt/tags"
              code={noteRaw}
              preview={
                <div className="max-h-[520px] overflow-auto">
                  <NotePreview metadata={noteParsed.metadata as NoteMetadata} content={noteParsed.content} />
                </div>
              }
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
              previewTitle="渲染效果（DocPreview）"
            />
          </div>
        ),
      },
    ];
  }, []);

  if (!open) return null;

  const active = tabs.find((t) => t.id === tab) ?? tabs[0];

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
            <div className="flex flex-wrap gap-2">
              {tabs.map((t) => {
                const active = t.id === tab;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`px-3 py-1.5 text-sm rounded-md transition-colors border ${
                      active
                        ? 'bg-[var(--color-paper)] text-[var(--color-text)] border-[var(--color-border)]'
                        : 'bg-transparent text-[var(--color-text-muted)] border-transparent hover:bg-[var(--color-paper)] hover:border-[var(--color-border)] hover:text-[var(--color-text)]'
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <div className="h-[calc(85vh-6rem)] overflow-y-auto p-4">
            {active.render()}
          </div>
        </div>
      </div>
    </div>
  );
}
