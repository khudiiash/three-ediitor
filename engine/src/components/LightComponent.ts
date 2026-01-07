import { Component } from '../ecs/Component';
import * as THREE from 'three';

/**
 * Light component for scene lighting.
 */
export class LightComponent extends Component {
  static readonly componentId = 'Light';

  light: THREE.Light | null = null;
  lightType: 'directional' | 'point' | 'spot' | 'ambient' = 'directional';
  
  color: number = 0xffffff;
  intensity: number = 1;
  
  // Point/Spot light params
  distance: number = 0;
  decay: number = 2;
  
  // Spot light params
  angle: number = Math.PI / 3;
  penumbra: number = 0;

  constructor() {
    super();
  }

  createLight(): THREE.Light {
    switch (this.lightType) {
      case 'directional':
        this.light = new THREE.DirectionalLight(this.color, this.intensity);
        break;
      case 'point':
        this.light = new THREE.PointLight(this.color, this.intensity, this.distance, this.decay);
        break;
      case 'spot':
        this.light = new THREE.SpotLight(
          this.color,
          this.intensity,
          this.distance,
          this.angle,
          this.penumbra,
          this.decay
        );
        break;
      case 'ambient':
        this.light = new THREE.AmbientLight(this.color, this.intensity);
        break;
      default:
        this.light = new THREE.DirectionalLight(this.color, this.intensity);
    }
    return this.light;
  }

  toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      lightType: this.lightType,
      color: this.color,
      intensity: this.intensity,
      distance: this.distance,
      decay: this.decay,
      angle: this.angle,
      penumbra: this.penumbra,
    };
  }

  fromJSON(data: Record<string, any>): void {
    super.fromJSON(data);
    if (data.lightType) this.lightType = data.lightType;
    if (data.color !== undefined) this.color = data.color;
    if (data.intensity !== undefined) this.intensity = data.intensity;
    if (data.distance !== undefined) this.distance = data.distance;
    if (data.decay !== undefined) this.decay = data.decay;
    if (data.angle !== undefined) this.angle = data.angle;
    if (data.penumbra !== undefined) this.penumbra = data.penumbra;
  }
}

