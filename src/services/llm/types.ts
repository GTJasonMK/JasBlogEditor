/**
 * LLM 类型定义
 *
 * 对齐参考实现 llm_tool.py / api_format_utils.py 的全部类型。
 */

// ===== 枚举 =====

/** API 协议格式 */
export type APIFormat = 'openai' | 'anthropic';

/** 流式响应收集模式 */
export type ContentCollectMode =
  | 'content_only'      // 仅收集最终答案（用于结构化输出）
  | 'with_reasoning'    // 收集答案 + 思考过程
  | 'reasoning_only';   // 仅收集思考过程

// ===== 数据结构 =====

/** 聊天消息 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** 流式 chunk（从 SSE 解析后产出） */
export interface StreamChunk {
  content: string | null;
  reasoningContent?: string | null;
  finishReason: string | null;
}

/** 流式收集结果 */
export interface StreamCollectResult {
  content: string;
  reasoning: string;
  finishReason: string | null;
  chunkCount: number;
}

// ===== 客户端配置 =====

/** LLM 客户端初始化参数 */
export interface LLMClientOptions {
  apiKey?: string;
  baseUrl?: string;
  /** 严格模式：为 true 时不回退环境变量，必须显式传参 */
  strictMode?: boolean;
  /** 模拟浏览器请求头（部分中转站需要） */
  simulateBrowser?: boolean;
}

/** 用于 createFromConfig 的配置字典 */
export interface LLMConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

/** 流式聊天请求参数 */
export interface StreamChatParams {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  /** 响应格式（仅 OpenAI 格式支持，如 "json_object"） */
  responseFormat?: string;
  /** 超时（秒） */
  timeout?: number;
}

/** stream_and_collect 的额外参数 */
export interface CollectParams extends StreamChatParams {
  collectMode?: ContentCollectMode;
  logChunks?: boolean;
}

// ===== 日志结构 =====

/** 请求日志条目（JSONL 中的一行） */
export interface LLMLogEntry {
  requestId: string;
  timestamp: string;
  apiFormat: APIFormat;
  endpoint: string;
  baseUrl: string;
  apiKeyMasked: string;
  model: string;
  messagesCount: number;
  messagesPreview: Array<{ role: string; contentPreview: string }>;
  temperature?: number | null;
  maxTokens?: number | null;
  timeout: number;
  extraParams?: Record<string, unknown> | null;
  status: 'pending' | 'success' | 'error';
  startTime: number;
  // 成功时追加
  durationMs?: number;
  responseLength?: number;
  chunkCount?: number;
  responsePreview?: string;
  // 失败时追加
  errorType?: string;
  errorMessage?: string;
  statusCode?: number;
}

// ===== 设置 =====

/** LLM 相关设置（持久化到 settings.json） */
export interface LLMSettings {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}
