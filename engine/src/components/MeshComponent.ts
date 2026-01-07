import { Component } from '../ecs/Component';
import * as THREE from 'three';

/**
 * Mesh component for rendering 3D objects.
 */
export class MeshComponent extends Component {
  static readonly componentId = 'Mesh';

  mesh: THREE.Mesh | null = null;
  geometryType: string = 'box';
  materialType: string = 'standard';

  // Geometry parameters
  geometryParams: Record<string, any> = {
    width: 1,
    height: 1,
    depth: 1,
  };

  // Material parameters
  materialParams: Record<string, any> = {
    color: 0xffffff,
  };

  constructor() {
    super();
  }

  /**
   * Create the Three.js mesh based on parameters.
   */
  createMesh(): THREE.Mesh {
    let geometry: THREE.BufferGeometry;

    // Create geometry based on type
    switch (this.geometryType) {
      case 'box':
        geometry = new THREE.BoxGeometry(
          this.geometryParams.width || 1,
          this.geometryParams.height || 1,
          this.geometryParams.depth || 1
        );
        break;
      case 'sphere':
        geometry = new THREE.SphereGeometry(
          this.geometryParams.radius || 1,
          this.geometryParams.widthSegments || 32,
          this.geometryParams.heightSegments || 32
        );
        break;
      case 'plane':
        geometry = new THREE.PlaneGeometry(
          this.geometryParams.width || 1,
          this.geometryParams.height || 1
        );
        break;
      default:
        geometry = new THREE.BoxGeometry(1, 1, 1);
    }

    // Create material based on type
    let material: THREE.Material;
    switch (this.materialType) {
      case 'standard':
        material = new THREE.MeshStandardMaterial(this.materialParams);
        break;
      case 'basic':
        material = new THREE.MeshBasicMaterial(this.materialParams);
        break;
      case 'phong':
        material = new THREE.MeshPhongMaterial(this.materialParams);
        break;
      default:
        material = new THREE.MeshStandardMaterial(this.materialParams);
    }

    this.mesh = new THREE.Mesh(geometry, material);
    return this.mesh;
  }

  toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      geometryType: this.geometryType,
      geometryParams: this.geometryParams,
      materialType: this.materialType,
      materialParams: this.materialParams,
    };
  }

  fromJSON(data: Record<string, any>): void {
    super.fromJSON(data);
    if (data.geometryType) this.geometryType = data.geometryType;
    if (data.geometryParams) this.geometryParams = data.geometryParams;
    if (data.materialType) this.materialType = data.materialType;
    if (data.materialParams) this.materialParams = data.materialParams;
  }
}

