import * as THREE from 'three';
import { Asset, AssetState, AssetType } from '../core/Asset';

export interface TextureAssetMetadata {
	name: string;
	path: string;
	source?: string;
	dateCreated?: number;
	dateModified?: number;
	width?: number;
	height?: number;
	format?: number;
	type?: number;
	colorSpace?: string;
	flipY?: boolean;
	generateMipmaps?: boolean;
	minFilter?: number;
	magFilter?: number;
	wrapS?: number;
	wrapT?: number;
	anisotropy?: number;
}

export class TextureAsset extends Asset {
	public metadata: TextureAssetMetadata;
	private texture: THREE.Texture | null = null;
	private loader: THREE.TextureLoader;

	constructor(name: string, path: string, metadata: Partial<TextureAssetMetadata> = {}) {
		super(name, path);
		this.loader = new THREE.TextureLoader();
		this.type = AssetType.TEXTURE;
		this.metadata = {
			name,
			path,
			...metadata
		};
		if (metadata.dateCreated !== undefined) {
			this.createdAt = metadata.dateCreated;
		}
		if (metadata.dateModified !== undefined) {
			this.modifiedAt = metadata.dateModified;
		}
	}

	async load(): Promise<void> {
		if (this.state === AssetState.LOADED && this.texture) {
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
			if (!this.url || this.url === 'null' || this.url === 'undefined' || this.url.trim() === '') {
				throw new Error(`Invalid texture URL: ${this.url}`);
			}

			this.texture = await new Promise<THREE.Texture>((resolve, reject) => {
				this.loader.load(
					this.url,
					(texture) => {
						if (this.metadata.width === undefined && texture.image) {
							this.metadata.width = texture.image.width;
							this.metadata.height = texture.image.height;
						}
						if (this.metadata.format === undefined) {
							this.metadata.format = texture.format;
						}
						if (this.metadata.type === undefined) {
							this.metadata.type = texture.type;
						}
						if (this.metadata.colorSpace === undefined) {
							this.metadata.colorSpace = texture.colorSpace;
						}
						if (this.metadata.flipY === undefined) {
							this.metadata.flipY = texture.flipY;
						}
						if (this.metadata.generateMipmaps === undefined) {
							this.metadata.generateMipmaps = texture.generateMipmaps;
						}
						if (this.metadata.minFilter === undefined) {
							this.metadata.minFilter = texture.minFilter;
						}
						if (this.metadata.magFilter === undefined) {
							this.metadata.magFilter = texture.magFilter;
						}
						if (this.metadata.wrapS === undefined) {
							this.metadata.wrapS = texture.wrapS;
						}
						if (this.metadata.wrapT === undefined) {
							this.metadata.wrapT = texture.wrapT;
						}
						if (this.metadata.anisotropy === undefined) {
							this.metadata.anisotropy = texture.anisotropy;
						}
						resolve(texture);
					},
					undefined,
					(error) => {
						const errorMessage = error instanceof Error ? error.message : `Failed to load texture from ${this.url}`;
						reject(new Error(errorMessage));
					}
				);
			});

			this.data = this.texture;
			this.state = AssetState.LOADED;
			this.emit('loaded', this.texture);
		} catch (error: any) {
			this.state = AssetState.FAILED;
			this.error = error?.message || 'Failed to load texture';
			this.emit('error', error);
			throw error;
		}
	}

	unload(): void {
		if (this.texture) {
			this.texture.dispose();
			this.texture = null;
		}
		this.data = null;
		this.state = AssetState.NOT_LOADED;
	}

	getTexture(): THREE.Texture | null {
		return this.texture;
	}

	getImage(): HTMLImageElement | null {
		if (this.texture && this.texture.image) {
			return this.texture.image as HTMLImageElement;
		}
		return null;
	}

	getMetadata(): TextureAssetMetadata {
		return { ...this.metadata };
	}

	async updateMetadata(updates: Partial<TextureAssetMetadata>): Promise<void> {
		this.metadata = { ...this.metadata, ...updates };
		if (this.texture) {
			if (updates.colorSpace !== undefined) {
				this.texture.colorSpace = updates.colorSpace;
			}
			if (updates.flipY !== undefined) {
				this.texture.flipY = updates.flipY;
			}
			if (updates.generateMipmaps !== undefined) {
				this.texture.generateMipmaps = updates.generateMipmaps;
			}
			if (updates.minFilter !== undefined) {
				this.texture.minFilter = updates.minFilter as THREE.MinificationTextureFilter;
			}
			if (updates.magFilter !== undefined) {
				this.texture.magFilter = updates.magFilter as THREE.MagnificationTextureFilter;
			}
			if (updates.wrapS !== undefined) {
				this.texture.wrapS = updates.wrapS as THREE.Wrapping;
			}
			if (updates.wrapT !== undefined) {
				this.texture.wrapT = updates.wrapT as THREE.Wrapping;
			}
			if (updates.anisotropy !== undefined) {
				this.texture.anisotropy = updates.anisotropy;
			}
			this.texture.needsUpdate = true;
		}
		this.modifiedAt = Date.now();
		await this.emitAsync('changed', this);
	}
}
