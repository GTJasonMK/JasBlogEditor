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
      if (e.ctrlKey && !e.altKey && e.key === "s") {
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

