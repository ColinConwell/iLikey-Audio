// iLikey Audio — Tauri Desktop App
// Wraps the web UI and adds OS-level media detection capabilities.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;

#[tauri::command]
fn get_now_playing() -> Option<serde_json::Value> {
    // TODO: Platform-specific now-playing detection
    // macOS: MRMediaRemoteNowPlayingInfo via objc
    // Linux: MPRIS D-Bus interface
    // Windows: Windows.Media.Control
    None
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![get_now_playing])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
