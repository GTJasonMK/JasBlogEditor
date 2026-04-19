import {
  FRONTMATTER_HELP_EXAMPLES,
} from "@/components/layout/toolbar/help/frontmatterHelpData";
import type { EditorFile } from "@/types";
import {
  AI_BODY_END_MARKER,
  AI_BODY_START_MARKER,
} from "./aiSuggestionResponseProtocol";
import {
  AI_FIND_MARKER,
  AI_REPLACE_MARKER,
} from "./aiSuggestionPatchProtocol";
import type { ChatMessage } from "./llm";
import type {
  AIAction,
  BuildAIAssistantMessagesParams,
} from "./aiWritingAssistantTypes";

const NOTE_MARKDOWN_CAPABILITIES = `你正在为一个 Markdown 博客编辑器生成学习笔记。输出必须是纯 Markdown 格式。

支持的 Markdown 扩展语法：
- GFM：表格、任务列表 \`- [ ]\`/\`- [x]\`、删除线 \`~~text~~\`、脚注
- 代码块：\`\`\`lang 围栏语法，支持语法高亮
- KaTeX 数学公式：行内 \`$E=mc^2$\`，块级用独立行 \`$$\` 包裹
- Mermaid 图表：\`\`\`mermaid 代码块（flowchart、sequenceDiagram、classDiagram 等）
- GitHub 风格提示块：\`> [!NOTE]\`、\`> [!TIP]\`、\`> [!IMPORTANT]\`、\`> [!WARNING]\`、\`> [!CAUTION]\`
- 图片支持 alt 文本作为图注
- 标题 H1-H4 自动生成锚点`;

const DOC_MARKDOWN_CAPABILITIES = `你正在为一个普通文档生成内容。输出必须是纯 Markdown 格式。

支持的 Markdown 扩展语法：
- GFM：表格、任务列表 \`- [ ]\`/\`- [x]\`、删除线 \`~~text~~\`、脚注
- 代码块：\`\`\`lang 围栏语法，支持语法高亮
- KaTeX 数学公式：行内 \`$E=mc^2$\`，块级用独立行 \`$$\` 包裹
- Mermaid 图表：\`\`\`mermaid 代码块（flowchart、sequenceDiagram、classDiagram 等）
- GitHub 风格提示块：\`> [!NOTE]\`、\`> [!TIP]\`、\`> [!IMPORTANT]\`、\`> [!WARNING]\`、\`> [!CAUTION]\``;

const PROJECT_MARKDOWN_CAPABILITIES = `你正在为项目介绍文档生成内容。输出必须是纯 Markdown，优先使用这些能力：
- 标题与小节
- 功能列表、表格、链接
- 围栏代码块与命令示例
- 引用块与注意事项
- 除非当前文档已经在用，否则不要主动引入 KaTeX 或 Mermaid`;

const DIARY_MARKDOWN_CAPABILITIES = `输出必须是纯 Markdown，重点使用当前日志真正需要的写法：
- 标题与小节
- 无序列表 / 有序列表
- 引用块与提醒
- 普通链接与站内引用链接
- 围栏代码块（仅在确实需要记录命令或代码时使用）`;

const ROADMAP_MARKDOWN_CAPABILITIES = `输出必须是纯 Markdown，且 roadmap 任务语法优先级最高：
- 普通说明段落、H2/H3 标题
- 任务行必须使用 \`- [ ] 标题 \\\`priority\\\`\` 这类格式
- 可用的任务状态只有 \`[ ]\`、\`[-]\`、\`[x]\`
- 任务补充信息只能写在缩进行里，例如 \`描述:\`、\`详情:\`、\`截止:\`、\`完成:\``;

const GRAPH_MARKDOWN_CAPABILITIES = `输出必须是纯 Markdown，graph 类型只需要这些能力：
- frontmatter 说明字段
- 正文说明段落、标题、列表
- 第一个有效 \`\`\`graph\` 代码块
- 不要把 Mermaid、KaTeX 或其他无关扩展混入 graph JSON 代码块`;

