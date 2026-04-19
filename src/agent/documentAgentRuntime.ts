import { DOCUMENT_CAPABILITY_CATALOG, DOCUMENT_TOOL_SCHEMAS } from './documentCapabilityCatalog';
import type {
  AgentApproval,
  AgentCommandResult,
  AgentError,
  AgentEvent,
  AgentProjection,
  AgentResourceRef,
  AgentSession,
  AgentTask,
  DeleteDocumentResult,
  DocumentAgentRuntimeAdapters,
  SaveDocumentResult,
} from './types';

function createAgentError(
  code: AgentError['code'],
  message: string,
  extras: Partial<AgentError> = {}
): AgentError {
  return {
    code,
    message,
    retryable: code === 'CONCURRENCY_CONFLICT' || code === 'EXTERNAL_FAILURE',
    ...extras,
  };
}

function normalizeAgentError(error: unknown, fallback: AgentError): AgentError {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    'retryable' in error
  ) {
    return error as AgentError;
  }

  if (error instanceof Error) {
    return {
      ...fallback,
      message: error.message || fallback.message,
    };
  }

  return fallback;
}

function cloneTask(task: AgentTask): AgentTask {
  return {
    ...task,
    error: task.error ? { ...task.error } : undefined,
  };
}

function cloneSession(session: AgentSession | null): AgentSession | null {
  if (!session) return null;
  return {
    ...session,
    target: session.target ? { ...session.target } : undefined,
    error: session.error ? { ...session.error } : undefined,
    task: cloneTask(session.task),
  };
}

function cloneApproval(approval: AgentApproval): AgentApproval {
  return {
    ...approval,
    resource: { ...approval.resource },
    sideEffects: [...approval.sideEffects],
  };
}

function cloneEvent(event: AgentEvent): AgentEvent {
  return {
    ...event,
    resourceRef: event.resourceRef ? { ...event.resourceRef } : undefined,
  };
}

export class DocumentAgentRuntime {
  private session: AgentSession | null = null;
  private approvals: AgentApproval[] = [];
  private recentEvents: AgentEvent[] = [];

  constructor(private readonly adapters: DocumentAgentRuntimeAdapters) {}

  getProjection(): AgentProjection {
    return {
      session: cloneSession(this.session),
      approvals: this.approvals.map(cloneApproval),
      recentEvents: this.recentEvents.map(cloneEvent),
      capabilities: DOCUMENT_CAPABILITY_CATALOG,
      toolSchemas: DOCUMENT_TOOL_SCHEMAS,
    };
  }

  async saveActiveDocument(input: {
    file: Parameters<DocumentAgentRuntimeAdapters['persistDocument']>[0]['file'] | null;
    actor: string;
    resource: AgentResourceRef | null;
  }): Promise<AgentCommandResult<SaveDocumentResult>> {
    if (!input.file || !input.resource) {
      return this.commandResult<SaveDocumentResult>(
        false,
        undefined,
        createAgentError('PRECONDITION_FAILED', '当前没有可保存的活动文档。', {
          suggestedAction: 'describe_active_document',
        })
      );
    }

    await this.startSession({
      actionName: 'save_active_document',
      actor: input.actor,
      goal: `保存文档 ${input.resource.name}`,
      stepLabel: '写入文档内容',
      target: input.resource,
    });

    await this.emit({
      type: 'agent.step.started',
      sessionId: this.session!.id,
      actor: input.actor,
      reason: '开始保存当前活动文档',
    });
    await this.emit({
      type: 'workspace.task.started',
      sessionId: this.session!.id,
      actor: input.actor,
      resourceRef: { type: input.resource.type, id: input.resource.id },
      fromStatus: 'pending',
      toStatus: 'running',
      reason: 'save_active_document',
    });

    try {
      const data = await this.adapters.persistDocument({
        file: input.file,
        actor: input.actor,
        document: input.resource,
      });

      this.finishSession('保存完成', `已保存 ${input.resource.name}`);
      await this.emit({
        type: 'workspace.document.saved',
        sessionId: this.session!.id,
        actor: input.actor,
        resourceRef: { type: input.resource.type, id: input.resource.id },
      });
      await this.emit({
        type: 'workspace.task.succeeded',
        sessionId: this.session!.id,
        actor: input.actor,
        resourceRef: { type: input.resource.type, id: input.resource.id },
        fromStatus: 'running',
        toStatus: 'succeeded',
      });
      await this.emit({
        type: 'agent.step.succeeded',
        sessionId: this.session!.id,
        actor: input.actor,
        resourceRef: { type: input.resource.type, id: input.resource.id },
      });
      await this.emit({
        type: 'agent.session.finished',
        sessionId: this.session!.id,
        actor: input.actor,
        fromStatus: 'active',
        toStatus: 'finished',
      });

      return this.commandResult(true, data);
    } catch (error) {
      const normalized = normalizeAgentError(
        error,
        createAgentError('EXTERNAL_FAILURE', `保存 ${input.resource.name} 失败。`)
      );
      this.failSession(normalized, '保存失败');
      await this.emit({
        type: 'workspace.task.failed',
        sessionId: this.session!.id,
        actor: input.actor,
        resourceRef: { type: input.resource.type, id: input.resource.id },
        fromStatus: 'running',
        toStatus: 'failed',
        errorCode: normalized.code,
        reason: normalized.message,
      });
      await this.emit({
        type: 'agent.step.failed',
        sessionId: this.session!.id,
        actor: input.actor,
        resourceRef: { type: input.resource.type, id: input.resource.id },
        errorCode: normalized.code,
        reason: normalized.message,
      });
      await this.emit({
        type: 'agent.session.aborted',
        sessionId: this.session!.id,
        actor: input.actor,
        fromStatus: 'active',
        toStatus: 'aborted',
        errorCode: normalized.code,
        reason: normalized.message,
      });

      return this.commandResult<SaveDocumentResult>(false, undefined, normalized);
    }
  }

