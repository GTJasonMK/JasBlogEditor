import test from 'node:test';
import assert from 'node:assert/strict';
import { DocumentAgentRuntime } from '../src/agent/documentAgentRuntime';
import { createDocumentResourceRef } from '../src/agent/documentQueries';
import type { EditorFile } from '../src/types/content';

function createEditorFile(): EditorFile {
  return {
    path: '/workspace/notes/agent-ready.md',
    name: 'agent-ready.md',
    type: 'note',
    content: '## Agent Ready\n',
    metadata: {
      title: 'Agent Ready',
      date: '2026-03-12',
      excerpt: 'agent',
      tags: ['agent'],
    },
    issues: [],
    metadataDirty: false,
    isDirty: true,
    hasFrontmatter: true,
    hasBom: false,
    lineEnding: 'lf',
    frontmatterBlock: '---\ntitle: Agent Ready\ndate: 2026-03-12\nexcerpt: agent\ntags:\n  - agent\n---\n\n',
    frontmatterRaw: {
      title: 'Agent Ready',
      date: '2026-03-12',
      excerpt: 'agent',
      tags: ['agent'],
    },
  };
}

test('saveActiveDocument 走完整成功事件链并结束 session', async () => {
  let index = 0;
  const runtime = new DocumentAgentRuntime({
    persistDocument: async ({ document, file }) => ({
      document,
      savedAt: '2026-03-12T09:00:00.000Z',
      bytes: file.content.length,
      dirtyBeforeSave: file.isDirty,
    }),
    deleteDocument: async () => {
      throw new Error('should not delete');
    },
    now: () => `2026-03-12T09:00:0${index++}.000Z`,
    createId: (prefix) => `${prefix}_${index++}`,
  });

  const file = createEditorFile();
  const resource = createDocumentResourceRef({
    path: file.path,
    name: file.name,
    contentType: file.type,
    workspacePath: '/workspace',
    workspaceType: 'jasblog',
  });

  const result = await runtime.saveActiveDocument({
    file,
    actor: 'agent:test',
    resource,
  });

  assert.equal(result.ok, true);
  assert.equal(result.data?.document.path, file.path);
  assert.equal(result.projection.session?.status, 'finished');
  assert.equal(result.projection.session?.task.status, 'succeeded');
  assert.deepEqual(
    result.projection.recentEvents.map((event) => event.type),
    [
      'agent.session.started',
      'agent.step.started',
      'workspace.task.started',
      'workspace.document.saved',
      'workspace.task.succeeded',
      'agent.step.succeeded',
      'agent.session.finished',
    ]
  );
});

test('deleteWorkspaceDocument 先阻塞审批，审批通过后才真正删除', async () => {
  let deletedPath = '';
  let index = 0;
  const runtime = new DocumentAgentRuntime({
    persistDocument: async () => {
      throw new Error('should not save');
    },
    deleteDocument: async ({ resource }) => {
      deletedPath = resource.path;
      return {
        document: resource,
        deletedAt: '2026-03-12T09:10:00.000Z',
      };
    },
    now: () => `2026-03-12T09:10:0${index++}.000Z`,
    createId: (prefix) => `${prefix}_${index++}`,
  });

  const resource = createDocumentResourceRef({
    path: '/workspace/notes/remove-me.md',
    name: 'remove-me.md',
    contentType: 'note',
    workspacePath: '/workspace',
    workspaceType: 'jasblog',
  });

  const requestResult = await runtime.deleteWorkspaceDocument({
    resource,
    actor: 'agent:test',
    reason: '清理重复内容',
  });

  assert.equal(requestResult.ok, false);
  assert.equal(requestResult.error?.code, 'APPROVAL_REQUIRED');
  assert.equal(requestResult.approval?.status, 'requested');
  assert.equal(requestResult.projection.session?.status, 'paused');
  assert.equal(requestResult.projection.session?.task.status, 'blocked');

  const approvalId = requestResult.approval?.id;
  assert.ok(approvalId);

  const approveResult = await runtime.approveDocumentDeletion({
    approvalId,
    actor: 'user:operator',
  });

  assert.equal(approveResult.ok, true);
  assert.equal(deletedPath, resource.path);
  assert.equal(approveResult.projection.session?.status, 'finished');
  assert.equal(approveResult.projection.session?.task.status, 'succeeded');
  assert.ok(
    approveResult.projection.recentEvents.some(
      (event) => event.type === 'workspace.document.deleted'
    )
  );
  assert.ok(
    approveResult.projection.recentEvents.some(
      (event) => event.type === 'workspace.approval.approved'
    )
  );
});
