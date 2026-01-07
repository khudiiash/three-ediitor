import { System } from '../ecs/System';
import { Entity } from '../ecs/Entity';
import { TransformComponent } from '../components/TransformComponent';
import { World } from '../ecs/World';
import { object3DRegistry } from '../utils/Object3DRegistry';
import * as THREE from 'three';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';

/**
 * GizmoSystem manages transform gizmos for selected entities.
 */
export class GizmoSystem extends System {
  readonly requiredComponents: never[] = []; // This system doesn't require specific components

  private scene: THREE.Scene;
  private camera: THREE.Camera | null = null;
  private domElement: HTMLElement | null = null;
  private transformControls: TransformControls | null = null;
  private selectedEntityId: number | null = null;
  private isDragging: boolean = false;
  private onTransformChangeCallback: ((entity: Entity, transform: TransformComponent) => void) | null = null;
  private lastUpdateTime: number = 0;
  private updateThrottle: number = 50; // Update every 50ms during drag (20fps)
  private editorCameraSystem: any = null; // Reference to EditorCameraSystem to disable OrbitControls during drag

  constructor(scene: THREE.Scene) {
    super();
    this.scene = scene;
  }

  onInit(_world: World): void {
    // TransformControls will be created when an entity is selected
  }

  /**
   * Set the camera and DOM element for the gizmo controls
   */
  setCamera(camera: THREE.Camera, domElement?: HTMLElement): void {
    this.camera = camera;
    if (domElement) {
      this.domElement = domElement;
    }
    
    // If controls exist and camera changed, recreate them
    if (this.transformControls && this.domElement) {
      const wasAttached = this.transformControls.object !== null;
      const attachedObject = this.transformControls.object;
      const mode = this.transformControls.getMode();
      
      this.scene.remove(this.transformControls);
      this.transformControls.dispose();
      
      this.transformControls = new TransformControls(this.camera, this.domElement);
      this.transformControls.setMode(mode);
      this.scene.add(this.transformControls);
      
      if (wasAttached && attachedObject) {
        this.transformControls.attach(attachedObject);
      }
    }
  }

  /**
   * Set callback for when transform changes via gizmo
   */
  setOnTransformChange(callback: (entity: Entity, transform: TransformComponent) => void): void {
    this.onTransformChangeCallback = callback;
  }

  /**
   * Set reference to EditorCameraSystem to disable OrbitControls during gizmo drag
   */
  setEditorCameraSystem(editorCameraSystem: any): void {
    this.editorCameraSystem = editorCameraSystem;
  }

  /**
   * Select an entity to show gizmos for
   */
  selectEntity(entity: Entity | null): void {
    // Remove existing gizmo
    if (this.transformControls) {
      this.scene.remove(this.transformControls);
      this.transformControls.dispose();
      this.transformControls = null;
    }

    this.selectedEntityId = null;

    if (!entity || !this.camera) {
      return;
    }

    // Get the Object3D for this entity
    const object3D = object3DRegistry.getForEntity(entity);
    if (!object3D) {
      return;
    }

    if (!this.camera || !this.domElement) {
      console.warn('[GizmoSystem] Camera or DOM element not set, cannot create gizmo');
      return;
    }

    // Create transform controls
    this.transformControls = new TransformControls(this.camera, this.domElement);
    this.transformControls.attach(object3D);
    this.transformControls.setMode('translate'); // Default to translate mode
    this.scene.add(this.transformControls);

    // Store entity reference for callbacks
    const entityRef = entity;

    // Listen for changes
    this.transformControls.addEventListener('change', () => {
      this.onGizmoChange(entityRef);
      
      // Send updates during dragging (throttled)
      if (this.isDragging && this.onTransformChangeCallback) {
        const currentTime = performance.now();
        if (currentTime - this.lastUpdateTime >= this.updateThrottle) {
          const transform = entityRef.getComponent(TransformComponent);
          if (transform) {
            this.onTransformChangeCallback(entityRef, transform);
            this.lastUpdateTime = currentTime;
          }
        }
      }
    });

    this.transformControls.addEventListener('dragging-changed', (event: any) => {
      const wasDragging = this.isDragging;
      this.isDragging = event.value as boolean;
      
      // Disable OrbitControls when dragging gizmo, enable when done
      if (this.editorCameraSystem) {
        this.editorCameraSystem.setOrbitControlsEnabled(!this.isDragging);
      }
      
      // When dragging starts, reset throttle timer
      if (!wasDragging && this.isDragging) {
        this.lastUpdateTime = 0; // Force immediate first update
      }
      
      // When dragging ends, send the final transform update immediately
      if (wasDragging && !this.isDragging) {
        // Make sure transform is synced
        this.onGizmoChange(entityRef);
        
        // Send final update to editor
        if (this.onTransformChangeCallback) {
          const transform = entityRef.getComponent(TransformComponent);
          if (transform) {
            this.onTransformChangeCallback(entityRef, transform);
          }
        }
      }
    });

    this.selectedEntityId = entity.id;
  }

