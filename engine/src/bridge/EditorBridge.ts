import { World } from '../ecs/World';
import { Entity } from '../ecs/Entity';
import { TransformComponent, MeshComponent } from '../components';
import { GizmoSystem } from '../systems/GizmoSystem';
import * as THREE from 'three';

/**
 * Messages from editor to engine
 */
export interface EditorMessage {
  type: 'LoadScene' | 'UpdateTransform' | 'CreateEntity' | 'DeleteEntity' | 'SetPlayMode' | 'GetSceneState' | 'SelectEntity';
  scene_json?: string;
  entity_id?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  name?: string;
  components?: string[];
  parent_id?: number;
  playing?: boolean;
}

/**
 * Messages from engine to editor
 */
export interface EngineMessage {
  type: 'SceneState' | 'EntityCreated' | 'EntityDeleted' | 'FrameStats' | 'Connected' | 'Error' | 'TransformUpdated' | 'EntitySelected';
  scene_json?: string;
  entity_id?: number | null;
  name?: string;
  fps?: number;
  entity_count?: number;
  message?: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
}

/**
 * Bridge between the engine and the Rust editor via WebSocket
 */
export class EditorBridge {
  private static instance: EditorBridge | null = null;
  private static instanceId: string = Math.random().toString(36).substring(7);
  
  private ws: WebSocket | null = null;
  private world: World = new World();
  private connected: boolean = false;
  private reconnectInterval: number = 2000;
  private reconnectTimer: number | null = null;
  private playMode: boolean = false;
  private isConnecting: boolean = false; // Prevent multiple simultaneous connection attempts
  private isPrimaryInstance: boolean = false; // Only primary instance handles entity creation
  private gizmoSystem: GizmoSystem | null = null;
  
  // Stats tracking
  private frameCount: number = 0;
  private lastStatsTime: number = 0;
  private currentFps: number = 0;

  constructor(world: World, autoConnect: boolean = true) {
    // Singleton pattern - only allow one instance
    if (EditorBridge.instance) {
      console.warn(`[EditorBridge] Instance already exists! This is instance ${EditorBridge.instanceId}. Ignoring duplicate.`);
      return EditorBridge.instance;
    }
    
    console.log(`%c[EditorBridge] Creating PRIMARY instance ${EditorBridge.instanceId}`, 'background: #8b5cf6; color: white; font-weight: bold; padding: 4px;');
    
    this.world = world;
    this.isPrimaryInstance = true; // First instance is always primary
    
    EditorBridge.instance = this;

    if (autoConnect) {
      this.connect();
    }
  }

