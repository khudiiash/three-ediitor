import * as THREE from 'three';

class AssetObjectLoader extends THREE.ObjectLoader {

	constructor( manager, projectPath ) {

		super( manager );
		this.projectPath = projectPath;

	}

	async parseAsync( json ) {

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
								// In browser mode, ignore blob URLs from IndexedDB and use asset path instead
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
					
					// In browser mode, ignore blob URLs and use asset path
					const isInBrowser = typeof window !== 'undefined' && window.location && window.location.protocol === 'http:';
					if ( finalPath && finalPath.startsWith( 'blob:' ) && isInBrowser && assetPath ) {
						// Replace blob URL with asset path in browser mode
						let normalizedPath = assetPath;
						if ( normalizedPath.startsWith( '/' ) ) {
							normalizedPath = normalizedPath.slice( 1 );
						}
						if ( !normalizedPath.startsWith( 'assets/' ) ) {
							normalizedPath = 'assets/' + normalizedPath;
						}
						// Update the image URL to use asset path instead of blob URL
						if ( json.images ) {
							const imageObj = json.images.find( img => img.uuid === imageUuid );
							if ( imageObj ) {
								imageObj.url = normalizedPath;
							}
						}
						// Update finalPath to use normalized path
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
				// Tauri mode - use file system access
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
				// Browser/play mode - use API
				console.log( '[AssetObjectLoader] Setting up API asset loading for project:', projectName );
				
				// Helper function to extract and normalize asset path
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
						// Remove any leading 'assets/' from assetPath to avoid double prefix
						while ( assetPath.startsWith( 'assets/' ) ) {
							assetPath = assetPath.slice( 7 );
						}
						return assetPath;
					}
					
					return null;
				};
				
				manager.setURLModifier( ( url ) => {
					if ( !url || typeof url !== 'string' ) {
						console.log( '[AssetObjectLoader] URL modifier: invalid URL', url );
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
						console.log( '[AssetObjectLoader] URL modifier transforming:', url, '->', apiUrl );
						return apiUrl;
					}
					return url;
				} );
				
				// Also intercept ImageLoader for textures (ImageLoader might not use URL modifier)
				const ImageLoader = THREE.ImageLoader;
				if ( ImageLoader && !ImageLoader.prototype.__editorAssetLoaderIntercepted ) {
					ImageLoader.prototype.__editorAssetLoaderIntercepted = true;
					const originalImageLoaderLoad = ImageLoader.prototype.load;
					ImageLoader.prototype.load = function( url, onLoad, onProgress, onError ) {
						console.log( '[AssetObjectLoader] ImageLoader.load called with URL:', url, 'projectName:', projectName );
						
						// Skip data URLs and already-transformed API URLs
						if ( url && typeof url === 'string' && ( url.startsWith( 'data:' ) || url.startsWith( '/api/projects/' ) ) ) {
							return originalImageLoaderLoad.call( this, url, onLoad, onProgress, onError );
						}
						
						// In browser mode, don't use blob URLs from IndexedDB - use API instead
						if ( url && typeof url === 'string' && url.startsWith( 'blob:' ) && useApiForAssets ) {
							console.log( '[AssetObjectLoader] Ignoring blob URL in browser mode, will use asset path instead:', url );
							// Don't return here - let it fall through to asset path detection
						} else if ( url && typeof url === 'string' && url.startsWith( 'blob:' ) ) {
							// In Tauri mode, blob URLs are fine
							return originalImageLoaderLoad.call( this, url, onLoad, onProgress, onError );
						}
						
						// Use the same helper function to extract asset path
						const assetPath = extractAssetPath( url );
						
						if ( assetPath ) {
							// Encode project name and asset path to handle UTF-8 characters
							const encodedProjectName = encodeURIComponent( projectName );
							const encodedAssetPath = encodeURIComponent( assetPath );
							const apiUrl = `/api/projects/${encodedProjectName}/assets/${encodedAssetPath}`;
							console.log( '[AssetObjectLoader] Intercepting asset load, using API:', apiUrl );
							return originalImageLoaderLoad.call( this, apiUrl, onLoad, onProgress, onError );
						}
						
						return originalImageLoaderLoad.call( this, url, onLoad, onProgress, onError );
					};
				}
			}
		}
		
		this.manager = manager;
		const result = await super.parseAsync( json );
		
		
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
						}
					} );
				}
			} );
		}
		
		return result;

	}

}

export { AssetObjectLoader };
