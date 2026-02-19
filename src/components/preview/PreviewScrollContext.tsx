import { createContext, useContext, type ReactNode } from 'react';

const PreviewScrollContext = createContext<HTMLElement | null>(null);

interface PreviewScrollProviderProps {
  container: HTMLElement | null;
  children: ReactNode;
}

export function PreviewScrollProvider({ container, children }: PreviewScrollProviderProps) {
  return (
    <PreviewScrollContext.Provider value={container}>
      {children}
    </PreviewScrollContext.Provider>
  );
}

export function usePreviewScrollContainer(): HTMLElement | null {
  return useContext(PreviewScrollContext);
}

