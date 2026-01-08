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
// These handle path resolution on the Rust side, which should work better with Tauri's scope system
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
fn write_scene_file(project_path: String, content: String) -> Result<(), String> {
    use std::fs;
    use std::path::PathBuf;
    use std::time::{SystemTime, UNIX_EPOCH};
    
    let path = PathBuf::from(&project_path).join("scene.json");
    
    fs::write(&path, content)
        .map_err(|e| format!("Failed to write file: {}", e))?;
    
    // Update the modified timestamp in project.json
    let project_json_path = PathBuf::from(&project_path).join("project.json");
    if project_json_path.exists() {
        if let Ok(project_content) = fs::read_to_string(&project_json_path) {
            if let Ok(mut metadata) = serde_json::from_str::<serde_json::Value>(&project_content) {
                // Update the modified timestamp
                let now = SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .unwrap()
                    .as_secs();
                metadata["modified"] = serde_json::Value::Number(now.into());
                
                // Write back the updated metadata
                if let Ok(updated_content) = serde_json::to_string_pretty(&metadata) {
                    let _ = fs::write(&project_json_path, updated_content);
                }
            }
        }
    }
    
    Ok(())
}

// Asset file operations
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
async fn write_asset_file(project_path: String, asset_path: String, content: Vec<u8>) -> Result<(), String> {
    use std::path::PathBuf;
    
    let assets_dir = PathBuf::from(&project_path).join("assets");
    let full_path = assets_dir.join(&asset_path);
    
    // Create parent directories if they don't exist
    if let Some(parent) = full_path.parent() {
        tokio::fs::create_dir_all(parent).await
            .map_err(|e| format!("Failed to create directory: {}", e))?;
    }
    
    tokio::fs::write(&full_path, content).await
        .map_err(|e| format!("Failed to write file: {}", e))?;
    
    Ok(())
}

#[tauri::command]
async fn read_assets_metadata(project_path: String) -> Result<String, String> {
    use std::path::PathBuf;
    
    let metadata_path = PathBuf::from(&project_path).join("assets").join("assets.json");
    
    match tokio::fs::read_to_string(&metadata_path).await {
        Ok(content) => Ok(content),
        Err(e) => {
            if e.kind() == std::io::ErrorKind::NotFound {
                // Return empty metadata if file doesn't exist
                Ok("{}".to_string())
            } else {
                Err(format!("Failed to read metadata: {}", e))
            }
        }
    }
}

