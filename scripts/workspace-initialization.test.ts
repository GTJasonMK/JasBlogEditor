import test from "node:test";
import assert from "node:assert/strict";
import {
  MISSING_WORKSPACE_ERROR,
  resolveWorkspaceInitialization,
} from "../src/store/workspaceInitialization";

test("工作区初始化在失效路径时直接返回缺失结果并跳过类型探测", async () => {
  let detectCalls = 0;

  const result = await resolveWorkspaceInitialization("/old/workspace", {
    resolveWorkspacePath: async () => "/resolved/workspace",
    detectWorkspaceTypeByPath: async () => {
      detectCalls += 1;
      return "docs";
    },
    pathExists: async () => false,
  });

  assert.deepEqual(result, {
    status: "missing",
    workspacePath: null,
    workspaceType: null,
    error: MISSING_WORKSPACE_ERROR,
    missingPath: "/resolved/workspace",
  });
  assert.equal(detectCalls, 0);
});

test("工作区初始化在路径存在时返回解析后的工作区信息", async () => {
  const result = await resolveWorkspaceInitialization("/notes", {
    resolveWorkspacePath: async () => "/blog",
    detectWorkspaceTypeByPath: async () => "jasblog",
    pathExists: async () => true,
  });

  assert.deepEqual(result, {
    status: "ready",
    workspacePath: "/blog",
    workspaceType: "jasblog",
  });
});
