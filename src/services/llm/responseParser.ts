import { parseChatChunkPayload } from "./chunkParser";
import type { APIFormat, StreamChunk } from "./types";

export interface ParsedChatResponse {
  chunks: StreamChunk[];
  content: string;
}

function parseLineChunks(
  body: string,
  format: APIFormat,
  resolver: (line: string) => string | null
): StreamChunk[] {
  const chunks: StreamChunk[] = [];

  body.split("\n").forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) {
      return;
    }

    const payload = resolver(line);
    if (!payload || payload === "[DONE]") {
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(payload);
    } catch {
      return;
    }

    const chunk = parseChatChunkPayload(parsed, format);
    if (chunk) {
      chunks.push(chunk);
    }
  });

  return chunks;
}

function buildParsedResponse(chunks: StreamChunk[]): ParsedChatResponse {
  return {
    chunks,
    content: chunks.map((chunk) => chunk.content ?? "").join(""),
  };
}

function bodyLooksLikeSSE(body: string): boolean {
  return body.split("\n").some((line) => {
    const trimmed = line.trim();
    return (
      trimmed.startsWith("data:") ||
      trimmed.startsWith("event:") ||
      trimmed.startsWith(":")
    );
  });
}

function bodyLooksLikeNDJSON(body: string): boolean {
  const lines = body
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return false;
  }

  return lines.every((line) => line.startsWith("{"));
}

function parseSSEBody(body: string, format: APIFormat): ParsedChatResponse | null {
  const chunks = parseLineChunks(body, format, (line) => {
    if (!line.startsWith("data:")) {
      return null;
    }

    return line.slice("data:".length).trim();
  });

  return chunks.length > 0 ? buildParsedResponse(chunks) : null;
}

function parseNDJSONBody(body: string, format: APIFormat): ParsedChatResponse | null {
  const chunks = parseLineChunks(body, format, (line) =>
    line.startsWith("{") ? line : null
  );

  return chunks.length > 0 ? buildParsedResponse(chunks) : null;
}

function parseJSONObjectBody(
  body: string,
  format: APIFormat
): ParsedChatResponse | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return null;
  }

  const chunk = parseChatChunkPayload(parsed, format);
  return chunk ? buildParsedResponse([chunk]) : null;
}

function parsePlainTextBody(body: string): ParsedChatResponse {
  return buildParsedResponse([
    { content: body, reasoningContent: null, finishReason: null },
  ]);
}

export function parseChatResponseText(
  body: string,
  format: APIFormat
): ParsedChatResponse {
  const trimmed = body.trim();
  if (!trimmed) {
    throw new Error("模型返回内容为空。");
  }

  if (bodyLooksLikeSSE(trimmed)) {
    const parsed = parseSSEBody(trimmed, format);
    if (parsed) {
      return parsed;
    }
  }

  if (bodyLooksLikeNDJSON(trimmed)) {
    const parsed = parseNDJSONBody(trimmed, format);
    if (parsed) {
      return parsed;
    }
  }

  const jsonParsed = parseJSONObjectBody(trimmed, format);
  if (jsonParsed) {
    return jsonParsed;
  }

  return parsePlainTextBody(trimmed);
}
