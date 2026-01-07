import { System } from '../ecs/System';
import { World } from '../ecs/World';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ViewHelper } from 'three/examples/jsm/helpers/ViewHelper.js';

/**
 * EditorCameraSystem manages a separate camera for the editor with orbit controls.
 * This camera is not part of the ECS hierarchy and is only active when the editor is connected.
 */
export class EditorCameraSystem extends System {
  readonly requiredComponents: never[] = [];

  private editorCamera: THREE.PerspectiveCamera | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private isActive: boolean = false;
  private orbitControls: OrbitControls | null = null;
  private viewHelper: ViewHelper | null = null;
  
  // Movement state
  private keys: Set<string> = new Set();
  private moveSpeed: number = 5.0;

  constructor(_scene: THREE.Scene) {
    super();
  }

  onInit(_world: World): void {
    // Camera will be created when activated
  }

  /**
   * Activate the editor camera
   */
  activate(canvas: HTMLCanvasElement): void {
    if (this.isActive) return;
    
    this.canvas = canvas;
    this.isActive = true;
    
    // Get canvas size (use clientWidth/Height if width/height are 0)
    const width = canvas.width || canvas.clientWidth || 800;
    const height = canvas.height || canvas.clientHeight || 600;
    const aspect = width / height;
    
    this.editorCamera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    
    // Initialize camera position (default: 0, 2, 5)
    this.editorCamera.position.set(0, 2, 5);
    this.editorCamera.lookAt(0, 0, 0);
    this.editorCamera.updateMatrixWorld();
    
    // Create OrbitControls - make sure canvas is the actual DOM element
    if (this.editorCamera && this.canvas) {
      // Ensure canvas has proper size
      if (canvas.width === 0 || canvas.height === 0) {
        canvas.width = canvas.clientWidth || 800;
        canvas.height = canvas.clientHeight || 600;
      }
      
      // Create OrbitControls - use the canvas DOM element directly
      // Make sure we're using the actual canvas element, not a reference
      const canvasElement = canvas;
      this.orbitControls = new OrbitControls(this.editorCamera, canvasElement);
      
      // Ensure OrbitControls is enabled
      this.orbitControls.enabled = true;
      
      // Configure OrbitControls
      this.orbitControls.target.set(0, 0, 0); // Look at origin
      this.orbitControls.enableDamping = true; // Smooth rotation
      this.orbitControls.dampingFactor = 0.05;
      this.orbitControls.enableZoom = false; // Disable default zoom, we handle it ourselves
      this.orbitControls.enablePan = true;
      
      // Pan with SHIFT + drag (like Blender) - this is the default behavior
      this.orbitControls.panSpeed = 1.0;
      this.orbitControls.rotateSpeed = 1.0;
      this.orbitControls.zoomSpeed = 1.0;
      
      // Track when OrbitControls is being used to prevent raycasting interference
      this.orbitControls.addEventListener('start', () => {
        (this.canvas as any).__orbitControlsActive = true;
        (this.canvas as any).__orbitControlsMoved = false;
      });
      
      this.orbitControls.addEventListener('change', () => {
        // If OrbitControls is active and changing, it means we're dragging
        if ((this.canvas as any).__orbitControlsActive) {
          (this.canvas as any).__orbitControlsMoved = true;
        }
      });
      
      this.orbitControls.addEventListener('end', () => {
        // Clear flag immediately - we'll check if it moved separately
        (this.canvas as any).__orbitControlsActive = false;
        // Keep the moved flag for a short time to check in raycast
        setTimeout(() => {
          (this.canvas as any).__orbitControlsMoved = false;
        }, 50);
      });
      
      // Update controls
      this.orbitControls.update();
      
      // Override mouse wheel to move along camera look axis
      this.canvas.addEventListener('wheel', this.onWheel, { passive: false });

      // Create ViewHelper - Three.js ViewHelper constructor: (camera, domElement)
      this.viewHelper = new ViewHelper(this.editorCamera, this.canvas);
      console.log('[EditorCamera] ViewHelper created, camera at:', this.editorCamera.position.x, this.editorCamera.position.y, this.editorCamera.position.z);
    }
    
    // Setup keyboard handlers
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    
    (this.editorCamera as any).editorCameraSystem = this;
  }
  

