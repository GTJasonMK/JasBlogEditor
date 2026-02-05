import { useEffect } from "react";
import { isTauri } from "@/platform/runtime";
import { useEditorStore } from "@/store";
import { useWindowStore } from "@/store/windowStore";

/**
 * 全局快捷键注册（仅 Tauri 环境）
 *
 * - Ctrl+Alt+X：切换迷你模式
 * - Ctrl+Alt+S：进入迷你模式并聚焦到文末
 */
export function useGlobalShortcutsEffect(): void {
  useEffect(() => {
    if (!isTauri()) return;

    let unregisterAll: (() => Promise<void>) | null = null;

    const setupGlobalShortcuts = async () => {
      try {
        const { register, unregisterAll: unregAll, isRegistered } = await import(
          "@tauri-apps/plugin-global-shortcut"
        );

        // 保存 unregisterAll 引用以便清理
        unregisterAll = unregAll;

        // 检查并跳过已注册的快捷键（避免热重载时重复注册错误）
        const isCtrlAltXRegistered = await isRegistered("Ctrl+Alt+X");
        const isCtrlAltSRegistered = await isRegistered("Ctrl+Alt+S");

        // Ctrl+Alt+X 切换迷你模式
        if (!isCtrlAltXRegistered) {
          await register("Ctrl+Alt+X", (event) => {
            if (event.state === "Pressed") {
              const { currentFile } = useEditorStore.getState();
              if (currentFile) {
                useWindowStore.getState().toggleMiniMode();
              }
            }
          });
        }

        // Ctrl+Alt+S 直接进入迷你写作模式并聚焦到文末
        if (!isCtrlAltSRegistered) {
          await register("Ctrl+Alt+S", async (event) => {
            if (event.state === "Pressed") {
              const { currentFile } = useEditorStore.getState();
              const { miniMode } = useWindowStore.getState();
              if (!currentFile) return;

              if (!miniMode) {
                // 未在迷你模式，先进入
                await useWindowStore.getState().enterMiniMode();
              }

              // 窗口获取焦点
              const { getCurrentWindow } = await import("@tauri-apps/api/window");
              await getCurrentWindow().setFocus();

              // 触发聚焦到文末
              setTimeout(() => {
                window.dispatchEvent(new Event("mini-mode-focus"));
              }, 100);
            }
          });
        }
      } catch (error) {
        console.error("[GlobalShortcut] 注册全局快捷键失败:", error);
      }
    };

    setupGlobalShortcuts();

    return () => {
      if (unregisterAll) {
        unregisterAll().catch(console.error);
      }
    };
  }, []);
}
