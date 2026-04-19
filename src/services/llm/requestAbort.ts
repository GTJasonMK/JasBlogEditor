interface RequestAbortHandle {
  controller: AbortController;
  dispose: () => void;
}

export function createRequestAbortHandle(
  timeoutSeconds: number,
  externalSignal?: AbortSignal
): RequestAbortHandle {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutSeconds * 1000);

  const abortFromExternal = () => {
    controller.abort();
  };

  if (externalSignal) {
    if (externalSignal.aborted) {
      abortFromExternal();
    } else {
      externalSignal.addEventListener("abort", abortFromExternal, { once: true });
    }
  }

  return {
    controller,
    dispose: () => {
      clearTimeout(timeoutId);
      externalSignal?.removeEventListener("abort", abortFromExternal);
    },
  };
}
