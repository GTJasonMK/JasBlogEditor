/**
 * LLM 服务层公开 API
 *
 * 统一导出所有 LLM 相关的类型、工具函数和客户端。
 */

// 类型
export type {
  APIFormat,
  ChatMessage,
  CollectParams,
  ContentCollectMode,
  LLMClientOptions,
  LLMConfig,
  LLMLogEntry,
  LLMSettings,
  StreamChatParams,
  StreamChunk,
  StreamCollectResult,
} from './types';

// URL 工具 + 格式检测
export {
  fixBaseUrl,
  buildAnthropicEndpoint,
  buildOpenaiEndpoint,
  detectApiFormat,
  getBrowserHeaders,
} from './apiFormatUtils';

// SSE 解析
export { parseSSEStream } from './sseParser';

// 请求日志
export { logRequest, logSuccess, logError, getRecentLogs } from './requestLogger';

// 核心客户端
export { LLMClient } from './llmClient';
