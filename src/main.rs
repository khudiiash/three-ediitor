// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod websocket;
mod project_manager;

use websocket::{WebSocketServer, EditorMessage, EngineMessage};
use project_manager::ProjectManager;
use parking_lot::Mutex;
use std::sync::Arc;
use std::process::{Command, Child};
use tauri::{Manager, State};

// Global state shared between Tauri and WebSocket
struct AppState {
    ws_server: Arc<Mutex<WebSocketServer>>,
    connected: Arc<Mutex<bool>>,
    playing: Arc<Mutex<bool>>,
    entities: Arc<Mutex<Vec<serde_json::Value>>>,
    engine_process: Arc<Mutex<Option<Child>>>,
}

// Tauri commands that the frontend can call
#[tauri::command]
fn send_to_engine(state: State<AppState>, message: String) -> Result<(), String> {
    let msg: EditorMessage = serde_json::from_str(&message)
        .map_err(|e| format!("Failed to parse message: {}", e))?;
    
    state.ws_server.lock().send(msg);
    Ok(())
}

#[tauri::command]
fn get_connection_status(state: State<AppState>) -> bool {
    *state.connected.lock()
}

#[tauri::command]
fn get_entities(state: State<AppState>) -> Vec<serde_json::Value> {
    state.entities.lock().clone()
}

// Project management commands
#[tauri::command]
fn list_projects() -> Result<Vec<project_manager::ProjectInfo>, String> {
    let manager = ProjectManager::new()?;
    manager.list_projects()
}

#[tauri::command]
fn create_project(name: String) -> Result<String, String> {
    let manager = ProjectManager::new()?;
    manager.create_project(&name)
}

#[tauri::command]
fn delete_project(path: String) -> Result<(), String> {
    let manager = ProjectManager::new()?;
    manager.delete_project(&path)
}

// Helper commands for reading/writing scene.json files
#[tauri::command]
fn read_scene_file(project_path: String) -> Result<String, String> {
    use std::fs;
    use std::path::PathBuf;
    
    let path = PathBuf::from(&project_path).join("scene.json");
    
    match fs::read_to_string(&path) {
        Ok(content) => Ok(content),
        Err(e) => {
            if e.kind() == std::io::ErrorKind::NotFound {
                Err("File not found".to_string())
            } else {
                Err(format!("Failed to read file: {}", e))
            }
        }
    }
}

#[tauri::command]
fn copy_scene_to_engine(project_path: String) -> Result<(), String> {
    use std::fs;
    use std::path::PathBuf;
    
    let scene_path = PathBuf::from(&project_path).join("scene.json");
    let engine_public = std::env::current_dir()
        .unwrap()
        .join("src/engine/public");
    
    if !engine_public.exists() {
        fs::create_dir_all(&engine_public)
            .map_err(|e| format!("Failed to create engine public directory: {}", e))?;
    }
    
    let dest_path = engine_public.join("scene.json");
    
    fs::copy(&scene_path, &dest_path)
        .map_err(|e| format!("Failed to copy scene.json to engine: {}", e))?;
    
    Ok(())
}

#[tauri::command]
fn write_scene_file(project_path: String, content: String) -> Result<(), String> {
    use std::fs;
    use std::path::PathBuf;
    use std::time::{SystemTime, UNIX_EPOCH};
    
    let path = PathBuf::from(&project_path).join("scene.json");
    
    fs::write(&path, content)
        .map_err(|e| format!("Failed to write file: {}", e))?;
    
    let project_json_path = PathBuf::from(&project_path).join("project.json");
    if project_json_path.exists() {
        if let Ok(project_content) = fs::read_to_string(&project_json_path) {
            if let Ok(mut metadata) = serde_json::from_str::<serde_json::Value>(&project_content) {
                let now = SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .unwrap()
                    .as_secs();
                metadata["modified"] = serde_json::Value::Number(now.into());
                
                if let Ok(updated_content) = serde_json::to_string_pretty(&metadata) {
                    let _ = fs::write(&project_json_path, updated_content);
                }
            }
        }
    }
    
    Ok(())
}

#[tauri::command]
async fn read_asset_file(project_path: String, asset_path: String) -> Result<Vec<u8>, String> {
    use std::path::PathBuf;
    
    let full_path = PathBuf::from(&project_path).join("assets").join(&asset_path);
    
    match tokio::fs::read(&full_path).await {
        Ok(data) => Ok(data),
        Err(e) => {
            if e.kind() == std::io::ErrorKind::NotFound {
                Err("File not found".to_string())
            } else {
                Err(format!("Failed to read file: {}", e))
            }
        }
    }
}