  async deleteWorkspaceDocument(input: {
    resource: AgentResourceRef;
    actor: string;
    reason?: string;
  }): Promise<AgentCommandResult<DeleteDocumentResult>> {
    if (!input.resource.path.trim() || !input.resource.name.trim()) {
      return this.commandResult<DeleteDocumentResult>(
        false,
        undefined,
        createAgentError('VALIDATION_FAILED', '删除文档需要明确的 path 和 name。', {
          field: 'path',
        })
      );
    }

    const existingApproval = this.approvals.find(
      (approval) =>
        approval.status === 'requested' &&
        approval.resource.id === input.resource.id
    );
    if (existingApproval) {
      return this.commandResult<DeleteDocumentResult>(
        false,
        undefined,
        createAgentError('CONCURRENCY_CONFLICT', `文档 ${input.resource.name} 已有待审批删除请求。`, {
          suggestedAction: 'approve_document_deletion',
        }),
        existingApproval
      );
    }

    await this.startSession({
      actionName: 'delete_workspace_document',
      actor: input.actor,
      goal: `删除文档 ${input.resource.name}`,
      stepLabel: '等待人工审批',
      target: input.resource,
    });

    const approval: AgentApproval = {
      id: this.createId('approval'),
      actionName: 'delete_workspace_document',
      sessionId: this.session!.id,
      status: 'requested',
      title: `删除 ${input.resource.name}`,
      reason: input.reason || '删除文档属于高风险写操作，需要人工审批。',
      requestedBy: input.actor,
      requestedAt: this.now(),
      resource: { ...input.resource },
      risk: 'high',
      sideEffects: [
        `永久删除 ${input.resource.path}`,
        '如果该文档正在编辑中，会同步关闭编辑器里的当前文档',
      ],
    };

    this.approvals = [approval, ...this.approvals].slice(0, 20);
    this.updateSession({
      status: 'paused',
      currentStep: '等待人工审批',
      blockedReason: 'APPROVAL_REQUIRED',
      pendingApprovalId: approval.id,
      task: {
        ...this.session!.task,
        status: 'blocked',
        stepLabel: '等待人工审批',
      },
    });

    await this.emit({
      type: 'agent.step.started',
      sessionId: this.session!.id,
      actor: input.actor,
      resourceRef: { type: input.resource.type, id: input.resource.id },
      reason: '开始处理删除请求',
    });
    await this.emit({
      type: 'agent.step.requires_approval',
      sessionId: this.session!.id,
      actor: input.actor,
      resourceRef: { type: input.resource.type, id: input.resource.id },
      reason: approval.reason,
    });
    await this.emit({
      type: 'agent.step.blocked',
      sessionId: this.session!.id,
      actor: input.actor,
      resourceRef: { type: input.resource.type, id: input.resource.id },
      fromStatus: 'running',
      toStatus: 'blocked',
      reason: 'APPROVAL_REQUIRED',
    });
    await this.emit({
      type: 'workspace.approval.requested',
      sessionId: this.session!.id,
      actor: input.actor,
      resourceRef: { type: input.resource.type, id: input.resource.id },
      reason: approval.reason,
    });
    await this.emit({
      type: 'agent.session.paused',
      sessionId: this.session!.id,
      actor: input.actor,
      fromStatus: 'active',
      toStatus: 'paused',
      reason: '等待人工审批',
    });

    return this.commandResult<DeleteDocumentResult>(
      false,
      undefined,
      createAgentError('APPROVAL_REQUIRED', `删除 ${input.resource.name} 需要人工审批。`, {
        suggestedAction: 'approve_document_deletion',
      }),
      approval
    );
  }

