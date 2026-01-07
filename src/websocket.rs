use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use tokio::net::TcpListener;
use tokio::sync::{mpsc, broadcast};
use tokio_tungstenite::accept_async;
use tokio_tungstenite::tungstenite::Message;

/// Messages sent from editor to engine
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum EditorMessage {
    /// Load a scene
    LoadScene { scene_json: String },
    /// Update entity transform
    UpdateTransform {
        entity_id: u32,
        position: [f32; 3],
        rotation: [f32; 3],
        scale: [f32; 3],
    },
    /// Create new entity
    CreateEntity {
        name: String,
        components: Vec<String>,
        parent_id: Option<u32>,
    },
    /// Delete entity
    DeleteEntity { entity_id: u32 },
    /// Select entity
    SelectEntity { entity_id: u32 },
    /// Play/Pause
    SetPlayMode { playing: bool },
    /// Request scene state
    GetSceneState,
}

/// Messages sent from engine to editor
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum EngineMessage {
    /// Scene state update
    SceneState { scene_json: String },
    /// Entity created
    EntityCreated { entity_id: u32, name: String },
    /// Entity deleted
    EntityDeleted { entity_id: u32 },
    /// Frame stats
    FrameStats { fps: u32, entity_count: u32 },
    /// Connection established
    Connected,
    /// Error message
    Error { message: String },
    /// Transform updated (from gizmo manipulation)
    TransformUpdated {
        entity_id: u32,
        position: [f32; 3],
        rotation: [f32; 3],
        scale: [f32; 3],
    },
    /// Entity selected (from click)
    EntitySelected { entity_id: Option<u32> },
}

pub struct WebSocketServer {
    tx: broadcast::Sender<EditorMessage>,
    rx: Arc<Mutex<mpsc::UnboundedReceiver<EngineMessage>>>,
}

impl WebSocketServer {
    pub fn new() -> Self {
        let (editor_tx, _) = broadcast::channel(100);
        let (engine_tx, engine_rx) = mpsc::unbounded_channel();

        let server = Self {
            tx: editor_tx.clone(),
            rx: Arc::new(Mutex::new(engine_rx)),
        };

        // Start WebSocket server in background
        server.start_server(editor_tx, engine_tx);

        server
    }

    fn start_server(
        &self,
        editor_tx: broadcast::Sender<EditorMessage>,
        engine_tx: mpsc::UnboundedSender<EngineMessage>,
    ) {
        std::thread::spawn(move || {
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(async move {
            let addr = "127.0.0.1:9001";
            let listener = match TcpListener::bind(addr).await {
                Ok(l) => l,
                Err(e) => {
                    eprintln!("Failed to bind WebSocket server: {}", e);
                    return;
                }
            };

            println!("WebSocket server listening on ws://{}", addr);

            // Accept connections and handle each in a separate task
            let client_counter = Arc::new(std::sync::atomic::AtomicUsize::new(0));
            
            loop {
                if let Ok((stream, addr)) = listener.accept().await {
                    let client_id = client_counter.fetch_add(1, std::sync::atomic::Ordering::SeqCst) + 1;
                    println!("[WebSocket] Client #{} connected from: {}", client_id, addr);

                    let engine_tx = engine_tx.clone();
                    let mut editor_rx = editor_tx.subscribe();

                    tokio::spawn(async move {
                        let ws_stream = match accept_async(stream).await {
                            Ok(ws) => ws,
                            Err(e) => {
                                eprintln!("[WebSocket] Client #{} handshake failed: {}", client_id, e);
                                return;
                            }
                        };

                        println!("[WebSocket] Client #{} handshake completed", client_id);
                        let (mut ws_sender, mut ws_receiver) = ws_stream.split();

                        // Send connected message
                        let _ = engine_tx.send(EngineMessage::Connected);

                        // Handle this connection
                        loop {
                            tokio::select! {
                                // Forward messages from editor to engine
                                Ok(msg) = editor_rx.recv() => {
                                    let json = serde_json::to_string(&msg).unwrap();
                                    if ws_sender.send(Message::Text(json)).await.is_err() {
                                        break;
                                    }
                                }
                                // Forward messages from engine to editor
                                Some(msg) = ws_receiver.next() => {
                                    if let Ok(Message::Text(text)) = msg {
                                        if let Ok(engine_msg) = serde_json::from_str::<EngineMessage>(&text) {
                                            let _ = engine_tx.send(engine_msg);
                                        }
                                    } else {
                                        break;
                                    }
                                }
                            }
                        }

                        println!("[WebSocket] Client #{} disconnected", client_id);
                    });
                }
            }
            });
        });
    }

    pub fn send(&self, message: EditorMessage) {
        let _ = self.tx.send(message);  // broadcast to all connected clients
    }

    pub fn try_recv(&self) -> Option<EngineMessage> {
        self.rx.lock().unwrap().try_recv().ok()
    }
}

