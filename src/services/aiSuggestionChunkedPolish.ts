/**
 * 分块润色：将文档按 Markdown 结构分块，并发调用 LLM 润色，累积 FIND/REPLACE patch。
 *
 * 优势：
 * - 每块独立调用，LLM 注意力集中在当前块
 * - 每个块都附带完整正文作为只读上下文，LLM 能理解全文语境
 * - 并发滑动窗口（默认 3 路），总耗时约等于最慢的一路
 * - 任何块完成后立即合并 patch 并刷新 diff，用户可以渐进看到结果
 * - 取消时已完成块的 patch 保留
 */

import type { EditorFile } from "@/types";
import type { PendingAISuggestion } from "./aiSuggestionTypes";
import type { AIApplyMode } from "./aiWritingAssistantTypes";
import {
  extractSuggestionBody,
  isPreviewableSuggestionBody,
} from "./aiSuggestionResponseProtocol";
import {
  extractPatchEntries,
  applyPatches,
  isPatchFormatBody,
  type PatchEntry,
} from "./aiSuggestionPatchProtocol";
import { buildSuggestionNextContent } from "./aiSuggestionContent";
import { buildChunkPolishMessages } from "./aiWritingAssistantPrompt";
import { validateGeneratedTextApplication } from "./aiWritingAssistant";
import { LLMClient } from "./llm";

// ===== 分块 =====

const MIN_CHUNK_LENGTH = 20;
const HEADING_PATTERN = /^#{2,3} /;
const DEFAULT_CONCURRENCY = 3;
const MAX_CONCURRENCY_LIMIT = 10;

export interface DocumentChunk {
  text: string;
  startOffset: number;
  endOffset: number;
}

function isHeadingLine(line: string): boolean {
  return HEADING_PATTERN.test(line);
}

function flushChunk(
  chunks: DocumentChunk[],
  lines: string[],
  startOffset: number,
  endOffset: number
): void {
  const text = lines.join("\n");
  if (!text.trim()) {
    return;
  }
  chunks.push({ text, startOffset, endOffset });
}

export function splitDocumentIntoChunks(content: string): DocumentChunk[] {
  if (!content.trim()) {
    return [];
  }

  const lines = content.split("\n");
  const chunks: DocumentChunk[] = [];
  let currentLines: string[] = [];
  let currentStart = 0;
  let offset = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineStart = offset;

    if (isHeadingLine(line) && currentLines.length > 0) {
      flushChunk(chunks, currentLines, currentStart, lineStart);
      currentLines = [];
      currentStart = lineStart;
    }

    currentLines.push(line);
    offset += line.length + (i < lines.length - 1 ? 1 : 0);
  }

  if (currentLines.length > 0) {
    flushChunk(chunks, currentLines, currentStart, content.length);
  }

  return mergeSmallChunks(chunks);
}

function mergeSmallChunks(chunks: DocumentChunk[]): DocumentChunk[] {
  if (chunks.length <= 1) {
    return chunks;
  }

  const result: DocumentChunk[] = [];

  for (const chunk of chunks) {
    const prev = result[result.length - 1];
    if (prev && prev.text.trim().length < MIN_CHUNK_LENGTH) {
      result[result.length - 1] = {
        text: prev.text + "\n" + chunk.text,
        startOffset: prev.startOffset,
        endOffset: chunk.endOffset,
      };
    } else {
      result.push(chunk);
    }
  }

  return result;
}

// ===== 并发控制 =====

export function clampConcurrency(value: number | undefined): number {
  if (!Number.isFinite(value) || value === undefined || value <= 0) {
    return DEFAULT_CONCURRENCY;
  }
  return Math.max(1, Math.min(MAX_CONCURRENCY_LIMIT, Math.floor(value)));
}

export async function runWithConcurrency<T>(
  tasks: readonly (() => Promise<T>)[],
  limit: number,
  isCancelled: () => boolean
): Promise<(T | undefined)[]> {
  const results: (T | undefined)[] = new Array(tasks.length).fill(undefined);
  let nextIndex = 0;

  async function runNext(): Promise<void> {
    while (nextIndex < tasks.length) {
      if (isCancelled()) {
        return;
      }

      const index = nextIndex++;
      try {
        results[index] = await tasks[index]();
      } catch {
        // 单块失败不阻断其他块
      }
    }
  }

  const workers = Array.from(
    { length: Math.min(limit, tasks.length) },
    () => runNext()
  );

  await Promise.all(workers);
  return results;
}

// ===== 分块润色编排 =====

interface ChunkedPolishOptions {
  file: EditorFile;
  sourceContent: string;
  mode: AIApplyMode;
  selectionStart: number;
  selectionEnd: number;
  selectedText: string;
  clientConfig: {
    apiKey: string;
    baseUrl?: string;
    model?: string;
  };
  concurrency?: number;
  signal?: AbortSignal;
  isCancelled: () => boolean;
  onReasoning: (chunk: string) => void;
  onSuggestion: (suggestion: PendingAISuggestion) => void;
}

type ChunkedPolishResult =
  | { ok: true; suggestion: PendingAISuggestion }
  | { ok: false; message: string; discardSuggestion?: boolean };

