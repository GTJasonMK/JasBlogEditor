import { useEffect } from "react";
import { isTauri } from "@/platform/runtime";
import { useEditorStore } from "@/store";
import { useWindowStore } from "@/store/windowStore";
import {
  globalShortcutController,
  type ShortcutDefinition,
  type ShortcutRegistrationApi,
} from "./globalShortcutController";

/**
 * 全局快捷键注册（仅 Tauri 环境）
 *
 * - Ctrl+Alt+X：切换迷你模式
 * - Ctrl+Alt+S：进入迷你模式并聚焦到文末
 */
export function useGlobalShortcutsEffect(): void {
  useEffect(() => {
    if (!isTauri()) return;

    let disposed = false;
    let releaseShortcuts: (() => Promise<void>) | null = null;

    const shortcuts: ShortcutDefinition[] = [
      {
        accelerator: "Ctrl+Alt+X",
        handler: (event) => {
          if (event.state !== "Pressed") return;
          const { currentFile } = useEditorStore.getState();
          if (currentFile) {
            useWindowStore.getState().toggleMiniMode();
          }
        },
      },
      {
        accelerator: "Ctrl+Alt+S",
        handler: async (event) => {
          if (event.state !== "Pressed") return;

          const { currentFile } = useEditorStore.getState();
          const { miniMode } = useWindowStore.getState();
          if (!currentFile) return;

          if (!miniMode) {
            await useWindowStore.getState().enterMiniMode();
          }

          const { getCurrentWindow } = await import("@tauri-apps/api/window");
          await getCurrentWindow().setFocus();

          setTimeout(() => {
            window.dispatchEvent(new Event("mini-mode-focus"));
          }, 100);
        },
      },
    ];

    const setupGlobalShortcuts = async () => {
      try {
        const { register, isRegistered } = await import(
          "@tauri-apps/plugin-global-shortcut"
        );
        const { unregister } = await import("@tauri-apps/plugin-global-shortcut");
        const shortcutApi: ShortcutRegistrationApi = {
          register,
          isRegistered,
          unregister,
        };

        releaseShortcuts = await globalShortcutController.acquire(shortcutApi, shortcuts);

        if (disposed && releaseShortcuts) {
          const release = releaseShortcuts;
          releaseShortcuts = null;
          await release();
        }
      } catch (error) {
        console.error("[GlobalShortcut] 注册全局快捷键失败:", error);
      }
    };

    setupGlobalShortcuts();

    return () => {
      disposed = true;
      if (!releaseShortcuts) return;

      const release = releaseShortcuts;
      releaseShortcuts = null;
      void release().catch((error) => {
        console.error("[GlobalShortcut] 注销全局快捷键失败:", error);
      });
    };
  }, []);
}
