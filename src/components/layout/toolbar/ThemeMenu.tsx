import { useState } from 'react';
import type { ThemeMode } from '@/types';

interface ThemeMenuProps {
  currentTheme: ThemeMode;
  effectiveTheme: 'light' | 'dark';
  onSetTheme: (theme: ThemeMode) => Promise<void>;
}

export function ThemeMenu({ currentTheme, effectiveTheme, onSetTheme }: ThemeMenuProps) {
  const [open, setOpen] = useState(false);

  const handleClick = async (theme: ThemeMode) => {
    setOpen(false);
    await onSetTheme(theme);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2 py-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] rounded-md transition-colors"
        title="切换主题"
      >
        {effectiveTheme === 'dark' ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1 bg-[var(--color-paper)] border border-[var(--color-border)] rounded-md shadow-lg py-1 z-50 min-w-[100px]">
          <button
            onClick={() => handleClick('light')}
            className={`w-full px-4 py-2 text-sm text-left hover:bg-[var(--color-surface)] transition-colors flex items-center gap-2 ${currentTheme === 'light' ? 'text-[var(--color-primary)]' : ''}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            浅色
          </button>
          <button
            onClick={() => handleClick('dark')}
            className={`w-full px-4 py-2 text-sm text-left hover:bg-[var(--color-surface)] transition-colors flex items-center gap-2 ${currentTheme === 'dark' ? 'text-[var(--color-primary)]' : ''}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
            深色
          </button>
          <button
            onClick={() => handleClick('system')}
            className={`w-full px-4 py-2 text-sm text-left hover:bg-[var(--color-surface)] transition-colors flex items-center gap-2 ${currentTheme === 'system' ? 'text-[var(--color-primary)]' : ''}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            跟随系统
          </button>
        </div>
      )}
    </div>
  );
}

