import * as THREE from 'three';
import { Component } from '../core/Component';
import { ParticleSystem, ParticleSystemConfig } from '../utils/ParticleSystem';

export class ParticleComponent extends Component {
    private particleSystem: ParticleSystem | null = null;

    getParticleSystem(): ParticleSystem | null {
        return this.particleSystem;
    }

    async initialize(): Promise<void> {
        const app = this.entity.app;
        if (!app) return;

        const object3D = (this.entity as any)._object3D;
        if (!object3D || !object3D.userData || !object3D.userData.isParticleSystem) {
            console.warn('[ParticleComponent] Not a particle system object');
            return;
        }

        console.log('[ParticleComponent] Initializing particle system for entity:', this.entity.name);

        const particleData = object3D.userData.particleSystem || {};
        
        // Convert particle data to config
        const config: ParticleSystemConfig = {
            maxParticles: particleData.maxParticles || 1000,
            emissionRate: particleData.emissionRate || 50,
            lifetime: particleData.lifetime || 2,
            startSize: particleData.startSize || 0.1,
            endSize: particleData.endSize || 0.05,
            startColor: particleData.startColor ? new THREE.Color(particleData.startColor) : new THREE.Color(0xffffff),
            endColor: particleData.endColor ? new THREE.Color(particleData.endColor) : new THREE.Color(0x888888),
            velocity: particleData.velocity ? new THREE.Vector3().fromArray(particleData.velocity) : new THREE.Vector3(0, 1, 0),
            gravity: particleData.gravity ? new THREE.Vector3().fromArray(particleData.gravity) : new THREE.Vector3(0, -9.8, 0),
            spread: particleData.spread !== undefined ? particleData.spread : 0.5
        };
        
        console.log('[ParticleComponent] Config:', config);
        
        this.particleSystem = new ParticleSystem(config);
        
        // Initialize with renderer if available
        if (app.engine && app.engine.renderer) {
            console.log('[ParticleComponent] Calling initializeWithRenderer...');
            await this.particleSystem.initializeWithRenderer(app.engine.renderer);
        } else {
            console.warn('[ParticleComponent] No renderer available!');
        }
        
        // DON'T add emitter to entity - we'll update position manually in update()
        // This avoids ANY bounding box issues
        this.particleSystem.emitter.name = 'ParticleEmitterTracker';
        
        // Add particles directly to scene root
        const particles = this.particleSystem.getPointsObject();
        if (particles && app.scene) {
            particles.name = `${this.entity.name || 'Particle'}_Particles`;
            particles.userData.skipSerialization = true;
            particles.userData.particleSystemEntity = object3D.uuid;
            particles.visible = true;
            app.scene.add(particles);
            console.log('[ParticleComponent] Particles added to scene:', particles.name, 'count:', particles.count, 'visible:', particles.visible);
            console.log('[ParticleComponent] Particles position:', particles.position);
            console.log('[ParticleComponent] Scene children count:', app.scene.children.length);
        } else {
            console.error('[ParticleComponent] Failed to add particles - particles:', particles, 'scene:', app.scene);
        }
    }

    update(delta: number): void {
        if (this.particleSystem) {
            // Update emitter position from entity's world position
            const object3D = (this.entity as any)._object3D;
            if (object3D) {
                object3D.getWorldPosition(this.particleSystem.emitter.position);
                object3D.getWorldQuaternion(this.particleSystem.emitter.quaternion);
            }
            this.particleSystem.update(delta);
        }
    }

    destroy(): void {
        if (this.particleSystem) {
            const app = this.entity.app;
            const particles = this.particleSystem.getPointsObject();
            
            // Remove particles from scene
            if (particles && particles.parent) {
                particles.parent.remove(particles);
            }
            
            // Emitter is not added to scene, no need to remove

            this.particleSystem.dispose();
            this.particleSystem = null;
        }
    }
}
