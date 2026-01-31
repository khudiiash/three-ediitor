function Storage() {

	let currentProjectPath = null;

	function isTauri() {
		return typeof window !== 'undefined' && window.__TAURI__;
	}

	async function waitForTauriAPI(maxRetries = 100, delay = 10) {
		for (let i = 0; i < maxRetries; i++) {
			if (isTauri() && window.__TAURI__.core && window.__TAURI__.core.invoke) {
				return window.__TAURI__.core.invoke;
			}
			await new Promise(resolve => setTimeout(resolve, delay));
		}
		throw new Error('Tauri API not available after waiting');
	}

	async function tryGetTauriInvoke() {
		if (typeof window === 'undefined') return null;
		if (window.__TAURI__ && window.__TAURI__.core && window.__TAURI__.core.invoke) return window.__TAURI__.core.invoke;
		try {
			return await waitForTauriAPI(100, 10);
		} catch (e) {
			return null;
		}
	}

	function restoreProjectPath() {
		if (typeof window !== 'undefined' && window.sessionStorage) {
			const savedPath = sessionStorage.getItem('editor_project_path');
			if (savedPath) currentProjectPath = savedPath;
		}
	}

	restoreProjectPath();

	const storageImpl = {
			init: function ( callback ) {
				restoreProjectPath();
				callback();
			},

			get: async function ( callback ) {
				restoreProjectPath();
				
				if ( ! currentProjectPath ) {
					callback( undefined );
					return;
				}

				try {
					const invoke = await tryGetTauriInvoke();
					if ( !invoke ) {
						console.warn( '[Storage] Tauri API not available, cannot load scene' );
						callback( undefined );
						return;
					}

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
						callback( undefined );
					} else {
						const errorInfo = {
							error: true,
							message: errorMessage,
							isJsonError: errorMessage && errorMessage.includes( 'JSON' )
						};
						
						if ( errorInfo.isJsonError ) {
							console.error( 'Scene file contains invalid JSON. The file may be corrupted.' );
						} else {
							console.warn( 'Failed to load scene from file:', error );
							console.warn( 'Error details:', errorMessage );
						}
						
						callback( errorInfo );
					}
				}

			},

			set: async function ( data ) {
				restoreProjectPath();
				if (!currentProjectPath) return;

				const start = performance.now();

				try {
					function replaceTextureImages( obj, textureMap ) {
						if ( Array.isArray( obj ) ) {
							return obj.map( item => replaceTextureImages( item, textureMap ) );
						} else if ( obj && typeof obj === 'object' ) {
							const result = {};
							for ( const key in obj ) {
								if ( key === 'image' && obj[ key ] && typeof obj[ key ] === 'object' ) {
									
									const imageObj = obj[ key ];
									if ( imageObj.data ) {
										
										
										const textureUuid = obj.uuid || imageObj.uuid;
										if ( textureUuid && textureMap && textureMap[ textureUuid ] ) {
											
											result[ key ] = {
												uuid: imageObj.uuid || textureUuid,
												url: textureMap[ textureUuid ].path || 'assets/textures/' + textureUuid + '.png'
											};
										} else {
											
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

					let textureMap = null;
					const processedData = replaceTextureImages( data, textureMap );
					const content = JSON.stringify( processedData, null, '\t' );
					
					const invoke = await tryGetTauriInvoke();
					if ( !invoke ) {
						console.warn( '[Storage] Tauri API not available, cannot save scene' );
						return;
					}

					try {
						await invoke( 'write_scene_file', { 
							projectPath: currentProjectPath,
							content: content
						} );
					} catch (invokeError) {
						console.error('[Storage] write_scene_file invoke error:', invokeError);
						throw invokeError;
					}

				} catch ( error ) {
					console.error( '[Storage] Failed to save scene to file:', error );
				}

			},

			clear: function () {},
			setProjectPath: function ( path ) {
				currentProjectPath = path;
				if (typeof window !== 'undefined' && window.sessionStorage) {
					sessionStorage.setItem('editor_project_path', path);
				}
			},
			getProjectPath: function () {
				return currentProjectPath;
			}
		};

	return storageImpl;

}

export { Storage };
