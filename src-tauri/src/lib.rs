#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    if std::env::var("WAYLAND_DISPLAY").is_ok() 
        || std::env::var("XDG_SESSION_TYPE").unwrap_or_default() == "wayland" 
    {
        if std::path::Path::new("/proc/driver/nvidia").exists() {
            unsafe {
                std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
            }
        }
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