  /**
   * Connect to the editor WebSocket server
   */
  connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      console.log('[EditorBridge] Already connected or connecting to editor');
      return;
    }

    if (this.isConnecting) {
      console.log('[EditorBridge] Connection attempt already in progress');
      return;
    }

    // Close existing connection if any
    if (this.ws) {
      try {
        console.log('[EditorBridge] Closing existing connection...');
        this.ws.close();
      } catch (e) {
        // Ignore
      }
      this.ws = null;
    }

    this.isConnecting = true;

    try {
      const wsUrl = 'ws://127.0.0.1:9001';
      console.log(`[EditorBridge] Connecting to editor at ${wsUrl}...`);
      
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log(`%c[EditorBridge ${EditorBridge.instanceId}] ✓ CONNECTED TO EDITOR!`, 'background: #4ade80; color: black; font-weight: bold; padding: 4px;');
        this.connected = true;
        this.isConnecting = false;
        
        this.sendMessage({ type: 'Connected' });
        
        // Send initial scene state
        this.sendSceneState();
        
        // Clear reconnect timer
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const message: EditorMessage = JSON.parse(event.data);
          this.handleEditorMessage(message);
        } catch (e) {
          console.error('[EditorBridge] Failed to parse editor message:', e, event.data);
        }
      };

      this.ws.onerror = (error) => {
        console.error('[EditorBridge] WebSocket error:', error);
        this.isConnecting = false;
      };

      this.ws.onclose = (event) => {
        console.log('%c[EditorBridge] ✗ DISCONNECTED FROM EDITOR', 'background: #f87171; color: black; font-weight: bold; padding: 4px;', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean
        });
        this.connected = false;
        this.isConnecting = false;
        this.ws = null;
        
        // Only reconnect if it wasn't a normal closure (code 1000) or server-initiated close (code 1001)
        if (event.code !== 1000 && event.code !== 1001) {
          this.scheduleReconnect();
        } else {
          console.log('[EditorBridge] Connection closed normally, not reconnecting');
        }
      };
    } catch (e) {
      console.error('[EditorBridge] Failed to connect to editor:', e);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  /**
   * Schedule a reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    
    console.log(`[EditorBridge] Reconnecting in ${this.reconnectInterval}ms...`);
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, this.reconnectInterval);
  }

  /**
   * Disconnect from the editor
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.connected = false;
  }

  /**
   * Check if connected to editor
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Check if in play mode
   */
  isPlaying(): boolean {
    return this.playMode;
  }

  /**
   * Select an entity (called from click-to-select)
   */
  selectEntity(entityId: number | null): void {
    if (entityId !== null) {
      this.sendMessage({
        type: 'EntitySelected',
        entity_id: entityId,
      });
      
      // Also update gizmo immediately
      const entity = this.world.getEntity(entityId);
      if (entity && this.gizmoSystem) {
        this.gizmoSystem.selectEntity(entity);
      }
    } else {
      // Deselect
      this.sendMessage({
        type: 'EntitySelected',
        entity_id: null,
      });
      
      if (this.gizmoSystem) {
        this.gizmoSystem.selectEntity(null);
      }
    }
  }

  /**
   * Set the gizmo system reference
   */
  setGizmoSystem(gizmoSystem: GizmoSystem): void {
    this.gizmoSystem = gizmoSystem;
    
    // Set up callback to send transform updates when gizmo changes
    gizmoSystem.setOnTransformChange((entity, transform) => {
      this.sendMessage({
        type: 'TransformUpdated',
        entity_id: entity.id,
        position: transform.position.toArray() as [number, number, number],
        rotation: [transform.rotation.x, transform.rotation.y, transform.rotation.z] as [number, number, number],
        scale: transform.scale.toArray() as [number, number, number],
      });
    });
  }

  /**
   * Send a message to the editor
   */
  private sendMessage(message: EngineMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      this.ws.send(JSON.stringify(message));
    } catch (e) {
      console.error('Failed to send message to editor:', e);
    }
  }

  /**
   * Handle messages from the editor
   */
  private handleEditorMessage(message: EditorMessage): void {
    switch (message.type) {
      case 'GetSceneState':
        this.sendSceneState();
        break;

      case 'SetPlayMode':
        this.playMode = message.playing ?? false;
        console.log(this.playMode ? '[EditorBridge] Play mode enabled' : '[EditorBridge] Play mode disabled');
        break;

      case 'CreateEntity':
        // Only primary instance should create entities
        if (!this.isPrimaryInstance) {
          console.log(`%c[EditorBridge ${EditorBridge.instanceId}] Ignoring CreateEntity (not primary instance)`, 'background: #fbbf24; color: black; padding: 2px;');
          return;
        }
        
        console.log(`%c[EditorBridge ${EditorBridge.instanceId}] Creating entity...`, 'background: #10b981; color: white; padding: 2px;');
        
        if (message.name) {
          const entity = new Entity(message.name);
          
          // Add default components to make the entity visible
          const transform = new TransformComponent(
            new THREE.Vector3(0, 0, 0),
            new THREE.Euler(0, 0, 0),
            new THREE.Vector3(1, 1, 1)
          );
          entity.addComponent(transform);
          
          // Add a cube
          const mesh = new MeshComponent();
          mesh.geometryType = 'box';
          mesh.materialParams.color = new THREE.Color(0xffffff).getHex();
          entity.addComponent(mesh);
          
          // Handle parent relationship
          if (message.parent_id !== undefined) {
            const parent = this.world.getEntity(message.parent_id);
            if (parent) {
              parent.addChild(entity);
              // Still add to world (it will be tracked but not as root)
              this.world.addEntity(entity);
              console.log(`[EditorBridge] Created entity ${entity.name} as child of ${parent.name}`);
            } else {
              console.warn(`[EditorBridge] Parent entity ${message.parent_id} not found, creating as root`);
              this.world.addEntity(entity);
            }
          } else {
            this.world.addEntity(entity);
          }
          
          this.sendMessage({
            type: 'EntityCreated',
            entity_id: entity.id,
            name: entity.name,
          });
          console.log(`[EditorBridge] Created entity: ${entity.name}`);
          
          // Don't send scene state here - let the editor request it to avoid duplicates
        }
        break;

      case 'DeleteEntity':
        // Only primary instance should delete entities
        if (!this.isPrimaryInstance) {
          console.log('[EditorBridge] Ignoring DeleteEntity (not primary instance)');
          return;
        }
        
        if (message.entity_id !== undefined) {
          const entity = this.world.getEntity(message.entity_id);
          if (entity) {
            this.world.removeEntity(entity);
            this.sendMessage({
              type: 'EntityDeleted',
              entity_id: message.entity_id,
            });
            console.log(`[EditorBridge] Deleted entity: ${entity.name}`);
          }
        }
        break;

      case 'SelectEntity':
        if (message.entity_id !== undefined) {
          const entity = this.world.getEntity(message.entity_id);
          if (entity && this.gizmoSystem) {
            this.gizmoSystem.selectEntity(entity);
            console.log(`[EditorBridge] Selected entity: ${entity.name} (ID: ${message.entity_id})`);
          } else if (!entity) {
            console.warn(`[EditorBridge] Entity ${message.entity_id} not found`);
          }
        }
        break;

      case 'UpdateTransform':
        console.log('[EditorBridge] Received UpdateTransform message:', message);
        if (message.entity_id !== undefined && message.position && message.rotation && message.scale) {
          const entity = this.world.getEntity(message.entity_id);
          if (entity) {
            const transform = entity.getComponent(TransformComponent);
            if (transform) {
              transform.position.set(message.position[0], message.position[1], message.position[2]);
              transform.rotation.set(message.rotation[0], message.rotation[1], message.rotation[2]);
              transform.scale.set(message.scale[0], message.scale[1], message.scale[2]);
              
              // Update gizmo if this entity is selected
              if (this.gizmoSystem) {
                this.gizmoSystem.updateGizmoTransform(entity);
              }
              
              console.log(`[EditorBridge] ✓ Updated transform for entity: ${entity.name}`);
            } else {
              console.warn(`[EditorBridge] Entity ${entity.name} has no TransformComponent`);
            }
          } else {
            console.warn(`[EditorBridge] Entity with ID ${message.entity_id} not found`);
          }
        } else {
          console.warn('[EditorBridge] Invalid UpdateTransform message:', message);
        }
        break;

      case 'LoadScene':
        // TODO: Implement scene loading
        console.log('[EditorBridge] Load scene:', message.scene_json);
        break;

      default:
        console.warn('Unknown message type:', message);
    }
  }

  /**
   * Send current scene state to editor
   */
  private sendSceneState(): void {
    const sceneData = this.world.toJSON();
    this.sendMessage({
      type: 'SceneState',
      scene_json: JSON.stringify(sceneData),
    });
  }

  /**
   * Update stats and send to editor
   * Call this every frame
   */
  update(): void {
    this.frameCount++;
    
    const currentTime = performance.now();
    if (currentTime - this.lastStatsTime >= 1000) {
      this.currentFps = Math.round((this.frameCount * 1000) / (currentTime - this.lastStatsTime));
      
      // Send stats to editor
      if (this.connected) {
        this.sendMessage({
          type: 'FrameStats',
          fps: this.currentFps,
          entity_count: this.world.getAllEntities().length,
        });
      }
      
      this.frameCount = 0;
      this.lastStatsTime = currentTime;
    }
  }

  /**
   * Send an error message to the editor
   */
  sendError(message: string): void {
    this.sendMessage({
      type: 'Error',
      message,
    });
  }
}

