import { useEffect } from 'react';

interface UseAIShortcutEffectOptions {
  enabled: boolean;
  onToggle: () => void;
}

/**
 * Ctrl+I 切换 AI 助手面板
 */
export function useAIShortcutEffect(options: UseAIShortcutEffectOptions): void {
  const { enabled, onToggle } = options;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isAIHotkey = (e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'i';
      if (isAIHotkey) {
        e.preventDefault();
        if (enabled) {
          onToggle();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, onToggle]);
}
