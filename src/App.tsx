import { useEffect } from 'react';
import { Toolbar, Sidebar, EditorArea, MetadataPanel, MiniModeLayout } from '@/components';
import { useSettingsStore, useFileStore, useEditorStore } from '@/store';
import { isTauri } from '@/platform/runtime';

function App() {
  const { loadSettings, settings } = useSettingsStore();
  const { setWorkspacePath, loadFileTree } = useFileStore();
  const saveFile = useEditorStore((state) => state.saveFile);
  const currentFile = useEditorStore((state) => state.currentFile);
  const miniMode = useEditorStore((state) => state.miniMode);

  // 初始化：加载设置
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // 设置加载完成后，初始化工作区
  useEffect(() => {
    if (settings.workspacePath) {
      setWorkspacePath(settings.workspacePath);
      loadFileTree();
    }
  }, [settings.workspacePath, setWorkspacePath, loadFileTree]);

  // 全局快捷键注册
  useEffect(() => {
    if (!isTauri()) return;

    let unregisterAll: (() => Promise<void>) | null = null;

    const setupGlobalShortcuts = async () => {
      try {
        const { register, unregister, unregisterAll: unregAll } = await import('@tauri-apps/plugin-global-shortcut');

        // 先注销可能已存在的快捷键（避免热重载时重复注册）
        try {
          await unregister('Ctrl+Alt+X');
          await unregister('Ctrl+Alt+S');
        } catch {
          // 忽略注销错误
        }

        // Ctrl+Alt+X 切换迷你模式
        await register('Ctrl+Alt+X', (event) => {
          if (event.state === 'Pressed') {
            const { currentFile } = useEditorStore.getState();
            if (currentFile) {
              useEditorStore.getState().toggleMiniMode();
            }
          }
        });

        // Ctrl+Alt+S 直接进入迷你写作模式并聚焦到文末
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

        unregisterAll = unregAll;
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
