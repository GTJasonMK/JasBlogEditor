import { GraphPreview } from "@/components/preview/previews/GraphPreview";
import { RoadmapPreview } from "@/components/preview/previews/RoadmapPreview";
import type { GraphMetadata, RoadmapMetadata } from "@/types";
import type { HelpTabContentDefinition } from "./helpModalSchema";
import {
  CodeCard,
  PreviewCard,
  Section,
  SideBySideExample,
} from "./helpBlocks";

const roadmapMeta = {
  title: "示例规划",
  description: "任务语法解析示例",
  status: "active",
} as RoadmapMetadata;

const graphMeta = {
  name: "示例图谱",
  description: "graph 代码块解析示例",
  date: "2026-04-03",
} as GraphMetadata;

const roadmapExample = [
  "这里是规划说明（非任务内容，会按 Markdown 渲染）。",
  "",
  "## 任务列表",
  "",
  "- [-] 搭建编辑器骨架 `high`",
  "  描述: 支持打开/保存",
  "  详情:",
  "    - 需要同时覆盖桌面与迷你模式",
  "    - 包含端口冲突自动处理",
  "  截止: 2026-06-01",
  "",
  "- [ ] 增加帮助文档面板 `medium`",
  "  描述: 需要分 Tab 展示",
  "",
  "- [x] 修复端口冲突 `low`",
  "  完成: 2026-02-05",
].join("\n");

const roadmapPrefixExample = [
  "* [ ] 使用星号前缀 `medium`",
  "+ [x] 使用加号前缀 `low`",
  "- [-] 使用减号前缀 `high`",
].join("\n");

const roadmapInvalidExample = [
  "- [ ] `high` 写错位置",
  "\t截止: 2026-06-01",
  " 单空格缩进: 也不会变成任务字段",
].join("\n");

const roadmapCompletedExample = [
  "- [x] 完成帮助文档回归测试 `low`",
  "  完成: 2026-04-06",
].join("\n");

const graphExample = [
  "```graph",
  "{",
  '  "nodes": [',
  '    {',
  '      "id": "n1",',
  '      "position": { "x": 0, "y": 0 },',
  '      "data": { "label": "A", "color": "blue", "edgeColor": "p2", "tags": ["demo"] }',
  "    },",
  '    {',
  '      "id": "n2",',
  '      "position": { "x": 260, "y": 140 },',
  '      "data": { "label": "B", "color": "green" }',
  "    }",
  "  ],",
  '  "edges": [',
  '    { "id": "e1", "source": "n1", "target": "n2", "label": "相关" }',
  "  ]",
  "}",
  "```",
  "",
  "## 阅读提示",
  "",
  "- 蓝色节点表示元数据层",
  "- 绿色节点表示正文渲染层",
].join("\n");

const graphFirstValidExample = [
  "```graph",
  '{ "nodes": [], "edges": [] }',
  "```",
  "",
  "```graph",
  '{ "nodes": [{ "id": "n1" }], "oops": [] }',
  "```",
].join("\n");

const graphInvalidExample = [
  "```graph",
  '{ "nodes": [{ "id": "n1" }], "oops": [] }',
  "```",
  "",
  "```graph",
  "{ bad json }",
  "```",
].join("\n");

const graphSchemaExample = [
  "{",
  '  "nodes": [',
  '    {',
  '      "id": "node-1",',
  '      "position": { "x": 120, "y": 80 },',
  '      "data": {',
  '        "label": "核心概念",',
  '        "color": "blue",',
  '        "edgeColor": "p1",',
  '        "tags": ["基础"],',
  '        "content": "<p>节点详情 HTML</p>",',
  '        "locked": true,',
  '        "createdAt": 1712188800000,',
  '        "updatedAt": 1712275200000',
  "      }",
  "    }",
  "  ],",
  '  "edges": [',
  '    {',
  '      "id": "edge-1",',
  '      "source": "node-1",',
  '      "target": "node-2",',
  '      "label": "依赖"',
  "    }",
  "  ]",
  "}",
].join("\n");

function renderRoadmapPreview(content: string) {
  return (
    <div className="min-w-0 min-h-0">
      <RoadmapPreview
        fileName="roadmap-help.md"
        metadata={roadmapMeta}
        content={content}
        embedded
      />
    </div>
  );
}

function renderGraphPreview(content: string) {
  return (
    <div className="min-w-0 min-h-[420px]">
      <GraphPreview
        fileName="graph-help.md"
        metadata={graphMeta}
        content={content}
        embedded
      />
    </div>
  );
}

