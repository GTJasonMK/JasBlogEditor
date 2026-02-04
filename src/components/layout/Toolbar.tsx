import { useState, useEffect } from 'react';
import { useSettingsStore, useFileStore, useEditorStore } from '@/store';
import { openFolderDialog } from '@/platform/tauri';
import { applyTheme, getEffectiveTheme } from '@/utils';
import type { ContentType, ThemeMode } from '@/types';

// JasBlog 模式下的内容类型标签
const JASBLOG_TYPE_LABELS: Record<string, string> = {
  note: '笔记',
  project: '项目',
  roadmap: '规划',
  graph: '图谱',
};

export function Toolbar() {
  const { settings, setWorkspacePath, setWorkspaceType, setTheme, error: settingsError, clearError: clearSettingsError } = useSettingsStore();
  const { workspaceType, refreshFileTree, detectWorkspaceType, setWorkspaceType: setFileStoreWorkspaceType } = useFileStore();
  const { currentFile, saveFile, viewMode, setViewMode, isLoading, toggleMiniMode, error: editorError, clearError: clearEditorError } = useEditorStore();
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showNewDialog, setShowNewDialog] = useState<Exclude<ContentType, 'doc'> | null>(null);
  const [showDocDialog, setShowDocDialog] = useState(false);
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [newFilename, setNewFilename] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const currentTheme = settings.theme || 'system';
  const effectiveTheme = getEffectiveTheme(currentTheme);

  // 合并错误信息
  const displayError = localError || editorError || settingsError;

  // 自动清除错误（5秒后）
  useEffect(() => {
    if (displayError) {
      const timer = setTimeout(() => {
        setLocalError(null);
        clearEditorError();
        clearSettingsError();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [displayError, clearEditorError, clearSettingsError]);

  const handleSelectWorkspace = async () => {
    try {
      const path = await openFolderDialog({
        title: '选择工作区目录',
      });
      if (path) {
        await setWorkspacePath(path);
        useFileStore.getState().setWorkspacePath(path);

        // 自动检测工作区类型
        const detectedType = await detectWorkspaceType();
        setFileStoreWorkspaceType(detectedType);
        await setWorkspaceType(detectedType);

        await refreshFileTree();
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

  const handleNewFile = (type: Exclude<ContentType, 'doc'>) => {
    setShowNewMenu(false);
    setShowNewDialog(type);
    setNewFilename('');
  };

  const handleNewDoc = () => {
    setShowNewMenu(false);
    setShowDocDialog(true);
    setNewFilename('');
  };

  const handleNewFolder = () => {
    setShowNewMenu(false);
    setShowFolderDialog(true);
    setNewFilename('');
  };

  const handleCreateDoc = async () => {
    if (!newFilename.trim() || !settings.workspacePath) return;

    try {
      const { createDocFile, openFile } = useEditorStore.getState();
      const path = await createDocFile(settings.workspacePath, newFilename.trim());
      await openFile(path, 'doc');
      await refreshFileTree();
      setShowDocDialog(false);
      setNewFilename('');
    } catch (error) {
      // 错误已在 store 中处理
      setShowDocDialog(false);
      setNewFilename('');
    }
  };

  const handleCreateFolder = async () => {
    if (!newFilename.trim() || !settings.workspacePath) return;

    try {
      const { createFolder } = useEditorStore.getState();
      await createFolder(settings.workspacePath, newFilename.trim());
      await refreshFileTree();
      setShowFolderDialog(false);
      setNewFilename('');
    } catch (error) {
      setLocalError(`创建文件夹失败: ${error}`);
      setShowFolderDialog(false);
      setNewFilename('');
    }
  };

  const handleCreateFile = async () => {
    if (!newFilename.trim() || !showNewDialog || !settings.workspacePath) return;

    try {
      const { createNewFile, openFile } = useEditorStore.getState();
      const path = await createNewFile(settings.workspacePath, showNewDialog, newFilename.trim());
      await openFile(path, showNewDialog);
      await refreshFileTree();
      setShowNewDialog(null);
      setNewFilename('');
    } catch (error) {
      // 错误已在 store 中处理
      setShowNewDialog(null);
      setNewFilename('');
    }
  };

  const handleDelete = async () => {
    if (!currentFile) return;
    if (!confirm(`确定要删除 ${currentFile.name} 吗?`)) return;

    try {
      const { deleteCurrentFile } = useEditorStore.getState();
      await deleteCurrentFile();
      await refreshFileTree();
    } catch (error) {
      // 错误已在 store 中处理
    }
  };

  const handleDismissError = () => {
    setLocalError(null);
    clearEditorError();
    clearSettingsError();
  };

  const handleSetTheme = async (theme: ThemeMode) => {
    setShowThemeMenu(false);
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

      {/* 新建按钮 */}
      <div className="relative">
        <button
          onClick={() => setShowNewMenu(!showNewMenu)}
          disabled={!settings.workspacePath}
          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)] disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          新建
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showNewMenu && (
          <div className="absolute top-full left-0 mt-1 bg-[var(--color-paper)] border border-[var(--color-border)] rounded-md shadow-lg py-1 z-50 min-w-[120px]">
            {workspaceType === 'jasblog' ? (
              // JasBlog 模式: 显示内容类型选项
              (['note', 'project', 'roadmap', 'graph'] as Exclude<ContentType, 'doc'>[]).map((type) => (
                <button
                  key={type}
                  onClick={() => handleNewFile(type)}
                  className="w-full px-4 py-2 text-sm text-left hover:bg-[var(--color-surface)] transition-colors"
                >
                  {JASBLOG_TYPE_LABELS[type]}
                </button>
              ))
            ) : (
              // 普通文档模式: 显示新建文档和新建文件夹
              <>
                <button
                  onClick={handleNewDoc}
                  className="w-full px-4 py-2 text-sm text-left hover:bg-[var(--color-surface)] transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  新建文档
                </button>
                <button
                  onClick={handleNewFolder}
                  className="w-full px-4 py-2 text-sm text-left hover:bg-[var(--color-surface)] transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                  </svg>
                  新建文件夹
                </button>
              </>
            )}
          </div>
        )}
      </div>

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
      {currentFile && currentFile.type !== 'graph' && (
        <div className="flex items-center bg-[var(--color-surface)] rounded-md p-0.5">
          {(['edit', 'preview', 'split'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                viewMode === mode
                  ? 'bg-[var(--color-paper)] shadow-sm text-[var(--color-text)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              {mode === 'edit' ? '编辑' : mode === 'preview' ? '预览' : '分屏'}
            </button>
          ))}
        </div>
      )}

      {/* 主题切换 */}
      <div className="relative">
        <button
          onClick={() => setShowThemeMenu(!showThemeMenu)}
          className="flex items-center gap-1 px-2 py-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] rounded-md transition-colors"
          title="切换主题"
        >
          {effectiveTheme === 'dark' ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          )}
        </button>

        {showThemeMenu && (
          <div className="absolute top-full right-0 mt-1 bg-[var(--color-paper)] border border-[var(--color-border)] rounded-md shadow-lg py-1 z-50 min-w-[100px]">
            <button
              onClick={() => handleSetTheme('light')}
              className={`w-full px-4 py-2 text-sm text-left hover:bg-[var(--color-surface)] transition-colors flex items-center gap-2 ${currentTheme === 'light' ? 'text-[var(--color-primary)]' : ''}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              浅色
            </button>
            <button
              onClick={() => handleSetTheme('dark')}
              className={`w-full px-4 py-2 text-sm text-left hover:bg-[var(--color-surface)] transition-colors flex items-center gap-2 ${currentTheme === 'dark' ? 'text-[var(--color-primary)]' : ''}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
              深色
            </button>
            <button
              onClick={() => handleSetTheme('system')}
              className={`w-full px-4 py-2 text-sm text-left hover:bg-[var(--color-surface)] transition-colors flex items-center gap-2 ${currentTheme === 'system' ? 'text-[var(--color-primary)]' : ''}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              跟随系统
            </button>
          </div>
        )}
      </div>

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

      {/* 新建文件对话框 (JasBlog 模式) */}
      {showNewDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[var(--color-paper)] rounded-lg p-6 w-[400px] shadow-xl">
            <h3 className="text-lg font-medium mb-4">新建{JASBLOG_TYPE_LABELS[showNewDialog]}</h3>
            <input
              type="text"
              value={newFilename}
              onChange={(e) => setNewFilename(e.target.value)}
              placeholder="请输入文件名（不含扩展名）"
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md focus:outline-none focus:border-[var(--color-primary)] mb-4"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFile();
                if (e.key === 'Escape') setShowNewDialog(null);
              }}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowNewDialog(null)}
                className="px-4 py-2 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] rounded-md transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleCreateFile}
                disabled={!newFilename.trim()}
                className="px-4 py-2 text-sm bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)] disabled:opacity-50 rounded-md transition-colors"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 新建文档对话框 (普通文档模式) */}
      {showDocDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[var(--color-paper)] rounded-lg p-6 w-[400px] shadow-xl">
            <h3 className="text-lg font-medium mb-4">新建文档</h3>
            <input
              type="text"
              value={newFilename}
              onChange={(e) => setNewFilename(e.target.value)}
              placeholder="请输入文件路径（如: notes/daily.md 或 README）"
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md focus:outline-none focus:border-[var(--color-primary)] mb-2"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateDoc();
                if (e.key === 'Escape') setShowDocDialog(false);
              }}
            />
            <p className="text-xs text-[var(--color-text-muted)] mb-4">
              支持相对路径，目录不存在时将自动创建。扩展名可省略（默认 .md）
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDocDialog(false)}
                className="px-4 py-2 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] rounded-md transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleCreateDoc}
                disabled={!newFilename.trim()}
                className="px-4 py-2 text-sm bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)] disabled:opacity-50 rounded-md transition-colors"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 新建文件夹对话框 (普通文档模式) */}
      {showFolderDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[var(--color-paper)] rounded-lg p-6 w-[400px] shadow-xl">
            <h3 className="text-lg font-medium mb-4">新建文件夹</h3>
            <input
              type="text"
              value={newFilename}
              onChange={(e) => setNewFilename(e.target.value)}
              placeholder="请输入文件夹路径（如: docs/guides）"
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md focus:outline-none focus:border-[var(--color-primary)] mb-2"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFolder();
                if (e.key === 'Escape') setShowFolderDialog(false);
              }}
            />
            <p className="text-xs text-[var(--color-text-muted)] mb-4">
              支持嵌套路径，父目录不存在时将自动创建
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowFolderDialog(false)}
                className="px-4 py-2 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] rounded-md transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleCreateFolder}
                disabled={!newFilename.trim()}
                className="px-4 py-2 text-sm bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)] disabled:opacity-50 rounded-md transition-colors"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* 错误提示 */}
      {displayError && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2 px-4 py-2 bg-[var(--color-danger-bg)] border border-[var(--color-danger)] rounded-lg shadow-lg">
            <svg className="w-4 h-4 text-[var(--color-danger)] flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-sm text-[var(--color-danger)] max-w-[400px] truncate">{displayError}</span>
            <button
              onClick={handleDismissError}
              className="ml-2 text-[var(--color-danger)] opacity-60 hover:opacity-100 transition-opacity"
              aria-label="关闭错误提示"
            >
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
