import { useState } from 'react';
import { CONTENT_TYPE_LABELS } from '@/types';
import type { JasBlogContentType } from '@/types';

interface SaveAsTemplateDialogProps {
  type: JasBlogContentType;
  defaultName: string;
  onConfirm: (name: string, description: string) => Promise<void>;
  onCancel: () => void;
}

export function SaveAsTemplateDialog({ type, defaultName, onConfirm, onCancel }: SaveAsTemplateDialogProps) {
  const [name, setName] = useState(defaultName);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    setIsSubmitting(true);
    try {
      await onConfirm(trimmed, description.trim());
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
      <div className="bg-[var(--color-paper)] rounded-lg p-6 w-[400px] shadow-xl">
        <h3 className="text-lg font-medium mb-4">
          另存为{CONTENT_TYPE_LABELS[type]}模板
        </h3>

        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-xs text-[var(--color-text-muted)] mb-1">模板名称</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="请输入模板名称"
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md focus:outline-none focus:border-[var(--color-primary)] bg-[var(--color-bg)] text-[var(--color-text)]"
              autoFocus
              onKeyDown={handleKeyDown}
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--color-text-muted)] mb-1">描述（可选）</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="简要描述模板用途"
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md focus:outline-none focus:border-[var(--color-primary)] bg-[var(--color-bg)] text-[var(--color-text)]"
              onKeyDown={handleKeyDown}
            />
          </div>
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
            disabled={!name.trim() || isSubmitting}
            className="px-4 py-2 text-sm bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)] disabled:opacity-50 rounded-md transition-colors"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
