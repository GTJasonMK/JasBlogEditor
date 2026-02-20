import { useCallback, useEffect } from "react";
import { Toolbar, Sidebar, EditorArea, MetadataPanel, MiniModeLayout } from "@/components";
import { useSettingsStore, useFileStore, useEditorStore, useWindowStore, useTemplateStore } from "@/store";
import { useGlobalShortcutsEffect, useSaveShortcutEffect, useThemeEffect, useWorkspaceInitEffect, useAIShortcutEffect } from "@/hooks";

function App() {
  const { loadSettings, saveSettings, settings } = useSettingsStore();
  const { initWorkspace } = useFileStore();
  const saveFile = useEditorStore((state) => state.saveFile);
  const currentFile = useEditorStore((state) => state.currentFile);
  const viewMode = useEditorStore((state) => state.viewMode);
  const toggleAIPanel = useEditorStore((state) => state.toggleAIPanel);
  const miniMode = useWindowStore((state) => state.miniMode);
  const loadTemplates = useTemplateStore((state) => state.loadTemplates);

  // 初始化：加载设置和模板
  useEffect(() => {
    loadSettings();
    loadTemplates();
  }, [loadSettings, loadTemplates]);

  useThemeEffect(settings.theme);

  // 初始化工作区时，若自动解析出更“正确”的根目录/类型，则同步写回 settings（修复历史配置造成的判定偏差）
  const handleWorkspaceResolved = useCallback(async (resolved: { workspacePath: string; workspaceType: 'jasblog' | 'docs' }) => {
    const current = useSettingsStore.getState().settings;
    if (
      current.workspacePath !== resolved.workspacePath ||
      current.workspaceType !== resolved.workspaceType
    ) {
      await saveSettings({
        workspacePath: resolved.workspacePath,
        workspaceType: resolved.workspaceType,
      });
    }
  }, [saveSettings]);

  useWorkspaceInitEffect({
    workspacePath: settings.workspacePath,
    initWorkspace,
    onResolved: handleWorkspaceResolved,
  });
  useGlobalShortcutsEffect();
  useSaveShortcutEffect({ enabled: !!currentFile?.isDirty, onSave: saveFile });
  useAIShortcutEffect({ enabled: !!currentFile && viewMode !== 'preview', onToggle: toggleAIPanel });

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
