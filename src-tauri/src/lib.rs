// 防止在 release 模式下额外弹出命令行窗口（仅 Windows）
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::path::PathBuf;
use serde::{Deserialize, Serialize};
use tauri::Manager;

// 文件信息结构体
#[derive(Debug, Serialize, Deserialize)]
pub struct FileInfo {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
}

// 迷你模式窗口配置
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MiniModeSettings {
    pub width: f64,
    pub height: f64,
    pub position_x: Option<f64>,
    pub position_y: Option<f64>,
}

// 用户模板结构体
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UserTemplate {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub template_type: String,
    pub content: String,
    pub created_at: String,
    pub updated_at: String,
}

// 设置结构体
#[derive(Debug, Serialize, Deserialize, Default)]
pub struct Settings {
    pub workspace_path: Option<String>,
    pub workspace_type: Option<String>,  // "jasblog" | "docs"
    pub last_opened_file: Option<String>,
    pub mini_mode_settings: Option<MiniModeSettings>,
    pub theme: Option<String>,  // "light" | "dark" | "system"
}

// 获取模板文件路径
fn get_templates_path() -> Result<PathBuf, String> {
    let app_dir = dirs_next::data_dir()
        .ok_or("无法获取应用数据目录".to_string())?
        .join("JasBlogEditor");

    fs::create_dir_all(&app_dir)
        .map_err(|e| format!("创建目录失败: {}", e))?;

    Ok(app_dir.join("templates.json"))
}

// 获取设置文件路径
fn get_settings_path() -> Result<PathBuf, String> {
    let app_dir = dirs_next::data_dir()
        .ok_or("无法获取应用数据目录".to_string())?
        .join("JasBlogEditor");

    fs::create_dir_all(&app_dir)
        .map_err(|e| format!("创建目录失败: {}", e))?;

    Ok(app_dir.join("settings.json"))
}

// 读取目录内容
#[tauri::command]
fn read_directory(path: String) -> Result<Vec<FileInfo>, String> {
    let entries = fs::read_dir(&path)
        .map_err(|e| format!("读取目录失败: {}", e))?;

    let mut files: Vec<FileInfo> = Vec::new();

    for entry in entries {
        let entry = entry.map_err(|e| format!("读取条目失败: {}", e))?;
        let metadata = entry.metadata().map_err(|e| format!("获取元数据失败: {}", e))?;
        let name = entry.file_name().to_string_lossy().to_string();
        let file_path = entry.path().to_string_lossy().to_string();

        // 跳过隐藏文件和不相关的文件
        if name.starts_with('.') || name == "node_modules" {
            continue;
        }

        files.push(FileInfo {
            name,
            path: file_path,
            is_dir: metadata.is_dir(),
        });
    }

    // 排序：目录优先，然后按名称排序
    files.sort_by(|a, b| {
        if a.is_dir == b.is_dir {
            a.name.to_lowercase().cmp(&b.name.to_lowercase())
        } else if a.is_dir {
            std::cmp::Ordering::Less
        } else {
            std::cmp::Ordering::Greater
        }
    });

    Ok(files)
}

// 读取文件内容
#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path)
        .map_err(|e| format!("读取文件失败: {}", e))
}

// 写入文件内容
#[tauri::command]
fn write_file(path: String, content: String) -> Result<(), String> {
    fs::write(&path, &content)
        .map_err(|e| format!("写入文件失败: {}", e))
}

// 创建文件
#[tauri::command]
fn create_file(path: String, content: String) -> Result<(), String> {
    // 确保父目录存在
    if let Some(parent) = std::path::Path::new(&path).parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("创建目录失败: {}", e))?;
    }

    // 检查文件是否已存在
    if std::path::Path::new(&path).exists() {
        return Err("文件已存在".to_string());
    }

    fs::write(&path, &content)
        .map_err(|e| format!("创建文件失败: {}", e))
}

// 删除文件
#[tauri::command]
fn delete_file(path: String) -> Result<(), String> {
    fs::remove_file(&path)
        .map_err(|e| format!("删除文件失败: {}", e))
}

// 重命名文件
#[tauri::command]
fn rename_file(old_path: String, new_path: String) -> Result<(), String> {
    // 检查新路径是否已存在
    if std::path::Path::new(&new_path).exists() {
        return Err("目标文件已存在".to_string());
    }

    fs::rename(&old_path, &new_path)
        .map_err(|e| format!("重命名文件失败: {}", e))
}

// 创建目录
#[tauri::command]
fn create_directory(path: String) -> Result<(), String> {
    fs::create_dir_all(&path)
        .map_err(|e| format!("创建目录失败: {}", e))
}

// 检查路径是否存在
#[tauri::command]
fn path_exists(path: String) -> bool {
    std::path::Path::new(&path).exists()
}

// 获取设置
#[tauri::command]
fn get_settings() -> Result<Settings, String> {
    let path = get_settings_path()?;

    if !path.exists() {
        return Ok(Settings::default());
    }

    let content = fs::read_to_string(&path)
        .map_err(|e| format!("读取设置失败: {}", e))?;

    serde_json::from_str(&content)
        .map_err(|e| format!("解析设置失败: {}", e))
}

// 保存设置
#[tauri::command]
fn save_settings(settings: Settings) -> Result<(), String> {
    let path = get_settings_path()?;

    let content = serde_json::to_string_pretty(&settings)
        .map_err(|e| format!("序列化设置失败: {}", e))?;

    fs::write(&path, &content)
        .map_err(|e| format!("保存设置失败: {}", e))
}

// 获取用户模板
#[tauri::command]
fn get_templates() -> Result<Vec<UserTemplate>, String> {
    let path = get_templates_path()?;

    if !path.exists() {
        return Ok(vec![]);
    }

    let content = fs::read_to_string(&path)
        .map_err(|e| format!("读取模板失败: {}", e))?;

    serde_json::from_str(&content)
        .map_err(|e| format!("解析模板失败: {}", e))
}

// 保存用户模板
#[tauri::command]
fn save_templates(templates: Vec<UserTemplate>) -> Result<(), String> {
    let path = get_templates_path()?;

    let content = serde_json::to_string_pretty(&templates)
        .map_err(|e| format!("序列化模板失败: {}", e))?;

    fs::write(&path, &content)
        .map_err(|e| format!("保存模板失败: {}", e))
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            read_directory,
            read_file,
            write_file,
            create_file,
            delete_file,
            rename_file,
            create_directory,
            path_exists,
            get_settings,
            save_settings,
            get_templates,
            save_templates
        ])
        .setup(|app| {
            // 在 Windows 上启用 WebView2 的 pinch zoom
            #[cfg(target_os = "windows")]
            {
                use webview2_com::Microsoft::Web::WebView2::Win32::ICoreWebView2Settings5;
                use windows_core::Interface;

                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.with_webview(|webview| {
                        unsafe {
                            let core = webview.controller().CoreWebView2().unwrap();
                            let settings = core.Settings().unwrap();
                            if let Ok(settings5) = settings.cast::<ICoreWebView2Settings5>() {
                                let _ = settings5.SetIsPinchZoomEnabled(true);
                            }
                        }
                    });
                }
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("启动 Tauri 应用失败");
}
