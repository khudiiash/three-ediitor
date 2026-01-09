import * as THREE from 'three';
import { Component } from '../core/Component';
import { Entity } from '../core/Entity';
import { App } from '../core/App';

/**
 * CameraComponent adds a camera to an entity
 * The camera is added as a child of the entity's Object3D
 */
export class CameraComponent extends Component {
    private camera: THREE.Camera | null = null;
    private app: App | null = null;

    initialize(): void {
    }

    /**
     * Create a perspective camera
     */
    createPerspective(fov: number = 75, aspect: number = 1, near: number = 0.1, far: number = 1000): void {
        this.removeCamera();
        
        this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
        (this.entity as any)._object3D.add(this.camera);
    }

    /**
     * Create an orthographic camera
     */
    createOrthographic(left: number, right: number, top: number, bottom: number, near: number = 0.1, far: number = 1000): void {
        this.removeCamera();
        
        this.camera = new THREE.OrthographicCamera(left, right, top, bottom, near, far);
        (this.entity as any)._object3D.add(this.camera);
    }

    /**
     * Get the camera
     */
    getCamera(): THREE.Camera | null {
        return this.camera;
    }

    /**
     * Set this camera as the main camera for the app
     * Note: This requires access to the app, which we'll get from the entity's scene
     */
    setAsMainCamera(): void {
        if (!this.camera) return;
        
        let current: THREE.Object3D | null = (this.entity as any)._object3D;
        while (current && !(current instanceof THREE.Scene)) {
            current = current.parent;
        }
        
        if (current instanceof THREE.Scene) {
            const app = (current as any).__app as App | undefined;
            if (app) {
                app.setCamera(this.camera);
            }
        }
    }

    /**
     * Remove the camera
     */
    removeCamera(): void {
        if (this.camera) {
            (this.entity as any)._object3D.remove(this.camera);
            
            let current: THREE.Object3D | null = (this.entity as any)._object3D;
            while (current && !(current instanceof THREE.Scene)) {
                current = current.parent;
            }
            
            if (current instanceof THREE.Scene) {
                const app = (current as any).__app as App | undefined;
                if (app && app.getCamera() === this.camera) {
                    app.setCamera(null as any);
                }
            }
            
            this.camera = null;
        }
    }

    destroy(): void {
        this.removeCamera();
    }
}
