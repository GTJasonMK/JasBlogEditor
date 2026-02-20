/**
 * Tauri 与 Rust 侧数据结构（snake_case）
 *
 * 说明：
 * - Rust 结构体字段为 snake_case
 * - 前端内部使用 camelCase 的 `types/`，通过 store 做转换
 */

// Rust 返回的 FileInfo
export interface RustFileInfo {
  name: string;
  path: string;
  is_dir: boolean;
}

// Rust 设置结构（与 src-tauri/src/lib.rs 保持一致）
export interface RustMiniModeSettings {
  width: number;
  height: number;
  position_x?: number;
  position_y?: number;
}

export interface RustLLMSettings {
  api_key?: string;
  base_url?: string;
  model?: string;
}

export interface RustSettings {
  workspace_path: string | null;
  workspace_type: string | null;
  last_opened_file: string | null;
  mini_mode_settings?: RustMiniModeSettings;
  theme?: string | null;
  llm?: RustLLMSettings;
}

// Rust 用户模板结构（与 src-tauri/src/lib.rs UserTemplate 保持一致）
export interface RustUserTemplate {
  id: string;
  name: string;
  description?: string;
  template_type: string;
  content: string;
  created_at: string;
  updated_at: string;
}