  async approveDocumentDeletion(input: {
    approvalId: string;
    actor: string;
  }): Promise<AgentCommandResult<DeleteDocumentResult>> {
    const approval = this.approvals.find((item) => item.id === input.approvalId);
    if (!approval) {
      return this.commandResult<DeleteDocumentResult>(
        false,
        undefined,
        createAgentError('RESOURCE_NOT_FOUND', `未找到审批 ${input.approvalId}。`)
      );
    }

    if (approval.status !== 'requested') {
      return this.commandResult<DeleteDocumentResult>(
        false,
        undefined,
        createAgentError('PRECONDITION_FAILED', `审批 ${approval.id} 当前不在 requested 状态。`, {
          expectedState: 'requested',
          currentState: approval.status,
        })
      );
    }

    const approvedApproval: AgentApproval = {
      ...approval,
      status: 'approved',
      resolvedAt: this.now(),
      resolvedBy: input.actor,
    };
    this.approvals = this.approvals.map((item) =>
      item.id === approval.id ? approvedApproval : item
    );

    this.updateSession({
      status: 'active',
      currentStep: '执行文档删除',
      blockedReason: undefined,
      pendingApprovalId: undefined,
      task: {
        ...this.session!.task,
        status: 'running',
        stepLabel: '执行文档删除',
      },
    });

    await this.emit({
      type: 'workspace.approval.approved',
      sessionId: approval.sessionId,
      actor: input.actor,
      resourceRef: { type: approval.resource.type, id: approval.resource.id },
    });
    await this.emit({
      type: 'agent.session.resumed',
      sessionId: approval.sessionId,
      actor: input.actor,
      fromStatus: 'paused',
      toStatus: 'active',
      reason: '审批通过，继续执行删除',
    });
    await this.emit({
      type: 'workspace.task.started',
      sessionId: approval.sessionId,
      actor: input.actor,
      resourceRef: { type: approval.resource.type, id: approval.resource.id },
      fromStatus: 'blocked',
      toStatus: 'running',
      reason: 'delete_workspace_document',
    });

    try {
      const data = await this.adapters.deleteDocument({
        resource: approval.resource,
        actor: input.actor,
      });

      this.finishSession('删除完成', `已删除 ${approval.resource.name}`);
      await this.emit({
        type: 'workspace.document.deleted',
        sessionId: approval.sessionId,
        actor: input.actor,
        resourceRef: { type: approval.resource.type, id: approval.resource.id },
      });
      await this.emit({
        type: 'workspace.task.succeeded',
        sessionId: approval.sessionId,
        actor: input.actor,
        resourceRef: { type: approval.resource.type, id: approval.resource.id },
        fromStatus: 'running',
        toStatus: 'succeeded',
      });
      await this.emit({
        type: 'agent.step.succeeded',
        sessionId: approval.sessionId,
        actor: input.actor,
        resourceRef: { type: approval.resource.type, id: approval.resource.id },
      });
      await this.emit({
        type: 'agent.session.finished',
        sessionId: approval.sessionId,
        actor: input.actor,
        fromStatus: 'active',
        toStatus: 'finished',
      });

      return this.commandResult(true, data);
    } catch (error) {
      const normalized = normalizeAgentError(
        error,
        createAgentError('EXTERNAL_FAILURE', `删除 ${approval.resource.name} 失败。`)
      );
      this.failSession(normalized, '删除失败');
      await this.emit({
        type: 'workspace.task.failed',
        sessionId: approval.sessionId,
        actor: input.actor,
        resourceRef: { type: approval.resource.type, id: approval.resource.id },
        fromStatus: 'running',
        toStatus: 'failed',
        errorCode: normalized.code,
        reason: normalized.message,
      });
      await this.emit({
        type: 'agent.step.failed',
        sessionId: approval.sessionId,
        actor: input.actor,
        resourceRef: { type: approval.resource.type, id: approval.resource.id },
        errorCode: normalized.code,
        reason: normalized.message,
      });
      await this.emit({
        type: 'agent.session.aborted',
        sessionId: approval.sessionId,
        actor: input.actor,
        fromStatus: 'active',
        toStatus: 'aborted',
        errorCode: normalized.code,
        reason: normalized.message,
      });

      return this.commandResult<DeleteDocumentResult>(false, undefined, normalized);
    }
  }