#[tauri::command]
async fn write_assets_metadata(project_path: String, content: String) -> Result<(), String> {
    use std::path::PathBuf;
    
    let assets_dir = PathBuf::from(&project_path).join("assets");
    let metadata_path = assets_dir.join("assets.json");
    
    // Ensure assets directory exists
    tokio::fs::create_dir_all(&assets_dir).await
        .map_err(|e| format!("Failed to create assets directory: {}", e))?;
    
    tokio::fs::write(&metadata_path, content).await
        .map_err(|e| format!("Failed to write metadata: {}", e))?;
    
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
    println!("[Editor] Opening project: {}", path);
    
    // Check if editor window already exists and is visible
    if let Some(existing_window) = app.get_window("editor") {
        // Check if window is actually visible
        match existing_window.is_visible() {
            Ok(true) => {
                // Window exists and is visible - show error, don't allow opening another
                println!("[Editor] Editor window already open and visible");
                return Err("Editor is already open. Please close it first.".to_string());
            }
            Ok(false) | Err(_) => {
                // Window exists but is not visible - show it
                println!("[Editor] Editor window exists but is not visible, showing it...");
                if let Err(e) = existing_window.show() {
                    eprintln!("[Editor] Failed to show existing window: {}", e);
                    return Err(format!("Failed to show editor window: {}", e));
                }
                if let Err(e) = existing_window.set_focus() {
                    eprintln!("[Editor] Failed to focus editor window: {}", e);
                }
                // Emit project-opened event after a delay to allow the window to load
                let window_clone = existing_window.clone();
                let path_clone = path.clone();
                std::thread::spawn(move || {
                    std::thread::sleep(std::time::Duration::from_millis(2500));
                    println!("[Editor] Emitting project-opened event with path: {}", path_clone);
                    if let Err(e) = window_clone.emit("project-opened", path_clone) {
                        eprintln!("[Editor] Failed to emit project-opened event: {}", e);
                    } else {
                        println!("[Editor] Project-opened event emitted successfully");
                    }
                });
                return Ok(());
            }
        }
    }
    
    // Spawn window creation in a separate thread to avoid blocking/deadlocks on Windows
    // This is especially important on Windows where synchronous window creation can hang
    let app_clone = app.clone();
    let path_clone = path.clone();
    std::thread::spawn(move || {
        println!("[Editor] Creating new editor window in background thread...");
        
        // Create new editor window
        // Note: fileDropEnabled is set to false in tauri.conf.json for the hub window
        // For dynamically created windows, we need to handle this differently
        // In Tauri v1, we can't directly set fileDropEnabled on WindowBuilder
        // Instead, we'll rely on the window not having file drop enabled by default
        // and handle it via event listeners if needed
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
                println!("[Editor] Editor window created successfully");
                window
            }
            Err(e) => {
                eprintln!("[Editor] Failed to create editor window: {}", e);
                // Try to emit error to hub window
                if let Some(hub_window) = app_clone.get_window("hub") {
                    let _ = hub_window.emit("editor-error", format!("Failed to create editor window: {}", e));
                }
                return;
            }
        };
        
        // The window is already visible from .visible(true) in the builder
        // Just ensure it's focused
        if let Err(e) = editor_window.set_focus() {
            eprintln!("[Editor] Failed to focus editor window: {}", e);
        }
        
        // Wait for the window to fully load before emitting the event
        // The event listener needs time to be set up in the editor's index.html
        std::thread::spawn({
            let window = editor_window.clone();
            let path_clone = path_clone.clone();
            move || {
                // Wait for the window's webview to be ready
                // The editor loads many modules and sets up event listeners
                std::thread::sleep(std::time::Duration::from_millis(2500));
                println!("[Editor] Emitting project-opened event with path: {}", path_clone);
                if let Err(e) = window.emit("project-opened", path_clone) {
                    eprintln!("[Editor] Failed to emit project-opened event: {}", e);
                } else {
                    println!("[Editor] Project-opened event emitted successfully");
                }
            }
        });
    });

    println!("[Editor] Editor window creation initiated");
    Ok(())
}

