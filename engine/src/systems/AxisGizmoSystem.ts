import { System } from '../ecs/System';
import { Entity } from '../ecs/Entity';
import { World } from '../ecs/World';
import { CameraComponent } from '../components/CameraComponent';
import { TransformComponent } from '../components/TransformComponent';
import * as THREE from 'three';
import { ViewHelper } from 'three/examples/jsm/helpers/ViewHelper.js';

/**
 * AxisGizmoSystem creates a 3D axes gizmo widget in the viewport (like Blender).
 * Users can click on the axes to switch camera views.
 */
export class AxisGizmoSystem extends System {
  readonly requiredComponents: never[] = [];

  private scene: THREE.Scene;
  private cameraEntity: Entity | null = null;
  private orthographicSize: number = 10;
  private rendererRef: any = null; // Reference to our Renderer class
  private viewHelper: ViewHelper | null = null;
  private webglRenderer: THREE.WebGLRenderer | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private camera: THREE.Camera | null = null;
  private isEditorConnected: boolean = false;
  private orbitControls: any = null; // Reference to OrbitControls

  constructor(scene: THREE.Scene) {
    super();
    this.scene = scene;
  }

  onInit(_world: World): void {
    // Gizmo will be created when camera is set
  }

  /**
   * Set the camera entity to control
   */
  setCameraEntity(entity: Entity): void {
    this.cameraEntity = entity;
  }

  /**
   * Set renderer reference to update mainCamera
   */
  setRenderer(renderer: any): void {
    this.rendererRef = renderer;
  }

  /**
   * Set camera, renderer, and canvas for ViewHelper
   */
  setCamera(camera: THREE.Camera, canvas: HTMLCanvasElement, webglRenderer: THREE.WebGLRenderer, orbitControls?: any): void {
    this.camera = camera;
    this.canvas = canvas;
    this.webglRenderer = webglRenderer;
    this.orbitControls = orbitControls || null;
    this.createGizmo();
  }

  /**
   * Create the 3D axes gizmo widget using Three.js ViewHelper
   */
  private createGizmo(): void {
    if (this.viewHelper) {
      // ViewHelper is not in scene, just dispose it
      this.viewHelper.dispose();
      this.viewHelper = null;
    }

    if (!this.camera || !this.webglRenderer || !this.canvas) {
      return;
    }

    // Store camera state before creating ViewHelper to prevent it from resetting
    const savedPosition = this.camera.position.clone();
    const savedQuaternion = this.camera.quaternion.clone();
    const savedRotation = this.camera.rotation.clone();
    
    // Create ViewHelper - Three.js built-in viewport gizmo
    // ViewHelper constructor: (camera, domElement)
    // ViewHelper handles its own event listeners internally
    this.viewHelper = new ViewHelper(this.camera, this.canvas);
    
    // Restore camera state after ViewHelper creation (it might reset the camera)
    this.camera.position.copy(savedPosition);
    this.camera.quaternion.copy(savedQuaternion);
    this.camera.rotation.copy(savedRotation);
    this.camera.updateMatrixWorld();
    
    // Update OrbitControls target if available
    if (this.orbitControls) {
      this.orbitControls.target.set(0, 0, 0);
      this.orbitControls.update();
    }
  }


  /**
   * Set editor connection state
   */
  setEditorConnected(connected: boolean): void {
    this.isEditorConnected = connected;
    if (this.viewHelper) {
      this.viewHelper.visible = connected;
    }
  }

  /**
   * Update ViewHelper - it needs to be updated every frame
   */
  update(_entity: Entity, deltaTime: number): void {
    if (!this.viewHelper || !this.isEditorConnected || !this.camera) {
      if (this.viewHelper) {
        this.viewHelper.visible = false;
      }
      return;
    }

    this.viewHelper.visible = true;
    
    // Update ViewHelper with deltaTime - this handles animations and interactions
    // ViewHelper modifies the camera directly when axes are clicked
    this.viewHelper.update(deltaTime);
    
    // Ensure camera is synced with ViewHelper if it changed
    // ViewHelper might have modified the camera, so update OrbitControls target if needed
    if (this.orbitControls && this.camera) {
      // ViewHelper might have changed the camera, so update OrbitControls
      this.orbitControls.update();
    }
    
    // Ensure renderer is using the current camera
    if (this.rendererRef && this.camera) {
      this.rendererRef.mainCamera = this.camera;
    }
  }

