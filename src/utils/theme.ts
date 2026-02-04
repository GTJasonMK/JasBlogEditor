/**
 * 主题管理工具函数
 */

import type { ThemeMode } from '@/types';

/**
 * 应用主题到 DOM
 * @param mode 主题模式
 */
export function applyTheme(mode: ThemeMode): void {
  const root = document.documentElement;

  if (mode === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', prefersDark);
  } else {
    root.classList.toggle('dark', mode === 'dark');
  }
}

/**
 * 获取当前生效的主题
 * @param mode 用户设置的主题模式
 * @returns 实际生效的主题（light 或 dark）
 */
export function getEffectiveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return mode;
}

/**
 * 监听系统主题变化
 * @param callback 变化时的回调函数
 * @returns 清理函数
 */
export function setupSystemThemeListener(callback: () => void): () => void {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', callback);
  return () => mediaQuery.removeEventListener('change', callback);
}
