import { create } from 'zustand';
import { isTauri } from '@/platform/runtime';
import {
  getWindowState,
  setMiniModeWindow,
  restoreNormalWindow,
  getCurrentMiniModeSettings,
} from '@/platform/tauri';
import { useSettingsStore } from './settingsStore';
import type { MiniModeSettings, WindowState } from '@/types';

// 迷你模式默认配置
const DEFAULT_MINI_MODE: MiniModeSettings = { width: 450, height: 350 };

function sanitizeMiniModeSettings(settings: MiniModeSettings | undefined): MiniModeSettings {
  if (!settings) return DEFAULT_MINI_MODE;

  // 简单的防御性校验：避免尺寸/坐标异常导致窗口跑飞
  const widthOk = Number.isFinite(settings.width) && settings.width > 200 && settings.width < 1000;
  const heightOk = Number.isFinite(settings.height) && settings.height > 150 && settings.height < 1000;
  if (!widthOk || !heightOk) return DEFAULT_MINI_MODE;

  const positionXOk = settings.positionX === undefined || (Number.isFinite(settings.positionX) && settings.positionX < 5000);
  const positionYOk = settings.positionY === undefined || (Number.isFinite(settings.positionY) && settings.positionY < 5000);

  return {
    width: settings.width,
    height: settings.height,
    positionX: positionXOk ? settings.positionX : undefined,
    positionY: positionYOk ? settings.positionY : undefined,
  };
}

interface WindowStoreState {
  miniMode: boolean;
  savedWindowState: WindowState | null;
  error: string | null;

  enterMiniMode: () => Promise<void>;
  exitMiniMode: () => Promise<void>;
  toggleMiniMode: () => Promise<void>;
  clearError: () => void;
}

export const useWindowStore = create<WindowStoreState>((set, get) => ({
  miniMode: false,
  savedWindowState: null,
  error: null,

  clearError: () => set({ error: null }),

  enterMiniMode: async () => {
    const { miniMode } = get();
    if (miniMode) return;
    if (!isTauri()) return;

    try {
      // 保存当前窗口状态
      const windowState = await getWindowState();
      set({ savedWindowState: windowState, error: null });

      // 获取用户上次保存的迷你模式设置
      const savedSettings = useSettingsStore.getState().settings.miniModeSettings;
      const miniModeSettings = sanitizeMiniModeSettings(savedSettings);

      // 设置迷你模式窗口
      await setMiniModeWindow(miniModeSettings);
      set({ miniMode: true });
    } catch (error) {
      console.error('[MiniMode] 进入迷你模式失败:', error);
      set({ error: `进入迷你模式失败: ${error}` });
    }
  },

  exitMiniMode: async () => {
    const { miniMode, savedWindowState } = get();
    if (!miniMode || !savedWindowState) return;
    if (!isTauri()) return;

    try {
      // 保存当前迷你模式的位置和大小
      const currentMiniSettings = await getCurrentMiniModeSettings();
      await useSettingsStore.getState().saveMiniModeSettings(currentMiniSettings);

      // 恢复正常窗口
      await restoreNormalWindow(savedWindowState);
      set({ miniMode: false, savedWindowState: null, error: null });
    } catch (error) {
      console.error('[MiniMode] 退出迷你模式失败:', error);
      set({ error: `退出迷你模式失败: ${error}` });
    }
  },

  toggleMiniMode: async () => {
    const { miniMode, enterMiniMode, exitMiniMode } = get();
    if (miniMode) {
      await exitMiniMode();
    } else {
      await enterMiniMode();
    }
  },
}));

