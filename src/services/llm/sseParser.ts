/**
 * SSE（Server-Sent Events）流解析器
 *
 * 处理两种格式：
 * 1. OpenAI Chat Completions — choices[0].delta.content + 可选 reasoning_content
 * 2. Anthropic Messages — content_block_delta / message_delta / message_stop
 */

import type { APIFormat, StreamChunk } from './types';
import { parseChatChunkPayload } from './chunkParser';

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

        const chunk = parseChatChunkPayload(parsed, format);

        if (chunk) yield chunk;
      }
    }
  } finally {
    reader.releaseLock();
  }
}
