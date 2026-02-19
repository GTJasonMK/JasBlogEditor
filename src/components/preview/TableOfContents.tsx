import { useCallback, useEffect, useRef, useState } from 'react';
import { generateId } from '@/utils';
import { usePreviewScrollContainer } from './PreviewScrollContext';

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  content: string;
  offsetTop?: number;
}

function extractHeadings(content: string): TocItem[] {
  const headingRegex = /^(#{2,4})\s+(.+)$/gm;
  const visibleLines: string[] = [];
  const headingIdCounts = new Map<string, number>();

  let inFence = false;
  let fenceChar = '';

  // 与 JasBlog TableOfContents.tsx 行为对齐：忽略 fenced code block 内的“伪标题”
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trimStart();
    const fenceMatch = trimmed.match(/^(`{3,}|~{3,})/);

    if (fenceMatch) {
      const currentFenceChar = fenceMatch[1][0];
      if (!inFence) {
        inFence = true;
        fenceChar = currentFenceChar;
      } else if (currentFenceChar === fenceChar) {
        inFence = false;
        fenceChar = '';
      }
      continue;
    }

    if (!inFence) {
      visibleLines.push(line);
    }
  }

  const source = visibleLines.join('\n');
  const headings: TocItem[] = [];
  let match: RegExpExecArray | null;

  while ((match = headingRegex.exec(source)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();
    const baseId = generateId(text);
    const current = headingIdCounts.get(baseId) || 0;
    const next = current + 1;
    headingIdCounts.set(baseId, next);
    const id = current === 0 ? baseId : `${baseId}-${current}`;
    headings.push({ id, text, level });
  }

  return headings;
}

function safeEscapeSelector(value: string): string {
  // CSS.escape 在现代环境可用，但为了稳妥做一个降级
  if (typeof (globalThis as unknown as { CSS?: { escape?: (v: string) => string } }).CSS?.escape === 'function') {
    return (globalThis as unknown as { CSS: { escape: (v: string) => string } }).CSS.escape(value);
  }
  return value.replace(/["\\]/g, '\\$&');
}

export function TableOfContents({ content, offsetTop = 100 }: TableOfContentsProps) {
  const scrollContainer = usePreviewScrollContainer();

  const [activeId, setActiveId] = useState<string>('');
  const [items, setItems] = useState<TocItem[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  const navRef = useRef<HTMLElement>(null);
  const activeItemRef = useRef<HTMLAnchorElement>(null);
  const activeIdRef = useRef<string>('');

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  // 从 Markdown 内容中提取标题（与 JasBlog TableOfContents.tsx 逻辑一致）
  useEffect(() => {
    setItems(extractHeadings(content));

    const timer = window.setTimeout(() => setIsVisible(true), 100);
    return () => window.clearTimeout(timer);
  }, [content]);

  // 当 activeId 改变时，滚动目录使当前项可见
  useEffect(() => {
    if (!activeId || !activeItemRef.current || !navRef.current) return;

    const nav = navRef.current;
    const activeItem = activeItemRef.current;

    const navRect = nav.getBoundingClientRect();
    const itemRect = activeItem.getBoundingClientRect();

    const itemTop = itemRect.top - navRect.top + nav.scrollTop;
    const itemBottom = itemTop + itemRect.height;
    const navVisibleTop = nav.scrollTop;
    const navVisibleBottom = navVisibleTop + nav.clientHeight;

    if (itemTop < navVisibleTop + 40) {
      nav.scrollTo({ top: Math.max(0, itemTop - 60), behavior: 'smooth' });
    } else if (itemBottom > navVisibleBottom - 40) {
      nav.scrollTo({ top: itemBottom - nav.clientHeight + 60, behavior: 'smooth' });
    }
  }, [activeId]);

  // 监听预览容器滚动，高亮当前标题
  useEffect(() => {
    if (!scrollContainer || items.length === 0) return;

    const handleScroll = () => {
      const containerRect = scrollContainer.getBoundingClientRect();
      const scrollTop = scrollContainer.scrollTop;

      let currentId = '';

      for (const item of items) {
        const selector = `#${safeEscapeSelector(item.id)}`;
        const element = scrollContainer.querySelector<HTMLElement>(selector);
        if (!element) continue;

        const elementRect = element.getBoundingClientRect();
        const elementTop = elementRect.top - containerRect.top + scrollTop;

        if (elementTop <= scrollTop + offsetTop) {
          currentId = item.id;
        }
      }

      if (scrollTop < 100 && items.length > 0) {
        currentId = items[0].id;
      }

      if (currentId && currentId !== activeIdRef.current) {
        setActiveId(currentId);
      }
    };

    handleScroll();
    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [scrollContainer, items, offsetTop]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    if (!scrollContainer) return;

    const selector = `#${safeEscapeSelector(id)}`;
    const element = scrollContainer.querySelector<HTMLElement>(selector);
    if (!element) return;

    const containerRect = scrollContainer.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    const elementTop = elementRect.top - containerRect.top + scrollContainer.scrollTop;

    scrollContainer.scrollTo({
      top: Math.max(0, elementTop - 80),
      behavior: 'smooth',
    });

    setActiveId(id);
  }, [scrollContainer]);

  if (!scrollContainer) return null;
  if (items.length === 0) return null;

  const activeIndex = items.findIndex((item) => item.id === activeId);
  const progress = items.length > 1 ? (activeIndex / (items.length - 1)) * 100 : 0;

  return (
    <nav
      ref={navRef}
      className={`toc-scrollbar sticky top-24 w-56 max-h-[60vh] overflow-y-auto transition-all duration-500 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
      }`}
      style={{
        scrollbarWidth: 'thin',
        scrollbarColor: 'var(--color-paper-darker) transparent',
      }}
    >
      {/* 标题和进度 */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-medium text-[var(--color-ink)]">目录</h4>
        <span className="text-xs text-[var(--color-gray)]">
          {activeIndex + 1}/{items.length}
        </span>
      </div>

      {/* 进度条 */}
      <div className="h-0.5 bg-[var(--color-paper-darker)] rounded-full mb-4 overflow-hidden">
        <div
          className="h-full bg-[var(--color-vermilion)] transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 目录列表 */}
      <ul className="space-y-1 text-sm relative">
        <li
          aria-hidden="true"
          className="absolute left-0 top-0 bottom-0 w-0.5 bg-[var(--color-paper-darker)] rounded-full"
        />

        {items.map((item, index) => {
          const isActive = activeId === item.id;
          const isPassed = activeIndex >= 0 && index <= activeIndex;

          return (
            <li
              key={`${item.id}-${index}`}
              className="relative"
              style={{ paddingLeft: `${(item.level - 2) * 12}px` }}
            >
              <div
                className={`absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full transition-all duration-300 ${
                  isActive
                    ? 'bg-[var(--color-vermilion)] scale-125'
                    : isPassed
                      ? 'bg-[var(--color-vermilion)] opacity-50'
                      : 'bg-[var(--color-paper-darker)]'
                }`}
                style={{ marginLeft: '-3px' }}
              />

              <a
                ref={isActive ? activeItemRef : null}
                href={`#${item.id}`}
                className={`block py-1.5 pl-4 pr-2 rounded-r transition-all duration-200 ${
                  isActive
                    ? 'text-[var(--color-vermilion)] bg-[var(--color-vermilion)]/5 font-medium'
                    : isPassed
                      ? 'text-[var(--color-ink-light)]'
                      : 'text-[var(--color-gray)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-dark)]'
                }`}
                onClick={(e) => handleClick(e, item.id)}
              >
                <span className={`block truncate transition-transform duration-200 ${isActive ? 'translate-x-1' : ''}`}>
                  {item.text}
                </span>
              </a>
            </li>
          );
        })}
      </ul>

      {/* 快速跳转按钮 */}
      <div className="flex gap-2 mt-4 pt-4 border-t border-[var(--color-paper-darker)]">
        <button
          onClick={() => scrollContainer.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex-1 text-xs py-1.5 text-[var(--color-gray)] hover:text-[var(--color-vermilion)] hover:bg-[var(--color-paper-dark)] rounded transition-colors"
          title="回到顶部"
        >
          顶部
        </button>
        <button
          onClick={() => scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'smooth' })}
          className="flex-1 text-xs py-1.5 text-[var(--color-gray)] hover:text-[var(--color-vermilion)] hover:bg-[var(--color-paper-dark)] rounded transition-colors"
          title="跳到底部"
        >
          底部
        </button>
      </div>
    </nav>
  );
}
