/**
 * 文本处理工具函数
 */

import type { ReactNode } from 'react';

/**
 * 从 React children 中提取纯文本
 */
export function extractText(children: ReactNode): string {
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(extractText).join('');
  if (children && typeof children === 'object' && 'props' in children) {
    const element = children as { props: { children?: ReactNode } };
    return extractText(element.props.children);
  }
  return '';
}

/**
 * 为标题生成 URL 友好的 ID
 * 支持中文字符
 */
export function generateId(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u4e00-\u9fa5-]/g, '');
}
