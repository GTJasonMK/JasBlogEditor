/**
 * 统一 LLM 客户端
 *
 * 完整移植参考实现 llm_tool.py 的 LLMClient 类：
 * - 自动检测 API 格式（claude → Anthropic；其他 → OpenAI）
 * - 兼容中转站（base_url 智能构建端点）
 * - 流式调用 stream_chat + 收集方法 stream_and_collect
 * - 三种收集模式：content_only / with_reasoning / reasoning_only
 * - 工厂方法 createFromConfig
 * - 可观测性：全链路请求日志
 *
 * HTTP 通过 @tauri-apps/plugin-http 的 fetch 发起（绕过 WebView CORS）。
 */

import type {
  APIFormat,
  CollectParams,
  ContentCollectMode,
  LLMClientOptions,
  LLMConfig,
  StreamChatParams,
  StreamChunk,
  StreamCollectResult,
} from './types';
import {
  buildAnthropicEndpoint,
  buildOpenaiEndpoint,
  detectApiFormat,
  getBrowserHeaders,
} from './apiFormatUtils';
import { parseSSEStream } from './sseParser';
import { logRequest, logSuccess, logError } from './requestLogger';

/** 生成短请求 ID（8位 hex） */
function generateRequestId(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 获取 fetch 函数。
 * Tauri 环境使用 @tauri-apps/plugin-http 的 fetch（绕过 CORS）；
 * 浏览器/Node 环境使用全局 fetch（用于测试）。
 */
async function getFetch(): Promise<typeof globalThis.fetch> {
  try {
    const mod = await import('@tauri-apps/plugin-http');
    return mod.fetch;
  } catch {
    // 非 Tauri 环境回退到全局 fetch
    return globalThis.fetch;
  }
}

export class LLMClient {
  private readonly _apiKey: string;
  private readonly _baseUrl: string | undefined;
  private readonly _simulateBrowser: boolean;

  constructor(options: LLMClientOptions = {}) {
    const { apiKey, baseUrl, strictMode = false, simulateBrowser = false } = options;

    if (strictMode) {
      if (!apiKey) {
        throw new Error('严格模式下必须提供 API Key');
      }
      this._apiKey = apiKey;
      this._baseUrl = baseUrl;
    } else {
      // 兼容模式：必须有 apiKey（通过参数或配置传入）
      const key = apiKey;
      if (!key) {
        throw new Error('缺少 API Key 配置，请在设置中填写 API Key。');
      }
      this._apiKey = key;
      this._baseUrl = baseUrl;
    }

    this._simulateBrowser = simulateBrowser;
  }

  // ===== 公开方法 =====

  /**
   * 流式聊天请求（自动检测 API 格式）
   *
   * @yields StreamChunk
   */
  async *streamChat(params: StreamChatParams): AsyncGenerator<StreamChunk> {
    const model = params.model || 'gpt-3.5-turbo';
    const format = detectApiFormat(model);
    const timeout = params.timeout ?? 120;

    if (format === 'anthropic') {
      yield* this._streamAnthropic(params, model, format, timeout);
    } else {
      yield* this._streamOpenAI(params, model, format, timeout);
    }
  }

  /**
   * 流式请求并收集完整响应（便捷方法）
   */
  async streamAndCollect(params: CollectParams): Promise<StreamCollectResult> {
    const mode: ContentCollectMode = params.collectMode ?? 'content_only';
    let content = '';
    let reasoning = '';
    let finishReason: string | null = null;
    let chunkCount = 0;

    for await (const chunk of this.streamChat(params)) {
      chunkCount++;

      if (params.logChunks && chunkCount <= 3) {
        console.debug(`收到第 ${chunkCount} 个 chunk:`, chunk);
      }

      if (mode === 'content_only' || mode === 'with_reasoning') {
        if (chunk.content) content += chunk.content;
      }

      if (mode === 'with_reasoning' || mode === 'reasoning_only') {
        if (chunk.reasoningContent) reasoning += chunk.reasoningContent;
      }

      if (chunk.finishReason) finishReason = chunk.finishReason;
    }

    return { content, reasoning, finishReason, chunkCount };
  }

  /**
   * 工厂方法：从配置字典创建客户端
   */
  static createFromConfig(
    config: LLMConfig,
    strictMode = false,
    simulateBrowser = true,
  ): LLMClient {
    return new LLMClient({
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      strictMode,
      simulateBrowser,
    });
  }

  // ===== OpenAI 格式 =====

  private async *_streamOpenAI(
    params: StreamChatParams,
    model: string,
    format: APIFormat,
    timeout: number,
  ): AsyncGenerator<StreamChunk> {
    const endpoint = this._baseUrl
      ? buildOpenaiEndpoint(this._baseUrl)
      : 'https://api.openai.com/v1/chat/completions';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this._apiKey}`,
      ...(this._simulateBrowser ? getBrowserHeaders() : {}),
    };

    const payload: Record<string, unknown> = {
      model,
      messages: params.messages.map(m => ({ role: m.role, content: m.content })),
      stream: true,
    };
    if (params.temperature !== undefined) payload.temperature = params.temperature;
    if (params.topP !== undefined) payload.top_p = params.topP;
    if (params.maxTokens !== undefined) payload.max_tokens = params.maxTokens;
    if (params.responseFormat) payload.response_format = { type: params.responseFormat };

    // 创建请求日志
    const requestId = generateRequestId();
    const logEntry = logRequest({
      requestId,
      apiFormat: format,
      endpoint,
      model,
      messages: params.messages,
      temperature: params.temperature,
      maxTokens: params.maxTokens,
      timeout,
      baseUrl: this._baseUrl || 'https://api.openai.com',
      apiKey: this._apiKey,
      extraParams: params.topP || params.responseFormat
        ? { topP: params.topP, responseFormat: params.responseFormat }
        : undefined,
    });

    let collectedContent = '';
    let chunkCount = 0;

    try {
      const fetchFn = await getFetch();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout * 1000);

      const response = await fetchFn(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        const errorMsg = errorText.slice(0, 500);
        await logError(logEntry, 'HTTPError', errorMsg, response.status);
        throw new Error(`OpenAI API 错误(${response.status}): ${errorMsg}`);
      }

      if (!response.body) {
        throw new Error('响应体为空，无法解析流式数据');
      }

      for await (const chunk of parseSSEStream(response.body, 'openai')) {
        if (chunk.content) {
          chunkCount++;
          collectedContent += chunk.content;
        }
        yield chunk;
      }

      await logSuccess(logEntry, collectedContent.length, chunkCount, collectedContent);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      const errorName = e instanceof Error ? e.name : 'UnknownError';
      if (errorName === 'AbortError') {
        await logError(logEntry, 'TimeoutError', `请求超时(${timeout}秒)`);
        throw new Error(`OpenAI API 请求超时(${timeout}秒)`);
      }
      if (!errorMsg.includes('OpenAI API 错误')) {
        await logError(logEntry, errorName, errorMsg);
      }
      throw e;
    }
  }

  // ===== Anthropic 格式 =====

  private async *_streamAnthropic(
    params: StreamChatParams,
    model: string,
    format: APIFormat,
    timeout: number,
  ): AsyncGenerator<StreamChunk> {
    if (!this._baseUrl) {
      throw new Error('Anthropic 格式必须提供 base_url（官方 API 或中转站地址）');
    }

    const endpoint = buildAnthropicEndpoint(this._baseUrl);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this._apiKey}`,
      'anthropic-version': '2023-06-01',
      ...(this._simulateBrowser ? getBrowserHeaders() : {}),
    };

    // Anthropic 格式：system 消息单独传递
    let systemContent: string | undefined;
    const anthropicMessages: Array<{ role: string; content: string }> = [];

    for (const msg of params.messages) {
      if (msg.role === 'system') {
        systemContent = msg.content;
      } else {
        anthropicMessages.push({ role: msg.role, content: msg.content });
      }
    }

    const payload: Record<string, unknown> = {
      model,
      messages: anthropicMessages,
      stream: true,
      max_tokens: params.maxTokens ?? 4096,
    };
    if (systemContent) payload.system = systemContent;
    if (params.temperature !== undefined) payload.temperature = params.temperature;

    // 创建请求日志
    const requestId = generateRequestId();
    const allMessages = [
      ...(systemContent ? [{ role: 'system', content: systemContent }] : []),
      ...anthropicMessages,
    ];
    const logEntry = logRequest({
      requestId,
      apiFormat: format,
      endpoint,
      model,
      messages: allMessages,
      temperature: params.temperature,
      maxTokens: params.maxTokens,
      timeout,
      baseUrl: this._baseUrl,
      apiKey: this._apiKey,
    });

    let collectedContent = '';
    let chunkCount = 0;

    try {
      const fetchFn = await getFetch();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout * 1000);

      const response = await fetchFn(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        const errorMsg = errorText.slice(0, 500);
        await logError(logEntry, 'HTTPError', errorMsg, response.status);
        throw new Error(`Anthropic API 错误(${response.status}): ${errorMsg}`);
      }

      if (!response.body) {
        throw new Error('响应体为空，无法解析流式数据');
      }

      for await (const chunk of parseSSEStream(response.body, 'anthropic')) {
        if (chunk.content) {
          chunkCount++;
          collectedContent += chunk.content;
        }
        yield chunk;
      }

      await logSuccess(logEntry, collectedContent.length, chunkCount, collectedContent);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      const errorName = e instanceof Error ? e.name : 'UnknownError';
      if (errorName === 'AbortError') {
        await logError(logEntry, 'TimeoutError', `请求超时(${timeout}秒)`);
        throw new Error(`Anthropic API 请求超时(${timeout}秒)`);
      }
      if (!errorMsg.includes('Anthropic API 错误')) {
        await logError(logEntry, errorName, errorMsg);
      }
      throw e;
    }
  }
}
