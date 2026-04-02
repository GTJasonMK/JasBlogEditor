import { create } from 'zustand';
import { invokeTauri } from '@/platform/tauri';
import { isTauri } from '@/platform/runtime';
import { prepareDocumentSave } from '@/services/documentPersistence';
import { createDocumentResourceRef } from '@/agent/documentQueries';
import { DocumentAgentRuntime } from '@/agent/documentAgentRuntime';
import type {
  AgentApproval,
  AgentCommandResult,
  AgentError,
  AgentProjection,
  AgentResourceRef,
  DeleteDocumentResult,
  SaveDocumentResult,
} from '@/agent/types';
import { useEditorStore } from './editorStore';
import { useFileStore } from './fileStore';

interface AgentState extends AgentProjection {
  error: AgentError | null;
  syncProjection: () => void;
  saveActiveDocument: (actor?: string) => Promise<AgentCommandResult<SaveDocumentResult>>;
  deleteWorkspaceDocument: (
    resource: AgentResourceRef,
    actor?: string,
    reason?: string
  ) => Promise<AgentCommandResult<DeleteDocumentResult>>;
  approveDocumentDeletion: (
    approvalId: string,
    actor?: string
  ) => Promise<AgentCommandResult<DeleteDocumentResult>>;
  rejectDocumentDeletion: (
    approvalId: string,
    actor?: string,
    reason?: string
  ) => Promise<AgentCommandResult<AgentApproval>>;
  pauseSession: (actor?: string) => Promise<AgentCommandResult<null>>;
  resumeSession: (actor?: string) => Promise<AgentCommandResult<null>>;
  takeOverSession: (actor?: string, reason?: string) => Promise<AgentCommandResult<null>>;
  clearError: () => void;
}

let auditLogPathPromise: Promise<string | null> | null = null;

async function getAuditLogPath(): Promise<string | null> {
  if (!isTauri()) return null;
  if (!auditLogPathPromise) {
    auditLogPathPromise = invokeTauri('get_app_data_dir')
      .then((dir) => `${dir}/agent-events.jsonl`)
      .catch(() => null);
  }
  return auditLogPathPromise;
}

const runtime = new DocumentAgentRuntime({
  persistDocument: async ({ file, document }) => {
    const prepared = prepareDocumentSave(file);
    await invokeTauri('write_file', {
      path: file.path,
      content: prepared.fileContent,
    });

    useEditorStore.setState((state) => ({
      currentFile:
        state.currentFile && state.currentFile.path === file.path
          ? prepared.nextFile
          : state.currentFile,
    }));

    return {
      document,
      savedAt: new Date().toISOString(),
      bytes: prepared.fileContent.length,
      dirtyBeforeSave: file.isDirty,
    };
  },
  deleteDocument: async ({ resource }) => {
    await invokeTauri('delete_file', { path: resource.path });

    useEditorStore.setState((state) => ({
      currentFile:
        state.currentFile && state.currentFile.path === resource.path
          ? null
          : state.currentFile,
    }));

    return {
      document: resource,
      deletedAt: new Date().toISOString(),
    };
  },
  logEvent: async (event) => {
    const path = await getAuditLogPath();
    if (!path) return;
    await invokeTauri('append_file', {
      path,
      content: `${JSON.stringify(event)}\n`,
    });
  },
});

function applyProjection(
  set: (partial: Partial<AgentState>) => void,
  projection: AgentProjection
) {
  set({
    session: projection.session,
    approvals: projection.approvals,
    recentEvents: projection.recentEvents,
    capabilities: projection.capabilities,
    toolSchemas: projection.toolSchemas,
  });
}

function setEditorLoading(loading: boolean) {
  useEditorStore.setState((state) => ({
    isLoading: loading,
    error: loading ? null : state.error,
  }));
}

export const useAgentStore = create<AgentState>((set) => {
  const initialProjection = runtime.getProjection();

  return {
    ...initialProjection,
    error: null,

    syncProjection: () => {
      applyProjection(set, runtime.getProjection());
    },

    saveActiveDocument: async (actor = 'user:editor') => {
      const currentFile = useEditorStore.getState().currentFile;
      const { workspacePath, workspaceType } = useFileStore.getState();
      const resource = currentFile
        ? createDocumentResourceRef({
            path: currentFile.path,
            name: currentFile.name,
            contentType: currentFile.type,
            workspacePath,
            workspaceType,
          })
        : null;

      set({ error: null });
      setEditorLoading(true);
      try {
        const result = await runtime.saveActiveDocument({
          file: currentFile,
          actor,
          resource,
        });
        applyProjection(set, result.projection);

        if (!result.ok && result.error) {
          set({ error: result.error });
          useEditorStore.setState({ error: result.error.message });
        } else {
          useEditorStore.setState({ error: null });
        }

        return result;
      } finally {
        setEditorLoading(false);
      }
    },

    deleteWorkspaceDocument: async (resource, actor = 'user:operator', reason) => {
      set({ error: null });
      const result = await runtime.deleteWorkspaceDocument({
        resource,
        actor,
        reason,
      });
      applyProjection(set, result.projection);

      if (!result.ok && result.error && result.error.code !== 'APPROVAL_REQUIRED') {
        set({ error: result.error });
      }

      return result;
    },

    approveDocumentDeletion: async (approvalId, actor = 'user:operator') => {
      set({ error: null });
      setEditorLoading(true);
      try {
        const result = await runtime.approveDocumentDeletion({ approvalId, actor });
        applyProjection(set, result.projection);

        if (result.ok) {
          await useFileStore.getState().refreshFileTree();
          useEditorStore.setState({ error: null });
        } else if (result.error) {
          set({ error: result.error });
          useEditorStore.setState({ error: result.error.message });
        }

        return result;
      } finally {
        setEditorLoading(false);
      }
    },

    rejectDocumentDeletion: async (approvalId, actor = 'user:operator', reason) => {
      set({ error: null });
      const result = await runtime.rejectDocumentDeletion({ approvalId, actor, reason });
      applyProjection(set, result.projection);

      if (!result.ok && result.error) {
        set({ error: result.error });
      }

      return result;
    },

    pauseSession: async (actor = 'user:operator') => {
      set({ error: null });
      const result = await runtime.pauseSession({ actor });
      applyProjection(set, result.projection);
      if (!result.ok && result.error) {
        set({ error: result.error });
      }
      return result;
    },

    resumeSession: async (actor = 'user:operator') => {
      set({ error: null });
      const result = await runtime.resumeSession({ actor });
      applyProjection(set, result.projection);
      if (!result.ok && result.error) {
        set({ error: result.error });
      }
      return result;
    },

    takeOverSession: async (actor = 'user:operator', reason) => {
      set({ error: null });
      const result = await runtime.takeOverSession({ actor, reason });
      applyProjection(set, result.projection);
      if (!result.ok && result.error) {
        set({ error: result.error });
      }
      return result;
    },

    clearError: () => {
      set({ error: null });
    },
  };
});
