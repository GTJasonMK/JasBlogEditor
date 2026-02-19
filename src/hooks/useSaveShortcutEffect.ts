import { useEffect } from "react";

interface UseSaveShortcutEffectOptions {
  enabled: boolean;
  onSave: () => Promise<void>;
}

/**
 * 窗口内快捷键支持（Ctrl+S 保存）
 */
export function useSaveShortcutEffect(options: UseSaveShortcutEffectOptions): void {
  const { enabled, onSave } = options;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S 保存
      const isSaveHotkey = (e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "s";
      if (isSaveHotkey) {
        e.preventDefault();
        if (enabled) {
          void onSave();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, onSave]);
}
