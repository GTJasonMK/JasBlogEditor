import { create } from 'zustand';
import { invokeTauri } from '@/platform/tauri';
import type { Settings, MiniModeSettings } from '@/types';

interface SettingsState {
  settings: Settings;
  isLoading: boolean;
  error: string | null;
  loadSettings: () => Promise<void>;
  saveSettings: (settings: Partial<Settings>) => Promise<void>;
  setWorkspacePath: (path: string | null) => Promise<void>;
  saveMiniModeSettings: (miniSettings: MiniModeSettings) => Promise<void>;
  clearError: () => void;
}

// Rust 返回的 Settings 使用 snake_case
interface RustSettings {
  workspace_path: string | null;
  last_opened_file: string | null;
  mini_mode_settings?: {
    width: number;
    height: number;
    position_x?: number;
    position_y?: number;
  };
}

// 前端 Settings 转换为 Rust Settings
function toRustSettings(settings: Settings): RustSettings {
  return {
    workspace_path: settings.workspacePath,
    last_opened_file: settings.lastOpenedFile,
    mini_mode_settings: settings.miniModeSettings ? {
      width: settings.miniModeSettings.width,
      height: settings.miniModeSettings.height,
      position_x: settings.miniModeSettings.positionX,
      position_y: settings.miniModeSettings.positionY,
    } : undefined,
  };
}

// Rust Settings 转换为前端 Settings
function fromRustSettings(rust: RustSettings): Settings {
  return {
    workspacePath: rust.workspace_path,
    lastOpenedFile: rust.last_opened_file,
    miniModeSettings: rust.mini_mode_settings ? {
      width: rust.mini_mode_settings.width,
      height: rust.mini_mode_settings.height,
      positionX: rust.mini_mode_settings.position_x,
      positionY: rust.mini_mode_settings.position_y,
    } : undefined,
  };
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: {
    workspacePath: null,
    lastOpenedFile: null,
  },
  isLoading: true,
  error: null,

  loadSettings: async () => {
    set({ error: null });
    try {
      const rustSettings = await invokeTauri<RustSettings>('get_settings');
      set({
        settings: fromRustSettings(rustSettings),
        isLoading: false,
      });
    } catch (error) {
      console.error('加载设置失败:', error);
      set({ error: `加载设置失败: ${error}`, isLoading: false });
    }
  },

  saveSettings: async (newSettings) => {
    const { settings } = get();
    const merged = { ...settings, ...newSettings };
    set({ settings: merged, error: null });

    try {
      await invokeTauri('save_settings', {
        settings: toRustSettings(merged),
      });
    } catch (error) {
      console.error('保存设置失败:', error);
      set({ error: `保存设置失败: ${error}` });
    }
  },

  setWorkspacePath: async (path) => {
    const { saveSettings } = get();
    await saveSettings({ workspacePath: path });
  },

  saveMiniModeSettings: async (miniSettings) => {
    const { saveSettings } = get();
    await saveSettings({ miniModeSettings: miniSettings });
  },

  clearError: () => {
    set({ error: null });
  },
}));
