import * as THREE from 'three';
import { App } from '../core/App';
import { ScriptAsset } from '../assets/ScriptAsset';
import { Entity } from '../core/Entity';
import { ProjectLoader } from './ProjectLoader';
import { AssetObjectLoader } from './AssetObjectLoader';

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
        
        if (sceneData.scene && sceneData.scene.textures && Array.isArray(sceneData.scene.textures)) {
            if (!sceneData.scene.images) {
                sceneData.scene.images = [];
            }
            
            for (const texture of sceneData.scene.textures) {
                let assetPath = null;
                if (texture.userData && texture.userData.assetPath) {
                    assetPath = texture.userData.assetPath;
                }
                
                if (texture.image) {
                    let imageUuid: string;
                    let imagePath: string | null = null;
                    
                    if (typeof texture.image === 'string') {
                        imageUuid = texture.image;
                        const imageObj = sceneData.scene.images.find((img: any) => img.uuid === imageUuid);
                        if (imageObj) {
                            imagePath = imageObj.url;
                        }
                    } else if (typeof texture.image === 'object' && texture.image.uuid) {
                        imageUuid = texture.image.uuid;
                        imagePath = texture.image.url || assetPath;
                    } else {
                        imageUuid = texture.image as string;
                        const imageObj = sceneData.scene.images.find((img: any) => img.uuid === imageUuid);
                        if (imageObj) {
                            imagePath = imageObj.url;
                        }
                    }
                    
                    const finalPath = assetPath || imagePath;
                    
                    if (finalPath && !finalPath.startsWith('data:') && !finalPath.startsWith('blob:') && !finalPath.startsWith('http')) {
                        let normalizedPath = finalPath;
                        if (normalizedPath.startsWith('/')) {
                            normalizedPath = normalizedPath.slice(1);
                        }
                        normalizedPath = normalizedPath.replace(/\/+/g, '/');
                        
                        if (!normalizedPath.startsWith('assets/')) {
                            normalizedPath = 'assets/' + normalizedPath;
                        }
                        
                        const existingImageIndex = sceneData.scene.images.findIndex((img: any) => img.uuid === imageUuid);
                        if (existingImageIndex >= 0) {
                            sceneData.scene.images[existingImageIndex].url = normalizedPath;
                        } else {
                            sceneData.scene.images.push({
                                uuid: imageUuid,
                                url: normalizedPath
                            });
                        }
                        
                        if (typeof texture.image === 'object') {
                            texture.image = imageUuid;
                        }
                    }
                }
            }
        }
        
        const manager = new THREE.LoadingManager();
        
        const hasTauri = typeof window !== 'undefined' && (window as any).__TAURI__;
        const hasTauriInvoke = hasTauri && (window as any).__TAURI__.core?.invoke;
        const isInBrowser = typeof window !== 'undefined' && window.location.protocol === 'http:';
        const projectPath = ProjectLoader.getProjectPath();
        
        const useApiForAssets = isInBrowser || !hasTauriInvoke;
        
        if (useApiForAssets && projectPath) {
            const projectName = projectPath.split(/[/\\]/).pop();
            manager.setURLModifier((url: string) => {
                
                if (!url || typeof url !== 'string') {
                    return url;
                }
                
                if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('/api/projects/')) {
                    return url;
                }
                
                let assetPath: string | null = null;
                
                if (url.startsWith('assets/')) {
                    assetPath = url.slice(7);
                }
                else if (url.includes('/assets/')) {
                    const assetsIndex = url.indexOf('/assets/');
                    assetPath = url.substring(assetsIndex + 8); 
                }
                else if (!url.startsWith('http') && !url.startsWith('/') && !url.includes('://')) {
                    assetPath = url;
                }
                
                if (assetPath) {
                    const encodedProjectName = encodeURIComponent(projectName || '');
                    const encodedAssetPath = encodeURIComponent(assetPath);
                    const apiUrl = `/api/projects/${encodedProjectName}/assets/${encodedAssetPath}`;
                    return apiUrl;
                }
                
                return url;
            });
            
            const ImageLoader = (THREE as any).ImageLoader;
            const interceptionFlag = '__runtimeAssetLoaderIntercepted';
            if (ImageLoader && !ImageLoader.prototype[interceptionFlag]) {
                ImageLoader.prototype[interceptionFlag] = true;
                const originalImageLoaderLoad = ImageLoader.prototype.load;
                ImageLoader.prototype.load = function(url: string, onLoad?: (image: HTMLImageElement) => void, onProgress?: (event: ProgressEvent) => void, onError?: (err: unknown) => void) {
                    if (url && typeof url === 'string' && (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('/api/projects/'))) {
                        return originalImageLoaderLoad.call(this, url, onLoad, onProgress, onError);
                    }
                    
                    let assetPathToLoad: string | null = null;
                    
                    if (url && typeof url === 'string' && url.startsWith('assets/') && !url.startsWith('http')) {
                        assetPathToLoad = url.slice(7);
                    }
                    else if (url && typeof url === 'string' && url.includes('/assets/') && !url.startsWith('data:') && !url.startsWith('blob:')) {
                        const assetsIndex = url.indexOf('/assets/');
                        if (assetsIndex !== -1) {
                            assetPathToLoad = url.substring(assetsIndex + 8);
                        }
                    }
                    else if (url && typeof url === 'string' && !url.startsWith('http') && !url.startsWith('/') && !url.includes('://')) {
                        const ext = url.split('.').pop()?.toLowerCase();
                        const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'hdr', 'exr', 'tga', 'ktx2'];
                        if (ext && imageExts.includes(ext)) {
                            assetPathToLoad = url;
                        }
                    }
                    
                    if (assetPathToLoad) {
                        ProjectLoader.loadAsset(projectPath, assetPathToLoad)
                            .then((blob) => {
                                const blobUrl = URL.createObjectURL(blob);
                                originalImageLoaderLoad.call(this, blobUrl, onLoad, onProgress, onError);
                            })
                            .catch((error) => {
                                console.error('[SceneLoader] Failed to load asset:', assetPathToLoad, error);
                                if (onError) {
                                    onError(error);
                                }
                            });
                        return;
                    }
                    
                    return originalImageLoaderLoad.call(this, url, onLoad, onProgress, onError);
                };
            }
            
            const FileLoader = THREE.FileLoader;
            const fileLoaderInterceptionFlag = '__runtimeAssetLoaderIntercepted';
            if (FileLoader && !(FileLoader.prototype as any)[fileLoaderInterceptionFlag]) {
                (FileLoader.prototype as any)[fileLoaderInterceptionFlag] = true;
                const originalFileLoaderLoad = FileLoader.prototype.load;
                FileLoader.prototype.load = function(url: string, onLoad?: (response: string | ArrayBuffer) => void, onProgress?: (event: ProgressEvent) => void, onError?: (err: unknown) => void) {
                    if (url && typeof url === 'string' && (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('/api/projects/'))) {
                        return originalFileLoaderLoad.call(this, url, onLoad, onProgress, onError);
                    }
                    
                    if (url && typeof url === 'string') {
                        if (url.startsWith('js/') || url.startsWith('./js/') || url.startsWith('/js/') || url.includes('/js/')) {
                            if (!url.includes('/assets/js/') && !url.startsWith('assets/js/')) {
                                return originalFileLoaderLoad.call(this, url, onLoad, onProgress, onError);
                            }
                        }
                        if (url.endsWith('.js') && !url.includes('/assets/') && !url.startsWith('assets/') && !url.startsWith('./assets/')) {
                            return originalFileLoaderLoad.call(this, url, onLoad, onProgress, onError);
                        }
                    }
                    
                    let assetPathToLoad: string | null = null;
                    
                    if (url && typeof url === 'string' && url.startsWith('assets/') && !url.startsWith('http')) {
                        assetPathToLoad = url.slice(7);
                    }
                    else if (url && typeof url === 'string' && url.includes('/assets/') && !url.startsWith('data:') && !url.startsWith('blob:')) {
                        const assetsIndex = url.indexOf('/assets/');
                        if (assetsIndex !== -1) {
                            assetPathToLoad = url.substring(assetsIndex + 8);
                        }
                    }
                    else if (url && typeof url === 'string' && !url.startsWith('http') && !url.startsWith('/') && !url.includes('://')) {
                        const isScriptFile = url.startsWith('js/') || url.startsWith('./js/') || url.startsWith('/js/') || 
                                           (url.endsWith('.js') && !url.includes('/assets/') && !url.startsWith('assets/'));
                        if (!isScriptFile) {
                            assetPathToLoad = url;
                        }
                    }
                    
                    if (assetPathToLoad) {
                        ProjectLoader.loadAsset(projectPath, assetPathToLoad)
                            .then((blob) => {
                                const blobUrl = URL.createObjectURL(blob);
                                originalFileLoaderLoad.call(this, blobUrl, onLoad, onProgress, onError);
                            })
                            .catch((error) => {
                                console.error('[SceneLoader] Failed to load file:', assetPathToLoad, error);
                                if (onError) {
                                    onError(error);
                                }
                            });
                        return;
                    }
                    
                    return originalFileLoaderLoad.call(this, url, onLoad, onProgress, onError);
                };
            }
        }
        
        const loader = new AssetObjectLoader(manager);
        
        if (sceneData.camera) {
            const camera = await loader.parseAsync(sceneData.camera) as THREE.Camera;
            if (camera && (camera instanceof THREE.PerspectiveCamera || camera instanceof THREE.OrthographicCamera)) {
                app.setCamera(camera);
                if (camera instanceof THREE.PerspectiveCamera || camera instanceof THREE.OrthographicCamera) {
                    camera.updateProjectionMatrix();
                }
            }
        }
        
        if (sceneData.scene) {
            const loadedScene = await loader.parseAsync(sceneData.scene);
            await app.loadScene(loadedScene);
        }

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
                                const attrs = script.getAttributes();
                                const scene = app.scene;
                                for (const attrName in scriptData.attributes) {
                                    let value: any = scriptData.attributes[attrName];
                                    const attr = attrs.get(attrName);
                                    if (attr?.type === 'entity' && typeof value === 'string' && value) {
                                        value = App.resolveEntityRef(scene, value);
                                    }
                                    script.setAttribute(attrName, value);
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
