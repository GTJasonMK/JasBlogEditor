import { useEditorStore } from '@/store';

interface PreviewBackButtonProps {
  label: string;
  className?: string;
}

export function PreviewBackButton({ label, className = '' }: PreviewBackButtonProps) {
  const setPreviewMode = useEditorStore((state) => state.setPreviewMode);

  return (
    <button
      type="button"
      onClick={() => setPreviewMode('list')}
      className={`inline-flex items-center gap-1 text-[var(--color-gray)] hover:text-[var(--color-vermilion)] mb-6 transition-colors ${className}`.trim()}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path
          d="M10 12L6 8L10 4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {label}
    </button>
  );
}
