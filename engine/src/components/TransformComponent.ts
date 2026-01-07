import { Component } from '../ecs/Component';
import * as THREE from 'three';

/**
 * Transform component handles position, rotation, and scale.
 */
export class TransformComponent extends Component {
  static readonly componentId = 'Transform';

  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;

  constructor(
    position: THREE.Vector3 = new THREE.Vector3(0, 0, 0),
    rotation: THREE.Euler = new THREE.Euler(0, 0, 0),
    scale: THREE.Vector3 = new THREE.Vector3(1, 1, 1)
  ) {
    super();
    this.position = position;
    this.rotation = rotation;
    this.scale = scale;
  }

  toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      position: this.position.toArray(),
      rotation: [this.rotation.x, this.rotation.y, this.rotation.z],
      scale: this.scale.toArray(),
    };
  }

  fromJSON(data: Record<string, any>): void {
    super.fromJSON(data);
    if (data.position) this.position.fromArray(data.position);
    if (data.rotation) this.rotation.set(data.rotation[0], data.rotation[1], data.rotation[2]);
    if (data.scale) this.scale.fromArray(data.scale);
  }
}

