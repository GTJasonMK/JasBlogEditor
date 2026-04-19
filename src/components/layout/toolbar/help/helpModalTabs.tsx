import { FrontmatterHelpTab } from "./FrontmatterHelpTab";
import { FRONTMATTER_SECTION_LINKS } from "./frontmatterHelpData";
import { HELP_MODAL_MARKDOWN_TABS } from "./helpModalMarkdownTabs";
import type {
  HelpTabContentDefinition,
  HelpTabDefinition,
  HelpTabId,
} from "./helpModalSchema";
import { HELP_MODAL_STRUCTURED_TABS } from "./helpModalStructuredTabs";

const FRONTMATTER_RELATED_TOPICS = [
  "学习笔记",
  "考研日志",
  "项目卡片",
  "Roadmap 规划",
  "知识图谱",
  "普通文档",
  "note",
  "diary",
  "project",
  "roadmap",
  "graph",
  "doc",
] as const;

const TAB_PRESENTATION: Record<
  HelpTabId,
  Pick<HelpTabDefinition, "groupId" | "summary" | "relatedTopics">
> = {
  markdown: {
    groupId: "writing",
    summary: "标题、列表、链接、图片和目录锚点等基础 Markdown 写法。",
    relatedTopics: [],
  },
  gfm: {
    groupId: "writing",
    summary: "表格、脚注、任务列表、删除线和自动链接等 GFM 扩展。",
    relatedTopics: [],
  },
  code: {
    groupId: "writing",
    summary: "围栏代码块、语言标签、复制按钮和无语言代码块的显示规则。",
    relatedTopics: [],
  },
  math: {
    groupId: "enhanced",
    summary: "KaTeX 行内公式、块级公式和常见数学排版示例。",
    relatedTopics: [],
  },
  mermaid: {
    groupId: "enhanced",
    summary: "流程图、时序图和常见 Mermaid 图种的真实渲染效果。",
    relatedTopics: [],
  },
  alert: {
    groupId: "enhanced",
    summary: "GitHub 风格提示块及多段内容、列表混排的书写规范。",
    relatedTopics: [],
  },
  roadmap: {
    groupId: "structured",
    summary: "任务前缀、优先级、合法缩进与字段回退行为的完整契约。",
    relatedTopics: [],
  },
  graph: {
    groupId: "structured",
    summary: "graph 代码块、JSON 结构、错误暴露和图谱字段速查。",
    relatedTopics: [],
  },
  frontmatter: {
    groupId: "metadata",
    summary:
      "覆盖学习笔记、考研日志、项目卡片、Roadmap 规划、知识图谱和普通文档的 frontmatter 写法，并可直接对照真实渲染。",
    relatedTopics: [...FRONTMATTER_RELATED_TOPICS],
  },
};

function attachPresentation(
  tabs: readonly HelpTabContentDefinition[]
): HelpTabDefinition[] {
  return tabs.map((tab) => ({
    ...tab,
    ...TAB_PRESENTATION[tab.id],
  }));
}

const FRONTMATTER_HELP_TAB: HelpTabContentDefinition = {
  id: "frontmatter",
  label: "Frontmatter 元数据",
  keywords: [
    "frontmatter",
    "yaml",
    "元数据",
    "metadata",
    "示例",
    "写作",
    ...FRONTMATTER_RELATED_TOPICS,
  ],
  sectionLinks: FRONTMATTER_SECTION_LINKS,
  content: <FrontmatterHelpTab />,
};

export const HELP_MODAL_TABS: HelpTabDefinition[] = attachPresentation([
  ...HELP_MODAL_MARKDOWN_TABS,
  ...HELP_MODAL_STRUCTURED_TABS,
  FRONTMATTER_HELP_TAB,
]);
