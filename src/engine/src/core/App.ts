import * as THREE from 'three';
import { SuperEvents } from '@khudiiash/super-events';
import { Engine } from './Engine';
import { Entity } from './Entity';
import { AssetRegistry } from './AssetRegistry';
import { ScriptAsset } from '../assets/ScriptAsset';

export class App {
    public engine: Engine;
    public assets: AssetRegistry;
    
    public camera!: THREE.Camera;
    public scene: THREE.Scene;
    private events: SuperEvents | null = null;
    
    public time: { delta: number; elapsedTime: number } = { delta: 0, elapsedTime: 0 };
    private startTime: number = 0;

    constructor(engine: Engine) {
        this.engine = engine;
        this.assets = new AssetRegistry();
        
        this.scene = new THREE.Scene();
        this.events = SuperEvents.getInstance();
        this.scene.background = new THREE.Color(0x222222);
        
        this.startTime = performance.now() / 1000;
    }

    get renderer(): THREE.WebGLRenderer | null {
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

        if ((entity as any)._object3D.parent) {
            (entity as any)._object3D.parent.remove((entity as any)._object3D);
        }

        entity.dispose();
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
        this.time.elapsedTime = currentTime - this.startTime;
        
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

    loadScene(sceneJsonOrScene: any | THREE.Scene): void {
        let loadedScene: THREE.Object3D | THREE.Scene;
        
        if (sceneJsonOrScene instanceof THREE.Scene) {
            loadedScene = sceneJsonOrScene;
        } else {
            const loader = new THREE.ObjectLoader();
            loadedScene = loader.parse(sceneJsonOrScene);
        }
        
        if (loadedScene instanceof THREE.Scene) {
            while (this.scene.children.length > 0) {
                this.scene.remove(this.scene.children[0]);
            }
            
            this.scene.background = loadedScene.background;
            this.scene.environment = loadedScene.environment;
            this.scene.fog = loadedScene.fog;
            this.scene.backgroundBlurriness = loadedScene.backgroundBlurriness;
            this.scene.backgroundIntensity = loadedScene.backgroundIntensity;
            this.scene.userData = JSON.parse(JSON.stringify(loadedScene.userData));
            
            const childrenToAdd = [...loadedScene.children];
            for (let i = 0; i < childrenToAdd.length; i++) {
                const child = childrenToAdd[i];
                this.scene.add(child);
            }
            
            (this.scene as any).__app = this;
            
            this.scene.traverse((object3D) => {
                if (!(object3D as any).__entity) {
                    Entity.fromObject3D(object3D);
                }
            });

            this.loadScriptsFromScene().catch(() => {});
        } else {
            while (this.scene.children.length > 0) {
                this.scene.remove(this.scene.children[0]);
            }
            this.scene.add(loadedScene);
            
            loadedScene.traverse((object3D) => {
                if (!(object3D as any).__entity) {
                    Entity.fromObject3D(object3D);
                }
            });
        }
        
        this.events?.emit('scene:loaded', this);
    }


    private async loadScriptsFromScene(): Promise<void> {
        const assetRegistry = this.assets;
        const scriptAssets = new Map<string, ScriptAsset>();

        const promises: Promise<void>[] = [];

        this.scene.traverse((object3D) => {
            const scripts = (object3D.userData as any).scripts;
            if (!scripts || !Array.isArray(scripts)) return;

            const entity = Entity.fromObject3D(object3D);
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
                        
                        try {
                            await assetRegistry.load(scriptAsset.name);
                        } catch (error) {
                            return;
                        }
                    }

                    if (scriptAsset.scriptClass) {
                        const script = entity.addScriptFromAsset(scriptAsset);
                        if (script && scriptData.attributes) {
                            for (const attrName in scriptData.attributes) {
                                script.setAttribute(attrName, scriptData.attributes[attrName]);
                            }
                        }
                    }
                })();

                promises.push(promise);
            }
        });

        await Promise.all(promises);
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
