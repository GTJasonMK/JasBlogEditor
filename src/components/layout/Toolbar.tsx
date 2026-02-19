import { useState, useEffect, lazy, Suspense } from 'react';
import { useSettingsStore, useFileStore, useEditorStore, useWindowStore, useTemplateStore } from '@/store';
import { openFolderDialog } from '@/platform/tauri';
import { confirmDialog } from '@/utils/confirmDialog';
import { applyTheme, getEffectiveTheme } from '@/utils';
import type { ThemeMode } from '@/types';
import type { JasBlogContentType } from '@/types';
import { NewMenu } from './toolbar/NewMenu';
import { ThemeMenu } from './toolbar/ThemeMenu';
import { ViewModeToggle } from './toolbar/ViewModeToggle';
import { PreviewModeToggle } from './toolbar/PreviewModeToggle';
import { ErrorToast } from './toolbar/ErrorToast';
import { JasBlogSearchModal } from './toolbar/JasBlogSearchModal';
import { SaveAsTemplateDialog } from './toolbar/SaveAsTemplateDialog';

// HelpModal 内部导入全部预览组件 + MarkdownRenderer + mermaid 等重型依赖，仅在用户打开帮助时才加载
const LazyHelpModal = lazy(() =>
  import('./toolbar/HelpModal').then(m => ({ default: m.HelpModal }))
);

