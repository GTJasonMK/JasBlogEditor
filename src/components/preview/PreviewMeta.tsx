interface PreviewDateProps {
  date?: string;
  className?: string;
}

interface PreviewDescriptionProps {
  text?: string;
  className?: string;
}

interface PreviewTagListProps {
  tags?: readonly string[] | null;
  className?: string;
  tagClassName?: string;
  buttonClassName?: string;
  onTagClick?: (tag: string) => void;
}

function normalizeTags(tags?: readonly string[] | null): string[] {
  if (!tags || tags.length === 0) return [];
  return tags
    .map((tag) => String(tag).trim())
    .filter(Boolean);
}

export function PreviewDate({ date, className = 'text-sm text-[var(--color-gray)]' }: PreviewDateProps) {
  if (!date) return null;
  return <time className={className}>{date}</time>;
}

export function PreviewDescription({ text, className = 'text-[var(--color-gray)]' }: PreviewDescriptionProps) {
  if (!text) return null;
  return <p className={className}>{text}</p>;
}

export function PreviewTagList({
  tags,
  className = '',
  tagClassName = 'tag',
  buttonClassName = 'tag',
  onTagClick,
}: PreviewTagListProps) {
  const normalized = normalizeTags(tags);
  if (normalized.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-2 ${className}`.trim()}>
      {normalized.map((tag, index) => {
        const key = `${tag}-${index}`;
        if (!onTagClick) {
          return (
            <span key={key} className={tagClassName}>
              {tag}
            </span>
          );
        }

        return (
          <button
            key={key}
            type="button"
            onClick={() => onTagClick(tag)}
            className={buttonClassName}
          >
            {tag}
          </button>
        );
      })}
    </div>
  );
}
