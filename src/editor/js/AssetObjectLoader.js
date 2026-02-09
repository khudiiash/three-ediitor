import * as THREE from 'three';
import {
	NodeObjectLoader,
	MeshStandardNodeMaterial,
	MeshPhysicalNodeMaterial,
	MeshBasicNodeMaterial,
	MeshPhongNodeMaterial,
	MeshSSSNodeMaterial,
	MeshToonNodeMaterial,
	MeshLambertNodeMaterial,
	MeshNormalNodeMaterial,
	PointsNodeMaterial,
} from 'three/webgpu';
import { MaterialAsset } from '@engine/three-engine.js';

class AssetObjectLoader extends NodeObjectLoader {

	constructor( manager, projectPath, editor = null ) {

		super( manager );
		this.projectPath = projectPath;
		this.editor = editor;
		// Use Three.js NodeObjectLoader/NodeMaterialLoader: register node material types so when
		// scene JSON contains materials with type MeshPhysicalNodeMaterial, MeshToonNodeMaterial, etc.,
		// the loader instantiates the correct class. NodeMaterialObserver is used internally by
		// WebGPURenderer to detect when node materials need a refresh; we do not add custom observing.
		this.nodeMaterials = {
			MeshStandardNodeMaterial,
			MeshPhysicalNodeMaterial,
			MeshBasicNodeMaterial,
			MeshPhongNodeMaterial,
			MeshSSSNodeMaterial,
			MeshToonNodeMaterial,
			MeshLambertNodeMaterial,
			MeshNormalNodeMaterial,
			PointsNodeMaterial,
		};

	}

	/**
	 * Override so we never call NodeLoader.parseNodes with null/non-array (avoids "json is not iterable").
	 * We don't register TSL node types (VarNode, ConstNode, etc.), so we skip node graph parsing;
	 * node graphs come from generateMaterialFromNodes when loading .nodemat assets.
	 */
	parseNodes( json, textures ) {

		if ( json != null && Array.isArray( json ) ) {

			return super.parseNodes( json, textures );

		}

		return {};

	}

