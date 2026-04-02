import type { AgentToolCategory, DocumentCapabilityDefinition, AgentToolSchema } from './types';

const CAPABILITY_VERSION = '2026-03-12';

const queryOutputEnvelope = {
  type: 'object',
  properties: {
    ok: { type: 'boolean' },
    data: { type: 'object' },
  },
  required: ['ok', 'data'],
};

const actionOutputEnvelope = {
  type: 'object',
  properties: {
    ok: { type: 'boolean' },
    data: { type: 'object' },
    error: { type: 'object' },
    approval: { type: 'object' },
  },
  required: ['ok'],
};

export const DOCUMENT_CAPABILITY_CATALOG: DocumentCapabilityDefinition[] = [
  {
    name: 'list_workspace_documents',
    kind: 'query',
    goal: '读取当前工作区内全部可编辑文档资源。',
    description: '返回当前工作区的文件资源清单，不产生副作用。',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
    outputSchema: {
      ...queryOutputEnvelope,
      properties: {
        ...queryOutputEnvelope.properties,
        data: {
          type: 'object',
          properties: {
            workspacePath: { type: ['string', 'null'] },
            workspaceType: { type: ['string', 'null'] },
            totalDocuments: { type: 'number' },
            documents: { type: 'array' },
          },
          required: ['workspacePath', 'workspaceType', 'totalDocuments', 'documents'],
        },
      },
    },
    preconditions: ['已完成工作区初始化。'],
    sideEffects: [],
    idempotency: '完全幂等。',
    confirmationRequirement: 'none',
    failureModes: ['PRECONDITION_FAILED', 'EXTERNAL_FAILURE'],
    observableEvents: [],
    requiredRole: 'operator',
    resourceScope: 'workspace',
    approvalPolicy: 'none',
  },
  {
    name: 'describe_active_document',
    kind: 'query',
    goal: '读取当前编辑器中激活文档的结构化状态。',
    description: '返回当前打开文档的路径、脏状态、frontmatter 情况和元数据键。',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
    outputSchema: queryOutputEnvelope,
    preconditions: ['当前存在已打开文档。'],
    sideEffects: [],
    idempotency: '完全幂等。',
    confirmationRequirement: 'none',
    failureModes: ['PRECONDITION_FAILED'],
    observableEvents: [],
    requiredRole: 'operator',
    resourceScope: 'workspace',
    approvalPolicy: 'none',
  },
  {
    name: 'get_agent_projection',
    kind: 'query',
    goal: '读取当前 agent session、审批和事件投影。',
    description: '用于 operator UI 和下游 agent 观察当前执行上下文。',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
    outputSchema: queryOutputEnvelope,
    preconditions: [],
    sideEffects: [],
    idempotency: '完全幂等。',
    confirmationRequirement: 'none',
    failureModes: [],
    observableEvents: [],
    requiredRole: 'operator',
    resourceScope: 'workspace',
    approvalPolicy: 'none',
  },
  {
    name: 'save_active_document',
    kind: 'action',
    goal: '把当前编辑器中的文档状态落盘到工作区文件。',
    description: '共享 UI 保存按钮与 agent 调用的同一保存路径，保留 frontmatter、BOM 和换行风格。',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
    outputSchema: actionOutputEnvelope,
    preconditions: ['当前存在可保存的活动文档。'],
    sideEffects: ['写入本地工作区文件。', '写入 agent 审计事件日志。'],
    idempotency: '状态驱动幂等；相同文档状态重复保存不会产生额外业务副作用。',
    confirmationRequirement: 'none',
    failureModes: ['PRECONDITION_FAILED', 'EXTERNAL_FAILURE'],
    observableEvents: [
      'agent.session.started',
      'agent.step.started',
      'workspace.task.started',
      'workspace.document.saved',
      'workspace.task.succeeded',
      'agent.step.succeeded',
      'agent.step.failed',
      'agent.session.finished',
      'agent.session.aborted',
    ],
    requiredRole: 'operator',
    resourceScope: 'workspace',
    approvalPolicy: 'none',
  },
  {
    name: 'delete_workspace_document',
    kind: 'action',
    goal: '删除工作区中的目标文档。',
    description: '这是高风险写操作。首次调用只会创建审批请求并阻塞 session，审批通过后才真正删除文件。',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string' },
        name: { type: 'string' },
        contentType: { type: 'string' },
        reason: { type: 'string' },
      },
      required: ['path', 'name'],
      additionalProperties: false,
    },
    outputSchema: actionOutputEnvelope,
    preconditions: ['目标文档存在于当前工作区。', '当前不存在同一文档的待处理删除审批。'],
    sideEffects: ['创建删除审批请求。', '审批通过后删除本地磁盘文件。', '如果删除的是当前文档，将关闭编辑器中的该文档。', '写入 agent 审计事件日志。'],
    idempotency: '审批前按文档维度去重；审批通过后的删除不是幂等操作。',
    confirmationRequirement: 'required',
    failureModes: ['VALIDATION_FAILED', 'RESOURCE_NOT_FOUND', 'CONCURRENCY_CONFLICT', 'APPROVAL_REQUIRED', 'EXTERNAL_FAILURE'],
    observableEvents: [
      'agent.session.started',
      'agent.step.started',
      'agent.step.requires_approval',
      'agent.step.blocked',
      'agent.session.paused',
      'workspace.approval.requested',
      'workspace.approval.approved',
      'workspace.approval.rejected',
      'workspace.document.deleted',
      'workspace.task.succeeded',
      'agent.step.succeeded',
      'agent.session.finished',
      'agent.session.taken_over',
    ],
    requiredRole: 'operator',
    resourceScope: 'workspace',
    approvalPolicy: 'required',
  },
  {
    name: 'approve_document_deletion',
    kind: 'approval',
    goal: '批准待处理的文档删除请求，并继续执行删除。',
    description: '审批通过后，会恢复被阻塞的删除 session 并执行真正的文件删除。',
    inputSchema: {
      type: 'object',
      properties: {
        approvalId: { type: 'string' },
      },
      required: ['approvalId'],
      additionalProperties: false,
    },
    outputSchema: actionOutputEnvelope,
    preconditions: ['approvalId 对应的审批当前处于 requested 状态。'],
    sideEffects: ['批准删除审批。', '删除本地磁盘文件。', '写入 agent 审计事件日志。'],
    idempotency: '非幂等；审批通过后会触发真实删除。',
    confirmationRequirement: 'required',
    failureModes: ['RESOURCE_NOT_FOUND', 'PRECONDITION_FAILED', 'EXTERNAL_FAILURE'],
    observableEvents: [
      'workspace.approval.approved',
      'agent.session.resumed',
      'workspace.task.started',
      'workspace.document.deleted',
      'workspace.task.succeeded',
      'agent.step.succeeded',
      'agent.session.finished',
    ],
    requiredRole: 'operator',
    resourceScope: 'workspace',
    approvalPolicy: 'required',
  },
  {
    name: 'reject_document_deletion',
    kind: 'approval',
    goal: '拒绝待处理的文档删除请求。',
    description: '拒绝后会终止当前删除 session，并保留事件回放用于审计。',
    inputSchema: {
      type: 'object',
      properties: {
        approvalId: { type: 'string' },
        reason: { type: 'string' },
      },
      required: ['approvalId'],
      additionalProperties: false,
    },
    outputSchema: actionOutputEnvelope,
    preconditions: ['approvalId 对应的审批当前处于 requested 状态。'],
    sideEffects: ['拒绝删除审批。', '终止对应删除 session。', '写入 agent 审计事件日志。'],
    idempotency: '幂等于审批对象；同一审批只能拒绝一次。',
    confirmationRequirement: 'required',
    failureModes: ['RESOURCE_NOT_FOUND', 'PRECONDITION_FAILED'],
    observableEvents: [
      'workspace.approval.rejected',
      'agent.session.aborted',
    ],
    requiredRole: 'operator',
    resourceScope: 'workspace',
    approvalPolicy: 'required',
  },
];

function kindToCategory(kind: DocumentCapabilityDefinition['kind']): AgentToolCategory {
  switch (kind) {
    case 'query':
      return 'queries';
    case 'action':
      return 'actions';
    case 'approval':
      return 'approvals';
    default:
      return 'tasks';
  }
}

export const DOCUMENT_TOOL_SCHEMAS: AgentToolSchema[] = DOCUMENT_CAPABILITY_CATALOG.map((capability) => ({
  name: capability.name,
  category: kindToCategory(capability.kind),
  description: capability.description,
  inputSchema: capability.inputSchema,
  outputSchema: capability.outputSchema,
  requiredRole: capability.requiredRole,
  resourceScope: capability.resourceScope,
  approvalPolicy: capability.approvalPolicy,
  idempotency: capability.idempotency,
  preconditions: capability.preconditions,
  sideEffects: capability.sideEffects,
  failureModes: capability.failureModes,
  observableEvents: capability.observableEvents,
  metadata: {
    version: CAPABILITY_VERSION,
    deprecated: false,
    replacedBy: null,
  },
}));

export const DOCUMENT_MCP_SURFACE = {
  version: CAPABILITY_VERSION,
  tools: DOCUMENT_TOOL_SCHEMAS,
};
