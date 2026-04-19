import type { FrontmatterHelpExample } from "./frontmatterHelpSchema";

export interface FrontmatterHelpTypeOption {
  type: FrontmatterHelpExample["type"];
  label: string;
  summary: string;
  focus: string;
}

export const FRONTMATTER_HELP_TYPE_OPTIONS: FrontmatterHelpTypeOption[] = [
  {
    type: "note",
    label: "学习笔记",
    summary: "适合结论、步骤、标签和长期沉淀的主题内容。",
    focus: "强调结构化标题、标签和正文层次。",
  },
  {
    type: "diary",
    label: "考研日志",
    summary: "适合同一天内多次记录进度、心态和引用复盘材料。",
    focus: "强调时间线、上下文字段和正文里的引用链接。",
  },
  {
    type: "project",
    label: "项目卡片",
    summary: "适合展示项目定位、链接、技术栈和正文亮点。",
    focus: "强调卡片信息完整，但不把实现细节塞进 frontmatter。",
  },
  {
    type: "roadmap",
    label: "Roadmap 规划",
    summary: "适合阶段计划、任务状态、优先级和任务详情说明。",
    focus: "强调任务语法、状态契约和任务详情缩进。",
  },
  {
    type: "graph",
    label: "知识图谱",
    summary: "适合通过 graph 代码块展示节点、边和关系网络。",
    focus: "强调 frontmatter 只管头部信息，图谱结构写在代码块。",
  },
  {
    type: "doc",
    label: "普通文档",
    summary: "适合单纯写正文说明，也兼容很轻量的 frontmatter。",
    focus: "强调正文优先，frontmatter 只保留必要头部信息。",
  },
];

export function getFrontmatterHelpTypeOption(
  type: FrontmatterHelpExample["type"]
): FrontmatterHelpTypeOption {
  return (
    FRONTMATTER_HELP_TYPE_OPTIONS.find((option) => option.type === type) ??
    FRONTMATTER_HELP_TYPE_OPTIONS[0]
  );
}