  /**
   * Render the ViewHelper (call this after main render)
   */
  render(): void {
    if (this.viewHelper && this.isEditorConnected && this.webglRenderer) {
      this.viewHelper.render(this.webglRenderer);
    }
  }

  /**
   * Switch to a specific view (front, back, top, bottom, left, right)
   */
  switchToView(view: 'front' | 'back' | 'top' | 'bottom' | 'left' | 'right'): void {
    if (!this.cameraEntity) {
      return;
    }

    const cameraComp = this.cameraEntity.getComponent(CameraComponent);
    const transform = this.cameraEntity.getComponent(TransformComponent);
    
    if (!cameraComp || !transform) {
      return;
    }

    // Switch to orthographic
    cameraComp.cameraType = 'orthographic';
    
    // Recreate camera with correct aspect ratio
    if (this.canvas) {
      const aspect = this.canvas.width / this.canvas.height;
      const halfHeight = this.orthographicSize;
      const halfWidth = halfHeight * aspect;
      
      cameraComp.left = -halfWidth;
      cameraComp.right = halfWidth;
      cameraComp.top = halfHeight;
      cameraComp.bottom = -halfHeight;
      
      // Recreate camera
      cameraComp.createCamera(aspect);
    }

    // Set camera position and rotation based on view
    const distance = 10;
    
    switch (view) {
      case 'front':
        transform.position.set(0, 0, distance);
        transform.rotation.set(0, 0, 0);
        break;
      case 'back':
        transform.position.set(0, 0, -distance);
        transform.rotation.set(0, Math.PI, 0);
        break;
      case 'top':
        transform.position.set(0, distance, 0);
        transform.rotation.set(-Math.PI / 2, 0, 0);
        break;
      case 'bottom':
        transform.position.set(0, -distance, 0);
        transform.rotation.set(Math.PI / 2, 0, 0);
        break;
      case 'left':
        transform.position.set(-distance, 0, 0);
        transform.rotation.set(0, Math.PI / 2, 0);
        break;
      case 'right':
        transform.position.set(distance, 0, 0);
        transform.rotation.set(0, -Math.PI / 2, 0);
        break;
    }

    // Update camera transform
    if (cameraComp.camera) {
      cameraComp.camera.position.copy(transform.position);
      cameraComp.camera.rotation.copy(transform.rotation);
      
      // Update projection matrix
      if (cameraComp.camera instanceof THREE.OrthographicCamera) {
        cameraComp.camera.updateProjectionMatrix();
      }
      
      // Notify renderer that camera changed
      if (this.rendererRef) {
        this.rendererRef.mainCamera = cameraComp.camera;
      }
    }
  }

  /**
   * Switch back to perspective view
   */
  switchToPerspective(): void {
    if (!this.cameraEntity) {
      return;
    }

    const cameraComp = this.cameraEntity.getComponent(CameraComponent);
    const transform = this.cameraEntity.getComponent(TransformComponent);
    
    if (!cameraComp || !transform) {
      return;
    }

    // Switch back to perspective
    cameraComp.cameraType = 'perspective';

    // Recreate camera with correct aspect ratio
    if (this.canvas) {
      const aspect = this.canvas.width / this.canvas.height;
      cameraComp.createCamera(aspect);
    }

    // // Reset to default perspective position
    transform.position.set(0, 2, 5);
    transform.rotation.set(0, 0, 0);

    if (cameraComp.camera) {
      cameraComp.camera.position.copy(transform.position);
      cameraComp.camera.rotation.copy(transform.rotation);
      
     // Update projection matrix
      if (cameraComp.camera instanceof THREE.PerspectiveCamera) {
        cameraComp.camera.updateProjectionMatrix();
      }
      
      // Notify renderer that camera changed
      if (this.rendererRef) {
        this.rendererRef.mainCamera = cameraComp.camera;
      }
    }
  }

  /**
   * Set orthographic size
   */
  setOrthographicSize(size: number): void {
    this.orthographicSize = size;
  }

  onDestroy(): void {
    if (this.viewHelper) {
      this.scene.remove(this.viewHelper);
      this.viewHelper.dispose();
      this.viewHelper = null;
    }
  }
}