  async rejectDocumentDeletion(input: {
    approvalId: string;
    actor: string;
    reason?: string;
  }): Promise<AgentCommandResult<AgentApproval>> {
    const approval = this.approvals.find((item) => item.id === input.approvalId);
    if (!approval) {
      return this.commandResult<AgentApproval>(
        false,
        undefined,
        createAgentError('RESOURCE_NOT_FOUND', `未找到审批 ${input.approvalId}。`)
      );
    }

    if (approval.status !== 'requested') {
      return this.commandResult<AgentApproval>(
        false,
        undefined,
        createAgentError('PRECONDITION_FAILED', `审批 ${approval.id} 当前不在 requested 状态。`, {
          expectedState: 'requested',
          currentState: approval.status,
        })
      );
    }

    const rejectedApproval: AgentApproval = {
      ...approval,
      status: 'rejected',
      resolvedAt: this.now(),
      resolvedBy: input.actor,
    };
    this.approvals = this.approvals.map((item) =>
      item.id === approval.id ? rejectedApproval : item
    );

    this.updateSession({
      status: 'aborted',
      currentStep: '删除已拒绝',
      blockedReason: input.reason || '审批已拒绝',
      pendingApprovalId: undefined,
      resultSummary: '删除请求已终止',
      task: {
        ...this.session!.task,
        status: 'cancelled',
        stepLabel: '删除已拒绝',
      },
    });

    await this.emit({
      type: 'workspace.approval.rejected',
      sessionId: approval.sessionId,
      actor: input.actor,
      resourceRef: { type: approval.resource.type, id: approval.resource.id },
      reason: input.reason || '操作员拒绝删除请求',
    });
    await this.emit({
      type: 'agent.session.aborted',
      sessionId: approval.sessionId,
      actor: input.actor,
      fromStatus: 'paused',
      toStatus: 'aborted',
      reason: input.reason || '审批被拒绝',
    });

    return this.commandResult(true, cloneApproval(rejectedApproval));
  }

  async pauseSession(input: { actor: string }): Promise<AgentCommandResult<null>> {
    if (!this.session) {
      return this.commandResult<null>(
        false,
        undefined,
        createAgentError('PRECONDITION_FAILED', '当前没有可暂停的 session。')
      );
    }

    if (this.session.status !== 'active') {
      return this.commandResult<null>(
        false,
        undefined,
        createAgentError('PRECONDITION_FAILED', '只有 active session 才能暂停。', {
          expectedState: 'active',
          currentState: this.session.status,
        })
      );
    }

    const sessionId = this.session.id;
    this.updateSession({ status: 'paused' });
    await this.emit({
      type: 'agent.session.paused',
      sessionId,
      actor: input.actor,
      fromStatus: 'active',
      toStatus: 'paused',
      reason: '人工暂停',
    });

    return this.commandResult(true, null);
  }

  async resumeSession(input: { actor: string }): Promise<AgentCommandResult<null>> {
    if (!this.session) {
      return this.commandResult<null>(
        false,
        undefined,
        createAgentError('PRECONDITION_FAILED', '当前没有可恢复的 session。')
      );
    }

    if (this.session.status !== 'paused') {
      return this.commandResult<null>(
        false,
        undefined,
        createAgentError('PRECONDITION_FAILED', '只有 paused session 才能恢复。', {
          expectedState: 'paused',
          currentState: this.session.status,
        })
      );
    }

    if (this.session.pendingApprovalId) {
      return this.commandResult<null>(
        false,
        undefined,
        createAgentError('PRECONDITION_FAILED', '当前 session 仍在等待审批，不能直接恢复。', {
          suggestedAction: 'approve_document_deletion',
        })
      );
    }

    const sessionId = this.session.id;
    this.updateSession({ status: 'active' });
    await this.emit({
      type: 'agent.session.resumed',
      sessionId,
      actor: input.actor,
      fromStatus: 'paused',
      toStatus: 'active',
      reason: '人工恢复',
    });

    return this.commandResult(true, null);
  }

