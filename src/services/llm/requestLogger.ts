/**
 * LLM 请求日志记录器
 *
 * 完整移植参考实现 llm_request_logger.py：
 * - JSONL 落盘到 %APPDATA%/JasBlogEditor/llm_requests.jsonl
 * - API Key 脱敏（仅显示前4位 + 后4位）
 * - 内容截断（保留前后部分，中间省略）
 * - 日志条数上限清理
 * - log_request / log_success / log_error 三阶段记录
 */

import { invokeTauri } from '@/platform/tauri';
import { isTauri } from '@/platform/runtime';
import type { LLMLogEntry } from './types';

/** 日志记录器配置 */
interface LoggerConfig {
  maxEntries: number;
}

const DEFAULT_CONFIG: LoggerConfig = { maxEntries: 1000 };

// 缓存的应用数据目录路径
let cachedAppDataDir: string | null = null;

async function getLogFilePath(): Promise<string> {
  if (!cachedAppDataDir) {
    cachedAppDataDir = await invokeTauri('get_app_data_dir');
  }
  // 统一使用正斜杠，兼容 Rust 端的路径拼接
  const sep = cachedAppDataDir.includes('\\') ? '\\' : '/';
  return `${cachedAppDataDir}${sep}llm_requests.jsonl`;
}

/** 截断内容，保留前后部分 */
function truncateContent(content: string, maxLength = 200): string {
  if (!content || content.length <= maxLength) return content;
  const half = Math.floor(maxLength / 2);
  return `${content.slice(0, half)}...(${content.length}chars)...${content.slice(-half)}`;
}

/** 遮蔽 API Key，仅显示前后4位 */
function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 12) return '***';
  return `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`;
}

// ===== 公开 API =====

/**
 * 记录请求开始（返回日志条目供后续更新）
 */
export function logRequest(params: {
  requestId: string;
  apiFormat: 'openai' | 'anthropic';
  endpoint: string;
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  maxTokens?: number;
  timeout: number;
  baseUrl: string;
  apiKey: string;
  extraParams?: Record<string, unknown>;
}): LLMLogEntry {
  return {
    requestId: params.requestId,
    timestamp: new Date().toISOString(),
    apiFormat: params.apiFormat,
    endpoint: params.endpoint,
    baseUrl: params.baseUrl,
    apiKeyMasked: maskApiKey(params.apiKey),
    model: params.model,
    messagesCount: params.messages.length,
    messagesPreview: params.messages.slice(0, 3).map(msg => ({
      role: msg.role,
      contentPreview: truncateContent(msg.content),
    })),
    temperature: params.temperature ?? null,
    maxTokens: params.maxTokens ?? null,
    timeout: params.timeout,
    extraParams: params.extraParams ?? null,
    status: 'pending',
    startTime: Date.now(),
  };
}

/**
 * 记录请求成功
 */
export async function logSuccess(
  entry: LLMLogEntry,
  responseLength: number,
  chunkCount: number,
  responsePreview: string,
): Promise<void> {
  const finalEntry = {
    ...entry,
    status: 'success' as const,
    durationMs: Date.now() - entry.startTime,
    responseLength,
    chunkCount,
    responsePreview: truncateContent(responsePreview, 300),
  };

  // 移除临时字段
  const { startTime: _, ...loggable } = finalEntry;
  await writeLog(loggable);
}

/**
 * 记录请求失败
 */
export async function logError(
  entry: LLMLogEntry,
  errorType: string,
  errorMessage: string,
  statusCode?: number,
): Promise<void> {
  const finalEntry = {
    ...entry,
    status: 'error' as const,
    durationMs: Date.now() - entry.startTime,
    errorType,
    errorMessage: truncateContent(errorMessage, 500),
    ...(statusCode ? { statusCode } : {}),
  };

  const { startTime: _, ...loggable } = finalEntry;
  await writeLog(loggable);
}

// ===== 内部实现 =====

async function writeLog(entry: Record<string, unknown>): Promise<void> {
  if (!isTauri()) {
    // 非 Tauri 环境（如 Vite dev server 预览）只打印到控制台
    console.log('[LLM Log]', JSON.stringify(entry));
    return;
  }

  try {
    const logPath = await getLogFilePath();
    const line = JSON.stringify(entry) + '\n';
    await invokeTauri('append_file', { path: logPath, content: line });

    // 异步清理（不阻塞主流程）
    cleanupIfNeeded(logPath).catch(() => { /* 忽略清理失败 */ });
  } catch (e) {
    console.warn('写入 LLM 请求日志失败:', e);
  }
}

async function cleanupIfNeeded(logPath: string): Promise<void> {
  try {
    const content = await invokeTauri('read_file', { path: logPath });
    const lines = content.split('\n').filter(Boolean);
    if (lines.length > DEFAULT_CONFIG.maxEntries) {
      const keep = lines.slice(-DEFAULT_CONFIG.maxEntries);
      await invokeTauri('write_file', { path: logPath, content: keep.join('\n') + '\n' });
    }
  } catch {
    // 文件不存在或读取失败，忽略
  }
}

/**
 * 获取最近的日志条目（用于调试 UI）
 */
export async function getRecentLogs(count = 50): Promise<Array<Record<string, unknown>>> {
  if (!isTauri()) return [];
  try {
    const logPath = await getLogFilePath();
    const content = await invokeTauri('read_file', { path: logPath });
    const lines = content.split('\n').filter(Boolean);
    return lines.slice(-count).map(line => JSON.parse(line));
  } catch {
    return [];
  }
}
