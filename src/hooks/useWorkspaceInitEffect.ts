import { useEffect } from "react";
import type { WorkspaceType } from "@/types";

interface UseWorkspaceInitEffectOptions {
  workspacePath: string | null;
  initWorkspace: (path: string) => Promise<{ workspacePath: string; workspaceType: WorkspaceType }>;
  onResolved?: (resolved: { workspacePath: string; workspaceType: WorkspaceType }) => void | Promise<void>;
}

/**
 * 设置加载完成后，初始化工作区
 */
export function useWorkspaceInitEffect(options: UseWorkspaceInitEffectOptions): void {
  const { workspacePath, initWorkspace, onResolved } = options;

  useEffect(() => {
    if (!workspacePath) return;

    let cancelled = false;

    void (async () => {
      try {
        const resolved = await initWorkspace(workspacePath);
        if (cancelled) return;
        await onResolved?.(resolved);
      } catch (error) {
        if (cancelled) return;
        console.error('初始化工作区失败:', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [workspacePath, initWorkspace, onResolved]);
}
