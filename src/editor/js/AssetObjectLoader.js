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
								imagePath = imageObj.url || assetPath;
							}
						}
					}
					
					
					const finalPath = assetPath || imagePath;
					
					if ( finalPath && ! finalPath.startsWith( 'data:' ) && ! finalPath.startsWith( 'blob:' ) && ! finalPath.startsWith( 'http' ) ) {
						
						if ( isTauri && this.projectPath ) {
							try {
								
								let normalizedPath = finalPath;
								if ( normalizedPath.startsWith( '/' ) ) {
									normalizedPath = normalizedPath.slice( 1 );
								}
								normalizedPath = normalizedPath.replace( /\/+/g, '/' );
								
								const assetBytes = await window.__TAURI__.core.invoke( 'read_asset_file', {
									projectPath: this.projectPath,
									assetPath: normalizedPath
								} );
								
								const uint8Array = new Uint8Array( assetBytes );
								const blob = new Blob( [ uint8Array ] );
								const blobUrl = URL.createObjectURL( blob );
								
								
								const existingImageIndex = json.images.findIndex( img => img.uuid === imageUuid );
								if ( existingImageIndex >= 0 ) {
									json.images[ existingImageIndex ].url = blobUrl;
								} else {
									imagesToAdd.push( {
										uuid: imageUuid,
										url: blobUrl
									} );
								}
								
								
								if ( typeof texture.image === 'string' ) {
									texture.image = imageUuid;
								} else if ( typeof texture.image === 'object' ) {
									texture.image = imageUuid;
								}
								
								imageUuidMap.set( imageUuid, normalizedPath );
								
							} catch ( error ) {
								console.error( '[AssetObjectLoader] Failed to load asset:', finalPath, 'for texture UUID:', texture.uuid, error );
								
								
								const existingImageIndex = json.images.findIndex( img => img.uuid === imageUuid );
								if ( existingImageIndex >= 0 ) {
									json.images[ existingImageIndex ].url = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
								} else {
									imagesToAdd.push( {
										uuid: imageUuid,
										url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
									} );
								}
							}
						} else {
							
							const existingImageIndex = json.images.findIndex( img => img.uuid === imageUuid );
							if ( existingImageIndex >= 0 ) {
								json.images[ existingImageIndex ].url = 'assets/' + finalPath;
							} else {
								imagesToAdd.push( {
									uuid: imageUuid,
									url: 'assets/' + finalPath
								} );
							}
						}
					}
				}
			}
			
			json.images = imagesToAdd.concat( json.images );
		}
		
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
