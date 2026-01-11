import * as THREE from 'three';
import { Component } from '../core/Component';
import { ParticleSystem, BatchedRenderer } from 'three.quarks';
import { ParticleSystemFactory } from '../utils/ParticleSystemFactory';

export class ParticleComponent extends Component {
    private particleSystem: ParticleSystem | null = null;
    private batchedRenderer: BatchedRenderer | null = null;
    private static particleTexture: THREE.Texture | null = null;

    getParticleSystem(): ParticleSystem | null {
        return this.particleSystem;
    }

    initialize(): void {
        const app = this.entity.app;
        if (!app) return;

        if (!(app as any).particleRenderer) {
            (app as any).particleRenderer = new BatchedRenderer();
            app.scene.add((app as any).particleRenderer);
        }
        this.batchedRenderer = (app as any).particleRenderer;
        
        const object3D = (this.entity as any)._object3D;
        if (!object3D || !object3D.userData || !object3D.userData.isParticleSystem) {
            return;
        }

        const particleData = object3D.userData.particleSystem || {};
        
        if (!ParticleComponent.particleTexture) {
            ParticleComponent.particleTexture = ParticleSystemFactory.createParticleTexture();
        }
        
        this.particleSystem = ParticleSystemFactory.createParticleSystem(
            particleData, 
            ParticleComponent.particleTexture
        );
        
        this.particleSystem.emitter.name = this.entity.name || 'ParticleSystem';
        (this.particleSystem.emitter as any).__entity = null;
        this.particleSystem.emitter.userData.skipSerialization = true;

        if (this.batchedRenderer) {
            this.batchedRenderer.addSystem(this.particleSystem);
        }
        
        if (app && app.scene) {
            app.scene.add(this.particleSystem.emitter);
        }
    }

    update(): void {
        if (this.particleSystem && this.particleSystem.emitter) {
            const entityObj = (this.entity as any)._object3D;
            if (entityObj) {
                entityObj.getWorldPosition(this.particleSystem.emitter.position);
                entityObj.getWorldQuaternion(this.particleSystem.emitter.quaternion);
            }
        }
    }

    destroy(): void {
        if (this.particleSystem) {
            if (this.batchedRenderer && (this.batchedRenderer as any).removeSystem) {
                (this.batchedRenderer as any).removeSystem(this.particleSystem);
            }

            const emitter = this.particleSystem.emitter;
            if (emitter && emitter.parent) {
                emitter.parent.remove(emitter);
            }

            this.particleSystem = null;
        }
    }
}
