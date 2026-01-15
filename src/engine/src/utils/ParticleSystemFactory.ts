import * as THREE from 'three';
import { 
    ParticleSystem, 
    BatchedRenderer, 
    PointEmitter, 
    ConstantValue, 
    IntervalValue, 
    ConstantColor, 
    RenderMode,
    Gradient,
    ColorOverLife,
    ApplyForce,
    SphereEmitter,
    ConeEmitter,
    RectangleEmitter,
    EmitterMode
} from 'three.quarks';

/**
 * Shared factory for creating particle systems
 * Used by both the editor viewport and the runtime engine
 */
export class ParticleSystemFactory {
    
    /**
     * Create an emitter based on shape type and parameters
     */
    static createEmitter(shapeType: string, sizeX: number, sizeY: number, sizeZ: number, spreadAngle: number): any {
        const spreadRadians = (spreadAngle * Math.PI) / 180;
        
        switch (shapeType) {
            case 'box':
                return new RectangleEmitter({
                    width: sizeX,
                    height: sizeZ,
                    thickness: 1,
                    mode: EmitterMode.Random
                });
            case 'sphere':
                return new SphereEmitter({
                    radius: sizeX,
                    thickness: 1,
                    arc: Math.PI * 2,
                    mode: EmitterMode.Random
                });
            case 'cone':
                return new ConeEmitter({
                    radius: sizeX,
                    angle: Math.max(0.001, spreadRadians),
                    thickness: 1,
                    arc: Math.PI * 2,
                    mode: EmitterMode.Random
                });
            case 'point':
            default:
                return new PointEmitter();
        }
    }

    /**
     * Apply direction to emitter via rotation
     */
    static applyDirectionToEmitter(emitter: any, directionX: number, directionY: number, directionZ: number): void {
        const directionVec = new THREE.Vector3(directionX, directionY, directionZ);
        if (directionVec.lengthSq() > 0.0001) {
            directionVec.normalize();
            const defaultDirection = new THREE.Vector3(0, 1, 0);
            const quaternion = new THREE.Quaternion();
            quaternion.setFromUnitVectors(defaultDirection, directionVec);
            emitter.quaternion.copy(quaternion);
        }
    }

    /**
     * Create behaviors array from particle data
     */
    static createBehaviors(particleData: any): any[] {
        const behaviors: any[] = [];

        
        if (particleData.behaviors && Array.isArray(particleData.behaviors)) {
            particleData.behaviors.forEach((behaviorData: any) => {
                if (behaviorData.enabled === false) return;

                try {
                    const behavior = this.createBehavior(behaviorData, particleData);
                    if (behavior) {
                        behaviors.push(behavior);
                    }
                } catch (e) {
                    console.warn(`Failed to create behavior ${behaviorData.type}:`, e);
                }
            });
        }

        
        this.addLegacyBehaviors(behaviors, particleData);

        return behaviors;
    }

