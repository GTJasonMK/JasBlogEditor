import { useEffect } from "react";
import { Toolbar, Sidebar, EditorArea, MetadataPanel, MiniModeLayout } from "@/components";
import { useSettingsStore, useFileStore, useEditorStore, useWindowStore } from "@/store";
import { useGlobalShortcutsEffect, useSaveShortcutEffect, useThemeEffect, useWorkspaceInitEffect } from "@/hooks";

function App() {
  const { loadSettings, settings } = useSettingsStore();
  const { initWorkspace } = useFileStore();
  const saveFile = useEditorStore((state) => state.saveFile);
  const currentFile = useEditorStore((state) => state.currentFile);
  const miniMode = useWindowStore((state) => state.miniMode);

  // 初始化：加载设置
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useThemeEffect(settings.theme);
  useWorkspaceInitEffect({
    workspacePath: settings.workspacePath,
    workspaceType: settings.workspaceType,
    initWorkspace,
  });
  useGlobalShortcutsEffect();
  useSaveShortcutEffect({ enabled: !!currentFile?.isDirty, onSave: saveFile });

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