fn main() {
    // Start the engine process
    let engine_process = Arc::new(Mutex::new(start_engine()));
    
    // Create WebSocket server
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
            // Get the hub window (created by tauri.conf.json)
            let _hub_window = app.get_window("hub")
                .expect("Hub window should exist");
            
            // WebSocket polling will target editor windows when they exist
            let app_handle = app.handle().clone();
            let ws_server_clone = ws_server.clone();
            let connected_clone = connected.clone();
            let entities_clone = entities.clone();

            // Poll WebSocket messages and emit to editor windows
            std::thread::Builder::new()
                .name("websocket-polling".to_string())
                .spawn(move || {
                    loop {
                        // Check if app is still running by trying to get a window
                        // If both hub and editor windows are gone, exit the polling loop
                        let hub_exists = app_handle.get_window("hub").is_some();
                        let editor_exists = app_handle.get_window("editor").is_some();
                        
                        if !hub_exists && !editor_exists {
                            println!("[Editor] All windows closed, stopping WebSocket polling");
                            break;
                        }
                        
                        if let Some(msg) = ws_server_clone.lock().try_recv() {
                            match &msg {
                                EngineMessage::Connected => {
                                    *connected_clone.lock() = true;
                                    println!("[Editor] Engine connected!");
                                }
                                EngineMessage::SceneState { scene_json } => {
                                    if let Ok(scene) = serde_json::from_str::<serde_json::Value>(scene_json) {
                                        if let Some(ents) = scene.get("entities").and_then(|e| e.as_array()) {
                                            *entities_clone.lock() = ents.clone();
                                        }
                                    }
                                }
                                EngineMessage::FrameStats { fps, entity_count } => {
                                    // Emit to editor window if it exists
                                    if let Some(editor_window) = app_handle.get_window("editor") {
                                        let _ = editor_window.emit("frame-stats", serde_json::json!({
                                            "fps": fps,
                                            "entity_count": entity_count
                                        }));
                                    }
                                }
                                _ => {}
                            }

                            // Emit message to editor window if it exists
                            if let Some(editor_window) = app_handle.get_window("editor") {
                                let _ = editor_window.emit("engine-message", serde_json::to_string(&msg).unwrap());
                            }
                        }
                        std::thread::sleep(std::time::Duration::from_millis(16)); // ~60fps polling
                    }
                })
                .expect("Failed to spawn WebSocket polling thread");

            println!("[Editor] Tauri app initialized");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            send_to_engine,
            get_connection_status,
            get_entities,
            list_projects,
            create_project,
            delete_project,
            open_project,
            read_scene_file,
            write_scene_file,
            read_asset_file,
            write_asset_file,
            read_assets_metadata,
            write_assets_metadata,
            list_assets_directory
        ])
        .on_window_event(move |event| {
            match event.event() {
                tauri::WindowEvent::CloseRequested { .. } => {
                    let window_label = event.window().label();
                    println!("[Editor] Window '{}' close requested", window_label);
                    // Allow the window to close normally - don't prevent it
                }
                tauri::WindowEvent::Destroyed => {
                    let window_label = event.window().label();
                    println!("[Editor] Window '{}' destroyed", window_label);
                    
                    // Stop engine when editor window is destroyed
                    if window_label == "editor" {
                        println!("[Editor] Editor window destroyed, stopping engine...");
                        // Stop engine in a separate thread to avoid blocking
                        let engine_process_clone = engine_process_for_cleanup.clone();
                        std::thread::spawn(move || {
                            stop_engine(&engine_process_clone);
                        });
                    }
                    
                    // If hub window closes and no editor window exists, exit the app immediately
                    if window_label == "hub" {
                        let app = event.window().app_handle();
                        if app.get_window("editor").is_none() {
                            println!("[Editor] Hub closed and no editor window, exiting immediately...");
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
    println!("[Editor] Starting engine process...");
    
    let engine_dir = std::env::current_dir()
        .unwrap()
        .join("../engine");
    
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
            println!("[Editor] Engine process started (PID: {})", process.id());
            Some(process)
        }
        Err(e) => {
            eprintln!("[Editor] Failed to start engine: {}", e);
            None
        }
    }
}

fn stop_engine(engine_process: &Arc<Mutex<Option<Child>>>) {
    if let Some(mut process) = engine_process.lock().take() {
        let pid = process.id();
        println!("[Editor] Stopping engine process (PID: {})...", pid);
        
        #[cfg(target_os = "windows")]
        {
            // On Windows, kill the entire process tree
            // Use taskkill which is more reliable and doesn't require waiting
            let output = std::process::Command::new("taskkill")
                .args(&["/F", "/T", "/PID", &pid.to_string()])
                .output();
            
            match output {
                Ok(out) => {
                    if out.status.success() {
                        println!("[Editor] Engine process tree killed successfully");
                    } else {
                        let stderr = String::from_utf8_lossy(&out.stderr);
                        println!("[Editor] Warning: taskkill returned error: {}", stderr);
                        // Try fallback kill
                        let _ = process.kill();
                    }
                }
                Err(e) => {
                    eprintln!("[Editor] Failed to run taskkill: {}", e);
                    // Try fallback kill
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
        
        // Don't wait for the process - just fire and forget
        // The process will be cleaned up by the OS
        println!("[Editor] Engine stop signal sent");
    } else {
        println!("[Editor] No engine process to stop");
    }
}
