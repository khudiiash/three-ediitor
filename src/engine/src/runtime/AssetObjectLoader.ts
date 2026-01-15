import * as THREE from 'three';

export class AssetObjectLoader extends THREE.ObjectLoader {

	async parseAsync( json: any ): Promise<THREE.Object3D> {

		if ( json.textures ) {
			for ( const texture of json.textures ) {
				if ( texture.image && typeof texture.image === 'string' ) {
					const imagePath = texture.image;
					const imageUuid = THREE.MathUtils.generateUUID();
					
					if ( ! json.images ) {
						json.images = [];
					}
					
					json.images.push( {
						uuid: imageUuid,
						url: 'assets/' + imagePath
					} );
					
					texture.image = imageUuid;
				}
			}
		}

		return super.parseAsync( json );

	}

}
