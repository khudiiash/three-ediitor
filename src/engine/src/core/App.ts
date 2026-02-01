import * as THREE from 'three';
import { SuperEvents } from '@khudiiash/super-events';
import { Engine } from './Engine';
import { Entity } from './Entity';
import { AssetRegistry } from './AssetRegistry';
import type { ScriptAttribute } from './Script';
import { ScriptAsset } from '../assets/ScriptAsset';
import { ParticleComponent } from '../components/ParticleComponent';
import type { WebGPURenderer } from 'three/webgpu';

export class App {
    public engine: Engine;
    public assets: AssetRegistry;
    
    public camera!: THREE.Camera;
    public scene: THREE.Scene;
    private events: SuperEvents | null = null;
    
    public time: { delta: number; elapsed: number } = { delta: 0, elapsed: 0 };
    private startTime: number = 0;

    constructor(engine: Engine) {
        this.engine = engine;
        this.assets = new AssetRegistry();
        
        this.scene = new THREE.Scene();
        this.events = SuperEvents.getInstance();
        
        let clearColor = 0xaaaaaa;
        if (typeof window !== 'undefined' && window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            clearColor = mediaQuery.matches ? 0x333333 : 0xaaaaaa;
        }
        this.scene.background = new THREE.Color(clearColor);
        
        this.startTime = performance.now() / 1000;
    }

    get renderer(): WebGPURenderer | null {
        return this.engine.renderer;
    }

    createEntity(object3D?: THREE.Object3D, parent?: Entity): Entity {
        const entity = new Entity(object3D);

        if (parent) {
            parent.add((entity as any)._object3D);
        } else {
            this.scene.add((entity as any)._object3D);
        }

        return entity;
    }

    findByName(name: string): Entity | null {
        const object3D = this.scene.getObjectByName(name);
        if (object3D) {
            return Entity.fromObject3D(object3D);
        }
        return null;
    }

    getEntities(): Entity[] {
        const entities: Entity[] = [];
        this.scene.traverse((object3D) => {
            const entity = (object3D as any).__entity as Entity | undefined;
            if (entity) {
                entities.push(entity);
            }
        });
        return entities;
    }

    removeEntity(entity: Entity): void {
        this.events?.emit('entity:destroyed', entity);

        const particleComponent = entity.getComponent(ParticleComponent);
        if (particleComponent) {
            particleComponent.destroy();
        }

        if ((entity as any)._object3D.parent) {
            (entity as any)._object3D.parent.remove((entity as any)._object3D);
        }

        entity.dispose();
        
        if ((this as any).particleRenderer) {
            const batchedRenderer = (this as any).particleRenderer;
            if (batchedRenderer && (batchedRenderer as any).systems) {
                const systems = (batchedRenderer as any).systems;
                if (systems.length === 0) {
                    if (batchedRenderer.parent) {
                        batchedRenderer.parent.remove(batchedRenderer);
                    }
                }
            }
        }
    }

    setCamera(camera: THREE.Camera): void {
        this.camera = camera;
        
        if (camera.parent !== null) {
            camera.parent.remove(camera);
        }
    }

    getCamera(): THREE.Camera {
        return this.camera;
    }

    update(deltaTime: number): void {
        const currentTime = performance.now() / 1000;
        this.time.delta = deltaTime;
        this.time.elapsed = currentTime - this.startTime;
        
        if ((this as any).particleRenderer) {
            (this as any).particleRenderer.update(deltaTime);
        }
        
        this.scene.traverse((object3D) => {
            const entity = (object3D as any).__entity as Entity | undefined;
            if (entity) {
                entity.update(deltaTime);
            }
        });
    }

    onResize(width: number, height: number): void {
        if (this.camera instanceof THREE.PerspectiveCamera) {
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
        } else if (this.camera instanceof THREE.OrthographicCamera) {
            const aspect = width / height;
            this.camera.left = -aspect;
            this.camera.right = aspect;
            this.camera.updateProjectionMatrix();
        }
    }

