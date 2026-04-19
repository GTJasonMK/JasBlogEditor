import type { EditorFile } from "@/types";
import { buildSuggestionNextContent } from "./aiSuggestionContent";
import {
  isNoopSuggestion,
  NOOP_SUGGESTION_MESSAGE,
} from "./aiSuggestionNoop";
import { extractGraphFromContent, parseMarkdownContent } from "./contentParser";
import type {
  GeneratedTextValidationResult,
  ValidateGeneratedTextApplicationParams,
} from "./aiWritingAssistantTypes";

const FRONTMATTER_KEYS_BY_TYPE: Record<EditorFile["type"], readonly string[]> = {
  note: ["title", "date", "excerpt", "tags"],
  project: [
    "name",
    "description",
    "github",
    "demo",
    "date",
    "tags",
    "techStack",
  ],
  diary: [
    "title",
    "date",
    "time",
    "excerpt",
    "tags",
    "mood",
    "weather",
    "location",
    "companions",
  ],
  roadmap: ["title", "description", "date", "status"],
  graph: ["name", "title", "description", "date"],
  doc: ["title", "date"],
};

function buildRawDocument(file: EditorFile, bodyContent: string): string {
  return `${file.frontmatterBlock ?? ""}${bodyContent}`;
}

function uniqueIssues(issues: readonly string[]): string[] {
  return Array.from(new Set(issues.map((issue) => issue.trim()).filter(Boolean)));
}

function collectRoadmapSyntaxIssues(content: string): string[] {
  const issues: string[] = [];
  let inFence = false;
  let fenceChar = "";

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trimStart();
    const fenceMatch = trimmed.match(/^(`{3,}|~{3,})/);

    if (fenceMatch) {
      const currentFenceChar = fenceMatch[1][0];
      if (!inFence) {
        inFence = true;
        fenceChar = currentFenceChar;
      } else if (currentFenceChar === fenceChar) {
        inFence = false;
        fenceChar = "";
      }
      continue;
    }

    if (inFence) continue;

    if (/^[-*+]\s*\[[ xX\-]\]\s+`(high|medium|low)`\s+/.test(line)) {
      issues.push(
        "roadmap 任务优先级必须尾置在标题末尾，例如 `- [ ] 任务标题 `high``，不能写成 `- [ ] `high` 任务标题`。"
      );
    }

    if (/^\t(描述|详情|截止|完成)[:：]/.test(line)) {
      issues.push(
        "roadmap 任务详情字段必须至少缩进两个空白字符，单个 Tab 在站点不会按合法详情解析。"
      );
    }
  }

  return issues;
}

function collectDocumentIssues(file: EditorFile, bodyContent: string): string[] {
  const parsed = parseMarkdownContent(buildRawDocument(file, bodyContent), file.type);
  const issues = [...parsed.issues];

  if (file.type === "graph") {
    const extracted = extractGraphFromContent(parsed.content);
    if (extracted.error) {
      issues.push(extracted.error);
    }
  }

  if (file.type === "roadmap") {
    issues.push(...collectRoadmapSyntaxIssues(parsed.content));
  }

  return uniqueIssues(issues);
}

function startsWithFrontmatterBlock(text: string): boolean {
  const trimmed = text.trimStart();
  if (trimmed.startsWith("```") || trimmed.startsWith("~~~")) {
    return false;
  }

  const lines = trimmed.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") {
    return false;
  }

  let hasField = false;
  for (const line of lines.slice(1, 16)) {
    const current = line.trimEnd();
    if (!current) {
      continue;
    }
    if (current === "---" || current === "...") {
      return hasField;
    }
    if (/^\s*#/.test(current) || /^\s+/.test(line)) {
      continue;
    }
    if (/^[A-Za-z][\w-]*\s*:/.test(current)) {
      hasField = true;
      continue;
    }
    return false;
  }

  return false;
}

function startsWithMetadataPatch(file: EditorFile, text: string): boolean {
  const trimmed = text.trimStart();
  if (!trimmed || trimmed.startsWith("```") || trimmed.startsWith("~~~") || trimmed.startsWith("---")) {
    return false;
  }

  const allowedKeys = new Set(FRONTMATTER_KEYS_BY_TYPE[file.type]);
  let matchedFieldCount = 0;
  let sawContinuation = false;

  for (const line of trimmed.split(/\r?\n/).slice(0, 8)) {
    const current = line.trimEnd();
    if (!current) {
      break;
    }

    const fieldMatch = current.match(/^([A-Za-z][\w-]*)\s*:/);
    if (fieldMatch) {
      if (!allowedKeys.has(fieldMatch[1])) {
        return false;
      }
      matchedFieldCount += 1;
      continue;
    }

    if (/^\s+/.test(line) && matchedFieldCount > 0) {
      sawContinuation = true;
      continue;
    }

    return false;
  }

  return matchedFieldCount >= 2 || (matchedFieldCount >= 1 && sawContinuation);
}

