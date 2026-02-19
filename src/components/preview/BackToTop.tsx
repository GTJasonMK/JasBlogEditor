import { useCallback, useEffect, useState } from 'react';
import { usePreviewScrollContainer } from './PreviewScrollContext';

interface Offset {
  right: number;
  bottom: number;
}

function clampNonNegative(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}

function computeOffset(container: HTMLElement, padding = 32): Offset {
  const rect = container.getBoundingClientRect();
  const right = clampNonNegative(window.innerWidth - rect.right + padding);
  const bottom = clampNonNegative(window.innerHeight - rect.bottom + padding);
  return { right, bottom };
}

export function BackToTop() {
  const scrollContainer = usePreviewScrollContainer();
  const [visible, setVisible] = useState(false);
  const [offset, setOffset] = useState<Offset | null>(null);

  // 监听容器滚动，决定是否显示按钮
  useEffect(() => {
    if (!scrollContainer) return;

    const toggleVisible = () => {
      setVisible(scrollContainer.scrollTop > 300);
    };

    toggleVisible();
    scrollContainer.addEventListener('scroll', toggleVisible, { passive: true });
    return () => scrollContainer.removeEventListener('scroll', toggleVisible);
  }, [scrollContainer]);

  // 计算按钮相对容器的固定位置，避免被右侧面板遮挡
  useEffect(() => {
    if (!scrollContainer || !visible) return;

    const updateOffset = () => {
      setOffset(computeOffset(scrollContainer));
    };

    updateOffset();
    window.addEventListener('resize', updateOffset);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => updateOffset());
      ro.observe(scrollContainer);
    }

    return () => {
      window.removeEventListener('resize', updateOffset);
      ro?.disconnect();
    };
  }, [scrollContainer, visible]);

  const scrollToTop = useCallback(() => {
    if (!scrollContainer) return;
    scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
  }, [scrollContainer]);

  if (!scrollContainer || !visible) return null;

  return (
    <button
      onClick={scrollToTop}
      className="w-10 h-10 bg-[var(--color-vermilion)] text-white rounded-full shadow-lg flex items-center justify-center hover:bg-[var(--color-vermilion-dark)] transition-colors z-50"
      style={{
        position: 'fixed',
        right: `${offset?.right ?? 32}px`,
        bottom: `${offset?.bottom ?? 32}px`,
      }}
      aria-label="返回顶部"
      title="返回顶部"
    >
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    </button>
  );
}