#[tauri::command]
async fn get_file_metadata(project_path: String, asset_path: String) -> Result<Option<u64>, String> {
    use std::path::PathBuf;
    use std::time::UNIX_EPOCH;
    
    let full_path = PathBuf::from(&project_path).join("assets").join(&asset_path);
    
    match tokio::fs::metadata(&full_path).await {
        Ok(metadata) => {
            if let Ok(modified) = metadata.modified() {
                if let Ok(duration) = modified.duration_since(UNIX_EPOCH) {
                    Ok(Some(duration.as_secs()))
                } else {
                    Ok(None)
                }
            } else {
                Ok(None)
            }
        }
        Err(_) => Ok(None)
    }
}

#[tauri::command]
async fn write_asset_file(project_path: String, asset_path: String, content: Vec<u8>) -> Result<(), String> {
    use std::path::PathBuf;
    
    let assets_dir = PathBuf::from(&project_path).join("assets");
    let full_path = assets_dir.join(&asset_path);
    
    if let Some(parent) = full_path.parent() {
        tokio::fs::create_dir_all(parent).await
            .map_err(|e| format!("Failed to create directory: {}", e))?;
    }
    
    tokio::fs::write(&full_path, content).await
        .map_err(|e| format!("Failed to write file: {}", e))?;
    
    Ok(())
}

#[tauri::command]
async fn write_build_file(project_path: String, file_path: String, content: Vec<u8>) -> Result<(), String> {
    use std::path::PathBuf;
    
    let build_dir = PathBuf::from(&project_path).join("build");
    let full_path = build_dir.join(&file_path);
    
    if let Some(parent) = full_path.parent() {
        tokio::fs::create_dir_all(parent).await
            .map_err(|e| format!("Failed to create directory: {}", e))?;
    }
    
    tokio::fs::write(&full_path, content).await
        .map_err(|e| format!("Failed to write file: {}", e))?;
    
    Ok(())
}

#[tauri::command]
fn read_project_metadata(project_path: String) -> Result<String, String> {
    use std::fs;
    use std::path::PathBuf;
    
    let metadata_path = PathBuf::from(&project_path).join("project.json");
    
    match fs::read_to_string(&metadata_path) {
        Ok(content) => Ok(content),
        Err(e) => {
            if e.kind() == std::io::ErrorKind::NotFound {
                Err("File not found".to_string())
            } else {
                Err(format!("Failed to read file: {}", e))
            }
        }
    }
}

#[tauri::command]
async fn read_assets_metadata(project_path: String) -> Result<String, String> {
    use std::path::PathBuf;
    
    let metadata_path = PathBuf::from(&project_path).join("assets").join("assets.json");
    
    match tokio::fs::read_to_string(&metadata_path).await {
        Ok(content) => {
            if content.trim().is_empty() {
                Ok("{}".to_string())
            } else {
                Ok(content)
            }
        },
        Err(e) => {
            if e.kind() == std::io::ErrorKind::NotFound {
                Ok("{}".to_string())
            } else {
                Err(format!("Failed to read metadata: {}", e))
            }
        }
    }
}

#[tauri::command]
async fn open_file_in_editor(project_path: String, asset_path: String) -> Result<(), String> {
    use std::path::PathBuf;
    use std::process::Command;
    
    let full_path = PathBuf::from(&project_path).join("assets").join(&asset_path);
    
    #[cfg(target_os = "windows")]
    {
        Command::new("cmd")
            .args(&["/C", "start", "", &full_path.to_string_lossy()])
            .spawn()
            .map_err(|e| format!("Failed to open file: {}", e))?;
    }
    
    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(&full_path)
            .spawn()
            .map_err(|e| format!("Failed to open file: {}", e))?;
    }
    
    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(&full_path)
            .spawn()
            .map_err(|e| format!("Failed to open file: {}", e))?;
    }
    
    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        return Err("Unsupported platform".to_string());
    }
    
    Ok(())
}

#[tauri::command]
async fn write_assets_metadata(project_path: String, content: String) -> Result<(), String> {
    use std::path::PathBuf;
    
    let assets_dir = PathBuf::from(&project_path).join("assets");
    let metadata_path = assets_dir.join("assets.json");
    
    tokio::fs::create_dir_all(&assets_dir).await
        .map_err(|e| format!("Failed to create assets directory: {}", e))?;
    
    tokio::fs::write(&metadata_path, content).await
        .map_err(|e| format!("Failed to write metadata: {}", e))?;
    
    Ok(())
}

#[tauri::command]
async fn delete_asset_file(project_path: String, asset_path: String) -> Result<(), String> {
    use std::path::PathBuf;
    
    let assets_dir = PathBuf::from(&project_path).join("assets");
    let full_path = assets_dir.join(&asset_path);
    
    if !full_path.exists() {
        return Err("File not found".to_string());
    }
    
    if full_path.is_dir() {
        tokio::fs::remove_dir_all(&full_path).await
            .map_err(|e| format!("Failed to delete directory: {}", e))?;
    } else {
        tokio::fs::remove_file(&full_path).await
            .map_err(|e| format!("Failed to delete file: {}", e))?;
    }
    
    Ok(())
}