function buildSuggestionFromPatches(
  options: ChunkedPolishOptions,
  patches: readonly PatchEntry[]
): PendingAISuggestion | null {
  if (patches.length === 0) {
    return null;
  }

  const { content } = applyPatches(options.sourceContent, patches);
  const nextContent = buildSuggestionNextContent({
    mode: options.mode,
    sourceContent: options.sourceContent,
    generatedText: content,
    selectionStart: options.selectionStart,
    selectionEnd: options.selectionEnd,
  });

  return {
    mode: options.mode,
    sourceContent: options.sourceContent,
    generatedText: content,
    selectionStart: options.selectionStart,
    selectionEnd: options.selectionEnd,
    nextContent,
    selectedText: options.selectedText,
  };
}

async function streamSingleChunkPolish(
  options: ChunkedPolishOptions,
  chunk: DocumentChunk,
  chunkIndex: number,
  chunkResults: PatchEntry[][],
  flushSuggestion: () => void
): Promise<PatchEntry[]> {
  const client = LLMClient.createFromConfig(options.clientConfig, true, true);

  const stream = client.streamChat({
    messages: buildChunkPolishMessages(options.file, {
      chunkText: chunk.text,
      fullContent: options.sourceContent,
    }),
    model: options.clientConfig.model || "gpt-3.5-turbo",
    temperature: 0.7,
    timeout: 120,
    signal: options.signal,
  });

  let rawText = "";
  let lastBody = "";
  const chunkPatches: PatchEntry[] = [];

  for await (const sseChunk of stream) {
    if (options.isCancelled()) {
      return chunkPatches;
    }

    if (sseChunk.content) {
      rawText += sseChunk.content;
      const extracted = extractSuggestionBody(rawText);
      if (
        extracted.started &&
        isPreviewableSuggestionBody(extracted) &&
        extracted.body !== lastBody
      ) {
        lastBody = extracted.body;
        if (isPatchFormatBody(extracted.body)) {
          const { patches } = extractPatchEntries(
            extracted.body,
            extracted.completed
          );
          chunkPatches.length = 0;
          chunkPatches.push(...patches);

          chunkResults[chunkIndex] = [...chunkPatches];
          flushSuggestion();
        }
      }
    }

    if (sseChunk.reasoningContent) {
      options.onReasoning(sseChunk.reasoningContent);
    }
  }

  const extracted = extractSuggestionBody(rawText);
  if (extracted.started && extracted.completed && extracted.body) {
    if (isPatchFormatBody(extracted.body)) {
      const { patches } = extractPatchEntries(extracted.body, true);
      chunkPatches.length = 0;
      chunkPatches.push(...patches);
    }
  }

  chunkResults[chunkIndex] = [...chunkPatches];
  flushSuggestion();

  return chunkPatches;
}

export async function streamChunkedPolish(
  options: ChunkedPolishOptions
): Promise<ChunkedPolishResult> {
  const chunks = splitDocumentIntoChunks(options.sourceContent);
  if (chunks.length === 0) {
    return { ok: false, message: "文档内容为空，无需润色。", discardSuggestion: true };
  }

  const chunkResults: PatchEntry[][] = chunks.map(() => []);

  function flushSuggestion(): void {
    const allPatches = chunkResults.flat();
    const suggestion = buildSuggestionFromPatches(options, allPatches);
    if (suggestion) {
      options.onSuggestion(suggestion);
    }
  }

  const tasks = chunks.map(
    (chunk, i) => () =>
      streamSingleChunkPolish(options, chunk, i, chunkResults, flushSuggestion)
  );

  const concurrency = clampConcurrency(options.concurrency);

  try {
    await runWithConcurrency(tasks, concurrency, options.isCancelled);
  } catch (issue) {
    if (
      options.isCancelled() ||
      options.signal?.aborted ||
      (issue instanceof Error && issue.name === "AbortError")
    ) {
      const allPatches = chunkResults.flat();
      if (allPatches.length > 0) {
        const suggestion = buildSuggestionFromPatches(options, allPatches);
        if (suggestion) {
          return { ok: false, message: "", discardSuggestion: false };
        }
      }
      return { ok: false, message: "" };
    }
    throw issue;
  }

  const allPatches = chunkResults.flat();

  if (allPatches.length === 0) {
    return { ok: false, message: "AI 认为当前文档无需润色。", discardSuggestion: true };
  }

  const { content: generatedText } = applyPatches(options.sourceContent, allPatches);

  const validation = validateGeneratedTextApplication({
    file: options.file,
    mode: options.mode,
    generatedText,
    selectionStart: options.selectionStart,
    selectionEnd: options.selectionEnd,
  });

  if (!validation.ok) {
    return {
      ok: false,
      message: validation.message ?? "本地契约校验未通过。",
      discardSuggestion: validation.discardSuggestion,
    };
  }

  const suggestion: PendingAISuggestion = {
    mode: options.mode,
    sourceContent: options.sourceContent,
    generatedText,
    selectionStart: options.selectionStart,
    selectionEnd: options.selectionEnd,
    nextContent: validation.nextContent,
    selectedText: options.selectedText,
  };

  return { ok: true, suggestion };
}
