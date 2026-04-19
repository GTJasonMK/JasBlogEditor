import type { ReactElement } from "react";

export type HelpTabId =
  | "markdown"
  | "gfm"
  | "code"
  | "math"
  | "mermaid"
  | "alert"
  | "roadmap"
  | "graph"
  | "frontmatter";

export type HelpTabGroupId =
  | "writing"
  | "enhanced"
  | "structured"
  | "metadata";

export interface HelpTabSectionLink {
  id: string;
  title: string;
}

export interface HelpTabGroupDefinition {
  id: HelpTabGroupId;
  label: string;
  description: string;
}

export const HELP_TAB_GROUPS = [
  {
    id: "writing",
    label: "基础写作",
    description: "正文、链接、表格、脚注和代码块等日常写作能力。",
  },
  {
    id: "enhanced",
    label: "增强表达",
    description: "数学公式、Mermaid 图表和 Alert 提示块。",
  },
  {
    id: "structured",
    label: "结构化内容",
    description: "roadmap 与 graph 这类带专用解析规则的内容类型。",
  },
  {
    id: "metadata",
    label: "元数据契约",
    description: "frontmatter、字段回退和各文档类型的真实示例。",
  },
] satisfies readonly HelpTabGroupDefinition[];

export interface HelpTabContentDefinition {
  id: HelpTabId;
  label: string;
  keywords: string[];
  sectionLinks: HelpTabSectionLink[];
  content: ReactElement;
}

export interface HelpTabDefinition extends HelpTabContentDefinition {
  groupId: HelpTabGroupId;
  summary: string;
  relatedTopics: string[];
}

export interface HelpTabGroupBucket {
  group: HelpTabGroupDefinition;
  tabs: HelpTabDefinition[];
}

export function filterHelpTabs(
  tabs: readonly HelpTabDefinition[],
  keyword: string
): HelpTabDefinition[] {
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) return [...tabs];

  return tabs.filter((item) =>
    [
      item.label,
      item.summary,
      ...item.relatedTopics,
      ...item.keywords,
      ...item.sectionLinks.map((section) => section.title),
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalized)
  );
}

export function groupHelpTabs(
  tabs: readonly HelpTabDefinition[]
): HelpTabGroupBucket[] {
  return HELP_TAB_GROUPS.map((group) => ({
    group,
    tabs: tabs.filter((tab) => tab.groupId === group.id),
  })).filter((bucket) => bucket.tabs.length > 0);
}
