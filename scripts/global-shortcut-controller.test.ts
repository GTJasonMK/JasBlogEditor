import test from "node:test";
import assert from "node:assert/strict";
import {
  createGlobalShortcutController,
  type ShortcutDefinition,
  type ShortcutRegistrationApi,
} from "../src/hooks/globalShortcutController";

function createApi() {
  const registered = new Set<string>();
  const operations: string[] = [];

  const api: ShortcutRegistrationApi = {
    isRegistered: async (accelerator) => {
      operations.push(`check:${accelerator}`);
      await Promise.resolve();
      return registered.has(accelerator);
    },
    register: async (accelerator) => {
      operations.push(`register:${accelerator}`);
      if (registered.has(accelerator)) {
        throw new Error(`duplicate register: ${accelerator}`);
      }
      registered.add(accelerator);
    },
    unregister: async (accelerator) => {
      operations.push(`unregister:${accelerator}`);
      registered.delete(accelerator);
    },
  };

  return { api, operations, registered };
}

const shortcuts: ShortcutDefinition[] = [
  { accelerator: "Ctrl+Alt+X", handler: () => undefined },
  { accelerator: "Ctrl+Alt+S", handler: () => undefined },
];

test("全局快捷键控制器在并发 acquire 时只注册一次", async () => {
  const controller = createGlobalShortcutController();
  const { api, operations, registered } = createApi();

  const [releaseA, releaseB] = await Promise.all([
    controller.acquire(api, shortcuts),
    controller.acquire(api, shortcuts),
  ]);

  assert.deepEqual([...registered].sort(), ["Ctrl+Alt+S", "Ctrl+Alt+X"]);
  assert.equal(
    operations.filter((item) => item === "register:Ctrl+Alt+X").length,
    1
  );
  assert.equal(
    operations.filter((item) => item === "register:Ctrl+Alt+S").length,
    1
  );

  await releaseA();
  assert.deepEqual([...registered].sort(), ["Ctrl+Alt+S", "Ctrl+Alt+X"]);

  await releaseB();
  assert.deepEqual([...registered], []);
  assert.equal(
    operations.filter((item) => item === "unregister:Ctrl+Alt+X").length,
    1
  );
  assert.equal(
    operations.filter((item) => item === "unregister:Ctrl+Alt+S").length,
    1
  );
});

test("全局快捷键控制器重复 release 不会重复注销", async () => {
  const controller = createGlobalShortcutController();
  const { api, operations } = createApi();

  const release = await controller.acquire(api, shortcuts);
  await release();
  await release();

  assert.equal(
    operations.filter((item) => item === "unregister:Ctrl+Alt+X").length,
    1
  );
  assert.equal(
    operations.filter((item) => item === "unregister:Ctrl+Alt+S").length,
    1
  );
});