    async loadScene(sceneJsonOrScene: any | THREE.Scene): Promise<void> {
        let loadedScene: THREE.Object3D | THREE.Scene;
        
        if (sceneJsonOrScene instanceof THREE.Scene) {
            loadedScene = sceneJsonOrScene;
        } else {
            const loader = new THREE.ObjectLoader();
            loadedScene = loader.parse(sceneJsonOrScene);
        }
        
        if (loadedScene instanceof THREE.Scene) {
            const particleRenderer = (this as any).particleRenderer;
            
            while (this.scene.children.length > 0) {
                this.scene.remove(this.scene.children[0]);
            }
            
            this.scene.background = loadedScene.background;
            this.scene.environment = loadedScene.environment;
            this.scene.fog = loadedScene.fog;
            this.scene.backgroundBlurriness = loadedScene.backgroundBlurriness;
            this.scene.backgroundIntensity = loadedScene.backgroundIntensity;
            this.scene.userData = JSON.parse(JSON.stringify(loadedScene.userData));
            
            if (this.renderer) {
                if (this.scene.background) {
                    if (this.scene.background instanceof THREE.Color) {
                        this.renderer.setClearColor(this.scene.background.getHex(), 1);
                    }
                } else {
                    let clearColor = 0xaaaaaa;
                    if (typeof window !== 'undefined' && window.matchMedia) {
                        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
                        clearColor = mediaQuery.matches ? 0x333333 : 0xaaaaaa;
                    }
                    this.renderer.setClearColor(clearColor, 1);
                }
            }
            
            const childrenToAdd = [...loadedScene.children];
            for (let i = 0; i < childrenToAdd.length; i++) {
                const child = childrenToAdd[i];
                this.scene.add(child);
            }
            
            if (particleRenderer && this.scene.children.indexOf(particleRenderer) === -1) {
                this.scene.add(particleRenderer);
            }
            
            (this.scene as any).__app = this;
            
            this.scene.traverse((object3D) => {
                if ((object3D as any).__entity === null) {
                    return;
                }
                if (object3D.userData && object3D.userData.isParticleSystem) {
                    if (!(object3D as any).__entity) {
                        Entity.fromObject3D(object3D);
                    }
                } else if (!(object3D as any).__entity) {
                    Entity.fromObject3D(object3D);
                }
            });

            await this.loadParticleSystems();
            try {
                await this.loadScriptsFromScene();
            } catch (error) {
                console.warn('[App] Failed to load scripts from scene:', error);
            }
        } else {
            while (this.scene.children.length > 0) {
                this.scene.remove(this.scene.children[0]);
            }
            this.scene.add(loadedScene);
            
            loadedScene.traverse((object3D) => {
                if ((object3D as any).__entity === null) {
                    return;
                }
                if (object3D.userData && object3D.userData.isParticleSystem) {
                    if (!(object3D as any).__entity) {
                        Entity.fromObject3D(object3D);
                    }
                } else if (!(object3D as any).__entity) {
                    Entity.fromObject3D(object3D);
                }
            });

            await this.loadParticleSystems();
            try {
                await this.loadScriptsFromScene();
            } catch (error) {
                console.warn('[App] Failed to load scripts from scene:', error);
            }
        }
        
        this.events?.emit('scene:loaded', this);
    }

    private async loadParticleSystems(): Promise<void> {
        const particlePromises: Promise<void>[] = [];
        
        this.scene.traverse((object3D) => {
            if (object3D.userData && object3D.userData.isParticleSystem) {
                const entity = (object3D as any).__entity as Entity | undefined;
                if (entity) {
                    let particleComponent = entity.getComponent(ParticleComponent);
                    if (!particleComponent) {
                        particleComponent = entity.addComponent(ParticleComponent);
                        console.log('[App] Added ParticleComponent to entity:', entity.name);
                    }
                    // Initialize particle system asynchronously
                    if (particleComponent && !particleComponent.getParticleSystem()) {
                        const initPromise = (particleComponent as any).initialize();
                        if (initPromise && typeof initPromise.then === 'function') {
                            particlePromises.push(initPromise);
                        }
                    }
                }
            }
        });
        
        // Wait for all particle systems to initialize
        if (particlePromises.length > 0) {
            console.log('[App] Initializing', particlePromises.length, 'particle systems...');
            await Promise.all(particlePromises);
            console.log('[App] All particle systems initialized');
        }
    }


