import type { APIFormat, StreamChunk } from "./types";

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function extractTextFromPart(value: unknown): string | null {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        const part = asObject(item);
        if (!part) {
          return typeof item === "string" ? item : "";
        }

        if (typeof part.text === "string") {
          return part.text;
        }

        return typeof part.value === "string" ? part.value : "";
      })
      .join("");
  }

  const objectValue = asObject(value);
  if (!objectValue) {
    return null;
  }

  if (typeof objectValue.text === "string") {
    return objectValue.text;
  }

  return typeof objectValue.value === "string" ? objectValue.value : null;
}

function parseOpenAIChunk(data: unknown): StreamChunk | null {
  const objectValue = asObject(data);
  const choices = Array.isArray(objectValue?.choices)
    ? (objectValue.choices as unknown[])
    : null;

  if (!choices || choices.length === 0) {
    return null;
  }

  const choice = asObject(choices[0]);
  if (!choice) {
    return null;
  }

  const delta = asObject(choice.delta);
  const message = asObject(choice.message);
  const content = extractTextFromPart(delta?.content ?? message?.content);
  const reasoningContent = extractTextFromPart(
    delta?.reasoning_content ?? message?.reasoning_content
  );
  const finishReason =
    typeof choice.finish_reason === "string" ? choice.finish_reason : null;

  if (!content && !reasoningContent && !finishReason) {
    return null;
  }

  return {
    content,
    reasoningContent,
    finishReason,
  };
}

function extractAnthropicContent(content: unknown): string | null {
  if (!Array.isArray(content)) {
    return null;
  }

  const merged = content
    .map((item) => {
      const block = asObject(item);
      return block?.type === "text" && typeof block.text === "string" ? block.text : "";
    })
    .join("");

  return merged || null;
}

function parseAnthropicChunk(data: unknown): StreamChunk | null {
  const objectValue = asObject(data);
  if (!objectValue) {
    return null;
  }

  const eventType = typeof objectValue.type === "string" ? objectValue.type : null;

  if (eventType === "content_block_delta") {
    const delta = asObject(objectValue.delta);
    if (delta?.type !== "text_delta" || typeof delta.text !== "string") {
      return null;
    }

    return { content: delta.text, reasoningContent: null, finishReason: null };
  }

  if (eventType === "message_delta") {
    const delta = asObject(objectValue.delta);
    const stopReason =
      delta && typeof delta.stop_reason === "string" ? delta.stop_reason : null;

    return stopReason
      ? { content: null, reasoningContent: null, finishReason: stopReason }
      : null;
  }

  if (eventType === "message_stop") {
    return { content: null, reasoningContent: null, finishReason: "stop" };
  }

  const content = extractAnthropicContent(objectValue.content);
  const finishReason =
    typeof objectValue.stop_reason === "string" ? objectValue.stop_reason : null;

  if (!content && !finishReason) {
    return null;
  }

  return {
    content,
    reasoningContent: null,
    finishReason,
  };
}

export function parseChatChunkPayload(
  data: unknown,
  format: APIFormat
): StreamChunk | null {
  return format === "anthropic" ? parseAnthropicChunk(data) : parseOpenAIChunk(data);
}
