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

					console.log( '[Storage] Loading scene from project path:', currentProjectPath );
					
					// Use Tauri command to read the file - handles path resolution on Rust side
					const content = await invoke( 'read_scene_file', { projectPath: currentProjectPath } );
					const data = JSON.parse( content );
					callback( data );

				} catch ( error ) {

					console.warn( 'Failed to load scene from file:', error );
					console.warn( 'Error details:', error.message || String( error ) );
					console.warn( 'This is normal if the scene.json file does not exist yet' );
					callback( undefined );

				}

			},

			set: async function ( data ) {

				if ( ! currentProjectPath ) {

					console.warn( '[Storage] No project path set, cannot save to file' );
					console.warn( '[Storage] Make sure project-opened event was received and setProjectPath was called' );
					return;

				}

				const start = performance.now();

				try {

					const content = JSON.stringify( data, null, '\t' );
					
					console.log( '[Storage] Saving scene to project path:', currentProjectPath );
					console.log( '[Storage] Data size:', content.length, 'bytes' );
					
					// Use Tauri command to write the file - handles path resolution on Rust side
					await invoke( 'write_scene_file', { 
						projectPath: currentProjectPath,
						content: content
					} );
					
					const elapsed = ( performance.now() - start ).toFixed( 2 );
					console.log( '[' + /\d\d\:\d\d\:\d\d/.exec( new Date() )[ 0 ] + ']', 'Saved state to file. ' + elapsed + 'ms' );
					console.log( '[Storage] File saved successfully to project:', currentProjectPath );

				} catch ( error ) {

					console.error( '[Storage] Failed to save scene to file!' );
					console.error( '[Storage] Error:', error );
					console.error( '[Storage] Error message:', error.message || String( error ) );
					console.error( '[Storage] Project path:', currentProjectPath );
					console.error( '[Storage] Full error object:', JSON.stringify( error, null, 2 ) );

				}

			},

			clear: function () {

				// Don't clear the project path - we need it for saving
				// Only clear the data, not the path itself
				// currentProjectPath should persist across editor.clear() calls
				console.log( '[Storage] clear() called, but keeping project path:', currentProjectPath );

			},

			setProjectPath: function ( path ) {

				currentProjectPath = path;
				console.log( '[Storage] Project path set to:', path );

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
