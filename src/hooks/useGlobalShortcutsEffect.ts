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

    const registeredShortcuts = new Set<string>();
    let disposed = false;

    const setupGlobalShortcuts = async () => {
      try {
        const { register, isRegistered } = await import(
          "@tauri-apps/plugin-global-shortcut"
        );

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
          if (disposed) {
            const { unregister } = await import("@tauri-apps/plugin-global-shortcut");
            await unregister("Ctrl+Alt+X");
          } else {
            registeredShortcuts.add("Ctrl+Alt+X");
          }
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
          if (disposed) {
            const { unregister } = await import("@tauri-apps/plugin-global-shortcut");
            await unregister("Ctrl+Alt+S");
          } else {
            registeredShortcuts.add("Ctrl+Alt+S");
          }
        }
      } catch (error) {
        console.error("[GlobalShortcut] 注册全局快捷键失败:", error);
      }
    };

    setupGlobalShortcuts();

    return () => {
      disposed = true;
      if (registeredShortcuts.size === 0) return;

      void (async () => {
        try {
          const { unregister, isRegistered } = await import("@tauri-apps/plugin-global-shortcut");
          await Promise.all(
            Array.from(registeredShortcuts).map(async (shortcut) => {
              const exists = await isRegistered(shortcut);
              if (exists) {
                await unregister(shortcut);
              }
            })
          );
        } catch (error) {
          console.error("[GlobalShortcut] 注销全局快捷键失败:", error);
        }
      })();
    };
  }, []);
}
