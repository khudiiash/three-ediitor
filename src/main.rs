// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod websocket;
use websocket::{WebSocketServer, EditorMessage, EngineMessage};
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
            let window = app.get_window("main").unwrap();
            let ws_server = ws_server.clone();
            let connected = connected.clone();
            let entities = entities.clone();

            // Poll WebSocket messages and emit to frontend
            std::thread::spawn(move || {
                loop {
                    if let Some(msg) = ws_server.lock().try_recv() {
                        match &msg {
                            EngineMessage::Connected => {
                                *connected.lock() = true;
                                println!("[Editor] Engine connected!");
                            }
                            EngineMessage::SceneState { scene_json } => {
                                if let Ok(scene) = serde_json::from_str::<serde_json::Value>(scene_json) {
                                    if let Some(ents) = scene.get("entities").and_then(|e| e.as_array()) {
                                        *entities.lock() = ents.clone();
                                    }
                                }
                            }
                            EngineMessage::FrameStats { fps, entity_count } => {
                                let _ = window.emit("frame-stats", serde_json::json!({
                                    "fps": fps,
                                    "entity_count": entity_count
                                }));
                            }
                            _ => {}
                        }

                        // Emit message to frontend
                        let _ = window.emit("engine-message", serde_json::to_string(&msg).unwrap());
                    }
                    std::thread::sleep(std::time::Duration::from_millis(16)); // ~60fps polling
                }
            });

            println!("[Editor] Tauri app initialized");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            send_to_engine,
            get_connection_status,
            get_entities
        ])
        .on_window_event(move |event| {
            if let tauri::WindowEvent::Destroyed = event.event() {
                println!("[Editor] Window closing, stopping engine...");
                stop_engine(&engine_process_for_cleanup);
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
            let _ = std::process::Command::new("taskkill")
                .args(&["/F", "/T", "/PID", &pid.to_string()])
                .output();
        }
        
        #[cfg(not(target_os = "windows"))]
        {
            let _ = process.kill();
        }
        
        let _ = process.wait();
        println!("[Editor] Engine stopped");
    }
}