export const HELP_MODAL_STRUCTURED_TABS: HelpTabContentDefinition[] = [
  {
    id: "roadmap",
    label: "Roadmap 任务",
    keywords: ["roadmap", "任务", "规划", "截止", "优先级", "缩进"],
    sectionLinks: [
      { id: "roadmap-support", title: "渲染规则" },
      { id: "roadmap-example", title: "任务语法示例" },
      { id: "roadmap-prefix-example", title: "前缀兼容写法" },
      { id: "roadmap-invalid-example", title: "错误缩进与优先级" },
      { id: "roadmap-completed-example", title: "完成字段示例" },
      { id: "roadmap-fallback", title: "解析细节与回退行为" },
    ],
    content: (
      <>
        <Section id="roadmap-support" title="渲染规则（仅 roadmap 类型预览生效）">
          <ul className="break-words text-sm text-[var(--color-text)] list-disc pl-5 space-y-1">
            <li>任务行支持 <code className="font-mono">- [ ]</code>、<code className="font-mono">- [-]</code>、<code className="font-mono">- [x]</code></li>
            <li>优先级必须写在标题尾部的 <code className="font-mono">`high|medium|low`</code></li>
            <li>任务字段行至少缩进两个空白字符，正文说明可以和任务混写</li>
          </ul>
        </Section>
        <SideBySideExample id="roadmap-example" title="任务语法示例" code={roadmapExample} preview={renderRoadmapPreview(roadmapExample)} previewTitle="渲染效果（RoadmapPreview）" />
        <SideBySideExample id="roadmap-prefix-example" title="前缀兼容写法" description="站点和编辑器都会接受 `-`、`*`、`+` 作为任务前缀，但建议统一成 `-`。" code={roadmapPrefixExample} preview={renderRoadmapPreview(roadmapPrefixExample)} previewTitle="兼容解析结果" />
        <SideBySideExample id="roadmap-invalid-example" title="错误缩进与优先级" description="优先级写错位置、单 Tab 缩进或单空格缩进，都不会按任务字段解析。" code={roadmapInvalidExample} preview={renderRoadmapPreview(roadmapInvalidExample)} previewTitle="错误写法的实际结果" />
        <SideBySideExample id="roadmap-completed-example" title="完成字段示例" description="完成: 只在已完成任务的合法缩进行里生效；如果任务不是 `[x]` 或缩进不合法，它就只会按普通正文处理。" code={roadmapCompletedExample} preview={renderRoadmapPreview(roadmapCompletedExample)} previewTitle="完成信息的实际结果" />
        <Section id="roadmap-fallback" title="解析细节与回退行为">
          <ul className="break-words text-sm text-[var(--color-text)] list-disc pl-5 space-y-1">
            <li>不符合任务格式的内容不会丢失，会保留到正文区继续按 Markdown 渲染。</li>
            <li><code className="font-mono">截止:</code> 可用于进行中或未开始任务，<code className="font-mono">完成:</code> 只在已完成任务的合法缩进行里生效。</li>
            <li>正文出现独立“任务列表”标题时，真正渲染会自动去重，避免正文和任务区重复。</li>
          </ul>
        </Section>
      </>
    ),
  },
  {
    id: "graph",
    label: "Graph 图谱",
    keywords: ["graph", "图谱", "nodes", "edges", "json"],
    sectionLinks: [
      { id: "graph-support", title: "渲染规则" },
      { id: "graph-example", title: "graph 代码块示例" },
      { id: "graph-first-valid-example", title: "第一个有效 graph 代码块" },
      { id: "graph-invalid-example", title: "错误 JSON 与错误结构" },
      { id: "graph-schema", title: "JSON 字段速查" },
      { id: "graph-faq", title: "常见问题" },
    ],
    content: (
      <>
        <Section id="graph-support" title="渲染规则（仅 graph 类型预览生效）">
          <ul className="break-words text-sm text-[var(--color-text)] list-disc pl-5 space-y-1">
            <li>使用 <code className="font-mono">```graph</code> 写 JSON，至少需要 <code className="font-mono">nodes/edges</code></li>
            <li>graph 代码块会渲染成图谱，剩余正文继续按 Markdown 渲染</li>
            <li>图谱错误会显式显示错误说明，而不是静默吞掉</li>
          </ul>
        </Section>
        <SideBySideExample id="graph-example" title="graph 代码块示例" code={graphExample} preview={renderGraphPreview(graphExample)} previewTitle="渲染效果（GraphPreview）" />
        <SideBySideExample id="graph-first-valid-example" title="第一个有效 graph 代码块" description="只有第一个合法的 graph 代码块会进入图谱渲染流程，其余 graph 内容会继续保留在正文里。" code={graphFirstValidExample} preview={renderGraphPreview(graphFirstValidExample)} previewTitle="首个合法块的实际结果" />
        <SideBySideExample id="graph-invalid-example" title="错误 JSON 与错误结构" description="JSON 解析失败或结构缺失时，预览会显式展示错误，并保留原文帮助定位问题。" code={graphInvalidExample} preview={renderGraphPreview(graphInvalidExample)} previewTitle="错误写法的实际结果" />
        <Section id="graph-schema" title="JSON 字段速查">
          <div className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-2">
            <CodeCard title="graph JSON 示例" code={graphSchemaExample} />
            <PreviewCard title="字段说明">
              <ul className="break-words text-sm text-[var(--color-text)] list-disc pl-5 space-y-1">
                <li><code className="font-mono">nodes[].id</code> 和 <code className="font-mono">edges[].id</code> 建议保持全局唯一。</li>
                <li><code className="font-mono">position</code> 使用画布坐标，单位为像素。</li>
                <li><code className="font-mono">data.label</code> 是节点显示文本，<code className="font-mono">data.tags</code> 用于标签展示。</li>
                <li><code className="font-mono">data.color</code> 支持 <code className="font-mono">default / red / orange / yellow / green / blue / purple / pink</code>。</li>
                <li><code className="font-mono">data.edgeColor</code> 支持 <code className="font-mono">default / p0-p9</code>，会影响节点出边颜色和重要程度说明。</li>
                <li><code className="font-mono">data.content</code> 可写节点详情 HTML，<code className="font-mono">locked</code> 可显示锁定标记。</li>
                <li><code className="font-mono">createdAt</code>、<code className="font-mono">updatedAt</code> 使用毫秒时间戳，会显示在节点详情面板里。</li>
              </ul>
            </PreviewCard>
          </div>
        </Section>
        <Section id="graph-faq" title="常见问题">
          <ul className="break-words text-sm text-[var(--color-text)] list-disc pl-5 space-y-1">
            <li>graph 文档建议先写正文说明，再给出图谱代码块和阅读提示，不要只剩一段裸 JSON。</li>
            <li>如果图谱 JSON 很长，先从最小合法结构起步，再逐步补节点属性和颜色。</li>
          </ul>
        </Section>
      </>
    ),
  },
];
