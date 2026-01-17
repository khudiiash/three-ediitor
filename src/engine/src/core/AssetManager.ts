/**
 * Centralized asset management system
 * Handles loading, caching, and retrieval of all asset types
 * Completely decoupled from any rendering or I/O implementation
 */

export interface AssetMetadata {
	id: string;
	type: AssetType;
	name?: string;
	path?: string;
	source?: string;
	timestamp: number;
	[key: string]: any;
}

export type AssetType = 'geometry' | 'material' | 'texture' | 'model' | 'audio' | 'script' | 'data';

export interface ParsedModelContents {
	name?: string;
	geometries?: Array<{ name: string; geometry: any }>;
	materials?: Array<{ name: string; material: any }>;
	textures?: Array<{ name: string; texture: any }>;
	model?: any;
}

/**
 * AssetManager - Centralized asset registry
 * 
 * Usage:
 * - Register assets as they are loaded
 * - Retrieve assets by ID, path, or name
 * - Query assets by type
 * - Track asset lifecycle
 */
export class AssetManager {
	private assets: Map<string, { asset: any; metadata: AssetMetadata }>;
	private geometries: Map<string, any>;
	private materials: Map<string, any>;
	private textures: Map<string, any>;
	private models: Map<string, any>;
	private audioBuffers: Map<string, any>;
	private scripts: Map<string, any>;
	private data: Map<string, any>;
	private parsedModels: Map<string, ParsedModelContents>;

	constructor() {
		this.assets = new Map();
		this.geometries = new Map();
		this.materials = new Map();
		this.textures = new Map();
		this.models = new Map();
		this.audioBuffers = new Map();
		this.scripts = new Map();
		this.data = new Map();
		this.parsedModels = new Map();
	}

	/**
	 * Register an asset with the manager
	 */
	register(id: string, asset: any, type: AssetType, metadata: Partial<AssetMetadata> = {}): any {
		const fullMetadata: AssetMetadata = {
			id,
			type,
			timestamp: Date.now(),
			...metadata
		};

		this.assets.set(id, { asset, metadata: fullMetadata });

		// Store in type-specific map
		switch (type) {
			case 'geometry':
				this.geometries.set(id, asset);
				break;
			case 'material':
				this.materials.set(id, asset);
				break;
			case 'texture':
				this.textures.set(id, asset);
				break;
			case 'model':
				this.models.set(id, asset);
				break;
			case 'audio':
				this.audioBuffers.set(id, asset);
				break;
			case 'script':
				this.scripts.set(id, asset);
				break;
			case 'data':
				this.data.set(id, asset);
				break;
		}

		return asset;
	}

	/**
	 * Register a geometry
	 */
	registerGeometry(id: string, geometry: any, metadata: Partial<AssetMetadata> = {}): any {
		return this.register(id, geometry, 'geometry', metadata);
	}

	/**
	 * Register a material
	 */
	registerMaterial(id: string, material: any, metadata: Partial<AssetMetadata> = {}): any {
		return this.register(id, material, 'material', metadata);
	}

	/**
	 * Register a texture
	 */
	registerTexture(id: string, texture: any, metadata: Partial<AssetMetadata> = {}): any {
		return this.register(id, texture, 'texture', metadata);
	}

	/**
	 * Register a model
	 */
	registerModel(id: string, model: any, metadata: Partial<AssetMetadata> = {}): any {
		return this.register(id, model, 'model', metadata);
	}

	/**
	 * Register an audio buffer
	 */
	registerAudio(id: string, audioBuffer: any, metadata: Partial<AssetMetadata> = {}): any {
		return this.register(id, audioBuffer, 'audio', metadata);
	}

	/**
	 * Register a script
	 */
	registerScript(id: string, script: any, metadata: Partial<AssetMetadata> = {}): any {
		return this.register(id, script, 'script', metadata);
	}

	/**
	 * Register arbitrary data
	 */
	registerData(id: string, data: any, metadata: Partial<AssetMetadata> = {}): any {
		return this.register(id, data, 'data', metadata);
	}

	/**
	 * Register parsed model contents (from GLB, GLTF, FBX, etc.)
	 * Automatically registers all sub-components (geometries, materials, textures, model)
	 */
	registerParsedModel(modelPath: string, modelContents: ParsedModelContents): ParsedModelContents {
		this.parsedModels.set(modelPath, modelContents);

		// Register individual components with their model path as prefix
		if (modelContents.geometries) {
			modelContents.geometries.forEach(geo => {
				const geoId = `${modelPath}/${geo.name}`;
				this.registerGeometry(geoId, geo.geometry, {
					name: geo.name,
					path: modelPath,
					source: 'model'
				});
			});
		}

		if (modelContents.materials) {
			modelContents.materials.forEach(mat => {
				const matId = `${modelPath}/${mat.name}`;
				this.registerMaterial(matId, mat.material, {
					name: mat.name,
					path: modelPath,
					source: 'model'
				});
			});
		}

		if (modelContents.textures) {
			modelContents.textures.forEach(tex => {
				const texId = `${modelPath}/${tex.name}`;
				this.registerTexture(texId, tex.texture, {
					name: tex.name,
					path: modelPath,
					source: 'model'
				});
			});
		}

		if (modelContents.model) {
			this.registerModel(modelPath, modelContents.model, {
				name: modelContents.name || modelPath.split('/').pop(),
				path: modelPath,
				source: 'model'
			});
		}

		return modelContents;
	}

	/**
	 * Get an asset by ID
	 */
	get(id: string): any | null {
		const entry = this.assets.get(id);
		return entry ? entry.asset : null;
	}

