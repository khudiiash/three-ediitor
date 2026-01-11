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
    SizeOverLife,
    ColorOverLife,
    ApplyForce,
    GravityForce,
    SphereEmitter,
    ConeEmitter,
    RectangleEmitter,
    EmitterMode,
    SpeedOverLife,
    OrbitOverLife,
    LimitSpeedOverLife,
    TurbulenceField,
    Noise,
    ForceOverLife,
    RotationOverLife,
    Rotation3DOverLife,
    RotationBySpeed,
    FrameOverLife,
    WidthOverLength
} from 'three.quarks';

/**
 * Shared factory for creating particle systems
 * Used by both the editor viewport and the runtime engine
 */
export class ParticleSystemFactory {
    
    /**
     * Create an emitter based on shape type and parameters
     */
    static createEmitter(shapeType, sizeX, sizeY, sizeZ, spreadAngle) {
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
    static applyDirectionToEmitter(emitter, directionX, directionY, directionZ) {
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
    static createBehaviors(particleData) {
        const behaviors = [];

        // Process behaviors from the behaviors array
        if (particleData.behaviors && Array.isArray(particleData.behaviors)) {
            particleData.behaviors.forEach((behaviorData) => {
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

        // Fallback: Add legacy behaviors if not in behaviors array
        this.addLegacyBehaviors(behaviors, particleData);

        return behaviors;
    }

    /**
     * Create a single behavior from behavior data
     */
    static createBehavior(behaviorData, particleData) {
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
                    const direction = { x: dirX, y: dirY, z: dirZ };
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
                        [{ x: startColorR, y: startColorG, z: startColorB }, 0],
                        [{ x: endColorR, y: endColorG, z: endColorB }, 1]
                    ],
                    [
                        [startColorA, 0],
                        [endColorA, 1]
                    ]
                );
                return new ColorOverLife(colorGradient);
            }

            case 'SizeOverLife': {
                const startSize = new IntervalValue(
                    behaviorData.startSizeMin !== undefined ? behaviorData.startSizeMin : (particleData.startSizeMin !== undefined ? particleData.startSizeMin : 0.1),
                    behaviorData.startSizeMax !== undefined ? behaviorData.startSizeMax : (particleData.startSizeMax !== undefined ? particleData.startSizeMax : 0.3)
                );
                const endSize = new IntervalValue(
                    behaviorData.endSizeMin !== undefined ? behaviorData.endSizeMin : (particleData.endSizeMin !== undefined ? particleData.endSizeMin : 0.1),
                    behaviorData.endSizeMax !== undefined ? behaviorData.endSizeMax : (particleData.endSizeMax !== undefined ? particleData.endSizeMax : 0.3)
                );
                return new SizeOverLife(startSize, endSize);
            }

            case 'SpeedOverLife': {
                const speed = new ConstantValue(behaviorData.speed !== undefined ? behaviorData.speed : 1);
                return new SpeedOverLife(speed);
            }

            case 'LimitSpeedOverLife': {
                const maxSpeed = new ConstantValue(behaviorData.maxSpeed !== undefined ? behaviorData.maxSpeed : 10);
                return new LimitSpeedOverLife(maxSpeed);
            }

            case 'OrbitOverLife': {
                const axis = new THREE.Vector3(
                    behaviorData.axisX !== undefined ? behaviorData.axisX : 0,
                    behaviorData.axisY !== undefined ? behaviorData.axisY : 1,
                    behaviorData.axisZ !== undefined ? behaviorData.axisZ : 0
                );
                const orbitSpeed = new ConstantValue(behaviorData.orbitSpeed !== undefined ? behaviorData.orbitSpeed : 1);
                return new OrbitOverLife(axis, orbitSpeed);
            }

            case 'TurbulenceField': {
                const scale = new ConstantValue(behaviorData.scale !== undefined ? behaviorData.scale : 1);
                const octaves = behaviorData.octaves !== undefined ? behaviorData.octaves : 3;
                const velocityMultiplier = new THREE.Vector3(
                    behaviorData.velocityMultiplierX !== undefined ? behaviorData.velocityMultiplierX : 1,
                    behaviorData.velocityMultiplierY !== undefined ? behaviorData.velocityMultiplierY : 1,
                    behaviorData.velocityMultiplierZ !== undefined ? behaviorData.velocityMultiplierZ : 1
                );
                const timeScale = new THREE.Vector3(
                    behaviorData.timeScaleX !== undefined ? behaviorData.timeScaleX : 1,
                    behaviorData.timeScaleY !== undefined ? behaviorData.timeScaleY : 1,
                    behaviorData.timeScaleZ !== undefined ? behaviorData.timeScaleZ : 1
                );
                return new TurbulenceField(scale, octaves, velocityMultiplier, timeScale);
            }

            case 'Noise': {
                const frequency = new ConstantValue(behaviorData.frequency !== undefined ? behaviorData.frequency : 1);
                const power = new ConstantValue(behaviorData.power !== undefined ? behaviorData.power : 1);
                return new Noise(frequency, power);
            }

            case 'ForceOverLife': {
                const force = new THREE.Vector3(
                    behaviorData.forceX !== undefined ? behaviorData.forceX : 0,
                    behaviorData.forceY !== undefined ? behaviorData.forceY : 0,
                    behaviorData.forceZ !== undefined ? behaviorData.forceZ : 0
                );
                return new ForceOverLife(new ConstantValue(force));
            }

            case 'RotationOverLife': {
                const angularVelocity = new ConstantValue(
                    behaviorData.angularVelocity !== undefined ? behaviorData.angularVelocity : 0
                );
                return new RotationOverLife(angularVelocity);
            }

            case 'Rotation3DOverLife': {
                const angularVelocity = new THREE.Vector3(
                    behaviorData.angularVelocityX !== undefined ? behaviorData.angularVelocityX : 0,
                    behaviorData.angularVelocityY !== undefined ? behaviorData.angularVelocityY : 0,
                    behaviorData.angularVelocityZ !== undefined ? behaviorData.angularVelocityZ : 0
                );
                return new Rotation3DOverLife(new ConstantValue(angularVelocity));
            }

            case 'RotationBySpeed': {
                const scale = behaviorData.scale !== undefined ? behaviorData.scale : 1;
                return new RotationBySpeed(scale);
            }

            case 'FrameOverLife': {
                const frame = new IntervalValue(
                    behaviorData.startFrame !== undefined ? behaviorData.startFrame : 0,
                    behaviorData.endFrame !== undefined ? behaviorData.endFrame : 1
                );
                return new FrameOverLife(frame);
            }

            case 'WidthOverLength': {
                const width = new ConstantValue(behaviorData.width !== undefined ? behaviorData.width : 1);
                return new WidthOverLength(width);
            }

            default:
                console.warn(`Unknown behavior type: ${behaviorData.type}`);
                return null;
        }
    }

    /**
     * Add legacy behaviors for backward compatibility
     */
    static addLegacyBehaviors(behaviors, particleData) {
        // Legacy Gravity/ApplyForce
        const hasGravityBehavior = particleData.behaviors?.some(b => 
            (b.type === 'Gravity' || b.type === 'ApplyForce') && b.enabled !== false
        );
        if (!hasGravityBehavior && (
            particleData.gravityX !== undefined || 
            particleData.gravityY !== undefined || 
            particleData.gravityZ !== undefined
        )) {
            const gravityDir = new THREE.Vector3(
                particleData.gravityX !== undefined ? particleData.gravityX : 0,
                particleData.gravityY !== undefined ? particleData.gravityY : -9.81,
                particleData.gravityZ !== undefined ? particleData.gravityZ : 0
            );
            const gravityMagnitude = gravityDir.length();
            if (gravityMagnitude > 0) {
                gravityDir.normalize();
                behaviors.push(new ApplyForce(gravityDir, new ConstantValue(gravityMagnitude)));
            }
        }

        // Legacy ColorOverLife
        const hasColorBehavior = particleData.behaviors?.some(b => 
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
                    [new THREE.Vector3(startColorR, startColorG, startColorB), 0],
                    [new THREE.Vector3(endColorR, endColorG, endColorB), 1]
                ],
                [
                    [startColorA, 0],
                    [endColorA, 1]
                ]
            );
            behaviors.push(new ColorOverLife(colorGradient));
        }

