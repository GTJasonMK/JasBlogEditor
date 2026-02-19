import type { ProjectMetadata } from '@/types';
import { useEditorStore } from '@/store';
import { MarkdownRenderer } from '../MarkdownRenderer';
import { TechStack } from '../TechStack';
import { BackToTop } from '../BackToTop';

interface ProjectPreviewProps {
  metadata: ProjectMetadata;
  content: string;
  embedded?: boolean;
}

function preprocessAlerts(content: string): string {
  return content.replace(
    /^(>\s*)\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\r?\n?/gm,
    '$1ALERTBOX$2ALERTBOX\n',
  );
}

// 开源项目预览（与 JasBlog projects/[slug]/page.tsx 一致）
export function ProjectPreview({ metadata, content, embedded = false }: ProjectPreviewProps) {
  const setPreviewMode = useEditorStore((state) => state.setPreviewMode);
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      {!embedded && (
        <button
          type="button"
          onClick={() => setPreviewMode('list')}
          className="inline-flex items-center gap-1 text-[var(--color-gray)] hover:text-[var(--color-vermilion)] mb-6 transition-colors"
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
          返回项目列表
        </button>
      )}

      {/* 项目头部 */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-4">{metadata.name}</h1>
        <p className="text-lg text-[var(--color-gray)] mb-4">{metadata.description}</p>

        {/* 链接按钮 */}
        <div className="flex flex-wrap gap-3 mb-6">
          {metadata.github && (
            <a
              href={metadata.github}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-ink)] text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              GitHub
            </a>
          )}
          {metadata.demo && (
            <a
              href={metadata.demo}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 border border-[var(--color-vermilion)] text-[var(--color-vermilion)] rounded-lg hover:bg-[var(--color-vermilion)] hover:text-white transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              在线演示
            </a>
          )}
        </div>

        {/* 标签 */}
        <div className="flex flex-wrap gap-2 mb-6">
          {metadata.tags?.map((tag) => (
            <span key={tag} className="tag">{tag}</span>
          ))}
        </div>

        {/* 技术栈 */}
        <TechStack items={metadata.techStack ?? []} />
      </header>

      <div className="divider-cloud my-8" />

      {/* 项目内容 */}
      <article className="prose-chinese">
        <MarkdownRenderer content={preprocessAlerts(content)} />
      </article>

      <BackToTop />
    </div>
  );
}
