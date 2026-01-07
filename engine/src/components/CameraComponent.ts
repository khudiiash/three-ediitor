import { Component } from '../ecs/Component';
import * as THREE from 'three';

/**
 * Camera component for rendering the scene.
 */
export class CameraComponent extends Component {
  static readonly componentId = 'Camera';

  camera: THREE.PerspectiveCamera | THREE.OrthographicCamera | null = null;
  cameraType: 'perspective' | 'orthographic' = 'perspective';
  
  // Perspective camera params
  fov: number = 75;
  near: number = 0.1;
  far: number = 1000;
  
  // Orthographic camera params
  left: number = -10;
  right: number = 10;
  top: number = 10;
  bottom: number = -10;

  isMainCamera: boolean = false;

  constructor() {
    super();
  }

  createCamera(aspect: number): THREE.Camera {
    if (this.cameraType === 'perspective') {
      this.camera = new THREE.PerspectiveCamera(this.fov, aspect, this.near, this.far);
    } else {
      this.camera = new THREE.OrthographicCamera(
        this.left,
        this.right,
        this.top,
        this.bottom,
        this.near,
        this.far
      );
    }
    return this.camera;
  }

  toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      cameraType: this.cameraType,
      fov: this.fov,
      near: this.near,
      far: this.far,
      isMainCamera: this.isMainCamera,
    };
  }

  fromJSON(data: Record<string, any>): void {
    super.fromJSON(data);
    if (data.cameraType) this.cameraType = data.cameraType;
    if (data.fov !== undefined) this.fov = data.fov;
    if (data.near !== undefined) this.near = data.near;
    if (data.far !== undefined) this.far = data.far;
    if (data.isMainCamera !== undefined) this.isMainCamera = data.isMainCamera;
  }
}