function getBodyEditorViolation(file: EditorFile, generatedText: string): string | null {
  if (
    startsWithFrontmatterBlock(generatedText) ||
    startsWithMetadataPatch(file, generatedText)
  ) {
    return "AI 输出包含 frontmatter / metadata 片段，但当前编辑区只能写正文。请在右侧栏修改标题、日期、标签和链接等元数据。";
  }

  return null;
}

function readComparableLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 4);
}

function countOverlappingLines(
  sourceLines: readonly string[],
  generatedLines: readonly string[]
): number {
  const sourceSet = new Set(sourceLines);
  return generatedLines.filter((line) => sourceSet.has(line)).length;
}

function hasSharedDocumentAnchors(sourceContent: string, generatedText: string): boolean {
  const sourceLines = readComparableLines(sourceContent);
  if (sourceLines.length === 0) {
    return false;
  }

  const firstAnchor = sourceLines[0];
  const lastAnchor = sourceLines[sourceLines.length - 1];
  return generatedText.includes(firstAnchor) && generatedText.includes(lastAnchor);
}

function looksLikeWholeDocumentOutput(
  sourceContent: string,
  generatedText: string
): boolean {
  const trimmedSource = sourceContent.trim();
  const trimmedGenerated = generatedText.trim();

  if (!trimmedSource || !trimmedGenerated) {
    return false;
  }

  if (trimmedSource === trimmedGenerated) {
    return true;
  }

  if (trimmedGenerated.length < Math.max(80, Math.floor(trimmedSource.length * 0.6))) {
    return false;
  }

  if (hasSharedDocumentAnchors(trimmedSource, trimmedGenerated)) {
    return true;
  }

  const sourceLines = readComparableLines(trimmedSource);
  const generatedLines = readComparableLines(trimmedGenerated);
  if (sourceLines.length < 3 || generatedLines.length < 3) {
    return false;
  }

  const overlapCount = countOverlappingLines(sourceLines, generatedLines);
  return overlapCount >= Math.max(3, Math.floor(sourceLines.length * 0.6));
}

function getScopeViolation(
  file: EditorFile,
  mode: ValidateGeneratedTextApplicationParams["mode"],
  selectionStart: number,
  selectionEnd: number,
  generatedText: string
): string | null {
  const isWholeDocumentReplace =
    mode === "replace" &&
    selectionStart === 0 &&
    selectionEnd === file.content.length;

  if (isWholeDocumentReplace || !looksLikeWholeDocumentOutput(file.content, generatedText)) {
    return null;
  }

  if (mode === "insert") {
    return "AI 输出看起来像整篇正文，但当前操作是插入。请让模型只返回新增片段，或直接发起整篇改写。";
  }

  return "AI 输出看起来像整篇正文，但当前操作是局部替换。请让模型只返回选中片段的替换结果。";
}

export function validateGeneratedTextApplication(
  params: ValidateGeneratedTextApplicationParams
): GeneratedTextValidationResult {
  const nextContent = buildSuggestionNextContent({
    mode: params.mode,
    sourceContent: params.file.content,
    generatedText: params.generatedText,
    selectionStart: params.selectionStart,
    selectionEnd: params.selectionEnd,
  });
  const bodyEditorViolation = getBodyEditorViolation(
    params.file,
    params.generatedText
  );
  const scopeViolation = getScopeViolation(
    params.file,
    params.mode,
    params.selectionStart,
    params.selectionEnd,
    params.generatedText
  );

  if (bodyEditorViolation || scopeViolation) {
    const violation = bodyEditorViolation ?? scopeViolation;
    if (!violation) {
      throw new Error("范围校验命中后缺少具体错误信息。");
    }
    return {
      ok: false,
      nextContent,
      issues: [violation],
      message: [
        "本地契约校验未通过，已阻止直接写回编辑器：",
        `- ${violation}`,
      ].join("\n"),
    };
  }

  if (isNoopSuggestion(params.file.content, nextContent)) {
    return {
      ok: false,
      nextContent,
      issues: [],
      message: NOOP_SUGGESTION_MESSAGE,
      discardSuggestion: true,
    };
  }

  const baselineIssues = new Set(collectDocumentIssues(params.file, params.file.content));
  const nextIssues = collectDocumentIssues(params.file, nextContent);
  const introducedIssues = nextIssues.filter((issue) => !baselineIssues.has(issue));

  if (introducedIssues.length === 0) {
    return { ok: true, nextContent, issues: [] };
  }

  return {
    ok: false,
    nextContent,
    issues: introducedIssues,
    message: [
      "本地契约校验未通过，已阻止直接写回编辑器：",
      ...introducedIssues.map((issue) => `- ${issue}`),
    ].join("\n"),
  };
}
