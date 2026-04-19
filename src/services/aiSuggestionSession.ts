import type { EditorFile } from "@/types";
import {
  buildAIAssistantMessages,
  validateGeneratedTextApplication,
} from "./aiWritingAssistant";
import type { AIAction, AIApplyMode } from "./aiWritingAssistantTypes";
import { buildSuggestionNextContent } from "./aiSuggestionContent";
import {
  extractSuggestionBody,
  getMissingBodyProtocolMessage,
  isPreviewableSuggestionBody,
} from "./aiSuggestionResponseProtocol";
import { streamChunkedPolish } from "./aiSuggestionChunkedPolish";
import type { PendingAISuggestion } from "./aiSuggestionTypes";
import { LLMClient } from "./llm";

interface StreamSuggestionOptions {
  file: EditorFile;
  action: AIAction;
  prompt: string;
  promptSelectionText: string;
  sourceContent: string;
  selectedText: string;
  selectionStart: number;
  selectionEnd: number;
  mode: AIApplyMode;
  clientConfig: {
    apiKey: string;
    baseUrl?: string;
    model?: string;
  };
  polishConcurrency?: number;
  signal?: AbortSignal;
  isCancelled: () => boolean;
  onReasoning: (chunk: string) => void;
  onSuggestion: (suggestion: PendingAISuggestion) => void;
}

type StreamSuggestionResult =
  | { ok: true; suggestion: PendingAISuggestion }
  | { ok: false; message: string; discardSuggestion?: boolean };

function buildSuggestion(
  options: StreamSuggestionOptions,
  generatedText: string,
  nextContent: string
): PendingAISuggestion {
  return {
    mode: options.mode,
    sourceContent: options.sourceContent,
    generatedText,
    selectionStart: options.selectionStart,
    selectionEnd: options.selectionEnd,
    nextContent,
    selectedText: options.selectedText,
  };
}

function isPolishWholeDocument(options: StreamSuggestionOptions): boolean {
  return (
    options.action === "polish" &&
    options.mode === "replace" &&
    options.selectionStart === 0 &&
    options.selectionEnd === options.sourceContent.length
  );
}

export async function streamValidatedSuggestion(
  options: StreamSuggestionOptions
): Promise<StreamSuggestionResult> {
  if (isPolishWholeDocument(options)) {
    return streamChunkedPolish({
      file: options.file,
      sourceContent: options.sourceContent,
      mode: options.mode,
      selectionStart: options.selectionStart,
      selectionEnd: options.selectionEnd,
      selectedText: options.selectedText,
      clientConfig: options.clientConfig,
      concurrency: options.polishConcurrency,
      signal: options.signal,
      isCancelled: options.isCancelled,
      onReasoning: options.onReasoning,
      onSuggestion: options.onSuggestion,
    });
  }

  const client = LLMClient.createFromConfig(
    options.clientConfig,
    true,
    true
  );
  const stream = client.streamChat({
    messages: buildAIAssistantMessages({
      action: options.action,
      file: options.file,
      selectedText: options.promptSelectionText,
      customPrompt: options.prompt.trim(),
      mode: options.mode,
      selectionStart: options.selectionStart,
      selectionEnd: options.selectionEnd,
    }),
    model: options.clientConfig.model || "gpt-3.5-turbo",
    temperature: 0.7,
    timeout: 120,
    signal: options.signal,
  });

  let rawText = "";
  let lastBody = "";

  try {
    for await (const chunk of stream) {
      if (options.isCancelled()) {
        return { ok: false, message: "" };
      }

      if (chunk.content) {
        rawText += chunk.content;
        const extracted = extractSuggestionBody(rawText);
        if (
          extracted.started &&
          isPreviewableSuggestionBody(extracted) &&
          extracted.body !== lastBody
        ) {
          lastBody = extracted.body;
          options.onSuggestion(buildSuggestion(
            options,
            extracted.body,
            buildSuggestionNextContent({
              mode: options.mode,
              sourceContent: options.sourceContent,
              generatedText: extracted.body,
              selectionStart: options.selectionStart,
              selectionEnd: options.selectionEnd,
            })
          ));
        }
      }

      if (chunk.reasoningContent) {
        options.onReasoning(chunk.reasoningContent);
      }
    }
  } catch (issue) {
    if (
      options.isCancelled() ||
      options.signal?.aborted ||
      (issue instanceof Error && issue.name === "AbortError")
    ) {
      return { ok: false, message: "" };
    }

    throw issue;
  }

  const extracted = extractSuggestionBody(rawText);
  if (!extracted.started || !extracted.completed) {
    return { ok: false, message: getMissingBodyProtocolMessage() };
  }

  if (!extracted.body) {
    return { ok: false, message: "AI 未返回可用内容。" };
  }

  const validation = validateGeneratedTextApplication({
    file: options.file,
    mode: options.mode,
    generatedText: extracted.body,
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

  return {
    ok: true,
    suggestion: buildSuggestion(options, extracted.body, validation.nextContent),
  };
}