#[tauri::command]
async fn list_assets_directory(project_path: String, dir_path: String) -> Result<serde_json::Value, String> {
    use std::path::PathBuf;
    use tokio::fs;
    
    let assets_dir = PathBuf::from(&project_path).join("assets");
    let target_dir = if dir_path.is_empty() || dir_path == "/" {
        assets_dir.clone()
    } else {
        assets_dir.join(&dir_path)
    };
    
    if !target_dir.exists() {
        return Ok(serde_json::json!({
            "files": [],
            "directories": []
        }));
    }
    
    let mut files = Vec::new();
    let mut directories = Vec::new();
    
    match fs::read_dir(&target_dir).await {
        Ok(mut entries) => {
            while let Ok(Some(entry)) = entries.next_entry().await {
                let path = entry.path();
                let name = path.file_name()
                    .and_then(|n| n.to_str())
                    .map(|s| s.to_string())
                    .unwrap_or_default();
                
                if path.is_dir() {
                    directories.push(name);
                } else {
                    let metadata = entry.metadata().await.ok();
                    let size = metadata.as_ref()
                        .map(|m| m.len())
                        .unwrap_or(0);
                    
                    files.push(serde_json::json!({
                        "name": name,
                        "size": size
                    }));
                }
            }
        }
        Err(e) => {
            return Err(format!("Failed to read directory: {}", e));
        }
    }
    
    Ok(serde_json::json!({
        "files": files,
        "directories": directories
    }))
}

#[tauri::command]
fn open_project(app: tauri::AppHandle, path: String) -> Result<(), String> {
    
    if let Some(existing_window) = app.get_window("editor") {
        match existing_window.is_visible() {
            Ok(true) => {
                return Err("Editor is already open. Please close it first.".to_string());
            }
            Ok(false) | Err(_) => {
                if let Err(e) = copy_scene_to_engine(path.clone()) {
                    eprintln!("[Editor] Warning: Failed to copy scene.json to engine: {}", e);
                }
                
                if let Err(e) = existing_window.show() {
                    eprintln!("[Editor] Failed to show existing window: {}", e);
                    return Err(format!("Failed to show editor window: {}", e));
                }
                if let Err(e) = existing_window.set_focus() {
                    eprintln!("[Editor] Failed to focus editor window: {}", e);
                }
                let window_clone = existing_window.clone();
                let path_clone = path.clone();
                std::thread::spawn(move || {
                    std::thread::sleep(std::time::Duration::from_millis(2500));
                    if let Err(e) = window_clone.emit("project-opened", path_clone) {
                    }
                });
                return Ok(());
            }
        }
    }
    
    let app_clone = app.clone();
    let path_clone = path.clone();
    std::thread::spawn(move || {
        let editor_window = match tauri::WindowBuilder::new(
            &app_clone,
            "editor",
            tauri::WindowUrl::App("editor/index.html".into())
        )
        .title("Three.js Editor")
        .inner_size(1280.0, 720.0)
        .resizable(true)
        .visible(true)
        .focused(true)
        .build() {
            Ok(window) => {
                window
            }
            Err(e) => {
                eprintln!("[Editor] Failed to create editor window: {}", e);
                if let Some(hub_window) = app_clone.get_window("hub") {
                    let _ = hub_window.emit("editor-error", format!("Failed to create editor window: {}", e));
                }
                return;
            }
        };
        
        if let Err(e) = editor_window.set_focus() {
            eprintln!("[Editor] Failed to focus editor window: {}", e);
        }
        
        if let Err(e) = copy_scene_to_engine(path_clone.clone()) {
            eprintln!("[Editor] Warning: Failed to copy scene.json to engine: {}", e);
        }
        
        std::thread::spawn({
            let window = editor_window.clone();
            let path_clone = path_clone.clone();
            move || {
                std::thread::sleep(std::time::Duration::from_millis(2500));
                if let Err(e) = window.emit("project-opened", path_clone) {
                    eprintln!("[Editor] Failed to emit project-opened event: {}", e);
                }
            }
        });
    });

    Ok(())
}

