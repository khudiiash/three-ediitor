import * as THREE from 'three';
import { SpriteNodeMaterial } from 'three/webgpu';
import { range, texture, mix, uv, color, positionLocal, time, uniform } from 'three/tsl';

export interface ParticleSystemConfig {
    maxParticles?: number;
    emissionRate?: number;
    lifetime?: number;
    startSize?: number;
    endSize?: number;
    startColor?: THREE.Color;
    endColor?: THREE.Color;
    velocity?: THREE.Vector3;
    gravity?: THREE.Vector3;
    spread?: number;
}

/**
 * Particle System using SpriteNodeMaterial with TSL nodes
 * Based on Three.js webgpu_particles example
 */
export class ParticleSystem {
    private config: Required<ParticleSystemConfig>;
    public emitter: THREE.Object3D;
    private particles: THREE.Mesh | null = null;
    private isDisposed: boolean = false;

    constructor(config: ParticleSystemConfig = {}) {
        this.config = {
            maxParticles: config.maxParticles || 1000,
            emissionRate: config.emissionRate || 50,
            lifetime: config.lifetime || 2,
            startSize: config.startSize || 0.1,
            endSize: config.endSize || 0.05,
            startColor: config.startColor || new THREE.Color(0xffffff),
            endColor: config.endColor || new THREE.Color(0x888888),
            velocity: config.velocity || new THREE.Vector3(0, 1, 0),
            gravity: config.gravity || new THREE.Vector3(0, -9.8, 0),
            spread: config.spread !== undefined ? config.spread : 0.5
        };

        this.emitter = new THREE.Object3D();
        this.emitter.name = 'ParticleEmitter';
        
        console.log('[ParticleSystem] Created with config:', this.config);
    }

    async initializeWithRenderer(renderer: any): Promise<void> {
        if (this.isDisposed) {
            console.warn('[ParticleSystem] Cannot initialize - system is disposed');
            return;
        }

        console.log('[ParticleSystem] Initializing with TSL nodes');

        try {
            const geometry = new THREE.PlaneGeometry(1, 1);
            
            const lifeRange = range(0.1, 1);
            const speed = uniform(1.0 / this.config.lifetime);
            const scaledTime = time.mul(speed);
            
            const lifeTime = scaledTime.mul(lifeRange).mod(1);
            const life = lifeTime.div(lifeRange);
            
            const velocityVec = new THREE.Vector3().copy(this.config.velocity);
            const gravityVec = new THREE.Vector3().copy(this.config.gravity);
            
            const spreadOffset = range(
                new THREE.Vector3(-this.config.spread, -this.config.spread, -this.config.spread),
                new THREE.Vector3(this.config.spread, this.config.spread, this.config.spread)
            );
            
            const velocityOffset = uniform(velocityVec).mul(lifeTime);
            const gravityOffset = uniform(gravityVec).mul(lifeTime).mul(lifeTime).mul(0.5);
            const positionNode = velocityOffset.add(gravityOffset).add(spreadOffset);
            
            const scaleNode = uniform(this.config.startSize).mul(
                life.oneMinus()
            ).add(
                uniform(this.config.endSize).mul(life)
            );
            
            const startColorNode = uniform(this.config.startColor);
            const endColorNode = uniform(this.config.endColor);
            const colorNode = mix(startColorNode, endColorNode, life);
            
            const opacityNode = life.oneMinus();
            
            const material = new SpriteNodeMaterial();
            material.colorNode = colorNode;
            material.opacityNode = opacityNode;
            material.positionNode = positionNode;
            material.scaleNode = scaleNode;
            material.transparent = true;
            material.depthWrite = false;
            material.blending = THREE.AdditiveBlending;
            
            this.particles = new THREE.Mesh(geometry, material);
            (this.particles as any).count = this.config.maxParticles;
            this.particles.frustumCulled = false;
            
            this.particles.position.copy(this.emitter.position);
            this.particles.quaternion.copy(this.emitter.quaternion);
            
            console.log('[ParticleSystem] Initialized successfully with', this.config.maxParticles, 'particles');
            
        } catch (error) {
            console.error('[ParticleSystem] Initialization failed:', error);
            throw error;
        }
    }

    update(deltaTime: number): void {
        if (this.particles && this.emitter) {
            this.particles.position.copy(this.emitter.position);
            this.particles.quaternion.copy(this.emitter.quaternion);
        }
    }

    getPointsObject(): THREE.Mesh | null {
        return this.particles;
    }

    dispose(): void {
        if (this.isDisposed) return;
        
        console.log('[ParticleSystem] Disposing...');
        
        if (this.particles) {
            if (this.particles.geometry) {
                this.particles.geometry.dispose();
            }
            if (this.particles.material) {
                (this.particles.material as THREE.Material).dispose();
            }
            this.particles = null;
        }
        
        this.isDisposed = true;
        console.log('[ParticleSystem] Disposed');
    }
}