    static resolveEntityRef(scene: THREE.Scene | null, uuid: string): Entity | THREE.Object3D | null {
        if (!scene) return null;
        const obj = scene.getObjectByProperty('uuid', uuid);
        return obj ? ((obj as any).__entity || obj) : null;
    }

    private async loadScriptsFromScene(): Promise<void> {
        const assetRegistry = this.assets;
        const scriptAssets = new Map<string, ScriptAsset>();
        const scene = this.scene;

        const promises: Promise<void>[] = [];

        this.scene.traverse((object3D) => {
            const scripts = (object3D.userData as any).scripts;
            if (!scripts || !Array.isArray(scripts)) return;

            // Reuse existing entity from first traverse so scripts are on the same entity that receives update()
            const entity = (object3D as any).__entity || Entity.fromObject3D(object3D);
            if (!entity) return;

            for (const scriptData of scripts) {
                const assetPath = scriptData.assetPath;
                if (!assetPath) continue;

                const promise = (async () => {
                    let scriptAsset = scriptAssets.get(assetPath);
                    if (!scriptAsset) {
                        let scriptUrl = assetPath;
                        if (scriptUrl.startsWith('/')) {
                            scriptUrl = scriptUrl.slice(1);
                        }
                        scriptUrl = scriptUrl.replace(/\/+/g, '/');
                        if (!scriptUrl.startsWith('assets/')) {
                            scriptUrl = 'assets/' + scriptUrl;
                        }
                        if (scriptUrl.endsWith('.ts') || scriptUrl.endsWith('.tsx')) {
                            scriptUrl = scriptUrl.replace(/\.tsx?$/, '.js');
                        }
                        scriptUrl = './' + scriptUrl;

                        scriptAsset = new ScriptAsset(assetPath.split('/').pop() || 'script', scriptUrl);
                        assetRegistry.register(scriptAsset);
                        scriptAssets.set(assetPath, scriptAsset);
                    }

                    try {
                        await assetRegistry.load(scriptAsset!.id);
                    } catch (error) {
                        console.warn('[App] Failed to load script asset:', assetPath, error);
                        return;
                    }

                    if (scriptAsset!.scriptClass) {
                        const script = entity.addScriptFromAsset(scriptAsset!);
                        if (script && scriptData.attributes) {
                            const attrs = script.getAttributes();
                            for (const attrName in scriptData.attributes) {
                                let value: any = scriptData.attributes[attrName];
                                const attr = attrs.get(attrName);
                                const uuid = typeof value === 'string' ? value : (value && typeof value === 'object' && value.uuid);
                                if (uuid && (attr?.type === 'entity' || !attr)) {
                                    const resolved = App.resolveEntityRef(scene, String(uuid));
                                    if (resolved !== null) value = resolved;
                                }
                                script.setAttribute(attrName, value);
                            }
                        }
                    }
                })();

                promises.push(promise);
            }
        });

        await Promise.all(promises);

        this.scene.traverse((object3D) => {
            const scripts = (object3D.userData as any).scripts;
            if (!scripts || !Array.isArray(scripts)) return;
            const entity = (object3D as any).__entity || Entity.fromObject3D(object3D);
            if (!entity || !entity.scripts) return;
            for (const script of entity.scripts) {
                const attrs = script.getAttributes();
                attrs.forEach((attr: ScriptAttribute, attrName: string) => {
                    if (attr.type !== 'entity') return;
                    const value = script.getAttribute(attrName);
                    const uuid = typeof value === 'string' ? value : (value && typeof value === 'object' && (value as any).uuid);
                    if (uuid) {
                        const resolved = App.resolveEntityRef(scene, String(uuid));
                        if (resolved !== null) {
                            script.setAttribute(attrName, resolved);
                        }
                    }
                });
            }
        });
    }

    destroy(): void {
        const entities = this.getEntities();
        entities.forEach(entity => {
            (entity as Entity).dispose();
        });
        
        this.camera = null as unknown as THREE.Camera;
        this.scene = null as unknown as THREE.Scene;
        this.events?.clear();
        this.events = null;
    }
}
