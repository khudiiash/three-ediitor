import * as THREE from 'three';
import { Component } from '../core/Component';
import { Entity } from '../core/Entity';

/**
 * LightComponent adds a light to an entity
 * The light is added as a child of the entity's Object3D
 */
export class LightComponent extends Component {
    private light: THREE.Light | null = null;

    /**
     * Create a directional light
     */
    createDirectional(color: number = 0xffffff, intensity: number = 1): void {
        this.removeLight();
        this.light = new THREE.DirectionalLight(color, intensity);
        (this.entity as any)._object3D.add(this.light);
    }

    /**
     * Create a point light
     */
    createPoint(color: number = 0xffffff, intensity: number = 1, distance: number = 0, decay: number = 2): void {
        this.removeLight();
        this.light = new THREE.PointLight(color, intensity, distance, decay);
        (this.entity as any)._object3D.add(this.light);
    }

    /**
     * Create a spot light
     */
    createSpot(color: number = 0xffffff, intensity: number = 1, distance: number = 0, angle: number = Math.PI / 3, penumbra: number = 0, decay: number = 2): void {
        this.removeLight();
        this.light = new THREE.SpotLight(color, intensity, distance, angle, penumbra, decay);
        (this.entity as any)._object3D.add(this.light);
    }

    /**
     * Create an ambient light
     */
    createAmbient(color: number = 0xffffff, intensity: number = 1): void {
        this.removeLight();
        this.light = new THREE.AmbientLight(color, intensity);
        (this.entity as any)._object3D.add(this.light);
    }

    /**
     * Get the light
     */
    getLight(): THREE.Light | null {
        return this.light;
    }

    /**
     * Remove the light
     */
    removeLight(): void {
        if (this.light) {
            (this.entity as any)._object3D.remove(this.light);
            
            if ('shadow' in this.light && (this.light as any).shadow) {
                const shadow = (this.light as any).shadow;
                if (shadow.map) {
                    shadow.map.dispose();
                }
            }
            
            this.light = null;
        }
    }

    destroy(): void {
        this.removeLight();
    }
}
