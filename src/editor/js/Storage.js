function Storage() {

	// Use Tauri filesystem API if available, otherwise fall back to IndexedDB
	const isTauri = typeof window !== 'undefined' && window.__TAURI__;
	let currentProjectPath = null;

	if ( isTauri ) {

		// In Tauri v1, invoke is accessed via window.__TAURI__.invoke
		const invoke = window.__TAURI__.invoke;

		return {

			init: function ( callback ) {

				callback();

			},

			get: async function ( callback ) {

				if ( ! currentProjectPath ) {

					callback( undefined );
					return;

				}

				try {

					
					// Use Tauri command to read the file - handles path resolution on Rust side
					const content = await invoke( 'read_scene_file', { projectPath: currentProjectPath } );
					
					if ( !content || content.trim() === '' ) {
						console.warn( 'Scene file is empty' );
						callback( undefined );
						return;
					}
					
					const data = JSON.parse( content );
					
					if ( !data || !data.scene ) {
						console.warn( 'Scene file does not contain valid scene data' );
						callback( undefined );
						return;
					}
					
					callback( data );

				} catch ( error ) {

					const errorMessage = error.message || String( error );
					
					if ( errorMessage && errorMessage.includes( 'File not found' ) ) {
					} else if ( errorMessage && errorMessage.includes( 'JSON' ) ) {
						console.error( 'Scene file contains invalid JSON. The file may be corrupted.' );
					} else {
						console.warn( 'Failed to load scene from file:', error );
						console.warn( 'Error details:', errorMessage );
					}
					
					callback( undefined );

				}

			},

			set: async function ( data ) {

				if ( ! currentProjectPath ) {
					console.warn( '[Storage] Cannot save scene: project path not set' );
					return;
				}

				const start = performance.now();

				try {

					// Custom replacer to convert texture image base64 data to asset URLs
					// This walks the JSON tree and replaces image.data (base64) with image.url (asset path)
					function replaceTextureImages( obj, textureMap ) {
						if ( Array.isArray( obj ) ) {
							return obj.map( item => replaceTextureImages( item, textureMap ) );
						} else if ( obj && typeof obj === 'object' ) {
							const result = {};
							for ( const key in obj ) {
								if ( key === 'image' && obj[ key ] && typeof obj[ key ] === 'object' ) {
									// This is a texture image object
									const imageObj = obj[ key ];
									if ( imageObj.data ) {
										// Has base64 data - replace with URL reference
										// Find texture UUID from parent (texture object should have uuid)
										const textureUuid = obj.uuid || imageObj.uuid;
										if ( textureUuid && textureMap && textureMap[ textureUuid ] ) {
											// Use the asset path from the texture map
											result[ key ] = {
												uuid: imageObj.uuid || textureUuid,
												url: textureMap[ textureUuid ].path || 'assets/textures/' + textureUuid + '.png'
											};
										} else {
											// Fallback: keep original but remove base64 data
											result[ key ] = {
												uuid: imageObj.uuid || textureUuid,
												url: 'assets/textures/' + ( textureUuid || 'unknown' ) + '.png'
											};
										}
									} else {
										result[ key ] = replaceTextureImages( imageObj, textureMap );
									}
								} else {
									result[ key ] = replaceTextureImages( obj[ key ], textureMap );
								}
							}
							return result;
						}
						return obj;
					}

					// Get texture map from editor if available
					// The editor instance is passed via closure or we can access it from the global scope
					// For now, we'll need to pass it differently - let's use a simpler approach
					// and modify the toJSON method in Editor.js instead
					let textureMap = null;

					// Replace texture images with URLs
					const processedData = replaceTextureImages( data, textureMap );

					const content = JSON.stringify( processedData, null, '\t' );
					
					console.log( '[Storage] Saving scene to project path:', currentProjectPath );
					
					// Use Tauri command to write the file - handles path resolution on Rust side
					await invoke( 'write_scene_file', { 
						projectPath: currentProjectPath,
						content: content
					} );
					
					const elapsed = ( performance.now() - start ).toFixed( 2 );
					console.log( '[' + /\d\d\:\d\d\:\d\d/.exec( new Date() )[ 0 ] + ']', 'Saved state to file. ' + elapsed + 'ms' );

				} catch ( error ) {

					console.error( 'Failed to save scene to file:', error );

				}

			},

			clear: function () {
				// Don't clear the project path - we need it for saving
			},

			setProjectPath: function ( path ) {
				console.log( '[Storage] Setting project path to:', path );
				currentProjectPath = path;
			},

			getProjectPath: function () {

				return currentProjectPath;

			}

		};

	}

	// Fallback to IndexedDB for browser mode
	const indexedDB = window.indexedDB;

	if ( indexedDB === undefined ) {

		console.warn( 'Storage: IndexedDB not available.' );
		return { init: function () {}, get: function () {}, set: function () {}, clear: function () {} };

	}

	const name = 'threejs-editor';
	const version = 1;

	let database;

	return {

		init: function ( callback ) {

			const request = indexedDB.open( name, version );
			request.onupgradeneeded = function ( event ) {

				const db = event.target.result;

				if ( db.objectStoreNames.contains( 'states' ) === false ) {

					db.createObjectStore( 'states' );

				}

			};

			request.onsuccess = function ( event ) {

				database = event.target.result;

				callback();

			};

			request.onerror = function ( event ) {

				console.error( 'IndexedDB', event );

			};


		},

		get: function ( callback ) {

			const transaction = database.transaction( [ 'states' ], 'readonly' );
			const objectStore = transaction.objectStore( 'states' );
			const request = objectStore.get( 0 );
			request.onsuccess = function ( event ) {

				callback( event.target.result );

			};

		},

		set: function ( data ) {

			const start = performance.now();

			const transaction = database.transaction( [ 'states' ], 'readwrite' );
			const objectStore = transaction.objectStore( 'states' );
			const request = objectStore.put( data, 0 );
			request.onsuccess = function () { 
				console.log( '[' + /\d\d\:\d\d\:\d\d/.exec( new Date() )[ 0 ] + ']', 'Saved state to IndexedDB. ' + ( performance.now() - start ).toFixed( 2 ) + 'ms' );
			};

		},

		clear: function () {

			if ( database === undefined ) return;

			const transaction = database.transaction( [ 'states' ], 'readwrite' );
			const objectStore = transaction.objectStore( 'states' );
			const request = objectStore.clear();
			request.onsuccess = function () {

				console.log( '[' + /\d\d\:\d\d\:\d\d/.exec( new Date() )[ 0 ] + ']', 'Cleared IndexedDB.' );

			};

		}

	};

}

export { Storage };
