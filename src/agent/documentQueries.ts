import type { FileTreeNode } from '@/store/fileStore';
import type { EditorFile, WorkspaceType } from '@/types';
import { collectLeafFiles } from '@/utils/fileTree';
import { isSamePath, normalizeSlashes } from '@/utils/path';
import type {
  ActiveDocumentSnapshot,
  AgentProjection,
  AgentResourceRef,
  WorkspaceDocumentQueryResult,
} from './types';
import { DOCUMENT_CAPABILITY_CATALOG, DOCUMENT_TOOL_SCHEMAS } from './documentCapabilityCatalog';

function buildDocumentId(path: string): string {
  return normalizeSlashes(path).toLowerCase();
}

export function createDocumentResourceRef(params: {
  path: string;
  name?: string;
  contentType?: EditorFile['type'];
  workspacePath?: string | null;
  workspaceType?: WorkspaceType | null;
}): AgentResourceRef {
  const name = params.name || params.path.split(/[/\\]/).pop() || params.path;

  return {
    type: 'workspace_document',
    id: buildDocumentId(params.path),
    path: params.path,
    name,
    contentType: params.contentType,
    workspacePath: params.workspacePath ?? null,
    workspaceType: params.workspaceType ?? null,
  };
}

export function buildWorkspaceDocumentQuery(params: {
  workspacePath: string | null;
  workspaceType: WorkspaceType | null;
  fileTree: FileTreeNode[];
  currentFilePath?: string | null;
}): WorkspaceDocumentQueryResult {
  const documents = collectLeafFiles(params.fileTree).map((node) => ({
    id: buildDocumentId(node.path),
    path: node.path,
    name: node.name,
    contentType: node.contentType,
    isCurrent: !!params.currentFilePath && isSamePath(node.path, params.currentFilePath),
  }));

  return {
    workspacePath: params.workspacePath,
    workspaceType: params.workspaceType,
    totalDocuments: documents.length,
    documents,
  };
}

export function describeActiveDocument(params: {
  currentFile: EditorFile | null;
  workspacePath: string | null;
  workspaceType: WorkspaceType | null;
}): ActiveDocumentSnapshot | null {
  const { currentFile, workspacePath, workspaceType } = params;
  if (!currentFile) return null;

  return {
    document: createDocumentResourceRef({
      path: currentFile.path,
      name: currentFile.name,
      contentType: currentFile.type,
      workspacePath,
      workspaceType,
    }),
    isDirty: currentFile.isDirty,
    contentLength: currentFile.content.length,
    metadataKeys: Object.keys(currentFile.metadata || {}),
    hasFrontmatter: currentFile.hasFrontmatter,
  };
}

export function buildAgentProjection(params: {
  session: AgentProjection['session'];
  approvals: AgentProjection['approvals'];
  recentEvents: AgentProjection['recentEvents'];
}): AgentProjection {
  return {
    session: params.session,
    approvals: params.approvals,
    recentEvents: params.recentEvents,
    capabilities: DOCUMENT_CAPABILITY_CATALOG,
    toolSchemas: DOCUMENT_TOOL_SCHEMAS,
  };
}