        // Legacy SizeOverLife
        const hasSizeBehavior = particleData.behaviors?.some(b => 
            b.type === 'SizeOverLife' && b.enabled !== false
        );
        if (!hasSizeBehavior && (
            particleData.endSizeMin !== undefined || 
            particleData.endSizeMax !== undefined
        )) {
            const startSize = new IntervalValue(
                particleData.startSizeMin !== undefined ? particleData.startSizeMin : 0.1,
                particleData.startSizeMax !== undefined ? particleData.startSizeMax : 0.3
            );
            const endSize = new IntervalValue(
                particleData.endSizeMin !== undefined ? particleData.endSizeMin : 0.1,
                particleData.endSizeMax !== undefined ? particleData.endSizeMax : 0.3
            );
            behaviors.push(new SizeOverLife(startSize, endSize));
        }
    }

    /**
     * Create a particle texture
     */
    static createParticleTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const context = canvas.getContext('2d');
        
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
    static createParticleSystem(particleData, texture) {
        // Create emitter
        const emitterShape = this.createEmitter(
            particleData.emitterShape || 'point',
            particleData.emitterSizeX !== undefined ? particleData.emitterSizeX : 1,
            particleData.emitterSizeY !== undefined ? particleData.emitterSizeY : 1,
            particleData.emitterSizeZ !== undefined ? particleData.emitterSizeZ : 1,
            particleData.spreadAngle !== undefined ? particleData.spreadAngle : 0
        );

        // Create behaviors
        const behaviors = this.createBehaviors(particleData);

        // Create material
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            color: particleData.materialColor !== undefined ? particleData.materialColor : 0xffffff,
            blending: THREE.AdditiveBlending,
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false
        });

        // Create particle system config
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
                }
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

        // Apply direction to emitter
        this.applyDirectionToEmitter(
            particleSystem.emitter,
            particleData.directionX !== undefined ? particleData.directionX : 0,
            particleData.directionY !== undefined ? particleData.directionY : 1,
            particleData.directionZ !== undefined ? particleData.directionZ : 0
        );

        return particleSystem;
    }
}
