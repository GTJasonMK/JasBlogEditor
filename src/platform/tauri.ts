import type { OpenDialogOptions } from "@tauri-apps/plugin-dialog";
import { isTauri } from "./runtime";
import type { MiniModeSettings, WindowState } from "@/types";
import type { RustFileInfo, RustSettings } from "./tauriTypes";

/**
 * Tauri 调用封装
 */

export type TauriCommandMap = {
  read_directory: { args: { path: string }; result: RustFileInfo[] };
  read_file: { args: { path: string }; result: string };
  write_file: { args: { path: string; content: string }; result: void };
  create_file: { args: { path: string; content: string }; result: void };
  delete_file: { args: { path: string }; result: void };
  rename_file: { args: { oldPath: string; newPath: string }; result: void };
  create_directory: { args: { path: string }; result: void };
  path_exists: { args: { path: string }; result: boolean };
  get_settings: { args: undefined; result: RustSettings };
  save_settings: { args: { settings: RustSettings }; result: void };
};

type TypedArgs<C extends keyof TauriCommandMap> = TauriCommandMap[C]["args"];
type TypedResult<C extends keyof TauriCommandMap> = TauriCommandMap[C]["result"];

export async function invokeTauri<C extends keyof TauriCommandMap>(
  cmd: C,
  ...args: TypedArgs<C> extends undefined ? [] : [TypedArgs<C>]
): Promise<TypedResult<C>>;
export async function invokeTauri<T>(cmd: string, args?: Record<string, unknown>): Promise<T>;
export async function invokeTauri(cmd: string, args?: Record<string, unknown>) {
  if (!isTauri()) {
    throw new Error("当前不在 Tauri 环境中运行");
  }
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke(cmd, args);
}

export async function openFolderDialog(options?: OpenDialogOptions): Promise<string | null> {
  if (!isTauri()) return null;
  const { open } = await import("@tauri-apps/plugin-dialog");
  const result = await open({
    directory: true,
    ...options,
  });
  if (typeof result === "string") return result;
  return null;
}

export async function readTextFile(filePath: string): Promise<string> {
  if (!isTauri()) {
    throw new Error("readTextFile 仅支持在 Tauri 环境中调用");
  }
  const { readTextFile } = await import("@tauri-apps/plugin-fs");
  return readTextFile(filePath);
}

export async function writeTextFile(filePath: string, contents: string): Promise<void> {
  if (!isTauri()) {
    throw new Error("writeTextFile 仅支持在 Tauri 环境中调用");
  }
  const { writeTextFile } = await import("@tauri-apps/plugin-fs");
  await writeTextFile(filePath, contents);
}

// ===== 窗口管理 API =====

/**
 * 获取当前窗口状态（大小、位置、是否最大化）
 * 注意：返回的是逻辑像素，已处理 DPI 缩放
 */
export async function getWindowState(): Promise<WindowState> {
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  const appWindow = getCurrentWindow();

  const scaleFactor = await appWindow.scaleFactor();
  const physicalSize = await appWindow.innerSize();
  const physicalPosition = await appWindow.outerPosition();
  const isMaximized = await appWindow.isMaximized();

  // 将物理像素转换为逻辑像素
  const logicalSize = physicalSize.toLogical(scaleFactor);
  const logicalPosition = physicalPosition.toLogical(scaleFactor);

  return {
    width: logicalSize.width,
    height: logicalSize.height,
    x: logicalPosition.x,
    y: logicalPosition.y,
    isMaximized,
  };
}

/**
 * 设置窗口为迷你模式
 */
export async function setMiniModeWindow(settings: MiniModeSettings): Promise<void> {
  const { getCurrentWindow, currentMonitor } = await import("@tauri-apps/api/window");
  const { LogicalSize, LogicalPosition } = await import("@tauri-apps/api/dpi");
  const appWindow = getCurrentWindow();

  // 取消最大化
  if (await appWindow.isMaximized()) {
    await appWindow.unmaximize();
  }

  // 设置窗口大小
  await appWindow.setSize(new LogicalSize(settings.width, settings.height));

  // 设置位置
  if (settings.positionX !== undefined && settings.positionY !== undefined) {
    await appWindow.setPosition(new LogicalPosition(settings.positionX, settings.positionY));
  } else {
    // 获取当前显示器信息，计算右上角位置
    const monitor = await currentMonitor();
    if (monitor) {
      const scaleFactor = monitor.scaleFactor;
      const screenWidth = monitor.size.width / scaleFactor;
      const x = screenWidth - settings.width - 20;
      const y = 20;
      await appWindow.setPosition(new LogicalPosition(x, y));
    }
  }

  // 设置最小尺寸
  await appWindow.setMinSize(new LogicalSize(300, 200));

  // 设置置顶
  await appWindow.setAlwaysOnTop(true);
}

/**
 * 恢复窗口为正常模式
 */
export async function restoreNormalWindow(state: WindowState): Promise<void> {
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  const { LogicalSize, LogicalPosition } = await import("@tauri-apps/api/dpi");
  const appWindow = getCurrentWindow();

  // 取消置顶
  await appWindow.setAlwaysOnTop(false);

  // 恢复最小尺寸
  await appWindow.setMinSize(new LogicalSize(900, 600));

  // 恢复尺寸和位置
  await appWindow.setSize(new LogicalSize(state.width, state.height));
  await appWindow.setPosition(new LogicalPosition(state.x, state.y));

  // 如果之前是最大化，恢复最大化
  if (state.isMaximized) {
    await appWindow.maximize();
  }
}

/**
 * 开始拖动窗口
 */
export async function startWindowDragging(): Promise<void> {
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  const appWindow = getCurrentWindow();
  await appWindow.startDragging();
}

/**
 * 获取当前窗口的迷你模式配置（位置和大小）
 * 注意：返回的是逻辑像素，已处理 DPI 缩放
 */
export async function getCurrentMiniModeSettings(): Promise<MiniModeSettings> {
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  const appWindow = getCurrentWindow();

  const scaleFactor = await appWindow.scaleFactor();
  const physicalSize = await appWindow.innerSize();
  const physicalPosition = await appWindow.outerPosition();

  // 将物理像素转换为逻辑像素
  const logicalSize = physicalSize.toLogical(scaleFactor);
  const logicalPosition = physicalPosition.toLogical(scaleFactor);

  return {
    width: logicalSize.width,
    height: logicalSize.height,
    positionX: logicalPosition.x,
    positionY: logicalPosition.y,
  };
}
