export interface ShortcutEventLike {
  state: string;
}

export interface ShortcutDefinition {
  accelerator: string;
  handler: (event: ShortcutEventLike) => void | Promise<void>;
}

export interface ShortcutRegistrationApi {
  isRegistered: (accelerator: string) => Promise<boolean>;
  register: (
    accelerator: string,
    handler: ShortcutDefinition["handler"]
  ) => Promise<void>;
  unregister: (accelerator: string) => Promise<void>;
}

type ShortcutRelease = () => Promise<void>;

function createOperationQueue() {
  let operation = Promise.resolve();

  return async function runExclusive<T>(task: () => Promise<T>): Promise<T> {
    const next = operation.then(task, task);
    operation = next.then(() => undefined, () => undefined);
    return next;
  };
}

export function createGlobalShortcutController() {
  const refCounts = new Map<string, number>();
  const runExclusive = createOperationQueue();

  async function acquireOne(
    api: ShortcutRegistrationApi,
    definition: ShortcutDefinition
  ): Promise<void> {
    const count = refCounts.get(definition.accelerator) ?? 0;
    if (count === 0) {
      const exists = await api.isRegistered(definition.accelerator);
      if (!exists) {
        await api.register(definition.accelerator, definition.handler);
      }
    }

    refCounts.set(definition.accelerator, count + 1);
  }

  async function releaseOne(
    api: ShortcutRegistrationApi,
    accelerator: string
  ): Promise<void> {
    const count = refCounts.get(accelerator);
    if (!count) return;

    if (count > 1) {
      refCounts.set(accelerator, count - 1);
      return;
    }

    refCounts.delete(accelerator);
    const exists = await api.isRegistered(accelerator);
    if (exists) {
      await api.unregister(accelerator);
    }
  }

  async function rollbackAcquire(
    api: ShortcutRegistrationApi,
    accelerators: readonly string[]
  ): Promise<void> {
    for (const accelerator of [...accelerators].reverse()) {
      await releaseOne(api, accelerator);
    }
  }

  async function acquire(
    api: ShortcutRegistrationApi,
    definitions: readonly ShortcutDefinition[]
  ): Promise<ShortcutRelease> {
    const acquired: string[] = [];

    await runExclusive(async () => {
      try {
        for (const definition of definitions) {
          await acquireOne(api, definition);
          acquired.push(definition.accelerator);
        }
      } catch (error) {
        await rollbackAcquire(api, acquired);
        throw error;
      }
    });

    let released = false;

    return async () => {
      if (released) return;
      released = true;

      await runExclusive(async () => {
        await rollbackAcquire(api, acquired);
      });
    };
  }

  return { acquire };
}

export const globalShortcutController = createGlobalShortcutController();
