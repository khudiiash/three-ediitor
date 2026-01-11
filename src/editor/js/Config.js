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
		'renderer/toneMappingExposure': 1
	};

	let editorStorage = { ...editorDefaults };
	let projectStorage = { ...projectDefaults };

	const isTauri = typeof window !== 'undefined' && window.__TAURI__;
	const invoke = isTauri ? window.__TAURI__.invoke : null;

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
		if ( !isTauri || !invoke || !storage ) {
			return;
		}

		const projectPath = storage.getProjectPath ? storage.getProjectPath() : null;
		if ( !projectPath ) {
			return;
		}

		try {
			const content = await invoke( 'read_project_config', { projectPath: projectPath } );
			if ( content && content.trim() !== '' ) {
				const data = JSON.parse( content );
				for ( const key in data ) {
					projectStorage[ key ] = data[ key ];
				}
			}
		} catch ( error ) {
			console.warn( '[Config] Failed to load project config:', error );
		}
	}

	async function saveProjectConfig() {
		if ( !isTauri || !invoke || !storage ) {
			return;
		}

		const projectPath = storage.getProjectPath ? storage.getProjectPath() : null;
		if ( !projectPath ) {
			return;
		}

		try {
			await invoke( 'write_project_config', { projectPath: projectPath, content: JSON.stringify( projectStorage, null, '\t' ) } );
			console.log( '[' + /\d\d\:\d\d\:\d\d/.exec( new Date() )[ 0 ] + ']', 'Saved project config to file.' );
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
				saveProjectConfig();
			}

		},

		loadProjectConfig: function () {
			loadProjectConfig();
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
