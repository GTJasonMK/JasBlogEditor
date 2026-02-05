import { useEffect } from 'react';
import { Toolbar, Sidebar, EditorArea, MetadataPanel, MiniModeLayout } from '@/components';
import { useSettingsStore, useFileStore, useEditorStore } from '@/store';
import { isTauri } from '@/platform/runtime';
import { applyTheme, setupSystemThemeListener } from '@/utils';

function App() {
  const { loadSettings, settings } = useSettingsStore();
  const { setWorkspacePath, setWorkspaceType, detectWorkspaceType, loadFileTree } = useFileStore();
  const saveFile = useEditorStore((state) => state.saveFile);
  const currentFile = useEditorStore((state) => state.currentFile);
  const miniMode = useEditorStore((state) => state.miniMode);

  // 初始化：加载设置
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // 主题初始化和系统主题变化监听
  useEffect(() => {
    const theme = settings.theme || 'system';
    applyTheme(theme);

    // 当主题为 system 时，监听系统主题变化
    if (theme === 'system') {
      return setupSystemThemeListener(() => applyTheme('system'));
    }
  }, [settings.theme]);

  // 设置加载完成后，初始化工作区
  useEffect(() => {
    const initWorkspace = async () => {
      if (!settings.workspacePath) return;

      setWorkspacePath(settings.workspacePath);

      // 优先使用已保存的工作区类型，否则重新检测
      if (settings.workspaceType) {
        setWorkspaceType(settings.workspaceType);
      } else {
        const detectedType = await detectWorkspaceType();
        setWorkspaceType(detectedType);
      }

      await loadFileTree();
    };

    initWorkspace();
  }, [settings.workspacePath, settings.workspaceType, setWorkspacePath, setWorkspaceType, detectWorkspaceType, loadFileTree]);

  // 全局快捷键注册
  useEffect(() => {
    if (!isTauri()) return;

    let unregisterAll: (() => Promise<void>) | null = null;

    const setupGlobalShortcuts = async () => {
      try {
        const { register, unregisterAll: unregAll, isRegistered } = await import('@tauri-apps/plugin-global-shortcut');

        // 保存 unregisterAll 引用以便清理
        unregisterAll = unregAll;

        // 检查并跳过已注册的快捷键（避免热重载时重复注册错误）
        const isCtrlAltXRegistered = await isRegistered('Ctrl+Alt+X');
        const isCtrlAltSRegistered = await isRegistered('Ctrl+Alt+S');

        // Ctrl+Alt+X 切换迷你模式
        if (!isCtrlAltXRegistered) {
          await register('Ctrl+Alt+X', (event) => {
            if (event.state === 'Pressed') {
              const { currentFile } = useEditorStore.getState();
              if (currentFile) {
                useEditorStore.getState().toggleMiniMode();
              }
            }
          });
        }

        // Ctrl+Alt+S 直接进入迷你写作模式并聚焦到文末
        if (!isCtrlAltSRegistered) {
          await register('Ctrl+Alt+S', async (event) => {
            if (event.state === 'Pressed') {
              const { currentFile, miniMode } = useEditorStore.getState();
              if (!currentFile) return;

              if (!miniMode) {
                // 未在迷你模式，先进入
                await useEditorStore.getState().enterMiniMode();
              }

              // 窗口获取焦点
              const { getCurrentWindow } = await import('@tauri-apps/api/window');
              await getCurrentWindow().setFocus();

              // 触发聚焦到文末
              setTimeout(() => {
                window.dispatchEvent(new Event('mini-mode-focus'));
              }, 100);
            }
          });
        }
      } catch (error) {
        console.error('[GlobalShortcut] 注册全局快捷键失败:', error);
      }
    };

    setupGlobalShortcuts();

    return () => {
      if (unregisterAll) {
        unregisterAll().catch(console.error);
      }
    };
  }, []);

  // 窗口内快捷键支持（Ctrl+S 保存）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S 保存
      if (e.ctrlKey && !e.altKey && e.key === 's') {
        e.preventDefault();
        if (currentFile?.isDirty) {
          saveFile();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentFile?.isDirty, saveFile]);

  // 迷你模式：只显示编辑区域
  if (miniMode) {
    return <MiniModeLayout />;
  }

  return (
    <div className="h-screen flex flex-col bg-[var(--color-bg)] overflow-hidden">
      <Toolbar />
      <div className="flex-1 min-h-0 flex overflow-hidden">
        <Sidebar />
        <EditorArea />
        <MetadataPanel />
      </div>
    </div>
  );
}

export default App;
