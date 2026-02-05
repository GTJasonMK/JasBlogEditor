import { useState, useEffect, useRef, useCallback } from 'react';
import { useEditorStore, useWindowStore } from '@/store';
import { startWindowDragging } from '@/platform/tauri';

// 防抖延迟时间（毫秒）
const DEBOUNCE_DELAY = 300;

/**
 * 迷你写作模式布局
 * 提供简化的编辑界面，支持窗口拖动和基本编辑功能
 */
export function MiniModeLayout() {
  const { currentFile, updateContent, saveFile } = useEditorStore();
  const { exitMiniMode } = useWindowStore();

  // 本地内容状态，用于即时响应输入
  const [localContent, setLocalContent] = useState('');
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 同步本地状态与 store
  useEffect(() => {
    if (currentFile) {
      setLocalContent(currentFile.content);
    }
  }, [currentFile?.path]);

  // 聚焦并将光标移到文末
  const focusToEnd = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.focus();
      const len = textarea.value.length;
      textarea.setSelectionRange(len, len);
      // 滚动到底部
      textarea.scrollTop = textarea.scrollHeight;
    }
  }, []);

  // 组件挂载后自动聚焦到文末
  useEffect(() => {
    // 延迟一帧确保内容已渲染
    requestAnimationFrame(() => {
      focusToEnd();
    });
  }, [focusToEnd]);

  // 监听外部聚焦事件（Ctrl+Alt+S 已在迷你模式时触发）
  useEffect(() => {
    const handler = () => focusToEnd();
    window.addEventListener('mini-mode-focus', handler);
    return () => window.removeEventListener('mini-mode-focus', handler);
  }, [focusToEnd]);

  // 处理内容变化（带防抖）
  const handleContentChange = useCallback((value: string) => {
    setLocalContent(value);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      updateContent(value);
    }, DEBOUNCE_DELAY);
  }, [updateContent]);

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // 处理保存
  const handleSave = useCallback(async () => {
    // 立即同步本地内容到 store
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    updateContent(localContent);
    await saveFile();
  }, [localContent, updateContent, saveFile]);

  // 拖动窗口
  const handleDragStart = useCallback(async (e: React.MouseEvent) => {
    // 如果点击的是按钮，不触发拖动
    if ((e.target as HTMLElement).closest('button')) return;
    await startWindowDragging();
  }, []);

  if (!currentFile) return null;

  return (
    <div className="h-screen flex flex-col bg-[var(--color-paper)] overflow-hidden rounded-lg">
      {/* 自定义标题栏（可拖动） */}
      <div
        className="flex-shrink-0 h-9 flex items-center px-3 gap-2 bg-[var(--color-surface)] border-b border-[var(--color-border)] cursor-move select-none"
        onMouseDown={handleDragStart}
      >
        {/* 文件名 */}
        <div className="flex-1 flex items-center gap-1.5 min-w-0">
          <svg className="w-3.5 h-3.5 text-[var(--color-text-muted)] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <span className="text-xs text-[var(--color-text)] truncate">
            {currentFile.name}
          </span>
          {currentFile.isDirty && (
            <span className="text-xs text-[var(--color-primary)] flex-shrink-0">*</span>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* 保存按钮 */}
          <button
            onClick={handleSave}
            disabled={!currentFile.isDirty}
            className="p-1 rounded hover:bg-[var(--color-surface-hover)] disabled:opacity-30 transition-colors"
            title="保存 (Ctrl+S)"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
          </button>

          {/* 退出按钮 */}
          <button
            onClick={exitMiniMode}
            className="p-1 rounded hover:bg-[var(--color-danger-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors"
            title="退出迷你模式 (Ctrl+Alt+X)"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* 编辑区域 */}
      <textarea
        ref={textareaRef}
        value={localContent}
        onChange={(e) => handleContentChange(e.target.value)}
        className="flex-1 min-h-0 p-3 resize-none bg-[var(--color-paper)] editor-textarea focus:outline-none text-sm leading-relaxed overflow-y-auto"
        placeholder="开始写作..."
        spellCheck={false}
      />
    </div>
  );
}
