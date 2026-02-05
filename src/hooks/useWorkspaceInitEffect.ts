import { useEffect } from "react";
import type { WorkspaceType } from "@/types";

interface UseWorkspaceInitEffectOptions {
  workspacePath: string | null;
  workspaceType: WorkspaceType | undefined;
  initWorkspace: (path: string, preferredType?: WorkspaceType | null) => Promise<WorkspaceType>;
}

/**
 * 设置加载完成后，初始化工作区
 */
export function useWorkspaceInitEffect(options: UseWorkspaceInitEffectOptions): void {
  const { workspacePath, workspaceType, initWorkspace } = options;

  useEffect(() => {
    if (!workspacePath) return;

    void initWorkspace(workspacePath, workspaceType || null);
  }, [workspacePath, workspaceType, initWorkspace]);
}

