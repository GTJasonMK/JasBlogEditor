/**
 * SSE（Server-Sent Events）流解析器
 *
 * 处理两种格式：
 * 1. OpenAI Chat Completions — choices[0].delta.content + 可选 reasoning_content
 * 2. Anthropic Messages — content_block_delta / message_delta / message_stop
 */

import type { APIFormat, StreamChunk } from './types';

/**
 * 从 ReadableStream 中逐行解析 SSE 事件并产出 StreamChunk
 *
 * @param body   fetch Response.body（ReadableStream<Uint8Array>）
 * @param format API 格式
 * @yields StreamChunk
 */
export async function* parseSSEStream(
  body: ReadableStream<Uint8Array>,
  format: APIFormat,
): AsyncGenerator<StreamChunk> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      // 最后一段可能不完整，保留到下次
      buffer = lines.pop()!;

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;

        const data = trimmed.slice(6); // 移除 "data: " 前缀
        if (data === '[DONE]') return;

        let parsed: unknown;
        try {
          parsed = JSON.parse(data);
        } catch {
          // 无效 JSON，跳过
          continue;
        }

        const chunk = format === 'anthropic'
          ? parseAnthropicChunk(parsed)
          : parseOpenAIChunk(parsed);

        if (chunk) yield chunk;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// ===== OpenAI 格式解析 =====

function parseOpenAIChunk(data: unknown): StreamChunk | null {
  const obj = data as Record<string, unknown>;
  const choices = obj.choices as Array<Record<string, unknown>> | undefined;
  if (!choices || choices.length === 0) return null;

  const choice = choices[0];
  const delta = choice.delta as Record<string, unknown> | undefined;
  if (!delta) return null;

  const content = (delta.content as string) ?? null;
  const finishReason = (choice.finish_reason as string) ?? null;

  // DeepSeek R1 等模型的 reasoning_content 字段
  const reasoningContent = (delta.reasoning_content as string) ?? null;

  return { content, reasoningContent, finishReason };
}

// ===== Anthropic 格式解析 =====

function parseAnthropicChunk(data: unknown): StreamChunk | null {
  const obj = data as Record<string, unknown>;
  const eventType = obj.type as string;

  if (eventType === 'content_block_delta') {
    const delta = obj.delta as Record<string, unknown> | undefined;
    if (delta?.type === 'text_delta') {
      const text = (delta.text as string) || null;
      return { content: text, finishReason: null };
    }
    return null;
  }

  if (eventType === 'message_delta') {
    const delta = obj.delta as Record<string, unknown> | undefined;
    const stopReason = (delta?.stop_reason as string) ?? null;
    if (stopReason) {
      return { content: null, finishReason: stopReason };
    }
    return null;
  }

  if (eventType === 'message_stop') {
    return { content: null, finishReason: 'stop' };
  }

  // 其他事件类型（message_start, content_block_start 等）忽略
  return null;
}
