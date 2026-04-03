import { isTauri } from "@/platform/runtime";
import {
  buildExamplePreviewUrl,
  EXAMPLE_PREVIEW_NAVIGATE_EVENT,
  EXAMPLE_PREVIEW_WINDOW_LABEL,
  getFrontmatterHelpExampleById,
  type ExamplePreviewNavigatePayload,
} from "./examplePreviewModel";

async function focusExampleWindow(
  windowHandle: import("@tauri-apps/api/webviewWindow").WebviewWindow
) {
  if (!(await windowHandle.isVisible())) {
    await windowHandle.show();
  }
  await windowHandle.setFocus();
}

function getWindowCreationError(payload: unknown): Error {
  if (payload instanceof Error) {
    return payload;
  }

  if (typeof payload === "string" && payload.trim()) {
    return new Error(payload);
  }

  return new Error("创建示例预览窗口失败");
}

export async function openExamplePreviewWindow(
  exampleId: string
): Promise<void> {
  if (!getFrontmatterHelpExampleById(exampleId)) {
    throw new Error(`未找到示例文档：${exampleId}`);
  }

  if (!isTauri()) {
    throw new Error("独立示例窗口仅支持在 Tauri 桌面应用中打开");
  }

  const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
  const existingWindow = await WebviewWindow.getByLabel(
    EXAMPLE_PREVIEW_WINDOW_LABEL
  );

  if (existingWindow) {
    const payload: ExamplePreviewNavigatePayload = { exampleId };
    await existingWindow.emit(EXAMPLE_PREVIEW_NAVIGATE_EVENT, payload);
    await focusExampleWindow(existingWindow);
    return;
  }

  const previewWindow = new WebviewWindow(EXAMPLE_PREVIEW_WINDOW_LABEL, {
    url: buildExamplePreviewUrl(window.location.href, exampleId),
    title: "示例文档对照预览",
    width: 1560,
    height: 920,
    minWidth: 1120,
    minHeight: 720,
    center: true,
    focus: true,
  });

  await new Promise<void>((resolve, reject) => {
    void previewWindow.once("tauri://created", () => resolve());
    void previewWindow.once("tauri://error", (event) =>
      reject(getWindowCreationError(event.payload))
    );
  });

  await focusExampleWindow(previewWindow);
}
