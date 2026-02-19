import { useEffect, useRef, useState } from 'react';
import { CONTENT_TYPE_LABELS, JASBLOG_CONTENT_TYPES } from '@/types';
import type { JasBlogContentType, WorkspaceType } from '@/types';
import { TemplatePickerDialog } from './TemplatePickerDialog';

interface NewMenuProps {
  disabled: boolean;
  workspaceType: WorkspaceType | null;
  onCreateJasblogFile: (type: JasBlogContentType, filename: string, content: string) => Promise<void>;
  onCreateDoc: (relativePath: string) => Promise<void>;
  onCreateFolder: (relativePath: string) => Promise<void>;
}

export function NewMenu({ disabled, workspaceType, onCreateJasblogFile, onCreateDoc, onCreateFolder }: NewMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [jasblogDialogType, setJasblogDialogType] = useState<JasBlogContentType | null>(null);
  const [docDialogOpen, setDocDialogOpen] = useState(false);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [input, setInput] = useState('');
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (menuRef.current && target && !menuRef.current.contains(target)) {
        setMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  const closeAllDialogs = () => {
    setJasblogDialogType(null);
    setDocDialogOpen(false);
    setFolderDialogOpen(false);
    setInput('');
  };

  const handleNewFile = (type: JasBlogContentType) => {
    setMenuOpen(false);
    setJasblogDialogType(type);
  };

  const handleNewDoc = () => {
    setMenuOpen(false);
    setDocDialogOpen(true);
    setInput('');
  };

  const handleNewFolder = () => {
    setMenuOpen(false);
    setFolderDialogOpen(true);
    setInput('');
  };

  const handleCreateDoc = async () => {
    if (!input.trim()) return;
    try {
      await onCreateDoc(input.trim());
      closeAllDialogs();
    } catch {
      // 错误由上层 store/Toolbar 统一处理；保留输入以便用户修改后重试
    }
  };

  const handleCreateFolder = async () => {
    if (!input.trim()) return;
    try {
      await onCreateFolder(input.trim());
      closeAllDialogs();
    } catch {
      // 错误由上层 store/Toolbar 统一处理；保留输入以便用户修改后重试
    }
  };

  return (
    <>
      <div className="relative">
        <div ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            disabled={disabled}
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

          {menuOpen && (
            <div className="absolute top-full left-0 mt-1 bg-[var(--color-paper)] border border-[var(--color-border)] rounded-md shadow-lg py-1 z-50 min-w-[120px]">
              {workspaceType === 'jasblog' ? (
                // JasBlog 模式: 显示内容类型选项
                (JASBLOG_CONTENT_TYPES as readonly JasBlogContentType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => handleNewFile(type)}
                    className="w-full px-4 py-2 text-sm text-left hover:bg-[var(--color-surface)] transition-colors"
                  >
                    {CONTENT_TYPE_LABELS[type]}
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
      </div>

      {/* 模板选择对话框 (JasBlog 模式) */}
      {jasblogDialogType && (
        <TemplatePickerDialog
          type={jasblogDialogType}
          onConfirm={async (filename, content) => {
            await onCreateJasblogFile(jasblogDialogType, filename, content);
            closeAllDialogs();
          }}
          onCancel={closeAllDialogs}
        />
      )}

      {/* 新建文档对话框 (普通文档模式) */}
      {docDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[var(--color-paper)] rounded-lg p-6 w-[400px] shadow-xl">
            <h3 className="text-lg font-medium mb-4">新建文档</h3>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="请输入文件路径（如: notes/daily.md 或 README）"
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md focus:outline-none focus:border-[var(--color-primary)] mb-2"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateDoc();
                if (e.key === 'Escape') closeAllDialogs();
              }}
            />
            <p className="text-xs text-[var(--color-text-muted)] mb-4">
              支持相对路径，目录不存在时将自动创建。扩展名可省略（默认 .md）
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={closeAllDialogs}
                className="px-4 py-2 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] rounded-md transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleCreateDoc}
                disabled={!input.trim()}
                className="px-4 py-2 text-sm bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)] disabled:opacity-50 rounded-md transition-colors"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 新建文件夹对话框 (普通文档模式) */}
      {folderDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[var(--color-paper)] rounded-lg p-6 w-[400px] shadow-xl">
            <h3 className="text-lg font-medium mb-4">新建文件夹</h3>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="请输入文件夹路径（如: docs/guides）"
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md focus:outline-none focus:border-[var(--color-primary)] mb-2"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFolder();
                if (e.key === 'Escape') closeAllDialogs();
              }}
            />
            <p className="text-xs text-[var(--color-text-muted)] mb-4">
              支持嵌套路径，父目录不存在时将自动创建
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={closeAllDialogs}
                className="px-4 py-2 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] rounded-md transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleCreateFolder}
                disabled={!input.trim()}
                className="px-4 py-2 text-sm bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)] disabled:opacity-50 rounded-md transition-colors"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