  async takeOverSession(input: {
    actor: string;
    reason?: string;
  }): Promise<AgentCommandResult<null>> {
    if (!this.session) {
      return this.commandResult<null>(
        false,
        undefined,
        createAgentError('PRECONDITION_FAILED', '当前没有可接管的 session。')
      );
    }

    const sessionId = this.session.id;
    const pendingApproval = this.session.pendingApprovalId
      ? this.approvals.find((approval) => approval.id === this.session?.pendingApprovalId)
      : null;
    if (pendingApproval && pendingApproval.status === 'requested') {
      const expiredApproval: AgentApproval = {
        ...pendingApproval,
        status: 'expired',
        resolvedAt: this.now(),
        resolvedBy: input.actor,
      };
      this.approvals = this.approvals.map((item) =>
        item.id === pendingApproval.id ? expiredApproval : item
      );
      await this.emit({
        type: 'workspace.approval.expired',
        sessionId,
        actor: input.actor,
        resourceRef: {
          type: pendingApproval.resource.type,
          id: pendingApproval.resource.id,
        },
        reason: input.reason || '人工接管后终止待审批删除请求',
      });
    }

    this.updateSession({
      status: 'taken_over',
      currentStep: '人工接管',
      pendingApprovalId: undefined,
      blockedReason: input.reason || '操作员已接管当前 session',
      task: {
        ...this.session.task,
        status:
          this.session.task.status === 'succeeded'
            ? 'succeeded'
            : 'cancelled',
        stepLabel: '人工接管',
      },
    });
    await this.emit({
      type: 'agent.session.taken_over',
      sessionId,
      actor: input.actor,
      fromStatus: 'paused',
      toStatus: 'taken_over',
      reason: input.reason || '操作员已接管执行流',
    });

    return this.commandResult(true, null);
  }

  private async startSession(params: {
    actionName: AgentSession['actionName'];
    actor: string;
    goal: string;
    stepLabel: string;
    target?: AgentResourceRef;
  }) {
    const timestamp = this.now();
    this.session = {
      id: this.createId('session'),
      actionName: params.actionName,
      goal: params.goal,
      status: 'active',
      currentStep: params.stepLabel,
      actor: params.actor,
      createdAt: timestamp,
      updatedAt: timestamp,
      target: params.target,
      task: {
        id: this.createId('task'),
        name: params.actionName,
        status: 'running',
        stepLabel: params.stepLabel,
      },
    };
    await this.emit({
      type: 'agent.session.started',
      sessionId: this.session.id,
      actor: params.actor,
      resourceRef: params.target
        ? { type: params.target.type, id: params.target.id }
        : undefined,
      fromStatus: 'planned',
      toStatus: 'active',
      reason: params.goal,
    });
  }

  private finishSession(stepLabel: string, resultSummary: string) {
    if (!this.session) return;
    this.session = {
      ...this.session,
      status: 'finished',
      currentStep: stepLabel,
      updatedAt: this.now(),
      resultSummary,
      blockedReason: undefined,
      pendingApprovalId: undefined,
      error: undefined,
      task: {
        ...this.session.task,
        status: 'succeeded',
        stepLabel,
        resultSummary,
        error: undefined,
      },
    };
  }

  private failSession(error: AgentError, stepLabel: string) {
    if (!this.session) return;
    this.session = {
      ...this.session,
      status: 'aborted',
      currentStep: stepLabel,
      updatedAt: this.now(),
      blockedReason: error.message,
      error,
      task: {
        ...this.session.task,
        status: 'failed',
        stepLabel,
        error,
      },
    };
  }

  private updateSession(patch: Partial<AgentSession>) {
    if (!this.session) return;
    this.session = {
      ...this.session,
      ...patch,
      updatedAt: this.now(),
      task: patch.task ? cloneTask(patch.task) : cloneTask(this.session.task),
    };
  }

  private async emit(event: Omit<AgentEvent, 'timestamp'>) {
    const payload: AgentEvent = {
      ...event,
      timestamp: this.now(),
    };
    this.recentEvents = [...this.recentEvents, payload].slice(-40);
    await this.adapters.logEvent?.(payload);
  }

  private commandResult<T>(
    ok: boolean,
    data?: T,
    error?: AgentError,
    approval?: AgentApproval
  ): AgentCommandResult<T> {
    return {
      ok,
      data,
      error,
      approval: approval ? cloneApproval(approval) : undefined,
      projection: this.getProjection(),
    };
  }

  private now(): string {
    return this.adapters.now?.() || new Date().toISOString();
  }

  private createId(prefix: string): string {
    if (this.adapters.createId) {
      return this.adapters.createId(prefix);
    }

    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `${prefix}_${crypto.randomUUID()}`;
    }

    return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
  }
}