fn main() {
    let engine_process = Arc::new(Mutex::new(start_engine()));
    
    let ws_server = Arc::new(Mutex::new(WebSocketServer::new()));
    let connected = Arc::new(Mutex::new(false));
    let playing = Arc::new(Mutex::new(false));
    let entities = Arc::new(Mutex::new(Vec::new()));

    let app_state = AppState {
        ws_server: ws_server.clone(),
        connected: connected.clone(),
        playing: playing.clone(),
        entities: entities.clone(),
        engine_process: engine_process.clone(),
    };

    println!("[Editor] Starting Tauri application...");
    println!("[Editor] WebSocket server on ws://127.0.0.1:9001");

    let engine_process_for_cleanup = engine_process.clone();
    
    tauri::Builder::default()
        .manage(app_state)
        .setup(move |app| {
            let _hub_window = app.get_window("hub")
                .expect("Hub window should exist");
            
            let app_handle = app.handle().clone();
            let ws_server_clone = ws_server.clone();
            let connected_clone = connected.clone();
            let entities_clone = entities.clone();

            std::thread::Builder::new()
                .name("websocket-polling".to_string())
                .spawn(move || {
                    loop {
                        let hub_exists = app_handle.get_window("hub").is_some();
                        let editor_exists = app_handle.get_window("editor").is_some();
                        
                        if !hub_exists && !editor_exists {
                            break;
                        }
                        
                        if let Some(msg) = ws_server_clone.lock().try_recv() {
                            match &msg {
                                EngineMessage::Connected => {
                                    *connected_clone.lock() = true;
                                }
                                EngineMessage::SceneState { scene_json } => {
                                    if let Ok(scene) = serde_json::from_str::<serde_json::Value>(scene_json) {
                                        if let Some(ents) = scene.get("entities").and_then(|e| e.as_array()) {
                                            *entities_clone.lock() = ents.clone();
                                        }
                                    }
                                }
                                EngineMessage::FrameStats { fps, entity_count } => {
                                    if let Some(editor_window) = app_handle.get_window("editor") {
                                        let _ = editor_window.emit("frame-stats", serde_json::json!({
                                            "fps": fps,
                                            "entity_count": entity_count
                                        }));
                                    }
                                }
                                _ => {}
                            }

                            if let Some(editor_window) = app_handle.get_window("editor") {
                                let _ = editor_window.emit("engine-message", serde_json::to_string(&msg).unwrap());
                            }
                        }
                        std::thread::sleep(std::time::Duration::from_millis(16)); // ~60fps polling
                    }
                })
                .expect("Failed to spawn WebSocket polling thread");

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            send_to_engine,
            delete_asset_file,
            get_connection_status,
            get_entities,
            list_projects,
            create_project,
            delete_project,
            open_project,
            read_scene_file,
            write_scene_file,
            read_project_metadata,
            read_asset_file,
            write_asset_file,
            get_file_metadata,
            read_assets_metadata,
            write_assets_metadata,
            open_file_in_editor,
            list_assets_directory,
            write_build_file
        ])
        .on_window_event(move |event| {
            match event.event() {
                tauri::WindowEvent::CloseRequested { .. } => {
                    let window_label = event.window().label();
                }
                tauri::WindowEvent::Destroyed => {
                    let window_label = event.window().label();
                    
                    if window_label == "editor" {
                        let engine_process_clone = engine_process_for_cleanup.clone();
                        std::thread::spawn(move || {
                            stop_engine(&engine_process_clone);
                        });
                    }
                    
                    if window_label == "hub" {
                        let app = event.window().app_handle();
                        if app.get_window("editor").is_none() {
                            std::process::exit(0);
                        }
                    }
                }
                _ => {}
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn start_engine() -> Option<Child> {
    
    let engine_dir = std::env::current_dir()
        .unwrap()
        .join("src/engine");
    
    #[cfg(target_os = "windows")]
    let child = Command::new("cmd")
        .args(&["/C", "npm", "run", "dev"])
        .current_dir(&engine_dir)
        .spawn();
    
    #[cfg(not(target_os = "windows"))]
    let child = Command::new("npm")
        .args(&["run", "dev"])
        .current_dir(&engine_dir)
        .spawn();
    
    match child {
        Ok(process) => {
            Some(process)
        }
        Err(e) => {
            None
        }
    }
}

fn stop_engine(engine_process: &Arc<Mutex<Option<Child>>>) {
    if let Some(mut process) = engine_process.lock().take() {
        let pid = process.id();
        
        #[cfg(target_os = "windows")]
        {
            let output = std::process::Command::new("taskkill")
                .args(&["/F", "/T", "/PID", &pid.to_string()])
                .output();
            
            match output {
                Ok(out) => {
                    if out.status.success() {
                    } else {
                        let stderr = String::from_utf8_lossy(&out.stderr);
                        let _ = process.kill();
                    }
                }
                Err(e) => {
                    let _ = process.kill();
                }
            }
        }
        
        #[cfg(not(target_os = "windows"))]
        {
            if let Err(e) = process.kill() {
                eprintln!("[Editor] Failed to kill engine process: {}", e);
            }
        }
        
    }
}
