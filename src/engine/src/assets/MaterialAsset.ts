import * as THREE from 'three';
import { Asset, AssetState, AssetType } from '../core/Asset';

export interface MaterialAssetMetadata {
	name: string;
	path: string;
	source?: string;
	dateCreated?: number;
	dateModified?: number;
	materialType?: string;
	modelPath?: string;
}

export class MaterialAsset extends Asset {
	public metadata: MaterialAssetMetadata;
	private material: THREE.Material | null = null;

	constructor(name: string, path: string, metadata: Partial<MaterialAssetMetadata> = {}) {
		super(name, path);
		this.type = AssetType.MATERIAL;
		this.metadata = {
			name,
			path,
			...metadata
		} as MaterialAssetMetadata;
		if (metadata.dateCreated !== undefined) {
			this.createdAt = metadata.dateCreated;
		}
		if (metadata.dateModified !== undefined) {
			this.modifiedAt = metadata.dateModified;
		}
	}

	async load(): Promise<void> {
		if (this.state === AssetState.LOADED && this.material) {
			return;
		}

		if (this.state === AssetState.LOADING) {
			return new Promise((resolve, reject) => {
				this.once('loaded', resolve);
				this.once('error', reject);
			});
		}

		this.state = AssetState.LOADING;
		this.error = null;

		try {
			let materialData: any = null;
			
			if (typeof window !== 'undefined' && (window as any).__TAURI__ && this.url) {
				const projectPath = (window as any).__editorProjectPath || 
					(typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('editor_project_path') : null);
				
				if (projectPath) {
					const assetPath = this.url.startsWith('/') ? this.url.slice(1) : this.url;
					try {
						const assetBytes = await (window as any).__TAURI__.core.invoke('read_asset_file', {
							projectPath: projectPath,
							assetPath: assetPath
						});
						const text = new TextDecoder().decode(new Uint8Array(assetBytes));
						materialData = JSON.parse(text);
					} catch (error: any) {
						const errorMessage = error?.message || String(error);
						if (errorMessage && !errorMessage.includes('File not found')) {
							console.warn('[MaterialAsset] Failed to load from file:', error);
						}
					}
				}
			} else if (this.url && (this.url.startsWith('data:') || this.url.startsWith('blob:'))) {
				try {
					const response = await fetch(this.url);
					materialData = await response.json();
				} catch (error) {
					console.warn('[MaterialAsset] Failed to load from URL:', error);
				}
			}
			
			let material: THREE.Material | null = null;
			
			if (materialData && materialData.type && materialData.type.includes('Material')) {
				try {
					const loader = new THREE.MaterialLoader();
					loader.setTextures({});
					material = loader.parse(materialData);
					
					if (!material) {
						const objectLoader = new THREE.ObjectLoader();
						const parsed = objectLoader.parseMaterials([materialData], {});
						material = (parsed && Array.isArray(parsed) && parsed.length > 0) ? parsed[0] : null;
					}
					
			if (!material && materialData.type) {
				const MaterialClass = (THREE as any)[materialData.type];
				if (MaterialClass) {
					material = new MaterialClass() as THREE.Material;
					const mat = material as any;
					if (materialData.color !== undefined && mat.color) {
						if (typeof materialData.color === 'number') {
							mat.color.setHex(materialData.color);
						} else if (materialData.color.r !== undefined) {
							mat.color.setRGB(materialData.color.r, materialData.color.g, materialData.color.b);
						}
					}
					if (materialData.roughness !== undefined && mat.roughness !== undefined) mat.roughness = materialData.roughness;
					if (materialData.metalness !== undefined && mat.metalness !== undefined) mat.metalness = materialData.metalness;
					if (materialData.emissive !== undefined && mat.emissive) {
						if (typeof materialData.emissive === 'number') {
							mat.emissive.setHex(materialData.emissive);
						} else if (materialData.emissive.r !== undefined) {
							mat.emissive.setRGB(materialData.emissive.r, materialData.emissive.g, materialData.emissive.b);
						}
					}
					if (materialData.opacity !== undefined) mat.opacity = materialData.opacity;
					if (materialData.transparent !== undefined) mat.transparent = materialData.transparent;
					if (materialData.name !== undefined) mat.name = materialData.name;
					if (materialData.userData) mat.userData = materialData.userData;
				}
			}
				} catch (parseError) {
					console.warn('[MaterialAsset] Failed to parse material data:', parseError);
				}
			}
			
			if (!material) {
				if (this.metadata.materialType) {
					const MaterialClass = (THREE as any)[this.metadata.materialType] || THREE.MeshStandardMaterial;
					material = new MaterialClass();
					if (material) {
						material.name = this.metadata.name;
					}
				} else {
					material = new THREE.MeshStandardMaterial();
					material.name = this.metadata.name;
					this.metadata.materialType = material.type;
				}
			}
			
			if (material) {
				const mat = material as any;
				mat.assetPath = this.url;
				mat.sourceFile = this.metadata.source || this.name;
				mat.isMaterial = true;
			}

			this.material = material;
			this.data = material;
			this.state = AssetState.LOADED;
			this.emit('loaded', this.material);
		} catch (error: any) {
			this.state = AssetState.FAILED;
			this.error = error?.message || 'Failed to load material';
			this.emit('error', error);
			throw error;
		}
	}

	async setMaterial(material: THREE.Material): Promise<void> {
		if (material === this.material) {
			return;
		}
		if (this.material) {
			this.material.dispose();
		}
		this.material = material;
		this.data = material;
		this.state = AssetState.LOADED;
		if (this.metadata.materialType === undefined) {
			this.metadata.materialType = material.type;
		}
		this.modifiedAt = Date.now();
		await this.emitAsync('changed', this);
	}

	unload(): void {
		if (this.material) {
			this.material.dispose();
			this.material = null;
		}
		this.data = null;
		this.state = AssetState.NOT_LOADED;
	}

	getMaterial(): THREE.Material | null {
		return this.material;
	}

	async updateMetadata(updates: Partial<MaterialAssetMetadata>): Promise<void> {
		this.metadata = { ...this.metadata, ...updates };
		this.modifiedAt = Date.now();
		await this.emitAsync('changed', this);
	}
}