  /**
   * Set the gizmo mode (translate, rotate, scale)
   */
  setMode(mode: 'translate' | 'rotate' | 'scale'): void {
    if (this.transformControls) {
      this.transformControls.setMode(mode);
    }
  }

  /**
   * Get current gizmo mode
   */
  getMode(): 'translate' | 'rotate' | 'scale' | null {
    return this.transformControls?.getMode() || null;
  }

  /**
   * Handle gizmo changes and update entity transform
   */
  private onGizmoChange(entity: Entity): void {
    const object3D = object3DRegistry.getForEntity(entity);
    if (!object3D) {
      console.warn('[GizmoSystem] onGizmoChange: Object3D not found for entity', entity.id);
      return;
    }

    const transform = entity.getComponent(TransformComponent);
    if (!transform) {
      console.warn('[GizmoSystem] onGizmoChange: TransformComponent not found for entity', entity.id);
      return;
    }

    // Gizmo directly manipulates Object3D, so we sync TransformComponent from Object3D
    // Object3D position/rotation/scale are in local space (relative to parent)
    transform.position.copy(object3D.position);
    transform.rotation.copy(object3D.rotation);
    transform.scale.copy(object3D.scale);
  }

  /**
   * Update gizmo position when transform is changed externally (from editor)
   * This ensures the Object3D matches the TransformComponent when editor updates it
   */
  updateGizmoTransform(entity: Entity): void {
    const object3D = object3DRegistry.getForEntity(entity);
    if (!object3D) {
      return;
    }

    const transform = entity.getComponent(TransformComponent);
    if (!transform) {
      return;
    }

    // When transform is updated from editor, update the Object3D to match
    // This ensures the visual representation matches the component data
    object3D.position.copy(transform.position);
    object3D.rotation.copy(transform.rotation);
    object3D.scale.copy(transform.scale);
    
    // Update matrix to apply changes
    object3D.updateMatrixWorld(true);
    
    // If gizmo is attached to this object, update it
    if (this.transformControls && this.selectedEntityId === entity.id) {
      // The gizmo is already attached, so it will follow automatically
      // But we can force an update to ensure it's in sync
      this.transformControls.updateMatrixWorld();
    }
  }

  /**
   * Update the gizmo to match entity transform (when transform is changed externally)
   */
  update(_entity: Entity, _deltaTime: number): void {
    // This system doesn't process entities in the normal way
    // It's managed through selectEntity/setMode methods
  }

  /**
   * Check if gizmo is currently being dragged
   */
  isDraggingGizmo(): boolean {
    return this.isDragging;
  }

  /**
   * Get the selected entity ID
   */
  getSelectedEntityId(): number | null {
    return this.selectedEntityId;
  }

  onDestroy(): void {
    if (this.transformControls) {
      this.scene.remove(this.transformControls);
      this.transformControls.dispose();
      this.transformControls = null;
    }
  }
}

