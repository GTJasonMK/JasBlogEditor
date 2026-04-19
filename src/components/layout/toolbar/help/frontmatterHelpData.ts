import type { HelpSectionLink } from "./frontmatterHelpSchema";

export type {
  FrontmatterHelpExample,
  FrontmatterHelpScenario,
  HelpSectionLink,
} from "./frontmatterHelpSchema";

export { FRONTMATTER_HELP_EXAMPLES } from "./frontmatterHelpExamples";

export const FRONTMATTER_FIELD_TABLE = [
  "| 类型 | 必填字段 | 可选字段 | 默认/回退行为 |",
  "| --- | --- | --- | --- |",
  "| note | 无强制 | `title/date/excerpt/tags` | `title` 为空时回退 slug，`date` 可留空 |",
  "| project | 无强制 | `name/description/github/demo/date/tags/techStack` | `name` 为空时回退 slug，空白描述/链接按缺失处理 |",
  "| diary（考研日志） | 无强制 | `title/date/time/excerpt/tags/mood/weather/location/companions` | 可从文件名推断 `title/date/time`；详情页时间缺失时显示 `00:00` |",
  "| roadmap | 无强制 | `title/description/date/status` | `title` 为空时回退 slug；非法 `status` 会报错并按 `active` 处理 |",
  "| graph | 无强制 | `name/description/date` | `name` 会依次回退 `title` 和 slug；graph 块错误会单独显示 |",
  "| doc | 无强制 | `title/date` | 无 frontmatter 也可渲染正文 |",
  "",
  "保存策略：仅正文改动时会尽量原样保留 frontmatter（包含注释/缩进/空行）。",
  "当元数据字段发生变化时会重新序列化 frontmatter（可能丢失注释与原始排版）。",
  "序列化会跳过 `undefined/null`；并保留常见空数组字段（`tags/companions/techStack`）以减少无意义 diff。",
].join("\n");

export const FRONTMATTER_WRITING_RULES = [
  "frontmatter 只放适合概括文档的元数据，例如标题、摘要、标签、发布日期；正文再展开细节与论证。",
  "优先让 frontmatter 与正文分工明确：标题/摘要回答“这篇是什么”，正文回答“为什么、怎么做、结果如何”。",
  "如果某个信息只在正文里出现一次，不要强行塞进 frontmatter；只有会被卡片、列表或头部展示消费的字段才值得放进去。",
  "先写最小 frontmatter 再补正文，比一开始堆很多字段更稳妥；不确定会不会长期维护的字段先不要引入。",
];

export const FRONTMATTER_FAQ = [
  "无 frontmatter 也能继续编辑与预览；标题、日期等展示按各类型的 fallback 规则处理。",
  "YAML 语法错误会显式暴露为 issue / 错误提示，正文仍会保留并继续渲染。",
  "仅修改正文时会原样保留 frontmatter；修改元数据字段后会尽量在原 frontmatter 上做增量更新。",
  "`tags`、`companions`、`techStack` 既可以写 YAML 数组，也兼容 `a, b, c` 或 `A、B、C` 这样的字符串写法。",
  "`diary.time` 支持 `9:00`、`09:00`、`0900` 三种常见写法，解析后会标准化成 `HH:MM`。",
  "diary 正文里可以继续用标准 Markdown 链接引用学习笔记和知识图谱，例如 `[状态同步排查笔记](/notes/react-state-sync)`、`[状态流转图谱](/graphs/state-flow)`；站点 diary 详情页会在当前页面弹出预览。",
  "`roadmap.status` 仅支持 `active/completed/paused`，非法值回退 `active`。",
  "`graph` 类型优先读取 `name`，缺失时会回退读取 `title`。",
  "`project.techStack` 适合写结构化技术栈，功能说明和实现细节仍应留在正文。",
];

export const FRONTMATTER_SECTION_LINKS: HelpSectionLink[] = [
  { id: "frontmatter-support", title: "说明" },
  { id: "frontmatter-fields", title: "字段矩阵速查" },
  { id: "frontmatter-writing-rules", title: "写作通用规则" },
  { id: "frontmatter-type-browser", title: "文档类型切换" },
  { id: "frontmatter-selected-example", title: "当前聚焦示例" },
  { id: "frontmatter-scenarios", title: "常见场景示例" },
  { id: "frontmatter-faq", title: "解析注意事项" },
];
