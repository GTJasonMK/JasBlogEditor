import { useEffect, useMemo, useRef } from 'react';

type RepoFullName = `${string}/${string}`;

function parseRepoFullName(value: string | undefined): RepoFullName | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!trimmed.includes('/')) return null;
  return trimmed as RepoFullName;
}

interface GiscusConfig {
  repo: RepoFullName;
  repoId: string;
  category: string;
  categoryId: string;
}

interface CommentsProps {
  /**
   * 与 JasBlog 保持一致的“讨论线程 key”：
   * - 站点使用 mapping=pathname（例如 /notes/my-note）
   * - 编辑器内没有真实路由，因此用 mapping=specific 并传入 term 来对齐同一讨论串
   */
  term: string;
}

export function Comments({ term }: CommentsProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const config = useMemo<GiscusConfig | null>(() => {
    const repo = parseRepoFullName(import.meta.env.VITE_GISCUS_REPO);
    const repoId = import.meta.env.VITE_GISCUS_REPO_ID;
    const category = import.meta.env.VITE_GISCUS_CATEGORY;
    const categoryId = import.meta.env.VITE_GISCUS_CATEGORY_ID;

    if (!repo || !repoId || !category || !categoryId) {
      return null;
    }

    return { repo, repoId, category, categoryId };
  }, []);

  useEffect(() => {
    if (!config) return;
    if (!containerRef.current) return;
    if (!term.trim()) return;

    // 重新挂载 giscus（term 变化时需要刷新 iframe）
    containerRef.current.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://giscus.app/client.js';
    script.async = true;
    script.crossOrigin = 'anonymous';

    script.setAttribute('data-repo', config.repo);
    script.setAttribute('data-repo-id', config.repoId);
    script.setAttribute('data-category', config.category);
    script.setAttribute('data-category-id', config.categoryId);

    script.setAttribute('data-mapping', 'specific');
    script.setAttribute('data-term', term);

    script.setAttribute('data-strict', '1');
    script.setAttribute('data-reactions-enabled', '1');
    script.setAttribute('data-emit-metadata', '0');
    script.setAttribute('data-input-position', 'top');
    script.setAttribute('data-theme', 'preferred_color_scheme');
    script.setAttribute('data-lang', 'zh-CN');

    containerRef.current.appendChild(script);
  }, [config, term]);

  if (!config) {
    if (import.meta.env.DEV) {
      return (
        <div className="text-sm text-[var(--color-gray)]">
          评论未配置：请设置 <span className="font-mono">VITE_GISCUS_*</span> 环境变量
        </div>
      );
    }
    return null;
  }

  return <div ref={containerRef} />;
}

