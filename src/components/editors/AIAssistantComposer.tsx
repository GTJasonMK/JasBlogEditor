import { useEffect, useRef } from "react";
import type { AIPresetAction } from "@/services/aiComposer";

interface AIAssistantComposerProps {
  visible: boolean;
  prompt: string;
  isGenerating: boolean;
  hasPendingSuggestion: boolean;
  error: string | null;
  applyIssue: string | null;
  reasoning: string;
  showReasoning: boolean;
  onClose: () => void;
  onPromptChange: (value: string) => void;
  onPresetSelect: (action: AIPresetAction) => void;
  onSubmit: () => void;
  onCancel: () => void;
  onToggleReasoning: () => void;
}

const PRESET_LABELS: Record<AIPresetAction, string> = {
  continue: "续写",
  polish: "润色",
  summary: "摘要",
  translate: "翻译",
};

const MAX_PROMPT_HEIGHT = 160;

function resizePrompt(textarea: HTMLTextAreaElement | null): void {
  if (!textarea) {
    return;
  }

  textarea.style.height = "0px";
  const nextHeight = Math.min(textarea.scrollHeight, MAX_PROMPT_HEIGHT);
  textarea.style.height = `${nextHeight}px`;
  textarea.style.overflowY =
    textarea.scrollHeight > MAX_PROMPT_HEIGHT ? "auto" : "hidden";
}

export function AIAssistantComposer({
  visible,
  prompt,
  isGenerating,
  hasPendingSuggestion,
  error,
  applyIssue,
  reasoning,
  showReasoning,
  onClose,
  onPromptChange,
  onPresetSelect,
  onSubmit,
  onCancel,
  onToggleReasoning,
}: AIAssistantComposerProps) {
  const promptRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    resizePrompt(promptRef.current);
  }, [prompt]);

  useEffect(() => {
    if (visible) {
      resizePrompt(promptRef.current);
    }
  }, [visible]);

  if (!visible) {
    return null;
  }

  return (
    <div className="border-t border-[var(--color-border)] bg-[var(--color-paper)] flex flex-col">
      <div className="flex items-center justify-between gap-3 px-4 py-2 border-b border-[var(--color-border)]">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {(
            Object.keys(PRESET_LABELS) as AIPresetAction[]
          ).map((action) => (
            <button
              key={action}
              type="button"
              disabled={isGenerating}
              onClick={() => onPresetSelect(action)}
              className="px-3 py-1 text-xs rounded-md bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text)] transition-colors disabled:opacity-50"
            >
              {PRESET_LABELS[action]}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] rounded transition-colors"
          title="关闭 AI"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="px-4 py-3">
        <div className="flex items-end gap-3">
          <textarea
            ref={promptRef}
            rows={1}
            value={prompt}
            onChange={(event) => onPromptChange(event.target.value)}
            placeholder="输入你的指令，或先点上方按钮填入预制提示词"
            className="min-h-[40px] max-h-40 flex-1 resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm leading-6 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
            onKeyDown={(event) => {
              if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                event.preventDefault();
                if (isGenerating) {
                  onCancel();
                  return;
                }
                onSubmit();
              }
            }}
          />

          <button
            type="button"
            onClick={isGenerating ? onCancel : onSubmit}
            disabled={!isGenerating && (!prompt.trim() || hasPendingSuggestion)}
            className="h-10 shrink-0 rounded-lg px-4 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)]"
          >
            {isGenerating ? "取消" : "发送"}
          </button>
        </div>
      </div>

      {(error || applyIssue) && (
        <div className="px-4 pb-2">
          {error && (
            <div className="rounded-md bg-[var(--color-danger)]/8 px-3 py-2 text-sm text-[var(--color-danger)] whitespace-pre-wrap">
              {error}
            </div>
          )}

          {applyIssue && (
            <div className="mt-2 rounded-md bg-[var(--color-gold)]/8 px-3 py-2 text-sm text-[var(--color-gold)] whitespace-pre-wrap">
              {applyIssue}
            </div>
          )}
        </div>
      )}

      {(reasoning || isGenerating) && (
        <div className="px-4 pb-3">
          {reasoning && (
            <button
              type="button"
              onClick={onToggleReasoning}
              className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
            >
              {showReasoning ? "▼" : "▶"} 思考过程
            </button>
          )}

          {showReasoning && reasoning && (
            <pre className="mt-2 max-h-28 overflow-auto rounded-md bg-[var(--color-surface)] px-3 py-2 text-xs whitespace-pre-wrap text-[var(--color-text-muted)]">
              {reasoning}
            </pre>
          )}

          {isGenerating && (
            <div className="mt-2 text-xs text-[var(--color-text-muted)]">生成中...</div>
          )}
        </div>
      )}
    </div>
  );
}