const BODY_EDITOR_BOUNDARY = `当前 AI 输出会直接写入正文编辑区，而不是右侧栏元数据表单。
- frontmatter / metadata 只作为只读上下文，用于理解当前文档，不可在输出中重写
- 不要输出 YAML frontmatter、字段矩阵、metadata patch，或单独的 \`title:\` / \`date:\` / \`tags:\` 这类元数据键值块
- 如果用户想改标题、日期、标签、项目链接等元数据，正文里不要伪造 frontmatter
- 只输出最终可写回编辑器的 Markdown 正文，不要附带“好的，我已理解”“下面是修改后内容”“我做了这些调整”之类说明
- 不要把整份输出再包一层 \`\`\`markdown\` 或 \`\`\`md\` 代码块
- 最终正文必须严格包在 ${AI_BODY_START_MARKER} 与 ${AI_BODY_END_MARKER} 之间，标记外不要放任何正文内容`;

const ACTION_SYSTEM_PROMPTS: Record<AIAction, string> = {
  continue:
    "你是写作助手。请基于完整文档继续往后写，不要重复已有内容，不要擅自改写前文的结构和契约。",
  polish:
    "你是写作润色专家。只允许优化自然语言文字的措辞和句式，使表达更清晰、准确、自然。\n" +
    "严格禁止：添加或删除段落/标题/章节、修改 Markdown 结构符号（标题级别 ##、列表符号 -、任务标记 - [ ]/- [-]/- [x]、代码围栏 ```、引用标记 >）、增减空白行。\n" +
    "如果某句已经足够清晰，不要修改它。只输出真正需要润色的片段的搜索替换对。",
  summary:
    "你是内容总结专家。请输出简洁的 Markdown 摘要，优先提炼结构与重点，不要捏造信息。",
  translate:
    "你是翻译专家。如果内容主要是中文，翻译为英文；如果主要是英文，翻译为中文。保留标题层级、列表、代码块、公式、链接和特殊语法。",
  custom:
    "你是 AI 写作助手。请严格遵守文档契约和用户指令处理内容，输出可直接粘贴回编辑器的 Markdown。",
};

function resolveMarkdownCapabilities(type: EditorFile["type"]): string {
  if (type === "note") {
    return NOTE_MARKDOWN_CAPABILITIES;
  }

  if (type === "project") {
    return PROJECT_MARKDOWN_CAPABILITIES;
  }

  if (type === "diary") {
    return DIARY_MARKDOWN_CAPABILITIES;
  }

  if (type === "roadmap") {
    return ROADMAP_MARKDOWN_CAPABILITIES;
  }

  if (type === "graph") {
    return GRAPH_MARKDOWN_CAPABILITIES;
  }

  return DOC_MARKDOWN_CAPABILITIES;
}

function formatGuideList(title: string, items: readonly string[]): string {
  if (items.length === 0) {
    return "";
  }

  return [title, ...items.map((item) => `- ${item}`)].join("\n");
}

