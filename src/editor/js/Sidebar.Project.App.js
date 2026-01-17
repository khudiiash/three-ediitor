import * as THREE from 'three';

import { zipSync, strToU8 } from 'three/addons/libs/fflate.module.js';

import { UIButton, UICheckbox, UIPanel, UIInput, UIRow, UIText } from './libs/ui.js';

function SidebarProjectApp( editor ) {

	const config = editor.config;
	const signals = editor.signals;
	const strings = editor.strings;

	const save = editor.utils.save;

	const container = new UIPanel();
	container.setId( 'app' );

	const headerRow = new UIRow();
	headerRow.add( new UIText( strings.getKey( 'sidebar/project/app' ).toUpperCase() ) );
	container.add( headerRow );

	

	const titleRow = new UIRow();
	const title = new UIInput( config.getKey( 'project/title' ) ).setLeft( '100px' ).setWidth( '150px' ).onChange( function () {

		config.setKey( 'project/title', this.getValue() );

	} );

	titleRow.add( new UIText( strings.getKey( 'sidebar/project/app/title' ) ).setClass( 'Label' ) );
	titleRow.add( title );

	container.add( titleRow );

	const publishButton = new UIButton( strings.getKey( 'sidebar/project/app/publish' ) );
	publishButton.setWidth( '160px' );
	publishButton.setMarginLeft( '90px' );
	publishButton.setMarginBottom( '10px' );
	publishButton.onClick( async function () {

		const isTauri = typeof window !== 'undefined' && window.__TAURI__;
		const invoke = isTauri && window.__TAURI__.core && window.__TAURI__.core.invoke ? window.__TAURI__.core.invoke : null;
		const projectPath = editor.storage && editor.storage.getProjectPath ? editor.storage.getProjectPath() : null;

		if ( ! isTauri || ! invoke || ! projectPath ) {
			console.warn( '[Publish] Tauri not available or no project path, falling back to zip download' );
			
			const toZip = {};
			let output = editor.toJSON();
			output.metadata.type = 'App';
			delete output.history;

			let sceneCamera = null;
			editor.scene.traverse( function ( object ) {
				if ( ( object.isPerspectiveCamera || object.isOrthographicCamera ) && object !== editor.camera ) {
					sceneCamera = object;
					return;
				}
			} );

			if ( sceneCamera !== null ) {
				output.camera = sceneCamera.toJSON();
			}

			output = JSON.stringify( output, null, '\t' );
			output = output.replace( /[\n\t]+([\d\.e\-\[\]]+)/g, '$1' );
			toZip[ 'app.json' ] = strToU8( output );

			const title = config.getKey( 'project/title' );
			const manager = new THREE.LoadingManager( function () {
				const zipped = zipSync( toZip, { level: 9 } );
				const blob = new Blob( [ zipped.buffer ], { type: 'application/zip' } );
				save( blob, ( title !== '' ? title : 'untitled' ) + '.zip' );
			} );

			const loader = new THREE.FileLoader( manager );
			loader.load( 'js/libs/app/index.html', function ( content ) {
				content = content.replace( '<!-- title -->', title );
				let editButton = '';
				content = content.replace( '\t\t\t/* edit button */', editButton );
				toZip[ 'index.html' ] = strToU8( content );
			} );
			loader.load( 'js/libs/app.js', function ( content ) {
				toZip[ 'js/app.js' ] = strToU8( content );
			} );
			loader.load( '../build/three.core.min.js', function ( content ) {
				toZip[ 'js/three.core.js' ] = strToU8( content );
			} );
			loader.load( '../build/three.module.min.js', function ( content ) {
				toZip[ 'js/three.module.js' ] = strToU8( content );
			} );
			loader.load( '../engine/dist/three-engine.js', function ( content ) {
				toZip[ 'js/three-engine.js' ] = strToU8( content );
			} );
			return;
		}

		const buildFiles = {};
		let filesLoaded = 0;
		const totalFiles = 6;

		function checkComplete() {
			filesLoaded++;
			if ( filesLoaded === totalFiles ) {
				writeBuildFiles();
			}
		}

		async function writeBuildFiles() {
			try {
				
				for ( const filePath in buildFiles ) {
					const content = buildFiles[ filePath ];
					const bytes = typeof content === 'string' 
						? Array.from( new TextEncoder().encode( content ) )
						: Array.from( content );
					
					await invoke( 'write_build_file', {
						projectPath: projectPath,
						filePath: filePath,
						content: bytes
					} );
				}
				
				await invoke( 'copy_assets_to_build', { projectPath: projectPath } );
				
				alert( 'Build published successfully to project/build folder!' );
			} catch ( error ) {
				console.error( '[Publish] Failed to write build files:', error );
				alert( 'Failed to publish build: ' + error );
			}
		}

		let output = editor.toJSON();
		output.metadata.type = 'App';
		delete output.history;

		let sceneCamera = null;
		editor.scene.traverse( function ( object ) {
			if ( ( object.isPerspectiveCamera || object.isOrthographicCamera ) && object !== editor.camera ) {
				sceneCamera = object;
				return;
			}
		} );

		if ( sceneCamera !== null ) {
			output.camera = sceneCamera.toJSON();
		}

		output = JSON.stringify( output, null, '\t' );
		output = output.replace( /[\n\t]+([\d\.e\-\[\]]+)/g, '$1' );
		buildFiles[ 'app.json' ] = output;
		checkComplete();

		const title = config.getKey( 'project/title' );
		
		invoke( 'read_editor_template_file', { filePath: 'js/libs/app/index.html' } )
			.then( function ( content ) {
				content = content.replace( /<script[^>]*src=["']\/@vite\/client["'][^>]*><\/script>\s*/gi, '' );
				content = content.replace( /<script[^>]*src=["'][^"']*html-proxy[^"']*["'][^>]*><\/script>\s*/gi, '' );
				
				content = content.replace( '<!-- title -->', title );
				let editButton = '';
				content = content.replace( '\t\t\t/* edit button */', editButton );
				buildFiles[ 'index.html' ] = content;
				checkComplete();
			} )
			.catch( function ( error ) {
				console.error( '[Publish] Failed to load HTML template:', error );
				checkComplete();
			} );
		
		const loader = new THREE.FileLoader();
		loader.load( 'js/libs/app.js', function ( content ) {
			buildFiles[ 'js/app.js' ] = content;
			checkComplete();
		} );
		
		// Read files directly from filesystem to avoid Vite transformations
		invoke( 'read_editor_template_file', { filePath: 'build/three.core.min.js' } )
			.then( function ( content ) {
				buildFiles[ 'js/three.core.min.js' ] = content;
				checkComplete();
			} )
			.catch( function ( error ) {
				console.error( '[Publish] Failed to load three.core.min.js:', error );
				checkComplete();
			} );
		
		invoke( 'read_editor_template_file', { filePath: 'build/three.module.min.js' } )
			.then( function ( content ) {
				// Fix absolute import path to relative path
				// Replace from "/editor/build/three.core.min.js" with from "./three.core.min.js"
				content = content.replace( /from\s+["']\/editor\/build\/three\.core\.min\.js["']/g, 'from "./three.core.min.js"' );
				content = content.replace( /from\s+["']editor\/build\/three\.core\.min\.js["']/g, 'from "./three.core.min.js"' );
				buildFiles[ 'js/three.module.min.js' ] = content;
				checkComplete();
			} )
			.catch( function ( error ) {
				console.error( '[Publish] Failed to load three.module.min.js:', error );
				checkComplete();
			} );
		
		fetch( '../engine/dist/three-engine.js' )
			.then( response => {
				if ( ! response.ok ) throw new Error( `HTTP ${response.status}` );
				return response.text();
			} )
			.then( content => {
				// Fix Vite dependency paths to use importmap
				// Replace .vite/deps/three.js with bare import 'three' (will be resolved by importmap)
				content = content.replace( /from\s+["']\.vite\/deps\/three\.js[^"']*["']/gi, 'from "three"' );
				content = content.replace( /from\s+["']\/\.vite\/deps\/three\.js[^"']*["']/gi, 'from "three"' );
				buildFiles[ 'js/three-engine.js' ] = content;
				checkComplete();
			} )
			.catch( error => {
				console.error( '[Publish] Failed to load three-engine.js:', error );
				checkComplete();
			} );

	} );
	container.add( publishButton );

	

	signals.editorCleared.add( function () {

		title.setValue( '' );
		config.setKey( 'project/title', '' );

	} );

	
	if ( typeof window !== 'undefined' && window.__TAURI__ ) {
		async function loadProjectMetadata() {
			for (let i = 0; i < 50; i++) {
				const projectPath = editor.storage && editor.storage.getProjectPath ? editor.storage.getProjectPath() : null;
				if (projectPath && window.__TAURI__ && window.__TAURI__.core && window.__TAURI__.core.invoke) {
					try {
						const content = await window.__TAURI__.core.invoke('read_project_metadata', { projectPath: projectPath });
						const metadata = JSON.parse(content);
						if (metadata && metadata.name) {
							title.setValue(metadata.name);
							config.setKey('project/title', metadata.name);
						}
					} catch (error) {
						console.warn('[Project] Failed to load project.json:', error);
					}
					return;
				}
				await new Promise(resolve => setTimeout(resolve, 100));
			}
		}
		loadProjectMetadata();
	}

	return container;

}

export { SidebarProjectApp };
