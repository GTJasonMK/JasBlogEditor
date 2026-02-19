import { useState, useEffect } from 'react';
import { useTemplateStore } from '@/store';
import { getBuiltinTemplates, applyTemplateToFilename } from '@/services/contentTemplates';
import { CONTENT_TYPE_LABELS } from '@/types';
import type { BuiltinTemplate } from '@/services/contentTemplates';
import type { JasBlogContentType, UserTemplate } from '@/types';

interface TemplatePickerDialogProps {
  type: JasBlogContentType;
  onConfirm: (filename: string, content: string) => Promise<void>;
  onCancel: () => void;
}

export function TemplatePickerDialog({ type, onConfirm, onCancel }: TemplatePickerDialogProps) {
  const [filename, setFilename] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { userTemplates, deleteTemplate } = useTemplateStore();

  const builtins = getBuiltinTemplates(type);
  const userTemplatesOfType = userTemplates.filter((t) => t.type === type);

  // 默认选中第一个内置模板
  useEffect(() => {
    if (builtins.length > 0) {
      setSelectedId(builtins[0].id);
    }
  }, [type]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleConfirm = async () => {
    const trimmed = filename.trim();
    if (!trimmed || !selectedId) return;

    const builtin = builtins.find((t) => t.id === selectedId);
    const userTemplate = userTemplatesOfType.find((t) => t.id === selectedId);

    let content: string;
    if (builtin) {
      content = builtin.buildContent(trimmed);
    } else if (userTemplate) {
      content = applyTemplateToFilename(userTemplate.content, trimmed);
    } else {
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(trimmed, content);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
    }
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[var(--color-paper)] rounded-lg p-6 w-[480px] shadow-xl">
        <h3 className="text-lg font-medium mb-4">
          新建{CONTENT_TYPE_LABELS[type]}
        </h3>

        {/* 文件名输入 */}
        <input
          type="text"
          value={filename}
          onChange={(e) => setFilename(e.target.value)}
          placeholder={type === 'diary'
            ? '请输入相对路径（如: 2026/02/2026-02-18-09-00-morning-session）'
            : '请输入文件名（不含扩展名）'}
          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md focus:outline-none focus:border-[var(--color-primary)] mb-2 bg-[var(--color-bg)] text-[var(--color-text)]"
          autoFocus
          onKeyDown={handleKeyDown}
        />
        {type === 'diary' && (
          <p className="text-xs text-[var(--color-text-muted)] mb-3">
            Diary 建议使用 <span className="font-mono">YYYY/MM</span> 目录结构；目录不存在时会自动创建。
          </p>
        )}

        {/* 模板选择 */}
        <p className="text-xs text-[var(--color-text-muted)] mb-2">选择模板</p>
        <div className="space-y-1 max-h-52 overflow-y-auto mb-4">
          {/* 内置模板 */}
          {builtins.map((t) => (
            <TemplateRadioItem
              key={t.id}
              id={t.id}
              name={t.name}
              description={t.description}
              selected={selectedId === t.id}
              onSelect={() => setSelectedId(t.id)}
            />
          ))}

          {/* 用户模板分隔线 */}
          {userTemplatesOfType.length > 0 && (
            <>
              <div className="flex items-center gap-2 py-1.5">
                <div className="flex-1 h-px bg-[var(--color-border)]" />
                <span className="text-xs text-[var(--color-text-muted)]">我的模板</span>
                <div className="flex-1 h-px bg-[var(--color-border)]" />
              </div>
              {userTemplatesOfType.map((t) => (
                <UserTemplateRadioItem
                  key={t.id}
                  template={t}
                  selected={selectedId === t.id}
                  onSelect={() => setSelectedId(t.id)}
                  onDelete={() => {
                    deleteTemplate(t.id);
                    // 如果删除的是当前选中的，切换回第一个内置模板
                    if (selectedId === t.id && builtins.length > 0) {
                      setSelectedId(builtins[0].id);
                    }
                  }}
                />
              ))}
            </>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] rounded-md transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={!filename.trim() || !selectedId || isSubmitting}
            className="px-4 py-2 text-sm bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)] disabled:opacity-50 rounded-md transition-colors"
          >
            创建
          </button>
        </div>
      </div>
    </div>
  );
}

// 内置模板单选项
function TemplateRadioItem({
  id, name, description, selected, onSelect,
}: {
  id: string;
  name: string;
  description?: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <label
      className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors ${
        selected ? 'bg-[var(--color-surface)]' : 'hover:bg-[var(--color-surface)]'
      }`}
    >
      <input
        type="radio"
        name="template"
        value={id}
        checked={selected}
        onChange={onSelect}
        className="accent-[var(--color-primary)]"
      />
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-[var(--color-text)]">{name}</span>
        {description && (
          <span className="text-xs text-[var(--color-text-muted)] ml-2">{description}</span>
        )}
      </div>
    </label>
  );
}

// 用户模板单选项（带删除按钮）
function UserTemplateRadioItem({
  template, selected, onSelect, onDelete,
}: {
  template: UserTemplate | BuiltinTemplate;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
        selected ? 'bg-[var(--color-surface)]' : 'hover:bg-[var(--color-surface)]'
      }`}
    >
      <label className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer">
        <input
          type="radio"
          name="template"
          value={template.id}
          checked={selected}
          onChange={onSelect}
          className="accent-[var(--color-primary)]"
        />
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-[var(--color-text)]">{template.name}</span>
          {template.description && (
            <span className="text-xs text-[var(--color-text-muted)] ml-2">{template.description}</span>
          )}
        </div>
      </label>
      <button
        onClick={(e) => {
          e.preventDefault();
          onDelete();
        }}
        className="p-1 text-[var(--color-text-muted)] hover:text-red-500 rounded transition-colors flex-shrink-0"
        title="删除此模板"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
