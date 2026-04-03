import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveGraphDisplay,
  resolveNoteDisplay,
  resolveProjectDisplay,
  resolveRoadmapDisplay,
} from "../src/services/displayMetadata";

test("详情预览在缺失标题时回退到文件名 slug，而不是显示空标题", () => {
  assert.deepEqual(resolveNoteDisplay("react-state-sync-note.md", { title: "", date: "", excerpt: "", tags: [] }), {
    title: "react-state-sync-note",
    date: "",
  });

  assert.deepEqual(resolveProjectDisplay("jas-tool.md", {
    name: "",
    description: "",
    github: "",
    tags: [],
  }), {
    name: "jas-tool",
    date: "",
  });

  assert.deepEqual(resolveRoadmapDisplay("rewrite-editor.md", {
    title: "",
    description: "",
    status: "active",
  }), {
    title: "rewrite-editor",
    date: "",
    status: "active",
  });

  assert.deepEqual(resolveGraphDisplay("knowledge-map.md", {
    name: "",
    description: "",
  }), {
    name: "knowledge-map",
    date: "",
  });
});
