function Config( storage ) {

	const userLanguage = navigator.language.split( '-' )[ 0 ];

	const suggestedLanguage = [ 'fr', 'ja', 'zh', 'ko', 'fa' ].includes( userLanguage ) ? userLanguage : 'en';

	const editorDefaults = {
		'language': suggestedLanguage,
		'autosave': true,
		'settings/history': false,
		'settings/shortcuts/translate': 'w',
		'settings/shortcuts/rotate': 'e',
		'settings/shortcuts/scale': 'r',
		'settings/shortcuts/undo': 'z',
		'settings/shortcuts/focus': 'f'
	};

	const projectDefaults = {
		'title': '',
		'editable': false,
		'vr': false,
		'renderer/antialias': true,
		'renderer/shadows': true,
		'renderer/shadowType': 1,
		'renderer/toneMapping': 0,
		'renderer/toneMappingExposure': 1,
		'defaults/castShadows': false,
		'defaults/receiveShadows': false,
		'defaults/material': null
	};

	let editorStorage = { ...editorDefaults };
	let projectStorage = { ...projectDefaults };

	const isTauri = typeof window !== 'undefined' && window.__TAURI__;
	const invoke = isTauri ? window.__TAURI__.core.invoke : null;

	async function loadEditorConfig() {
		if ( !isTauri || !invoke ) {
			return;
		}

		try {
			const content = await invoke( 'read_editor_config' );
			if ( content && content.trim() !== '' ) {
				const data = JSON.parse( content );
				for ( const key in data ) {
					editorStorage[ key ] = data[ key ];
				}
			}
		} catch ( error ) {
			console.warn( '[Config] Failed to load editor config:', error );
		}
	}

	async function saveEditorConfig() {
		if ( !isTauri || !invoke ) {
			return;
		}

		try {
			await invoke( 'write_editor_config', { content: JSON.stringify( editorStorage, null, '\t' ) } );
			console.log( '[' + /\d\d\:\d\d\:\d\d/.exec( new Date() )[ 0 ] + ']', 'Saved editor config to file.' );
		} catch ( error ) {
			console.error( '[Config] Failed to save editor config:', error );
		}
	}

	async function loadProjectConfig() {
		const currentIsTauri = typeof window !== 'undefined' && window.__TAURI__;
		const currentInvoke = currentIsTauri ? window.__TAURI__.core.invoke : null;
		
		if ( !currentIsTauri || !currentInvoke || !storage ) {
			return;
		}

		const projectPath = storage.getProjectPath ? storage.getProjectPath() : null;
		if ( !projectPath ) {
			return;
		}

		try {
			const content = await currentInvoke( 'read_project_config', { projectPath: projectPath } );
			if ( content && content.trim() !== '' ) {
				const data = JSON.parse( content );
				if ( data.settings && typeof data.settings === 'object' ) {
					for ( const key in data.settings ) {
						if ( typeof data.settings[ key ] === 'object' && data.settings[ key ] !== null && !Array.isArray( data.settings[ key ] ) ) {
							for ( const subKey in data.settings[ key ] ) {
								projectStorage[ key + '/' + subKey ] = data.settings[ key ][ subKey ];
							}
						} else {
							projectStorage[ key ] = data.settings[ key ];
						}
					}
				}
			}
		} catch ( error ) {
			console.warn( '[Config] Failed to load project config:', error );
		}
	}

	async function saveProjectConfig() {
		const currentIsTauri = typeof window !== 'undefined' && window.__TAURI__;
		const currentInvoke = currentIsTauri ? window.__TAURI__.core.invoke : null;
		
		if ( !currentIsTauri || !currentInvoke || !storage ) {
			return;
		}

		const projectPath = storage.getProjectPath ? storage.getProjectPath() : null;
		if ( !projectPath ) {
			console.warn( '[Config] Cannot save project config: project path not set' );
			return;
		}

		try {
			const existingContent = await currentInvoke( 'read_project_config', { projectPath: projectPath } );
			let existingData = {};
			if ( existingContent && existingContent.trim() !== '' ) {
				try {
					existingData = JSON.parse( existingContent );
				} catch ( e ) {
					console.warn( '[Config] Failed to parse existing project config:', e );
					existingData = {};
				}
			}

			const settingsData = {};
			for ( const key in projectStorage ) {
				if ( key.includes( '/' ) ) {
					const parts = key.split( '/' );
					let current = settingsData;
					for ( let i = 0; i < parts.length - 1; i ++ ) {
						if ( !current[ parts[ i ] ] ) {
							current[ parts[ i ] ] = {};
						}
						current = current[ parts[ i ] ];
					}
					current[ parts[ parts.length - 1 ] ] = projectStorage[ key ];
				} else {
					settingsData[ key ] = projectStorage[ key ];
				}
			}

			const mergedData = { ...existingData };
			if ( !mergedData.settings ) {
				mergedData.settings = {};
			}
			for ( const key in settingsData ) {
				if ( typeof settingsData[ key ] === 'object' && settingsData[ key ] !== null && !Array.isArray( settingsData[ key ] ) ) {
					mergedData.settings[ key ] = { ...( mergedData.settings[ key ] || {} ), ...settingsData[ key ] };
				} else {
					mergedData.settings[ key ] = settingsData[ key ];
				}
			}

			const contentToWrite = JSON.stringify( mergedData, null, '\t' );
			await currentInvoke( 'write_project_config', { projectPath: projectPath, content: contentToWrite } );
		} catch ( error ) {
			console.error( '[Config] Failed to save project config:', error );
		}
	}

	loadEditorConfig();

	return {

		getKey: function ( key ) {

			if ( key.startsWith( 'project/' ) ) {
				const projectKey = key.substring( 8 );
				return projectStorage[ projectKey ] !== undefined ? projectStorage[ projectKey ] : projectDefaults[ projectKey ];
			} else if ( key.startsWith( 'settings/' ) ) {
				return editorStorage[ key ] !== undefined ? editorStorage[ key ] : editorDefaults[ key ];
			} else {
				return editorStorage[ key ] !== undefined ? editorStorage[ key ] : editorDefaults[ key ];
			}

		},

		setKey: function () {

			let editorChanged = false;
			let projectChanged = false;

			for ( let i = 0, l = arguments.length; i < l; i += 2 ) {

				const key = arguments[ i ];
				const value = arguments[ i + 1 ];

				if ( key.startsWith( 'project/' ) ) {
					const projectKey = key.substring( 8 );
					projectStorage[ projectKey ] = value;
					projectChanged = true;
				} else {
					editorStorage[ key ] = value;
					editorChanged = true;
				}

			}

			if ( editorChanged ) {
				saveEditorConfig();
			}

			if ( projectChanged ) {
				saveProjectConfig().catch( function ( error ) {
					console.error( '[Config] Error saving project config:', error );
				} );
			}

		},

		loadProjectConfig: function () {
			return loadProjectConfig();
		},

		clear: function () {
			editorStorage = { ...editorDefaults };
			projectStorage = { ...projectDefaults };
			saveEditorConfig();
			saveProjectConfig();
		}

	};

}

export { Config };