function formatTypeWritingGuide(file: EditorFile): string {
  const example = FRONTMATTER_HELP_EXAMPLES.find((item) => item.type === file.type);
  if (!example) {
    return "当前类型暂无帮助页示例，请仅遵守当前文档上下文与解析契约。";
  }

  const scenarioSection = (example.scenarioExamples ?? [])
    .map((scenario) => {
      if (scenario.notes.length === 0) {
        return "";
      }

      return [
        `- ${scenario.title}`,
        ...scenario.notes.map((note) => `  - ${note}`),
      ].join("\n");
    })
    .filter(Boolean)
    .join("\n");

  return [
    `文档类型：${example.title}`,
    `适用场景：${example.suitableFor}`,
    formatGuideList("最常见正文写法：", example.commonPatterns),
    formatGuideList("正文写作建议：", example.writingTips),
    scenarioSection ? `场景提醒：\n${scenarioSection}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function formatDocumentContext(file: EditorFile, selectedText: string): string {
  const metadataJson = JSON.stringify(file.metadata, null, 2);
  const issuesSection =
    file.issues.length > 0
      ? file.issues.map((issue) => `- ${issue}`).join("\n")
      : "- 当前无解析 issue";
  const selectionSection = selectedText.trim()
    ? ["当前选中片段：", "<<<SELECTION>>>", selectedText, "<<<END_SELECTION>>>"].join("\n")
    : "当前没有选中文本。";

  return [
    "当前文档状态：",
    `- 路径: ${file.path}`,
    `- 文件名: ${file.name}`,
    `- 类型: ${file.type}`,
    `- hasFrontmatter: ${file.hasFrontmatter ? "yes" : "no"}`,
    `- metadataDirty: ${file.metadataDirty ? "yes" : "no"}`,
    "当前 metadata（规范化后，只读参考，由右侧栏维护）：",
    "```json",
    metadataJson,
    "```",
    "当前已知 issues：",
    issuesSection,
    selectionSection,
    "当前完整正文：",
    "```md",
    file.content,
    "```",
  ].join("\n");
}

function formatSharedContract(file: EditorFile): string {
  return [
    BODY_EDITOR_BOUNDARY,
    resolveMarkdownCapabilities(file.type),
    formatTypeWritingGuide(file),
  ]
    .filter(Boolean)
    .join("\n\n");
}

function isWholeDocumentReplace(params: BuildAIAssistantMessagesParams): boolean {
  return (
    params.mode === "replace" &&
    params.selectionStart === 0 &&
    params.selectionEnd === params.file.content.length
  );
}

function formatOperationScopeContract(
  params: BuildAIAssistantMessagesParams
): string {
  if (params.mode === "insert") {
    return [
      "本次操作类型：插入。",
      "- 只输出要插入当前位置的新文本片段",
      "- 不要重复任何已有正文",
      "- 不要回传整篇文档，也不要把原文重新包一遍后再返回",
      `- 请把最终片段包在 ${AI_BODY_START_MARKER} 与 ${AI_BODY_END_MARKER} 之间`,
    ].join("\n");
  }

  if (isWholeDocumentReplace(params) && params.action === "polish") {
    return [
      "本次操作类型：润色（patch 模式，只输出修改的部分）。",
      "- 不要输出完整正文，只输出需要修改的片段",
      "- 使用搜索替换对格式输出每一处修改：",
      `  ${AI_FIND_MARKER}`,
      "  原文中需要修改的片段（必须能在原文中精确匹配）",
      `  ${AI_REPLACE_MARKER}`,
      "  润色后的替换文本",
      "- 可以输出多个搜索替换对，每对修改一处",
      "- FIND 的内容必须是原文中的精确子串（逐字匹配，包括标点和空格）",
      "- 只修改自然语言文字的措辞和句式，禁止修改 Markdown 结构符号",
      "- 如果整篇文档已足够清晰，不需要修改，就不要输出任何搜索替换对",
      `- 请把全部搜索替换对包在 ${AI_BODY_START_MARKER} 与 ${AI_BODY_END_MARKER} 之间`,
    ].join("\n");
  }

  if (isWholeDocumentReplace(params)) {
    return [
      "本次操作类型：整篇改写。",
      "- 必须输出修改后的完整正文",
      "- 不能只返回一段摘要或局部片段",
      "- 不要额外解释你改了什么，直接返回完整结果",
      `- 请把完整正文包在 ${AI_BODY_START_MARKER} 与 ${AI_BODY_END_MARKER} 之间`,
    ].join("\n");
  }

  return [
    "本次操作类型：局部替换。",
    "- 只输出选中片段的替换结果",
    "- 不要回传整篇正文",
    "- 不要保留选区外的原文前后缀",
    `- 请把替换结果包在 ${AI_BODY_START_MARKER} 与 ${AI_BODY_END_MARKER} 之间`,
  ].join("\n");
}