export function Toolbar() {
  const {
    settings,
    saveSettings,
    setTheme,
    error: settingsError,
    clearError: clearSettingsError,
  } = useSettingsStore();
  const { workspacePath, workspaceType, refreshFileTree, initWorkspace } = useFileStore();
  const {
    currentFile,
    saveFile,
    viewMode,
    setViewMode,
    previewMode,
    setPreviewMode,
    isLoading,
    error: editorError,
    clearError: clearEditorError,
    createDocFile,
    openFile,
    createFolder,
    createNewFile,
    deleteFile,
  } = useEditorStore();
  const { toggleMiniMode, error: windowError, clearError: clearWindowError } = useWindowStore();
  const { saveAsTemplate, error: templateError, clearError: clearTemplateError } = useTemplateStore();
  const [localError, setLocalError] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);

  const currentTheme = settings.theme || 'system';
  const effectiveTheme = getEffectiveTheme(currentTheme);

  // 合并错误信息
  const displayError = localError || editorError || windowError || settingsError || templateError;

  // 自动清除错误（5秒后）
  useEffect(() => {
    if (displayError) {
      const timer = setTimeout(() => {
        setLocalError(null);
        clearEditorError();
        clearWindowError();
        clearSettingsError();
        clearTemplateError();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [displayError, clearEditorError, clearWindowError, clearSettingsError, clearTemplateError]);

  const isEditableTarget = (target: EventTarget | null) => {
    if (!target || !(target instanceof HTMLElement)) return false;
    const tagName = target.tagName.toLowerCase();
    return (
      target.isContentEditable ||
      tagName === 'input' ||
      tagName === 'textarea' ||
      tagName === 'select'
    );
  };

  // 搜索快捷键：/ 打开，ESC 关闭（对齐 JasBlog Header 行为）
  useEffect(() => {
    if (workspaceType !== 'jasblog') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === '/') {
        if (isEditableTarget(event.target)) return;
        event.preventDefault();
        setSearchOpen(true);
        return;
      }

      if (event.key === 'Escape') {
        if (!searchOpen) return;
        event.preventDefault();
        setSearchOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [workspaceType, searchOpen]);

  const handleSelectWorkspace = async () => {
    try {
      const path = await openFolderDialog({
        title: '选择工作区目录',
      });
      if (path) {
        const resolved = await initWorkspace(path);
        await saveSettings({
          workspacePath: resolved.workspacePath,
          workspaceType: resolved.workspaceType,
        });
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

  const handleCreateJasblogFile = async (type: JasBlogContentType, filename: string, content: string) => {
    if (!workspacePath) return;
    try {
      const path = await createNewFile(workspacePath, type, filename, content);
      await openFile(path, type);
      await refreshFileTree();
    } catch {
      // 错误已在 store 中处理
    }
  };

  const handleCreateDoc = async (relativePath: string) => {
    if (!workspacePath) return;
    try {
      const path = await createDocFile(workspacePath, relativePath);
      await openFile(path, 'doc');
      await refreshFileTree();
    } catch (error) {
      // 错误已在 store 中处理
    }
  };

  const handleCreateFolder = async (relativePath: string) => {
    if (!workspacePath) return;
    try {
      await createFolder(workspacePath, relativePath);
      await refreshFileTree();
    } catch (error) {
      setLocalError(`创建文件夹失败: ${error}`);
    }
  };

  const handleDelete = async () => {
    if (!currentFile) return;
    const file = currentFile;
    const confirmed = await confirmDialog(`确定要删除 "${file.name}" 吗?`, {
      title: '删除文件',
      kind: 'warning',
      okLabel: '删除',
      cancelLabel: '取消',
    });
    if (!confirmed) return;

    try {
      await deleteFile(file.path);
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
    clearTemplateError();
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
            {workspacePath?.split(/[/\\]/).pop() || '选择工作区'}
          </span>
        </button>

        {/* 新建按钮 + 对话框 */}
        <NewMenu
          disabled={!workspacePath}
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

        {/* 另存为模板按钮（仅 JasBlog 模式且有当前文件时可用） */}
        {workspaceType === 'jasblog' && currentFile && currentFile.type !== 'doc' && (
          <button
            onClick={() => setSaveTemplateOpen(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] rounded-md transition-colors"
            title="另存为模板"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
            存为模板
          </button>
        )}

        {/* 右侧分隔 */}
        <div className="flex-1" />

        {/* 视图切换 */}
        {currentFile && (
          <div className="flex items-center gap-2">
            <ViewModeToggle value={viewMode} onChange={setViewMode} />
            {workspaceType === 'jasblog' && currentFile.type !== 'doc' && (
              <PreviewModeToggle value={previewMode} onChange={setPreviewMode} />
            )}
          </div>
        )}

        {/* 主题切换 */}
        <ThemeMenu currentTheme={currentTheme} effectiveTheme={effectiveTheme} onSetTheme={handleSetTheme} />

        {/* JasBlog 全局搜索 */}
        {workspaceType === 'jasblog' && (
          <button
            onClick={() => setSearchOpen((open) => !open)}
            className="flex items-center gap-1 px-2 py-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] rounded-md transition-colors"
            title="搜索（快捷键 /）"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 103.9 3.9a7.5 7.5 0 0012.75 12.75z" />
            </svg>
          </button>
        )}

        {/* 帮助 */}
        <button
          onClick={() => setHelpOpen(true)}
          className="flex items-center gap-1 px-2 py-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] rounded-md transition-colors"
          title="渲染帮助"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.227 9a3 3 0 115.546 0c0 1.5-1.5 2-1.5 2.75V13m0 4h.01M12 3a9 9 0 100 18 9 9 0 000-18z" />
          </svg>
        </button>

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

      {helpOpen && (
        <Suspense fallback={null}>
          <LazyHelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
        </Suspense>
      )}

      <JasBlogSearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* 另存为模板对话框 */}
      {saveTemplateOpen && currentFile && currentFile.type !== 'doc' && (
        <SaveAsTemplateDialog
          type={currentFile.type as JasBlogContentType}
          defaultName={currentFile.name.replace(/\.md$/i, '')}
          onConfirm={async (name, description) => {
            // 从当前文件提取完整内容（frontmatter + body）
            const content = currentFile.frontmatterBlock
              ? `${currentFile.frontmatterBlock}${currentFile.content}`
              : currentFile.content;
            await saveAsTemplate(name, description || undefined, currentFile.type as JasBlogContentType, content);
            setSaveTemplateOpen(false);
          }}
          onCancel={() => setSaveTemplateOpen(false)}
        />
      )}
    </>
  );
}
