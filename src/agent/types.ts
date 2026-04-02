import type { ContentType, EditorFile, WorkspaceType } from '@/types';

export type AgentCapabilityKind = 'query' | 'action' | 'approval' | 'task';
export type AgentToolCategory = 'queries' | 'actions' | 'approvals' | 'tasks';

export type AgentErrorCode =
  | 'VALIDATION_FAILED'
  | 'INVALID_INPUT'
  | 'PRECONDITION_FAILED'
  | 'RESOURCE_NOT_FOUND'
  | 'CONCURRENCY_CONFLICT'
  | 'EXTERNAL_FAILURE'
  | 'APPROVAL_REQUIRED'
  | 'PARTIAL_SIDE_EFFECT';

export interface AgentError {
  code: AgentErrorCode;
  message: string;
  retryable: boolean;
  field?: string;
  expectedState?: string;
  currentState?: string;
  suggestedAction?: string;
  completedEffects?: string[];
  pendingEffects?: string[];
}

export interface AgentResourceRef {
  type: 'workspace_document';
  id: string;
  path: string;
  name: string;
  contentType?: ContentType;
  workspacePath?: string | null;
  workspaceType?: WorkspaceType | null;
}

export interface WorkspaceDocumentSummary {
  id: string;
  path: string;
  name: string;
  contentType?: ContentType;
  isCurrent: boolean;
}

export interface WorkspaceDocumentQueryResult {
  workspacePath: string | null;
  workspaceType: WorkspaceType | null;
  totalDocuments: number;
  documents: WorkspaceDocumentSummary[];
}

export interface ActiveDocumentSnapshot {
  document: AgentResourceRef;
  isDirty: boolean;
  contentLength: number;
  metadataKeys: string[];
  hasFrontmatter: boolean;
}

export type AgentTaskStatus =
  | 'pending'
  | 'running'
  | 'blocked'
  | 'succeeded'
  | 'failed'
  | 'cancelled';

export type AgentSessionStatus =
  | 'planned'
  | 'active'
  | 'paused'
  | 'finished'
  | 'taken_over'
  | 'aborted';

export type ApprovalStatus = 'requested' | 'approved' | 'rejected' | 'expired';

export interface AgentEvent {
  type: string;
  timestamp: string;
  sessionId: string;
  resourceRef?: {
    type: string;
    id: string;
  };
  fromStatus?: string;
  toStatus?: string;
  actor?: string;
  reason?: string;
  errorCode?: AgentErrorCode;
}

export interface AgentTask {
  id: string;
  name: string;
  status: AgentTaskStatus;
  stepLabel: string;
  progress?: number;
  resultSummary?: string;
  error?: AgentError;
}

export interface AgentSession {
  id: string;
  actionName: string;
  goal: string;
  status: AgentSessionStatus;
  currentStep: string;
  actor: string;
  createdAt: string;
  updatedAt: string;
  target?: AgentResourceRef;
  blockedReason?: string;
  pendingApprovalId?: string;
  resultSummary?: string;
  error?: AgentError;
  task: AgentTask;
}

export interface AgentApproval {
  id: string;
  actionName: 'delete_workspace_document';
  sessionId: string;
  status: ApprovalStatus;
  title: string;
  reason: string;
  requestedBy: string;
  requestedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resource: AgentResourceRef;
  risk: 'high';
  sideEffects: string[];
}

export interface DocumentCapabilityDefinition {
  name: string;
  kind: AgentCapabilityKind;
  goal: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  preconditions: string[];
  sideEffects: string[];
  idempotency: string;
  confirmationRequirement: 'none' | 'required';
  failureModes: AgentErrorCode[];
  observableEvents: string[];
  requiredRole: 'operator';
  resourceScope: 'workspace';
  approvalPolicy: 'none' | 'required';
}

export interface AgentToolSchema {
  name: string;
  category: AgentToolCategory;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  requiredRole: 'operator';
  resourceScope: 'workspace';
  approvalPolicy: 'none' | 'required';
  idempotency: string;
  preconditions: string[];
  sideEffects: string[];
  failureModes: AgentErrorCode[];
  observableEvents: string[];
  metadata: {
    version: string;
    deprecated: boolean;
    replacedBy: string | null;
  };
}

export interface AgentProjection {
  session: AgentSession | null;
  approvals: AgentApproval[];
  recentEvents: AgentEvent[];
  capabilities: DocumentCapabilityDefinition[];
  toolSchemas: AgentToolSchema[];
}

export interface PersistDocumentInput {
  file: EditorFile;
  actor: string;
  document: AgentResourceRef;
}

export interface SaveDocumentResult {
  document: AgentResourceRef;
  savedAt: string;
  bytes: number;
  dirtyBeforeSave: boolean;
}

export interface DeleteDocumentInput {
  resource: AgentResourceRef;
  actor: string;
}

export interface DeleteDocumentResult {
  document: AgentResourceRef;
  deletedAt: string;
}

export interface AgentCommandResult<T> {
  ok: boolean;
  data?: T;
  error?: AgentError;
  approval?: AgentApproval;
  projection: AgentProjection;
}

export interface DocumentAgentRuntimeAdapters {
  persistDocument: (input: PersistDocumentInput) => Promise<SaveDocumentResult>;
  deleteDocument: (input: DeleteDocumentInput) => Promise<DeleteDocumentResult>;
  logEvent?: (event: AgentEvent) => Promise<void>;
  now?: () => string;
  createId?: (prefix: string) => string;
}
