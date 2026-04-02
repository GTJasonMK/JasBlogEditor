import test from 'node:test';
import assert from 'node:assert/strict';
import { DOCUMENT_CAPABILITY_CATALOG, DOCUMENT_TOOL_SCHEMAS } from '../src/agent/documentCapabilityCatalog';
import { DocumentAgentRuntime } from '../src/agent/documentAgentRuntime';
import { createDocumentResourceRef } from '../src/agent/documentQueries';

test('tool schema 与 capability catalog 一一对应', () => {
  assert.equal(DOCUMENT_TOOL_SCHEMAS.length, DOCUMENT_CAPABILITY_CATALOG.length);

  for (const capability of DOCUMENT_CAPABILITY_CATALOG) {
    const tool = DOCUMENT_TOOL_SCHEMAS.find((item) => item.name === capability.name);
    assert.ok(tool, `缺少 tool schema: ${capability.name}`);
    assert.equal(tool?.approvalPolicy, capability.approvalPolicy);
    assert.deepEqual(tool?.failureModes, capability.failureModes);
    assert.deepEqual(tool?.observableEvents, capability.observableEvents);
  }
});

test('delete_workspace_document 的合同不允许绕过审批', async () => {
  const runtime = new DocumentAgentRuntime({
    persistDocument: async () => {
      throw new Error('should not save');
    },
    deleteDocument: async ({ resource }) => ({
      document: resource,
      deletedAt: '2026-03-12T09:20:00.000Z',
    }),
  });

  const deleteTool = DOCUMENT_TOOL_SCHEMAS.find((tool) => tool.name === 'delete_workspace_document');
  assert.ok(deleteTool);
  assert.equal(deleteTool?.approvalPolicy, 'required');
  assert.equal(deleteTool?.category, 'actions');

  const result = await runtime.deleteWorkspaceDocument({
    resource: createDocumentResourceRef({
      path: '/workspace/notes/contract.md',
      name: 'contract.md',
      contentType: 'note',
      workspacePath: '/workspace',
      workspaceType: 'jasblog',
    }),
    actor: 'agent:test',
    reason: '合同测试',
  });

  assert.equal(result.ok, false);
  assert.equal(result.error?.code, 'APPROVAL_REQUIRED');
  assert.ok(deleteTool?.failureModes.includes('APPROVAL_REQUIRED'));
});