	async parseAsync( json ) {

		// Skip parsing json.nodes so parseNodes() is never given null (NodeLoader expects iterable).
		this._nodesJSON = null;

		if ( json.textures ) {
			const isTauri = typeof window !== 'undefined' && window.__TAURI__ && window.__TAURI__.core.invoke;
			
			if ( ! json.images ) {
				json.images = [];
			}
			
			const imagesToAdd = [];
			const imageUuidMap = new Map(); 
			
			for ( const texture of json.textures ) {
				
				let assetPath = null;
				if ( texture.userData && texture.userData.assetPath ) {
					assetPath = texture.userData.assetPath;
				}
				
				if ( texture.image ) {
					let imageUuid;
					let imagePath;
					
					if ( typeof texture.image === 'string' ) {
						
						imagePath = texture.image;
						imageUuid = THREE.MathUtils.generateUUID();
					} else if ( typeof texture.image === 'object' && texture.image.uuid ) {
						
						imageUuid = texture.image.uuid;
						imagePath = texture.image.url || assetPath;
					} else {
						
						imageUuid = texture.image;
						
						if ( json.images ) {
							const imageObj = json.images.find( img => img.uuid === imageUuid );
							if ( imageObj ) {
								const isInBrowser = typeof window !== 'undefined' && window.location && window.location.protocol === 'http:';
								if ( imageObj.url && imageObj.url.startsWith( 'blob:' ) && isInBrowser && assetPath ) {
									imagePath = assetPath;
								} else {
									imagePath = imageObj.url || assetPath;
								}
							}
						}
					}
					
					
					let finalPath = assetPath || imagePath;
					
					const isInBrowser = typeof window !== 'undefined' && window.location && window.location.protocol === 'http:';
					if ( finalPath && finalPath.startsWith( 'blob:' ) && isInBrowser && assetPath ) {
						let normalizedPath = assetPath;
						if ( normalizedPath.startsWith( '/' ) ) {
							normalizedPath = normalizedPath.slice( 1 );
						}
						if ( !normalizedPath.startsWith( 'assets/' ) ) {
							normalizedPath = 'assets/' + normalizedPath;
						}
						if ( json.images ) {
							const imageObj = json.images.find( img => img.uuid === imageUuid );
							if ( imageObj ) {
								imageObj.url = normalizedPath;
							}
						}
						finalPath = normalizedPath;
					}
					
					if ( finalPath && ! finalPath.startsWith( 'data:' ) && ! finalPath.startsWith( 'blob:' ) && ! finalPath.startsWith( 'http' ) ) {
						
						let normalizedPath = finalPath;
						if ( normalizedPath.startsWith( '/' ) ) {
							normalizedPath = normalizedPath.slice( 1 );
						}
						normalizedPath = normalizedPath.replace( /\/+/g, '/' );
						
						if ( !normalizedPath.startsWith( 'assets/' ) ) {
							normalizedPath = 'assets/' + normalizedPath;
						}
						
						if ( isTauri && this.projectPath ) {
							const assetPathForLoader = normalizedPath.startsWith( 'assets/' ) ? normalizedPath.slice( 7 ) : normalizedPath;
							
							const existingImageIndex = json.images.findIndex( img => img.uuid === imageUuid );
							if ( existingImageIndex >= 0 ) {
								json.images[ existingImageIndex ].url = normalizedPath;
							} else {
								imagesToAdd.push( {
									uuid: imageUuid,
									url: normalizedPath
								} );
							}
							
							
							if ( typeof texture.image === 'string' ) {
								texture.image = imageUuid;
							} else if ( typeof texture.image === 'object' ) {
								texture.image = imageUuid;
							}
							
							imageUuidMap.set( imageUuid, assetPathForLoader );
						} else {
							
							const existingImageIndex = json.images.findIndex( img => img.uuid === imageUuid );
							if ( existingImageIndex >= 0 ) {
								json.images[ existingImageIndex ].url = normalizedPath;
							} else {
								imagesToAdd.push( {
									uuid: imageUuid,
									url: normalizedPath
								} );
							}
						}
					}
				}
			}
			
			json.images = imagesToAdd.concat( json.images );
		}
		
		const manager = this.manager || new THREE.LoadingManager();
		
		const isTauri = typeof window !== 'undefined' && window.__TAURI__ && window.__TAURI__.core?.invoke;
		const isInBrowser = typeof window !== 'undefined' && window.location && window.location.protocol === 'http:';
		const useApiForAssets = isInBrowser || !isTauri;
		
		if ( this.projectPath ) {
			const projectPath = this.projectPath;
			const projectName = projectPath.split( /[/\\]/ ).pop();
			
			if ( isTauri && !isInBrowser ) {
				manager.setURLModifier( ( url ) => {
					if ( url && url.startsWith( 'assets/' ) && !url.startsWith( 'data:' ) && !url.startsWith( 'blob:' ) && !url.startsWith( 'http' ) ) {
						return url;
					}
					return url;
				} );
				
				const originalFileLoaderLoad = THREE.FileLoader.prototype.load;
				THREE.FileLoader.prototype.load = function( url, onLoad, onProgress, onError ) {
					if ( url && typeof url === 'string' && url.startsWith( 'assets/' ) && !url.startsWith( 'data:' ) && !url.startsWith( 'blob:' ) && !url.startsWith( 'http' ) ) {
						const assetPath = url.startsWith( 'assets/' ) ? url.slice( 7 ) : url;
						
						window.__TAURI__.core.invoke( 'read_asset_file', {
							projectPath: projectPath,
							assetPath: assetPath
						} ).then( ( assetBytes ) => {
							const blob = new Blob( [ assetBytes ] );
							const blobUrl = URL.createObjectURL( blob );
							originalFileLoaderLoad.call( this, blobUrl, onLoad, onProgress, onError );
						} ).catch( ( error ) => {
							console.error( '[AssetObjectLoader] Failed to load asset:', assetPath, error );
							if ( onError ) onError( error );
						} );
						return;
					}
					return originalFileLoaderLoad.call( this, url, onLoad, onProgress, onError );
				};
			} else if ( useApiForAssets ) {
				const extractAssetPath = ( url ) => {
					if ( !url || typeof url !== 'string' ) return null;
					
					let assetPath = null;
					
					if ( url.startsWith( 'assets/' ) ) {
						assetPath = url.slice( 7 );
					} else if ( url.includes( '/assets/' ) ) {
						const assetsIndex = url.indexOf( '/assets/' );
						assetPath = url.substring( assetsIndex + 8 );
					} else if ( !url.startsWith( 'http' ) && !url.startsWith( '/' ) && !url.includes( '://' ) ) {
						const ext = url.split( '.' ).pop()?.toLowerCase();
						const imageExts = [ 'jpg', 'jpeg', 'png', 'gif', 'webp', 'hdr', 'exr', 'tga', 'ktx2' ];
						if ( ext && imageExts.includes( ext ) ) {
							assetPath = url;
						}
					}
					
					if ( assetPath ) {
						while ( assetPath.startsWith( 'assets/' ) ) {
							assetPath = assetPath.slice( 7 );
						}
						return assetPath;
					}
					
					return null;
				};
				
				manager.setURLModifier( ( url ) => {
					if ( !url || typeof url !== 'string' ) {
						return url;
					}
					if ( url.startsWith( 'data:' ) || url.startsWith( 'blob:' ) || url.startsWith( '/api/projects/' ) ) {
						return url;
					}
					
					const assetPath = extractAssetPath( url );
					
					if ( assetPath ) {
						const encodedProjectName = encodeURIComponent( projectName );
						const encodedAssetPath = encodeURIComponent( assetPath );
						const apiUrl = `/api/projects/${encodedProjectName}/assets/${encodedAssetPath}`;
						return apiUrl;
					}
					return url;
				} );
				
				const ImageLoader = THREE.ImageLoader;
				if ( ImageLoader && !ImageLoader.prototype.__editorAssetLoaderIntercepted ) {
					ImageLoader.prototype.__editorAssetLoaderIntercepted = true;
					const originalImageLoaderLoad = ImageLoader.prototype.load;
					ImageLoader.prototype.load = function( url, onLoad, onProgress, onError ) {
						
						if ( url && typeof url === 'string' && ( url.startsWith( 'data:' ) || url.startsWith( '/api/projects/' ) ) ) {
							return originalImageLoaderLoad.call( this, url, onLoad, onProgress, onError );
						}
						
						if ( url && typeof url === 'string' && url.startsWith( 'blob:' ) && useApiForAssets ) {
						} else if ( url && typeof url === 'string' && url.startsWith( 'blob:' ) ) {
							return originalImageLoaderLoad.call( this, url, onLoad, onProgress, onError );
						}
						
						const assetPath = extractAssetPath( url );
						
						if ( assetPath ) {
							const encodedProjectName = encodeURIComponent( projectName );
							const encodedAssetPath = encodeURIComponent( assetPath );
							const apiUrl = `/api/projects/${encodedProjectName}/assets/${encodedAssetPath}`;
							return originalImageLoaderLoad.call( this, apiUrl, onLoad, onProgress, onError );
						}
						
						return originalImageLoaderLoad.call( this, url, onLoad, onProgress, onError );
					};
				}
			}
		}
		
		this.manager = manager;
		
		if ( json.materials && this.editor ) {
			const originalParseMaterials = this.parseMaterials.bind( this );
			this.parseMaterials = ( materialsJson, textures ) => {
				const parsedMaterials = originalParseMaterials( materialsJson, textures );
				const materialMap = {};
				
				if ( Array.isArray( parsedMaterials ) ) {
					parsedMaterials.forEach( ( material, index ) => {
						if ( material && materialsJson[ index ] ) {
							const materialJson = materialsJson[ index ];
							if ( materialJson.userData && materialJson.userData.assetPath ) {
								const assetPath = materialJson.userData.assetPath.startsWith( '/' ) ? materialJson.userData.assetPath.slice( 1 ) : materialJson.userData.assetPath;
								material.assetPath = assetPath;
								const materialAsset = this.editor.assets.getByUrl( assetPath );
								if ( materialAsset && materialAsset instanceof MaterialAsset ) {
									const assetMaterial = materialAsset.getMaterial();
									if ( assetMaterial ) {
										materialMap[ material.uuid ] = assetMaterial;
									}
								}
							}
						}
					} );
				} else if ( parsedMaterials && typeof parsedMaterials === 'object' ) {
					for ( const uuid in parsedMaterials ) {
						const material = parsedMaterials[ uuid ];
						if ( material ) {
							const materialJson = materialsJson.find( m => m.uuid === uuid );
							if ( materialJson && materialJson.userData && materialJson.userData.assetPath ) {
								const assetPath = materialJson.userData.assetPath.startsWith( '/' ) ? materialJson.userData.assetPath.slice( 1 ) : materialJson.userData.assetPath;
								material.assetPath = assetPath;
								const materialAsset = this.editor.assets.getByUrl( assetPath );
								if ( materialAsset && materialAsset instanceof MaterialAsset ) {
									const assetMaterial = materialAsset.getMaterial();
									if ( assetMaterial ) {
										materialMap[ uuid ] = assetMaterial;
									}
								}
							}
						}
					}
				}
				
				if ( Object.keys( materialMap ).length > 0 ) {
					if ( Array.isArray( parsedMaterials ) ) {
						return parsedMaterials.map( ( material, index ) => {
							return materialMap[ material.uuid ] || material;
						} );
					} else {
						const result = {};
						for ( const uuid in parsedMaterials ) {
							result[ uuid ] = materialMap[ uuid ] || parsedMaterials[ uuid ];
						}
						return result;
					}
				}
				
				return parsedMaterials;
			};
		}
		
		const result = await super.parseAsync( json );
		this._nodesJSON = null;

		if ( json.textures && result ) {
			result.traverse( function( object ) {
				if ( object.material ) {
					const materials = Array.isArray( object.material ) ? object.material : [ object.material ];
					materials.forEach( function( material ) {
						if ( material ) {
							const textureProps = [ 'map', 'normalMap', 'bumpMap', 'roughnessMap', 'metalnessMap', 
								'aoMap', 'emissiveMap', 'displacementMap', 'alphaMap', 'envMap', 
								'lightMap', 'clearcoatMap', 'clearcoatNormalMap', 'clearcoatRoughnessMap',
								'sheenColorMap', 'sheenRoughnessMap', 'specularColorMap', 'specularIntensityMap',
								'transmissionMap', 'thicknessMap', 'iridescenceMap', 'iridescenceThicknessMap' ];
							
							textureProps.forEach( function( prop ) {
								const texture = material[ prop ];
								if ( texture && texture.isTexture && texture.uuid ) {
									
									const textureJson = json.textures.find( t => t.uuid === texture.uuid );
									if ( textureJson && textureJson.userData && textureJson.userData.assetPath ) {
										texture.assetPath = textureJson.userData.assetPath;
									}
								}
							} );
							
							if ( material.assetPath ) {
								const assetPath = material.assetPath.startsWith( '/' ) ? material.assetPath.slice( 1 ) : material.assetPath;
								const materialAsset = this.editor ? this.editor.assets.getByUrl( assetPath ) : null;
								if ( materialAsset && materialAsset instanceof MaterialAsset ) {
									const assetMaterial = materialAsset.getMaterial();
									if ( assetMaterial && assetMaterial !== material ) {
										if ( Array.isArray( object.material ) ) {
											const index = object.material.indexOf( material );
											if ( index !== -1 ) {
												object.material[ index ] = assetMaterial;
											}
										} else {
											object.material = assetMaterial;
										}
									}
								}
							}
						}
					}.bind( this ) );
				}
			}.bind( this ) );
		}
		
		return result;

	}

}

export { AssetObjectLoader };
