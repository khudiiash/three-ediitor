class ModuleSystem {

	constructor( editor ) {

		this.editor = editor;
		this.modules = new Map();
		this.moduleConfigs = new Map();
		this.hooks = new Map();
		this.assetMenuExtensions = new Map();
		this.materialTypeExtensions = new Map();
		this.materialEditorExtensions = new Map();
		this.uiExtensions = [];
		this.loadingFromProject = false;

	}

	async registerModule( moduleId, moduleClass, config = {} ) {

		if ( this.modules.has( moduleId ) ) {

			console.warn( `[ModuleSystem] Module '${moduleId}' is already registered` );
			return false;

		}

		try {

			const moduleInstance = new moduleClass( this.editor, config );
			
			if ( typeof moduleInstance.init === 'function' ) {

				await moduleInstance.init();

			}

			this.modules.set( moduleId, moduleInstance );
			this.moduleConfigs.set( moduleId, {
				id: moduleId,
				name: config.name || moduleId,
				version: config.version || '1.0.0',
				author: config.author || 'Unknown',
				description: config.description || '',
				enabled: true,
				...config
			} );

			this.editor.signals.moduleRegistered.dispatch( moduleId, moduleInstance );
			
			console.log( `[ModuleSystem] Module '${moduleId}' registered successfully` );
			return true;

		} catch ( error ) {

			console.error( `[ModuleSystem] Failed to register module '${moduleId}':`, error );
			return false;

		}

	}

	async unregisterModule( moduleId ) {

		const moduleInstance = this.modules.get( moduleId );
		
		if ( ! moduleInstance ) {

			console.warn( `[ModuleSystem] Module '${moduleId}' not found` );
			return false;

		}

		try {

			if ( typeof moduleInstance.dispose === 'function' ) {

				await moduleInstance.dispose();

			}

			this.unregisterAssetMenuExtensions( moduleId );
			this.unregisterMaterialTypeExtensions( moduleId );
			this.unregisterMaterialEditorExtensions( moduleId );

			this.modules.delete( moduleId );
			this.moduleConfigs.delete( moduleId );

			await this.removeModuleFromProject( moduleId );

			this.editor.signals.moduleUnregistered.dispatch( moduleId );
			
			console.log( `[ModuleSystem] Module '${moduleId}' unregistered successfully` );
			return true;

		} catch ( error ) {

			console.error( `[ModuleSystem] Failed to unregister module '${moduleId}':`, error );
			return false;

		}

	}

	getModule( moduleId ) {

		return this.modules.get( moduleId );

	}

	getModuleConfig( moduleId ) {

		return this.moduleConfigs.get( moduleId );

	}

	getAllModules() {

		return Array.from( this.modules.entries() );

	}

	getAllModuleConfigs() {

		return Array.from( this.moduleConfigs.values() );

	}

	async enableModule( moduleId ) {

		const moduleInstance = this.modules.get( moduleId );
		const config = this.moduleConfigs.get( moduleId );
		
		if ( ! moduleInstance || ! config ) return false;

		if ( config.enabled ) return true;

		try {

			if ( typeof moduleInstance.enable === 'function' ) {

				await moduleInstance.enable();

			}

			config.enabled = true;
			this.editor.signals.moduleEnabled.dispatch( moduleId );
			
			return true;

		} catch ( error ) {

			console.error( `[ModuleSystem] Failed to enable module '${moduleId}':`, error );
			return false;

		}

	}

	async disableModule( moduleId ) {

		const moduleInstance = this.modules.get( moduleId );
		const config = this.moduleConfigs.get( moduleId );
		
		if ( ! moduleInstance || ! config ) return false;

		if ( ! config.enabled ) return true;

		try {

			if ( typeof moduleInstance.disable === 'function' ) {

				await moduleInstance.disable();

			}

			config.enabled = false;
			this.editor.signals.moduleDisabled.dispatch( moduleId );
			
			return true;

		} catch ( error ) {

			console.error( `[ModuleSystem] Failed to disable module '${moduleId}':`, error );
			return false;

		}

	}

	registerHook( hookName, callback ) {

		if ( ! this.hooks.has( hookName ) ) {

			this.hooks.set( hookName, [] );

		}

		this.hooks.get( hookName ).push( callback );

	}

	async executeHook( hookName, ...args ) {

		const callbacks = this.hooks.get( hookName ) || [];
		
		for ( const callback of callbacks ) {

			try {

				await callback( ...args );

			} catch ( error ) {

				console.error( `[ModuleSystem] Error executing hook '${hookName}':`, error );

			}

		}

	}

	registerAssetMenuExtension( moduleId, assetType, menuItem ) {

		const key = `${moduleId}:${assetType}`;
		
		if ( ! this.assetMenuExtensions.has( assetType ) ) {

			this.assetMenuExtensions.set( assetType, [] );

		}

		this.assetMenuExtensions.get( assetType ).push( {
			moduleId,
			...menuItem
		} );

	}

	unregisterAssetMenuExtensions( moduleId ) {

		for ( const [ assetType, extensions ] of this.assetMenuExtensions.entries() ) {

			const filtered = extensions.filter( ext => ext.moduleId !== moduleId );
			this.assetMenuExtensions.set( assetType, filtered );

		}

	}

	getAssetMenuExtensions( assetType ) {

		return this.assetMenuExtensions.get( assetType ) || [];

	}

	registerMaterialTypeExtension( moduleId, materialTypeInfo ) {

		const key = `${moduleId}:${materialTypeInfo.type}`;
		
		if ( ! this.materialTypeExtensions.has( key ) ) {

			this.materialTypeExtensions.set( key, {
				moduleId,
				...materialTypeInfo
			} );

			console.log( `[ModuleSystem] Registered material type '${materialTypeInfo.type}' from module '${moduleId}'` );

			// Signal that material types have changed so UI can refresh
			this.editor.signals.moduleRegistered.dispatch( moduleId );

		}

	}

	unregisterMaterialTypeExtensions( moduleId ) {

		for ( const [ key, extension ] of this.materialTypeExtensions.entries() ) {

			if ( extension.moduleId === moduleId ) {

				this.materialTypeExtensions.delete( key );

			}

		}

	}

	getMaterialTypeExtensions() {

		return Array.from( this.materialTypeExtensions.values() );

	}

	registerMaterialEditorExtension( moduleId, materialEditorInfo ) {

		if ( ! this.materialEditorExtensions ) {

			this.materialEditorExtensions = new Map();

		}

		const key = `${moduleId}:${materialEditorInfo.materialType}`;
		
		if ( ! this.materialEditorExtensions.has( key ) ) {

			this.materialEditorExtensions.set( key, {
				moduleId,
				...materialEditorInfo
			} );

			console.log( `[ModuleSystem] Registered material editor for '${materialEditorInfo.materialType}' from module '${moduleId}'` );

		}

	}

	unregisterMaterialEditorExtensions( moduleId ) {

		if ( ! this.materialEditorExtensions ) return;

		for ( const [ key, extension ] of this.materialEditorExtensions.entries() ) {

			if ( extension.moduleId === moduleId ) {

				this.materialEditorExtensions.delete( key );

			}

		}

	}

	getMaterialEditorExtensions() {

		if ( ! this.materialEditorExtensions ) return [];

		return Array.from( this.materialEditorExtensions.values() );

	}

	async loadModuleFromUrl( url ) {

		try {

			let resolvedUrl = url;
			let isLocalFile = false;
			
			if ( url.startsWith( './' ) || url.startsWith( '../' ) ) {

				const baseUrl = window.location.href.substring( 0, window.location.href.lastIndexOf( '/' ) + 1 );
				
				if ( url.startsWith( './' ) ) {

					const projectPath = this.editor.storage.getProjectPath();
					
					if ( projectPath ) {

						const modulePath = url.substring( 2 );
						resolvedUrl = `${projectPath}/${modulePath}`.replace( /\\/g, '/' );
						isLocalFile = true;

					} else {

						resolvedUrl = new URL( url, baseUrl ).href;

					}

				} else {

					resolvedUrl = new URL( url, baseUrl ).href;

				}

			} else if ( url.match( /^[A-Za-z]:\\/ ) || url.startsWith( '/' ) ) {

				resolvedUrl = url.replace( /\\/g, '/' );
				isLocalFile = true;

			}
			
			console.log( `[ModuleSystem] Loading module from: ${resolvedUrl}` );

			let module;

			if ( isLocalFile && window.__TAURI__ ) {

				const { readTextFile } = window.__TAURI__.fs;
				const moduleCode = await readTextFile( resolvedUrl );
				
				const blob = new Blob( [ moduleCode ], { type: 'application/javascript' } );
				const blobUrl = URL.createObjectURL( blob );
				
				module = await import( blobUrl );
				
				URL.revokeObjectURL( blobUrl );

			} else {

				module = await import( resolvedUrl );

			}
			
			if ( module.default && typeof module.default === 'function' ) {

				const config = module.config || {};
				const moduleId = config.id || url;
				
				const success = await this.registerModule( moduleId, module.default, config );
				
				if ( success && ! this.loadingFromProject ) {

					await this.saveModuleToProject( url, moduleId );

				}
				
				return success;

			}

			console.error( `[ModuleSystem] Module at '${url}' does not export a default class` );
			return false;

		} catch ( error ) {

			console.error( `[ModuleSystem] Failed to load module from '${url}':`, error );
			return false;

		}

	}

	async saveModuleToProject( url, moduleId ) {

		try {

			const projectPath = this.editor.storage.getProjectPath();
			
			if ( ! projectPath || ! window.__TAURI__ ) return;

			const { readTextFile, writeTextFile } = window.__TAURI__.fs;
			const { invoke } = window.__TAURI__.core;
			
			const projectConfigPath = `${projectPath}/project.json`.replace( /\\/g, '/' );
			const content = await readTextFile( projectConfigPath );
			const projectConfig = JSON.parse( content );

			if ( ! projectConfig.modules ) {

				projectConfig.modules = [];

			}

			const existingIndex = projectConfig.modules.findIndex( m => m.id === moduleId );
			
			if ( existingIndex === - 1 ) {

				projectConfig.modules.push( {
					id: moduleId,
					url: url,
					enabled: true
				} );

			}

			await writeTextFile( projectConfigPath, JSON.stringify( projectConfig, null, 2 ) );
			
			console.log( `[ModuleSystem] Saved module '${moduleId}' to project.json` );

		} catch ( error ) {

			console.error( `[ModuleSystem] Failed to save module to project.json:`, error );

		}

	}

	async removeModuleFromProject( moduleId ) {

		try {

			const projectPath = this.editor.storage.getProjectPath();
			
			if ( ! projectPath || ! window.__TAURI__ ) return;

			const { readTextFile, writeTextFile } = window.__TAURI__.fs;
			
			const projectConfigPath = `${projectPath}/project.json`.replace( /\\/g, '/' );
			const content = await readTextFile( projectConfigPath );
			const projectConfig = JSON.parse( content );

			if ( projectConfig.modules ) {

				projectConfig.modules = projectConfig.modules.filter( m => m.id !== moduleId );
				await writeTextFile( projectConfigPath, JSON.stringify( projectConfig, null, 2 ) );
				
				console.log( `[ModuleSystem] Removed module '${moduleId}' from project.json` );

			}

		} catch ( error ) {

			console.error( `[ModuleSystem] Failed to remove module from project.json:`, error );

		}

	}

	async loadProjectModules() {

		try {

			const projectPath = this.editor.storage.getProjectPath();
			
			if ( ! projectPath || ! window.__TAURI__ ) return;

			const { readTextFile } = window.__TAURI__.fs;
			
			const projectConfigPath = `${projectPath}/project.json`.replace( /\\/g, '/' );
			const content = await readTextFile( projectConfigPath );
			const projectConfig = JSON.parse( content );

			if ( projectConfig.modules && Array.isArray( projectConfig.modules ) ) {

				console.log( `[ModuleSystem] Loading ${projectConfig.modules.length} modules from project.json` );

				this.loadingFromProject = true;

				for ( const moduleInfo of projectConfig.modules ) {

					if ( moduleInfo.enabled !== false ) {

						await this.loadModuleFromUrl( moduleInfo.url );

					}

				}

				this.loadingFromProject = false;

			}

		} catch ( error ) {

			this.loadingFromProject = false;
			console.error( `[ModuleSystem] Failed to load project modules:`, error );

		}

	}

}

class EditorModule {

	constructor( editor, config = {} ) {

		this.editor = editor;
		this.config = config;

	}

	async init() {

	}

	async dispose() {

	}

	async enable() {

	}

	async disable() {

	}

}

export { ModuleSystem, EditorModule };
