import * as THREE from 'three';
import { App } from '../core/App';
import { ScriptAsset } from '../assets/ScriptAsset';
import { Entity } from '../core/Entity';

export class SceneLoader {
    static async loadScene(app: App, sceneData: any): Promise<void> {
        const project = sceneData.project;
        const renderer = app.engine.renderer;
        
        if (renderer && project) {
            if (project.shadows !== undefined) renderer.shadowMap.enabled = project.shadows;
            if (project.shadowType !== undefined) renderer.shadowMap.type = project.shadowType;
            if (project.toneMapping !== undefined) renderer.toneMapping = project.toneMapping;
            if (project.toneMappingExposure !== undefined) renderer.toneMappingExposure = project.toneMappingExposure;
        }
        
        const manager = new THREE.LoadingManager();
        manager.setURLModifier((url: string) => {
            if (url.startsWith('assets/')) {
                return url;
            }
            return url;
        });
        
        const loader = new THREE.ObjectLoader(manager);
        
        if (sceneData.scene) {
            const loadedScene = loader.parse(sceneData.scene);
            app.loadScene(loadedScene);
        }
        
        if (sceneData.camera) {
            const camera = loader.parse(sceneData.camera) as THREE.Camera;
            if (camera && (camera instanceof THREE.PerspectiveCamera || camera instanceof THREE.OrthographicCamera)) {
                app.setCamera(camera);
            }
        }

        await SceneLoader.loadScripts(app, sceneData.scene);
    }

    static async loadScripts(app: App, sceneJson: any): Promise<void> {
        if (!sceneJson) return;

        const assetRegistry = app.assets;
        const scriptAssets = new Map<string, ScriptAsset>();

        const loadScriptsForObject = async (objectJson: any): Promise<void> => {
            if (objectJson.userData && objectJson.userData.scripts && Array.isArray(objectJson.userData.scripts)) {
                const object3D = app.scene.getObjectByProperty('uuid', objectJson.uuid);
                if (object3D) {
                    const entity = Entity.fromObject3D(object3D);
                    
                    for (const scriptData of objectJson.userData.scripts) {
                        const assetPath = scriptData.assetPath;
                        if (!assetPath) continue;

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
                                continue;
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
                    }
                }
            }

            if (objectJson.children) {
                for (const child of objectJson.children) {
                    await loadScriptsForObject(child);
                }
            }
        };

        if (sceneJson.object) {
            await loadScriptsForObject(sceneJson.object);
        } else if (sceneJson.children) {
            for (const child of sceneJson.children) {
                await loadScriptsForObject(child);
            }
        }
    }
}
