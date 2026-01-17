import * as THREE from 'three';
import { ProjectLoader } from './ProjectLoader';

export class AssetObjectLoader extends THREE.ObjectLoader {

	async parseAsync( json: any ): Promise<THREE.Object3D> {

		if ( json.textures ) {
			if ( ! json.images ) {
				json.images = [];
			}
			
			for ( const texture of json.textures ) {
				// Get asset path from texture userData (set by editor)
				let assetPath: string | null = null;
				if ( texture.userData && texture.userData.assetPath ) {
					assetPath = texture.userData.assetPath;
				}
				
				if ( texture.image ) {
					let imageUuid: string;
					let imagePath: string | null = null;
					
					if ( typeof texture.image === 'string' ) {
						// Image is a UUID string
						imageUuid = texture.image;
						const imageObj = json.images.find( ( img: any ) => img.uuid === imageUuid );
						if ( imageObj ) {
							imagePath = imageObj.url || assetPath;
						}
					} else if ( typeof texture.image === 'object' && texture.image.uuid ) {
						// Image is an object with UUID
						imageUuid = texture.image.uuid;
						imagePath = texture.image.url || assetPath;
					} else {
						// Image is a direct path (legacy)
						imagePath = texture.image as string;
						imageUuid = THREE.MathUtils.generateUUID();
					}
					
					const finalPath = assetPath || imagePath;
					
					if ( finalPath && ! finalPath.startsWith( 'data:' ) && ! finalPath.startsWith( 'blob:' ) && ! finalPath.startsWith( 'http' ) ) {
						let normalizedPath = finalPath;
						if ( normalizedPath.startsWith( '/' ) ) {
							normalizedPath = normalizedPath.slice( 1 );
						}
						normalizedPath = normalizedPath.replace( /\/+/g, '/' );
						
						if ( !normalizedPath.startsWith( 'assets/' ) ) {
							normalizedPath = 'assets/' + normalizedPath;
						}
						
						const existingImageIndex = json.images.findIndex( ( img: any ) => img.uuid === imageUuid );
						if ( existingImageIndex >= 0 ) {
							json.images[ existingImageIndex ].url = normalizedPath;
						} else {
							json.images.push( {
								uuid: imageUuid,
								url: normalizedPath
							} );
						}
						
						if ( typeof texture.image === 'object' ) {
							texture.image = imageUuid;
						} else if ( typeof texture.image === 'string' && texture.image !== imageUuid ) {
							// Only update if it's not already a UUID
							texture.image = imageUuid;
						}
					}
				}
			}
		}

		return super.parseAsync( json );

	}

}