  /**
   * Deactivate the editor camera
   */
  deactivate(): void {
    if (!this.isActive) return;
    
    this.isActive = false;
    
    // Remove event listeners
    if (this.canvas) {
      this.canvas.removeEventListener('wheel', this.onWheel);
    }
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    
    if (this.orbitControls) {
      this.orbitControls.dispose();
      this.orbitControls = null;
    }
    
    if (this.editorCamera) {
      this.editorCamera = null;
    }
    
    this.keys.clear();
  }

  /**
   * Get the editor camera
   */
  getCamera(): THREE.Camera | null {
    return this.editorCamera;
  }

  /**
   * Enable or disable OrbitControls (useful when gizmo is being dragged)
   */
  setOrbitControlsEnabled(enabled: boolean): void {
    if (this.orbitControls) {
      this.orbitControls.enabled = enabled;
    }
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    if (!this.isActive) return;
    this.keys.add(event.key.toLowerCase());
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    if (!this.isActive) return;
    this.keys.delete(event.key.toLowerCase());
  };

  private onWheel = (event: WheelEvent): void => {
    if (!this.isActive || !this.editorCamera || !this.orbitControls) return;
    
    event.preventDefault();
    
    // Calculate direction from camera to target (camera's look direction)
    const direction = new THREE.Vector3();
    direction.subVectors(this.orbitControls.target, this.editorCamera.position).normalize();
    
    // Move camera along this direction
    const moveDistance = event.deltaY > 0 ? -0.5 : 0.5; // Negative deltaY = scroll up = move forward
    const moveVector = direction.multiplyScalar(moveDistance);
    
    this.editorCamera.position.add(moveVector);
    this.orbitControls.target.add(moveVector); // Also move target to maintain relative position
    
    this.orbitControls.update();
  };

  /**
   * Update camera controls
   */
  update(_entity: any, deltaTime: number): void {
    if (!this.isActive || !this.orbitControls || !this.editorCamera) return;

    // Handle WASD movement relative to camera orientation
    const wPressed = this.keys.has('w');
    const sPressed = this.keys.has('s');
    const aPressed = this.keys.has('a');
    const dPressed = this.keys.has('d');
    
    if (wPressed || sPressed || aPressed || dPressed) {
      // Get camera's forward direction (from camera to target)
      const forward = new THREE.Vector3();
      forward.subVectors(this.orbitControls.target, this.editorCamera.position).normalize();
      
      // Get camera's right direction (cross product of forward and up)
      const right = new THREE.Vector3();
      right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
      
      // Calculate movement vector
      const moveVector = new THREE.Vector3(0, 0, 0);
      
      if (wPressed) {
        moveVector.add(forward);
      }
      if (sPressed) {
        moveVector.sub(forward);
      }
      if (aPressed) {
        moveVector.sub(right);
      }
      if (dPressed) {
        moveVector.add(right);
      }
      
      // Normalize and scale by move speed
      if (moveVector.lengthSq() > 0) {
        moveVector.normalize();
        moveVector.multiplyScalar(this.moveSpeed * deltaTime);
        
        // Move both camera and target to maintain relative position
        this.editorCamera.position.add(moveVector);
        this.orbitControls.target.add(moveVector);
      }
    }

    // Update OrbitControls (handles damping and smooth rotation)
    this.orbitControls.update();
  }

  /**
   * Update camera aspect ratio when viewport resizes
   */
  updateAspect(aspect: number): void {
    if (this.editorCamera) {
      this.editorCamera.aspect = aspect;
      this.editorCamera.updateProjectionMatrix();
    }
  }

  onDestroy(): void {
    this.deactivate();
  }
}
