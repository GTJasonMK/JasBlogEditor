/**
 * API 格式工具函数
 *
 * 完整移植参考实现 api_format_utils.py 的全部能力：
 * - fixBaseUrl: 去尾斜杠、修复 path 双斜杠但保留 http://
 * - buildOpenaiEndpoint / buildAnthropicEndpoint: 智能构建端点
 * - detectApiFormat: 根据模型名自动识别格式
 * - getBrowserHeaders: 模拟浏览器请求头
 */

import type { APIFormat } from './types';

// ===== URL 修复 =====

const SCHEME_RE = /^(https?:\/\/)(.*)$/i;

/**
 * 修复 base_url 中可能存在的问题
 * - 移除尾部斜杠
 * - 修复双斜杠问题（协议部分保留，仅归一化 path 的连续斜杠）
 */
export function fixBaseUrl(baseUrl: string): string {
  if (!baseUrl) return baseUrl;

  let fixed = baseUrl.replace(/\/+$/, '');

  const m = SCHEME_RE.exec(fixed);
  const scheme = m ? m[1] : '';
  let rest = m ? m[2] : fixed;

  if (rest.includes('//')) {
    rest = rest.replace(/\/{2,}/g, '/');
    fixed = scheme ? `${scheme}${rest}` : rest;
  }

  return fixed;
}

// ===== 端点构建 =====

/**
 * 构建 Anthropic Messages API 端点
 *
 * 智能处理各种 base_url 格式：
 * - http://api.example.com → http://api.example.com/v1/messages
 * - http://api.example.com/v1 → http://api.example.com/v1/messages
 * - http://api.example.com/v1/messages → 保持不变
 */
export function buildAnthropicEndpoint(baseUrl: string): string {
  const base = fixBaseUrl(baseUrl);
  if (base.endsWith('/messages')) return base;
  if (base.endsWith('/v1')) return `${base}/messages`;
  return `${base}/v1/messages`;
}

/**
 * 构建 OpenAI Chat Completions API 端点
 *
 * 智能处理各种 base_url 格式：
 * - http://api.example.com → http://api.example.com/v1/chat/completions
 * - http://api.example.com/v1 → http://api.example.com/v1/chat/completions
 * - http://api.example.com/v1/chat/completions → 保持不变
 */
export function buildOpenaiEndpoint(baseUrl: string): string {
  const base = fixBaseUrl(baseUrl);
  if (base.endsWith('/chat/completions')) return base;
  if (base.endsWith('/v1')) return `${base}/chat/completions`;
  return `${base}/v1/chat/completions`;
}

// ===== 格式检测 =====

/**
 * 根据模型名称自动检测 API 格式
 *
 * - 模型名包含 'claude' → Anthropic
 * - 其他 → OpenAI
 */
export function detectApiFormat(modelName: string): APIFormat {
  if (!modelName) return 'openai';
  return modelName.toLowerCase().includes('claude') ? 'anthropic' : 'openai';
}

// ===== 浏览器请求头 =====

/**
 * 模拟浏览器请求头。
 *
 * 这里只保留 fetch 规范允许脚本设置、且对常见中转站判别有帮助的字段。
 * `User-Agent`、`Accept-Encoding`、`Connection`、`Sec-Fetch-*` 等 forbidden
 * headers 在浏览器和 tauri-plugin-http 下都会被拦截或跳过，继续传只会产生噪音警告。
 */
export function getBrowserHeaders(): Record<string, string> {
  return {
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  };
}
