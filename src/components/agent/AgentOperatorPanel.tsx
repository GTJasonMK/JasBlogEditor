import { useMemo } from 'react';
import { buildWorkspaceDocumentQuery, describeActiveDocument } from '@/agent/documentQueries';
import { useAgentStore, useEditorStore, useFileStore } from '@/store';

const SESSION_STATUS_LABELS = {
  planned: '计划中',
  active: '执行中',
  paused: '已暂停',
  finished: '已完成',
  taken_over: '已接管',
  aborted: '已终止',
} as const;

const SESSION_STATUS_CLASSES = {
  planned: 'bg-[var(--color-surface)] text-[var(--color-text-muted)]',
  active: 'bg-emerald-100 text-emerald-700',
  paused: 'bg-amber-100 text-amber-700',
  finished: 'bg-sky-100 text-sky-700',
  taken_over: 'bg-rose-100 text-rose-700',
  aborted: 'bg-red-100 text-red-700',
} as const;

function formatClock(timestamp: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(timestamp));
}

export function AgentOperatorPanel() {
  const { workspacePath, workspaceType, fileTree } = useFileStore();
  const currentFile = useEditorStore((state) => state.currentFile);
  const {
    session,
    approvals,
    recentEvents,
    toolSchemas,
    error,
    approveDocumentDeletion,
    rejectDocumentDeletion,
    pauseSession,
    resumeSession,
    takeOverSession,
    clearError,
  } = useAgentStore();

  const workspaceSnapshot = useMemo(
    () =>
      buildWorkspaceDocumentQuery({
        workspacePath,
        workspaceType,
        fileTree,
        currentFilePath: currentFile?.path,
      }),
    [currentFile?.path, fileTree, workspacePath, workspaceType]
  );

  const activeDocument = useMemo(
    () =>
      describeActiveDocument({
        currentFile,
        workspacePath,
        workspaceType,
      }),
    [currentFile, workspacePath, workspaceType]
  );

  const pendingApprovals = approvals.filter((approval) => approval.status === 'requested');
  const sessionLabel = session ? SESSION_STATUS_LABELS[session.status] : '空闲';
  const sessionClassName = session
    ? SESSION_STATUS_CLASSES[session.status]
    : 'bg-[var(--color-surface)] text-[var(--color-text-muted)]';
  const canPause = session?.status === 'active';
  const canResume = session?.status === 'paused' && !session.pendingApprovalId;
  const canTakeOver = !!session && !['finished', 'taken_over', 'aborted'].includes(session.status);

  return (
    <section className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-[var(--color-text)]">Agent 控制台</h3>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            共享保存 / 删除执行路径，并实时投影审批与事件流。
          </p>
        </div>
        <span className={`px-2 py-1 rounded-full text-[11px] font-medium ${sessionClassName}`}>
          {sessionLabel}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)] p-3">
          <div className="text-[11px] text-[var(--color-text-muted)]">工作区文档</div>
          <div className="mt-1 text-lg font-semibold text-[var(--color-text)]">
            {workspaceSnapshot.totalDocuments}
          </div>
        </div>
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)] p-3">
          <div className="text-[11px] text-[var(--color-text-muted)]">待审批动作</div>
          <div className="mt-1 text-lg font-semibold text-[var(--color-text)]">
            {pendingApprovals.length}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)] p-3">
        <div className="text-[11px] text-[var(--color-text-muted)]">当前目标</div>
        <div className="mt-1 text-sm font-medium text-[var(--color-text)]">
          {session?.goal || activeDocument?.document.name || '等待新的执行请求'}
        </div>

        <div className="mt-3 space-y-1 text-xs text-[var(--color-text-muted)]">
          <div>
            当前步骤：
            <span className="ml-1 text-[var(--color-text)]">
              {session?.currentStep || '空闲'}
            </span>
          </div>
          <div>
            操作对象：
            <span className="ml-1 text-[var(--color-text)]">
              {session?.target?.name || activeDocument?.document.name || '无'}
            </span>
          </div>
          <div>
            阻塞原因：
            <span className="ml-1 text-[var(--color-text)]">
              {session?.blockedReason || '无'}
            </span>
          </div>
          {activeDocument && (
            <div>
              激活文档：
              <span className="ml-1 text-[var(--color-text)]">
                {activeDocument.document.name}
                {activeDocument.isDirty ? ' · 未保存' : ' · 已同步'}
              </span>
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => void pauseSession()}
            disabled={!canPause}
            className="px-3 py-1.5 text-xs rounded-md bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            暂停
          </button>
          <button
            onClick={() => void resumeSession()}
            disabled={!canResume}
            className="px-3 py-1.5 text-xs rounded-md bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            继续
          </button>
          <button
            onClick={() => void takeOverSession(undefined, '操作员手动接管当前执行流')}
            disabled={!canTakeOver}
            className="px-3 py-1.5 text-xs rounded-md bg-[var(--color-danger-hover)] text-[var(--color-danger)] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            接管
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-[var(--color-danger)]/20 bg-[var(--color-danger-hover)] p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-medium text-[var(--color-danger)]">{error.code}</div>
              <div className="mt-1 text-xs text-[var(--color-text)]">{error.message}</div>
            </div>
            <button
              onClick={clearError}
              className="px-2 py-1 text-xs rounded-md text-[var(--color-text-muted)] hover:bg-white/60 transition-colors"
            >
              关闭
            </button>
          </div>
        </div>
      )}

      {pendingApprovals.length > 0 && (
        <div className="space-y-3">
          <div className="text-xs font-medium text-[var(--color-text)]">待审批动作</div>
          {pendingApprovals.map((approval) => (
            <div
              key={approval.id}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)] p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-[var(--color-text)]">
                    {approval.title}
                  </div>
                  <div className="mt-1 text-xs text-[var(--color-text-muted)]">
                    {approval.reason}
                  </div>
                </div>
                <span className="px-2 py-1 rounded-full text-[11px] font-medium bg-red-100 text-red-700">
                  高风险
                </span>
              </div>

              <div className="mt-3 space-y-1 text-xs text-[var(--color-text-muted)]">
                <div>
                  目标文件：
                  <span className="ml-1 text-[var(--color-text)]">{approval.resource.name}</span>
                </div>
                <div>
                  请求时间：
                  <span className="ml-1 text-[var(--color-text)]">
                    {formatClock(approval.requestedAt)}
                  </span>
                </div>
              </div>

              <div className="mt-3 space-y-1">
                {approval.sideEffects.map((effect) => (
                  <div
                    key={effect}
                    className="text-xs text-[var(--color-text-muted)]"
                  >
                    - {effect}
                  </div>
                ))}
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => void approveDocumentDeletion(approval.id)}
                  className="flex-1 px-3 py-2 text-xs rounded-md bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)] transition-colors"
                >
                  批准并删除
                </button>
                <button
                  onClick={() => void rejectDocumentDeletion(approval.id, undefined, '操作员拒绝删除请求')}
                  className="flex-1 px-3 py-2 text-xs rounded-md bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] transition-colors"
                >
                  拒绝
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <div className="text-xs font-medium text-[var(--color-text)]">最近事件</div>
        <div className="space-y-2">
          {recentEvents.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[var(--color-border)] p-3 text-xs text-[var(--color-text-muted)]">
              还没有 agent 事件，先执行一次保存或删除试试。
            </div>
          ) : (
            recentEvents
              .slice(-8)
              .reverse()
              .map((event) => (
                <div
                  key={`${event.sessionId}-${event.type}-${event.timestamp}`}
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)] p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <code className="text-[11px] text-[var(--color-primary)]">{event.type}</code>
                    <span className="text-[11px] text-[var(--color-text-muted)]">
                      {formatClock(event.timestamp)}
                    </span>
                  </div>
                  {(event.reason || event.errorCode) && (
                    <div className="mt-2 text-xs text-[var(--color-text-muted)]">
                      {event.reason || event.errorCode}
                    </div>
                  )}
                </div>
              ))
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs font-medium text-[var(--color-text)]">MCP 能力面</div>
        <div className="flex flex-wrap gap-2">
          {toolSchemas.map((tool) => (
            <span
              key={tool.name}
              className="px-2 py-1 rounded-md bg-[var(--color-surface)] text-[11px] text-[var(--color-text)]"
              title={`${tool.category} · approval=${tool.approvalPolicy}`}
            >
              {tool.name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