    /**
     * Create a single behavior from behavior data
     * Note: Only supports Gravity/ApplyForce and ColorOverLife for now
     * Other behaviors require complex value generators that need proper implementation
     */
    static createBehavior(behaviorData: any, particleData: any): any {
        switch (behaviorData.type) {
            case 'Gravity':
            case 'ApplyForce': {
                
                const x = behaviorData.gravityX !== undefined ? behaviorData.gravityX : (behaviorData.forceX !== undefined ? behaviorData.forceX : 0);
                const y = behaviorData.gravityY !== undefined ? behaviorData.gravityY : (behaviorData.forceY !== undefined ? behaviorData.forceY : -9.81);
                const z = behaviorData.gravityZ !== undefined ? behaviorData.gravityZ : (behaviorData.forceZ !== undefined ? behaviorData.forceZ : 0);
                
                const magnitude = Math.sqrt(x * x + y * y + z * z);
                if (magnitude > 0) {
                    
                    const dirX = x / magnitude;
                    const dirY = y / magnitude;
                    const dirZ = z / magnitude;
                    
                    
                    const direction = { x: dirX, y: dirY, z: dirZ } as any;
                    return new ApplyForce(direction, new ConstantValue(magnitude));
                }
                break;
            }

            case 'ColorOverLife': {
                const startColorR = behaviorData.startColorR !== undefined ? behaviorData.startColorR : (particleData.startColorR || 1);
                const startColorG = behaviorData.startColorG !== undefined ? behaviorData.startColorG : (particleData.startColorG || 1);
                const startColorB = behaviorData.startColorB !== undefined ? behaviorData.startColorB : (particleData.startColorB || 1);
                const startColorA = behaviorData.startColorA !== undefined ? behaviorData.startColorA : (particleData.startColorA || 1);
                
                const endColorR = behaviorData.endColorR !== undefined ? behaviorData.endColorR : (particleData.endColorR || 1);
                const endColorG = behaviorData.endColorG !== undefined ? behaviorData.endColorG : (particleData.endColorG || 1);
                const endColorB = behaviorData.endColorB !== undefined ? behaviorData.endColorB : (particleData.endColorB || 1);
                const endColorA = behaviorData.endColorA !== undefined ? behaviorData.endColorA : (particleData.endColorA || 1);

                
                const colorGradient = new Gradient(
                    [
                        [{ x: startColorR, y: startColorG, z: startColorB } as any, 0],
                        [{ x: endColorR, y: endColorG, z: endColorB } as any, 1]
                    ],
                    [
                        [startColorA, 0],
                        [endColorA, 1]
                    ]
                );
                return new ColorOverLife(colorGradient);
            }

            default:
                console.warn(`Behavior type "${behaviorData.type}" is not yet supported`);
                return null;
        }
    }

    /**
     * Add legacy behaviors for backward compatibility
     */
    static addLegacyBehaviors(behaviors: any[], particleData: any): void {
        
        const hasGravityBehavior = particleData.behaviors?.some((b: any) => 
            (b.type === 'Gravity' || b.type === 'ApplyForce') && b.enabled !== false
        );
        if (!hasGravityBehavior && (
            particleData.gravityX !== undefined || 
            particleData.gravityY !== undefined || 
            particleData.gravityZ !== undefined
        )) {
            const x = particleData.gravityX !== undefined ? particleData.gravityX : 0;
            const y = particleData.gravityY !== undefined ? particleData.gravityY : -9.81;
            const z = particleData.gravityZ !== undefined ? particleData.gravityZ : 0;
            
            const magnitude = Math.sqrt(x * x + y * y + z * z);
            if (magnitude > 0) {
                const dirX = x / magnitude;
                const dirY = y / magnitude;
                const dirZ = z / magnitude;
                const direction = { x: dirX, y: dirY, z: dirZ } as any;
                behaviors.push(new ApplyForce(direction, new ConstantValue(magnitude)));
            }
        }

        
        const hasColorBehavior = particleData.behaviors?.some((b: any) => 
            b.type === 'ColorOverLife' && b.enabled !== false
        );
        if (!hasColorBehavior && (
            particleData.endColorR !== undefined || 
            particleData.endColorG !== undefined || 
            particleData.endColorB !== undefined
        )) {
            const startColorR = particleData.startColorR !== undefined ? particleData.startColorR : 1;
            const startColorG = particleData.startColorG !== undefined ? particleData.startColorG : 1;
            const startColorB = particleData.startColorB !== undefined ? particleData.startColorB : 1;
            const startColorA = particleData.startColorA !== undefined ? particleData.startColorA : 1;
            
            const endColorR = particleData.endColorR !== undefined ? particleData.endColorR : 1;
            const endColorG = particleData.endColorG !== undefined ? particleData.endColorG : 1;
            const endColorB = particleData.endColorB !== undefined ? particleData.endColorB : 1;
            const endColorA = particleData.endColorA !== undefined ? particleData.endColorA : 1;

            const colorGradient = new Gradient(
                [
                    [{ x: startColorR, y: startColorG, z: startColorB } as any, 0],
                    [{ x: endColorR, y: endColorG, z: endColorB } as any, 1]
                ],
                [
                    [startColorA, 0],
                    [endColorA, 1]
                ]
            );
            behaviors.push(new ColorOverLife(colorGradient));
        }
    }

