import type { WorkspaceType } from "@/types";

export const MISSING_WORKSPACE_ERROR = "上次工作区不存在，请重新选择工作区";

export interface WorkspaceInitializationDeps {
  resolveWorkspacePath: (inputPath: string) => Promise<string>;
  detectWorkspaceTypeByPath: (path: string) => Promise<WorkspaceType>;
  pathExists: (path: string) => Promise<boolean>;
}

export interface ReadyWorkspaceInitialization {
  status: "ready";
  workspacePath: string;
  workspaceType: WorkspaceType;
}

export interface MissingWorkspaceInitialization {
  status: "missing";
  workspacePath: null;
  workspaceType: null;
  error: string;
  missingPath: string;
}

export type WorkspaceInitializationResult =
  | ReadyWorkspaceInitialization
  | MissingWorkspaceInitialization;

export async function resolveWorkspaceInitialization(
  inputPath: string,
  deps: WorkspaceInitializationDeps
): Promise<WorkspaceInitializationResult> {
  const workspacePath = await deps.resolveWorkspacePath(inputPath);
  const exists = await deps.pathExists(workspacePath);

  if (!exists) {
    return {
      status: "missing",
      workspacePath: null,
      workspaceType: null,
      error: MISSING_WORKSPACE_ERROR,
      missingPath: workspacePath,
    };
  }

  const workspaceType = await deps.detectWorkspaceTypeByPath(workspacePath);
  return {
    status: "ready",
    workspacePath,
    workspaceType,
  };
}