function buildUserPrompt(params: BuildAIAssistantMessagesParams): string {
  const context = formatDocumentContext(params.file, params.selectedText);

  if (params.action === "continue") {
    return [
      "请基于上面的完整文档上下文，从当前正文末尾自然续写。",
      "禁止重复已有段落，禁止破坏当前 frontmatter 和类型契约。",
      context,
    ].join("\n\n");
  }

  if (params.action === "summary") {
    return ["请阅读完整文档上下文，生成一份结构清晰的摘要。", context].join(
      "\n\n"
    );
  }

  if (params.action === "translate") {
    return ["请阅读完整文档上下文并输出翻译后的结果。", context].join("\n\n");
  }

  if (params.action === "custom") {
    return [
      `用户指令：${params.customPrompt}`,
      "请先理解完整文档上下文，再按指令处理选中片段或整篇内容。",
      context,
    ].join("\n\n");
  }

  if (params.action === "polish") {
    return [
      "请逐段审阅文档，找出措辞不够清晰或准确的句子。",
      "对于每处需要润色的地方，输出一个搜索替换对：FIND 里放原文片段，REPLACE 里放润色后的文本。",
      "不需要改动的段落不要输出任何搜索替换对。",
      context,
    ].join("\n\n");
  }

  return ["请先理解完整文档上下文，再处理选中片段或整篇内容。", context].join(
    "\n\n"
  );
}

export function buildAIAssistantMessages(
  params: BuildAIAssistantMessagesParams
): ChatMessage[] {
  return [
    {
      role: "system",
      content: [
        formatSharedContract(params.file),
        formatOperationScopeContract(params),
        ACTION_SYSTEM_PROMPTS[params.action],
      ].join("\n\n"),
    },
    {
      role: "user",
      content: buildUserPrompt(params),
    },
  ];
}

export interface ChunkPolishContext {
  chunkText: string;
  fullContent: string;
}

const CHUNK_POLISH_SCOPE = [
  "本次操作类型：润色（patch 模式，只输出修改的部分）。",
  `- 使用搜索替换对格式输出每一处修改：`,
  `  ${AI_FIND_MARKER}`,
  "  原文中需要修改的片段（必须能在原文中精确匹配）",
  `  ${AI_REPLACE_MARKER}`,
  "  润色后的替换文本",
  "- FIND 的内容必须是原文中的精确子串（逐字匹配，包括标点和空格）",
  "- 只修改自然语言文字的措辞和句式，禁止修改 Markdown 结构符号",
  "- 如果当前文本块已足够清晰，不要输出任何搜索替换对",
  `- 请把搜索替换对包在 ${AI_BODY_START_MARKER} 与 ${AI_BODY_END_MARKER} 之间`,
].join("\n");

function formatChunkUserPrompt(ctx: ChunkPolishContext): string {
  return [
    "请审阅下面标记的文本块，找出措辞不够清晰或准确的句子，输出搜索替换对。",
    "不需要改动的内容不要输出任何搜索替换对。",
    "",
    "当前文档完整正文（只读上下文，帮助你理解全文主题和结构，不要对标记块以外的内容输出搜索替换对）：",
    "```md",
    ctx.fullContent,
    "```",
    "",
    "当前需要润色的文本块（只对这个块输出搜索替换对）：",
    "```md",
    ctx.chunkText,
    "```",
  ].join("\n");
}

export function buildChunkPolishMessages(
  file: EditorFile,
  ctx: ChunkPolishContext
): ChatMessage[] {
  return [
    {
      role: "system",
      content: [
        BODY_EDITOR_BOUNDARY,
        resolveMarkdownCapabilities(file.type),
        CHUNK_POLISH_SCOPE,
        ACTION_SYSTEM_PROMPTS["polish"],
      ].join("\n\n"),
    },
    {
      role: "user",
      content: formatChunkUserPrompt(ctx),
    },
  ];
}