    /**
     * Create a particle texture
     */
    static createParticleTexture(): THREE.Texture {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const context = canvas.getContext('2d')!;
        
        const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.8)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        context.fillStyle = gradient;
        context.fillRect(0, 0, 64, 64);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        
        return texture;
    }

    /**
     * Create a complete particle system from particle data
     */
    static createParticleSystem(particleData: any, texture: THREE.Texture): ParticleSystem {
        
        const emitterShape = this.createEmitter(
            particleData.emitterShape || 'point',
            particleData.emitterSizeX !== undefined ? particleData.emitterSizeX : 1,
            particleData.emitterSizeY !== undefined ? particleData.emitterSizeY : 1,
            particleData.emitterSizeZ !== undefined ? particleData.emitterSizeZ : 1,
            particleData.spreadAngle !== undefined ? particleData.spreadAngle : 0
        );

        
        const behaviors = this.createBehaviors(particleData);

        
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            color: particleData.materialColor !== undefined ? particleData.materialColor : 0xffffff,
            blending: THREE.AdditiveBlending,
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false
        });

        
        const config = {
            duration: particleData.duration !== undefined ? particleData.duration : 1,
            looping: particleData.looping !== undefined ? particleData.looping : true,
            prewarm: particleData.prewarm !== undefined ? particleData.prewarm : false,
            autoDestroy: particleData.autoDestroy !== undefined ? particleData.autoDestroy : false,
            maxParticle: particleData.maxParticle !== undefined ? particleData.maxParticle : 1000,
            emissionOverTime: particleData.emissionRate !== undefined ? 
                new ConstantValue(particleData.emissionRate) : 
                new ConstantValue(10),
            emissionOverDistance: particleData.emissionOverDistance !== undefined ? 
                new ConstantValue(particleData.emissionOverDistance) : 
                new ConstantValue(0),
            startLife: particleData.startLifeMin !== undefined && particleData.startLifeMax !== undefined ?
                new IntervalValue(particleData.startLifeMin, particleData.startLifeMax) :
                new ConstantValue(1),
            startSpeed: particleData.startSpeedMin !== undefined && particleData.startSpeedMax !== undefined ?
                new IntervalValue(particleData.startSpeedMin, particleData.startSpeedMax) :
                new ConstantValue(1),
            startRotation: particleData.startRotationMin !== undefined && particleData.startRotationMax !== undefined ?
                new IntervalValue(
                    particleData.startRotationMin * Math.PI / 180,
                    particleData.startRotationMax * Math.PI / 180
                ) :
                new ConstantValue(0),
            startSize: particleData.startSizeMin !== undefined && particleData.startSizeMax !== undefined ?
                new IntervalValue(particleData.startSizeMin, particleData.startSizeMax) :
                new ConstantValue(0.2),
            startColor: new ConstantColor(
                {
                    x: particleData.startColorR !== undefined ? particleData.startColorR : 1,
                    y: particleData.startColorG !== undefined ? particleData.startColorG : 1,
                    z: particleData.startColorB !== undefined ? particleData.startColorB : 1,
                    w: particleData.startColorA !== undefined ? particleData.startColorA : 1
                } as any
            ),
            worldSpace: particleData.worldSpace !== undefined ? particleData.worldSpace : true,
            renderMode: particleData.renderMode !== undefined ? particleData.renderMode : RenderMode.BillBoard,
            uTileCount: particleData.uTileCount !== undefined ? particleData.uTileCount : 1,
            vTileCount: particleData.vTileCount !== undefined ? particleData.vTileCount : 1,
            startTileIndex: particleData.startTileIndex !== undefined ? 
                new ConstantValue(particleData.startTileIndex) : 
                new ConstantValue(0),
            shape: emitterShape,
            behaviors: behaviors,
            material: material,
            emissionBursts: []
        };

        const particleSystem = new ParticleSystem(config);

        
        this.applyDirectionToEmitter(
            particleSystem.emitter,
            particleData.directionX !== undefined ? particleData.directionX : 0,
            particleData.directionY !== undefined ? particleData.directionY : 1,
            particleData.directionZ !== undefined ? particleData.directionZ : 0
        );

        return particleSystem;
    }
}
