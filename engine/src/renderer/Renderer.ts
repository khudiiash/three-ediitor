import * as THREE from 'three';
import { World } from '../ecs/World';
import { Entity } from '../ecs/Entity';
import { CameraComponent } from '../components/CameraComponent';
import { TransformComponent } from '../components/TransformComponent';

/**
 * Renderer handles the Three.js rendering pipeline.
 */
export class Renderer {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  public mainCamera: THREE.Camera | null = null; // Public so AxisGizmoSystem can update it
  private world: World;

  constructor(canvas: HTMLCanvasElement, world: World) {
    this.world = world;
    this.scene = new THREE.Scene();
    
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.autoClear = false; // Disable auto clear for ViewHelper rendering
    
    // Add grid helper
    const gridHelper = new THREE.GridHelper(20, 20, 0x888888, 0x444444);
    this.scene.add(gridHelper);
  }

  /**
   * Set the size of the renderer.
   */
  setSize(width: number, height: number): void {
    this.renderer.setSize(width, height);
    
    // Update camera aspect ratio
    if (this.mainCamera) {
      if (this.mainCamera instanceof THREE.PerspectiveCamera) {
        this.mainCamera.aspect = width / height;
        this.mainCamera.updateProjectionMatrix();
      } else if (this.mainCamera instanceof THREE.OrthographicCamera) {
        const aspect = width / height;
        const halfHeight = this.mainCamera.top;
        const halfWidth = halfHeight * aspect;
        this.mainCamera.left = -halfWidth;
        this.mainCamera.right = halfWidth;
        this.mainCamera.updateProjectionMatrix();
      }
    }
  }

  /**
   * Get the Three.js scene.
   */
  getScene(): THREE.Scene {
    return this.scene;
  }

  /**
   * Get the WebGL renderer instance.
   */
  getWebGLRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  /**
   * Set the main camera from editor camera (temporary override)
   */
  setMainCameraFromEditor(camera: THREE.Camera): void {
    this.mainCamera = camera;
  }

  /**
   * Get the Three.js renderer.
   */
  getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  /**
   * Set the main camera from an entity.
   */
  setMainCamera(entity: Entity): void {
    const cameraComp = entity.getComponent(CameraComponent);
    if (!cameraComp) {
      console.warn('Entity does not have a CameraComponent');
      return;
    }

    if (!cameraComp.camera) {
      const canvas = this.renderer.domElement;
      const aspect = canvas.width / canvas.height;
      cameraComp.createCamera(aspect);
    }

    this.mainCamera = cameraComp.camera;
    
    // Update camera transform
    const transform = entity.getComponent(TransformComponent);
    if (transform && this.mainCamera) {
      this.mainCamera.position.copy(transform.position);
      this.mainCamera.rotation.copy(transform.rotation);
      
      // Update projection matrix if orthographic
      if (this.mainCamera instanceof THREE.OrthographicCamera) {
        this.mainCamera.updateProjectionMatrix();
      }
    }
  }

  /**
   * Find and set the main camera from the world.
   */
  findMainCamera(): void {
    const entities = this.world.getAllEntities();
    
    for (const entity of entities) {
      const cameraComp = entity.getComponent(CameraComponent);
      if (cameraComp && cameraComp.isMainCamera) {
        this.setMainCamera(entity);
        return;
      }
    }

    // If no main camera found, use the first camera
    for (const entity of entities) {
      const cameraComp = entity.getComponent(CameraComponent);
      if (cameraComp) {
        this.setMainCamera(entity);
        return;
      }
    }
  }

  /**
   * Render the scene.
   */
  render(): void {
    // Don't auto-find camera if it's already set (might be editor camera)
    // Only find if it's null
    if (!this.mainCamera) {
      this.findMainCamera();
    }

    if (this.mainCamera) {
      // Clear manually since autoClear is disabled for ViewHelper
      this.renderer.clear();
      this.renderer.render(this.scene, this.mainCamera);
    }
  }

  /**
   * Dispose of the renderer and clean up resources.
   */
  dispose(): void {
    this.renderer.dispose();
  }
}