	/**
	 * Get a geometry by ID
	 */
	getGeometry(id: string): any | null {
		return this.geometries.get(id) || null;
	}

	/**
	 * Get a material by ID
	 */
	getMaterial(id: string): any | null {
		return this.materials.get(id) || null;
	}

	/**
	 * Get a texture by ID
	 */
	getTexture(id: string): any | null {
		return this.textures.get(id) || null;
	}

	/**
	 * Get a model by ID
	 */
	getModel(id: string): any | null {
		return this.models.get(id) || null;
	}

	/**
	 * Get an audio buffer by ID
	 */
	getAudio(id: string): any | null {
		return this.audioBuffers.get(id) || null;
	}

	/**
	 * Get a script by ID
	 */
	getScript(id: string): any | null {
		return this.scripts.get(id) || null;
	}

	/**
	 * Get data by ID
	 */
	getData(id: string): any | null {
		return this.data.get(id) || null;
	}

	/**
	 * Get parsed model contents
	 */
	getParsedModel(modelPath: string): ParsedModelContents | null {
		return this.parsedModels.get(modelPath) || null;
	}

	/**
	 * Get asset metadata
	 */
	getMetadata(id: string): AssetMetadata | null {
		const entry = this.assets.get(id);
		return entry ? entry.metadata : null;
	}

	/**
	 * Check if an asset exists
	 */
	has(id: string): boolean {
		return this.assets.has(id);
	}

	/**
	 * Check if a parsed model exists
	 */
	hasParsedModel(modelPath: string): boolean {
		return this.parsedModels.has(modelPath);
	}

	/**
	 * Get all assets of a specific type
	 */
	getAssetsByType(type: AssetType): Array<{ id: string; asset: any; metadata: AssetMetadata }> {
		const results: Array<{ id: string; asset: any; metadata: AssetMetadata }> = [];
		for (const [id, entry] of this.assets.entries()) {
			if (entry.metadata.type === type) {
				results.push({ id, ...entry });
			}
		}
		return results;
	}

	/**
	 * Find assets by name
	 */
	findByName(name: string): Array<{ id: string; asset: any; metadata: AssetMetadata }> {
		const results: Array<{ id: string; asset: any; metadata: AssetMetadata }> = [];
		for (const [id, entry] of this.assets.entries()) {
			if (entry.metadata.name === name) {
				results.push({ id, ...entry });
			}
		}
		return results;
	}

	/**
	 * Find assets by path
	 */
	findByPath(path: string): Array<{ id: string; asset: any; metadata: AssetMetadata }> {
		const results: Array<{ id: string; asset: any; metadata: AssetMetadata }> = [];
		for (const [id, entry] of this.assets.entries()) {
			if (entry.metadata.path === path) {
				results.push({ id, ...entry });
			}
		}
		return results;
	}

	/**
	 * Remove an asset
	 */
	remove(id: string): boolean {
		const entry = this.assets.get(id);
		if (!entry) return false;

		// Remove from type-specific map
		switch (entry.metadata.type) {
			case 'geometry':
				this.geometries.delete(id);
				break;
			case 'material':
				this.materials.delete(id);
				break;
			case 'texture':
				this.textures.delete(id);
				break;
			case 'model':
				this.models.delete(id);
				break;
			case 'audio':
				this.audioBuffers.delete(id);
				break;
			case 'script':
				this.scripts.delete(id);
				break;
			case 'data':
				this.data.delete(id);
				break;
		}

		this.assets.delete(id);
		return true;
	}

	/**
	 * Remove a parsed model and all its components
	 */
	removeParsedModel(modelPath: string): boolean {
		const modelContents = this.parsedModels.get(modelPath);
		if (!modelContents) return false;

		// Remove all components
		if (modelContents.geometries) {
			modelContents.geometries.forEach(geo => {
				this.remove(`${modelPath}/${geo.name}`);
			});
		}

		if (modelContents.materials) {
			modelContents.materials.forEach(mat => {
				this.remove(`${modelPath}/${mat.name}`);
			});
		}

		if (modelContents.textures) {
			modelContents.textures.forEach(tex => {
				this.remove(`${modelPath}/${tex.name}`);
			});
		}

		this.remove(modelPath); // Remove the model itself
		this.parsedModels.delete(modelPath);

		return true;
	}

	/**
	 * Clear all assets
	 */
	clear(): void {
		this.assets.clear();
		this.geometries.clear();
		this.materials.clear();
		this.textures.clear();
		this.models.clear();
		this.audioBuffers.clear();
		this.scripts.clear();
		this.data.clear();
		this.parsedModels.clear();
	}

	/**
	 * Get statistics about loaded assets
	 */
	getStats(): {
		total: number;
		geometries: number;
		materials: number;
		textures: number;
		models: number;
		audio: number;
		scripts: number;
		data: number;
		parsedModels: number;
	} {
		return {
			total: this.assets.size,
			geometries: this.geometries.size,
			materials: this.materials.size,
			textures: this.textures.size,
			models: this.models.size,
			audio: this.audioBuffers.size,
			scripts: this.scripts.size,
			data: this.data.size,
			parsedModels: this.parsedModels.size
		};
	}

	/**
	 * Get all asset IDs
	 */
	getAllIds(): string[] {
		return Array.from(this.assets.keys());
	}

	/**
	 * Get all assets
	 */
	getAllAssets(): Array<{ id: string; asset: any; metadata: AssetMetadata }> {
		const results: Array<{ id: string; asset: any; metadata: AssetMetadata }> = [];
		for (const [id, entry] of this.assets.entries()) {
			results.push({ id, ...entry });
		}
		return results;
	}
}

// Export singleton instance for convenience
export const assetManager = new AssetManager();
