// Import TypeScript engine from built dist
import { pc, App, SceneLoader } from '../../engine/dist/three-engine.js';

function Player( editor ) {

	const signals = editor.signals;

	// Get viewport container
	const viewport = document.getElementById( 'viewport' );
	if ( ! viewport ) {
		console.error( 'Viewport not found' );
		return;
	}

	// Create canvas (like the original player)
	const canvas = document.createElement( 'canvas' );
	canvas.style.cssText = 'width: 100%; height: 100%; display: block;';

	// Create container (like the original player)
	const dom = document.createElement( 'div' );
	dom.appendChild( canvas );
	dom.style.cssText = 'display: none; position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 100;';
	viewport.appendChild( dom );

	// Initialize engine (creates its own renderer)
	let app = null;
	let camera = null;
	let scene = null;
	let renderer = null; // Will be set from engine
	let isPlaying = false;
	
	function initEngine() {
		if ( !app ) {
			pc.init( canvas, {
				antialias: true,
				alpha: false,
				powerPreference: 'high-performance'
			} );
			
			app = pc.createApp();
			
			renderer = pc.renderer;
			if ( renderer ) {
				renderer.setPixelRatio( window.devicePixelRatio );
			}
		}
	}
	
	initEngine();
	
	// Expose pc to window for debugging (like the original player)
	window.pc = pc;

	this.dom = dom;
	this.canvas = renderer ? renderer.domElement : canvas;
	this.width = 500;
	this.height = 500;

	// Load method (like the original player)
	this.load = function ( json ) {

		const project = json.project;

		// Apply renderer settings from project (like the original player)
		// Note: SceneLoader already applies these, but we apply them here too for the player's renderer
		if ( project && renderer ) {
			if ( project.shadows !== undefined ) renderer.shadowMap.enabled = project.shadows;
			if ( project.shadowType !== undefined ) renderer.shadowMap.type = project.shadowType;
			if ( project.toneMapping !== undefined ) renderer.toneMapping = project.toneMapping;
			if ( project.toneMappingExposure !== undefined ) renderer.toneMappingExposure = project.toneMappingExposure;
		}

		// Find cameras in the scene hierarchy (not the viewport camera)
		const viewportCameraUuid = editor.camera.uuid;
		const sceneCameras = [];
		editor.scene.traverse( function ( object ) {
			if ( ( object.isPerspectiveCamera || object.isOrthographicCamera ) && object.uuid !== viewportCameraUuid ) {
				sceneCameras.push( object );
			}
		} );
		
		let sceneCamera = null;
		
		// Priority 1: Use selected camera if it's a scene camera
		if ( editor.selected && ( editor.selected.isPerspectiveCamera || editor.selected.isOrthographicCamera ) && editor.selected.uuid !== viewportCameraUuid ) {
			sceneCamera = editor.selected;
		}
		// Priority 2: Use first scene camera found in hierarchy
		else if ( sceneCameras.length > 0 ) {
			sceneCamera = sceneCameras[ 0 ];
		}
		// Priority 3: Fallback to viewport camera
		else {
			sceneCamera = editor.camera;
		}

		// Set the camera in JSON
		json.camera = sceneCamera.toJSON();

		initEngine();
		
		if ( typeof window !== 'undefined' && window.__TAURI__ ) {
			const projectPath = editor.storage && editor.storage.getProjectPath ? editor.storage.getProjectPath() : null;
			if ( projectPath ) {
				window.__editorProjectPath = projectPath;
			}
			
			if ( typeof window.ScriptCompiler === 'undefined' ) {
				import( './ScriptCompiler.js' ).then( module => {
					window.ScriptCompiler = module;
				} ).catch( err => {
					console.warn( '[Player] Failed to load ScriptCompiler:', err );
				} );
			}
		}
		
		SceneLoader.loadScene( app, json ).catch( () => {} );
		
		scene = app.scene;
		camera = app.getCamera();
		
		// Set camera aspect (like the original player)
		if ( camera ) {
			camera.aspect = this.width / this.height;
			camera.updateProjectionMatrix();
		}
	};

	// Set camera method (like the original player)
	this.setCamera = function ( value ) {

		camera = value;
		if ( app && camera ) {
			app.setCamera( camera );
			camera.aspect = this.width / this.height;
			camera.updateProjectionMatrix();
		}

	};

	// Set scene method (like the original player)
	this.setScene = function ( value ) {

		scene = value;
		if ( app && scene ) {
			app.loadScene( scene );
		}

	};

	// Set pixel ratio method (like the original player)
	this.setPixelRatio = function ( pixelRatio ) {

		if ( renderer ) {
			renderer.setPixelRatio( pixelRatio );
		}

	};

	// Set size method (like the original player)
	this.setSize = function ( width, height ) {

		this.width = width;
		this.height = height;

		// Set canvas size attributes
		canvas.width = width;
		canvas.height = height;

		if ( renderer ) {
			renderer.setSize( width, height, false );
		}

		if ( camera ) {

			camera.aspect = this.width / this.height;
			camera.updateProjectionMatrix();

		}

	};

	// Animate function (like the original player)
	var time, startTime, prevTime;

	function animate() {

		time = performance.now();

		// Update app (for entity updates if we add them later)
		if ( app ) {
			const deltaTime = prevTime ? ( time - prevTime ) / 1000 : 0;
			app.update( deltaTime );
		}

		// Render using the engine's renderer (like the original player)
		if ( scene && camera && renderer ) {
			renderer.render( scene, camera );
		}

		prevTime = time;

	}

	// Play method (like the original player)
	this.play = function () {

		startTime = prevTime = performance.now();

		if ( renderer ) {
			renderer.setAnimationLoop( animate );
		}

	};

	// Stop method (like the original player)
	this.stop = function () {

		if ( renderer ) {
			renderer.setAnimationLoop( null );
		}

	};

	// Render method (like the original player)
	this.render = function ( time ) {

		if ( scene && camera ) {

			renderer.render( scene, camera );

		}

	};

	// Dispose method (like the original player)
	this.dispose = function () {

		if ( renderer ) {
			renderer.dispose();
		}

		camera = undefined;
		scene = undefined;

		if ( app ) {
			pc.stop();
			pc.destroy();
			app = null;
		}

	};

	// Handle window resize
	window.addEventListener( 'resize', function () {

		if ( isPlaying ) {

			this.setSize( viewport.clientWidth, viewport.clientHeight );

		}

	}.bind( this ) );

	signals.windowResize.add( function () {

		if ( isPlaying ) {

			this.setSize( viewport.clientWidth, viewport.clientHeight );

		}

	}.bind( this ) );

	signals.startPlayer.add( function () {

		isPlaying = true;

		// Hide editor renderer and gizmos
		const editorCanvas = viewport.querySelector( 'canvas' );
		if ( editorCanvas && editorCanvas !== this.canvas ) {
			editorCanvas.style.display = 'none';
		}

		// Show player canvas
		dom.style.display = '';

		// Get JSON and load scene (like the original player)
		const json = editor.toJSON();
		this.load( json );
		
		// Set size and start
		this.setSize( viewport.clientWidth, viewport.clientHeight );
		this.play();

	}.bind( this ) );

	signals.stopPlayer.add( function () {

		isPlaying = false;

		// Show editor renderer
		const editorCanvas = viewport.querySelector( 'canvas' );
		if ( editorCanvas && editorCanvas !== this.canvas ) {
			editorCanvas.style.display = '';
		}

		// Hide player canvas
		dom.style.display = 'none';

		// Stop player
		this.stop();

	}.bind( this ) );

	// Return player instance (like the original player)
	return this;
}

function logSceneHierarchy( object, depth ) {
	const indent = '  '.repeat( depth );
	const type = object.constructor.name;
	const name = object.name || 'unnamed';
	const uuid = object.uuid.substring( 0, 8 );
	console.log( indent + type + ' "' + name + '" (' + uuid + ')' );
	
	for ( let i = 0; i < object.children.length; i ++ ) {
		logSceneHierarchy( object.children[ i ], depth + 1 );
	}
}

export { Player };
