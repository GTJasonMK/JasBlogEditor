import { useState, useEffect } from 'react';
import { useSettingsStore, useFileStore, useEditorStore, useWindowStore } from '@/store';
import { openFolderDialog } from '@/platform/tauri';
import { applyTheme, getEffectiveTheme } from '@/utils';
import type { ThemeMode } from '@/types';
import type { JasBlogContentType } from '@/types';
import { NewMenu } from './toolbar/NewMenu';
import { ThemeMenu } from './toolbar/ThemeMenu';
import { ViewModeToggle } from './toolbar/ViewModeToggle';
import { ErrorToast } from './toolbar/ErrorToast';

export function Toolbar() {
  const {
    settings,
    setWorkspacePath,
    setWorkspaceType,
    setTheme,
    error: settingsError,
    clearError: clearSettingsError,
  } = useSettingsStore();
  const { workspaceType, refreshFileTree, initWorkspace } = useFileStore();
  const {
    currentFile,
    saveFile,
    viewMode,
    setViewMode,
    isLoading,
    error: editorError,
    clearError: clearEditorError,
    createDocFile,
    openFile,
    createFolder,
    createNewFile,
    deleteCurrentFile,
  } = useEditorStore();
  const { toggleMiniMode, error: windowError, clearError: clearWindowError } = useWindowStore();
  const [localError, setLocalError] = useState<string | null>(null);

  const currentTheme = settings.theme || 'system';
  const effectiveTheme = getEffectiveTheme(currentTheme);

  // 合并错误信息
  const displayError = localError || editorError || windowError || settingsError;

  // 自动清除错误（5秒后）
  useEffect(() => {
    if (displayError) {
      const timer = setTimeout(() => {
        setLocalError(null);
        clearEditorError();
        clearWindowError();
        clearSettingsError();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [displayError, clearEditorError, clearWindowError, clearSettingsError]);

  const handleSelectWorkspace = async () => {
    try {
      const path = await openFolderDialog({
        title: '选择工作区目录',
      });
      if (path) {
        const detectedType = await initWorkspace(path);
        await setWorkspacePath(path);
        await setWorkspaceType(detectedType);
      }
    } catch (error) {
      console.error('选择工作区失败:', error);
      setLocalError(`选择工作区失败: ${error}`);
    }
  };

  const handleSave = async () => {
    if (currentFile && currentFile.isDirty) {
      try {
        await saveFile();
        await refreshFileTree();
      } catch (error) {
        // 错误已在 store 中处理
      }
    }
  };

  const handleCreateJasblogFile = async (type: JasBlogContentType, filename: string) => {
    if (!settings.workspacePath) return;
    try {
      const path = await createNewFile(settings.workspacePath, type, filename);
      await openFile(path, type);
      await refreshFileTree();
    } catch (error) {
      // 错误已在 store 中处理
    }
  };

  const handleCreateDoc = async (relativePath: string) => {
    if (!settings.workspacePath) return;
    try {
      const path = await createDocFile(settings.workspacePath, relativePath);
      await openFile(path, 'doc');
      await refreshFileTree();
    } catch (error) {
      // 错误已在 store 中处理
    }
  };

  const handleCreateFolder = async (relativePath: string) => {
    if (!settings.workspacePath) return;
    try {
      await createFolder(settings.workspacePath, relativePath);
      await refreshFileTree();
    } catch (error) {
      setLocalError(`创建文件夹失败: ${error}`);
    }
  };

  const handleDelete = async () => {
    if (!currentFile) return;
    if (!confirm(`确定要删除 ${currentFile.name} 吗?`)) return;

    try {
      await deleteCurrentFile();
      await refreshFileTree();
    } catch (error) {
      // 错误已在 store 中处理
    }
  };

  const handleDismissError = () => {
    setLocalError(null);
    clearEditorError();
    clearWindowError();
    clearSettingsError();
  };

  const handleSetTheme = async (theme: ThemeMode) => {
    applyTheme(theme);
    await setTheme(theme);
  };

  return (
    <>
      <div className="h-12 bg-[var(--color-paper)] border-b border-[var(--color-border)] flex items-center px-4 gap-3 select-none">
        {/* 工作区路径 */}
        <button
          onClick={handleSelectWorkspace}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] rounded-md transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <span className="max-w-[200px] truncate">
            {settings.workspacePath?.split(/[/\\]/).pop() || '选择工作区'}
          </span>
        </button>

        {/* 新建按钮 + 对话框 */}
        <NewMenu
          disabled={!settings.workspacePath}
          workspaceType={workspaceType}
          onCreateJasblogFile={handleCreateJasblogFile}
          onCreateDoc={handleCreateDoc}
          onCreateFolder={handleCreateFolder}
        />

        {/* 保存按钮 */}
        <button
          onClick={handleSave}
          disabled={!currentFile?.isDirty || isLoading}
          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
          保存
        </button>

        {/* 删除按钮 */}
        <button
          onClick={handleDelete}
          disabled={!currentFile}
          className="flex items-center gap-1 px-3 py-1.5 text-sm text-[var(--color-danger)] hover:bg-[var(--color-danger-hover)] disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          删除
        </button>

        {/* 右侧分隔 */}
        <div className="flex-1" />

        {/* 视图切换 */}
        {currentFile && (
          <ViewModeToggle value={viewMode} onChange={setViewMode} />
        )}

        {/* 主题切换 */}
        <ThemeMenu currentTheme={currentTheme} effectiveTheme={effectiveTheme} onSetTheme={handleSetTheme} />

        {/* 迷你模式切换 */}
        {currentFile && (
          <button
            onClick={toggleMiniMode}
            className="flex items-center gap-1 px-2 py-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] rounded-md transition-colors"
            title="迷你模式 (Ctrl+Alt+X)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        )}

        {/* 文件名 */}
        {currentFile && (
          <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
            <span>{currentFile.name}</span>
            {currentFile.isDirty && <span className="text-[var(--color-primary)]">*</span>}
          </div>
        )}
      </div>

      {/* 错误提示 */}
      {displayError && (
        <ErrorToast message={displayError} onDismiss={handleDismissError} />
      )}
    </>
  );
}
