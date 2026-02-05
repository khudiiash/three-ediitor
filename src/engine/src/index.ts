export { Engine, pc } from './core/Engine';
export { App } from './core/App';
export { Entity } from './core/Entity';
export { Component } from './core/Component';
export { Script } from './core/Script';

export { TransformComponent } from './components/TransformComponent';
export { MeshComponent } from './components/MeshComponent';
export { CameraComponent } from './components/CameraComponent';
export { LightComponent } from './components/LightComponent';
export { ParticleComponent } from './components/ParticleComponent';

export { SceneLoader } from './runtime/SceneLoader';
export { ProjectLoader } from './runtime/ProjectLoader';
export { EnginePlayer } from './runtime/EnginePlayer';
export { WebSocketClient } from './runtime/WebSocketClient';
export type { EditorMessage, EngineMessage } from './runtime/types';

export { registerComponent, attribute, getRegisteredComponent, getAllRegisteredComponents } from './core/decorators';
export type { ScriptAttribute } from './core/Script';
export type { AttributeOptions } from './core/decorators';

export { Asset, AssetState, AssetType } from './core/Asset';
export { AssetRegistry } from './core/AssetRegistry';
export { AssetManager, assetManager } from './core/AssetManager';
export { ScriptAsset } from './assets/ScriptAsset';
export { TextureAsset } from './assets/TextureAsset';
export { MaterialAsset } from './assets/MaterialAsset';
export type { TextureAssetMetadata } from './assets/TextureAsset';
export type { MaterialAssetMetadata } from './assets/MaterialAsset';

export {
	createMaterialFromGraph,
	setNodeMaterialBackend,
} from './material/createMaterialFromGraph';
export type { NodeMaterialGraph } from './material/createMaterialFromGraph';

export { ParticleSystem } from './utils/ParticleSystem';
export type { ParticleSystemConfig } from './utils/ParticleSystem';

export type { ComponentConstructor } from './core/Component';
export type { ScriptConstructor } from './core/Script';
