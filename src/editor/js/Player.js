
import { pc, App, SceneLoader } from '../../engine/dist/three-engine.js';

function Player( editor ) {

	const signals = editor.signals;

	
	const viewport = document.getElementById( 'viewport' );
	if ( ! viewport ) {
		console.error( 'Viewport not found' );
		return;
	}

	
	const canvas = document.createElement( 'canvas' );
	canvas.style.cssText = 'width: 100%; height: 100%; display: block;';

	
	const dom = document.createElement( 'div' );
	dom.appendChild( canvas );
	dom.style.cssText = 'display: none; position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 100;';
	viewport.appendChild( dom );

	
	let app = null;
	let camera = null;
	let scene = null;
	let renderer = null; 
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
	
	
	window.pc = pc;

	this.dom = dom;
	this.canvas = renderer ? renderer.domElement : canvas;
	this.width = 500;
	this.height = 500;

	
	this.load = function ( json ) {

		const project = json.project;

		
		
		if ( project && renderer ) {
			if ( project.shadows !== undefined ) renderer.shadowMap.enabled = project.shadows;
			if ( project.shadowType !== undefined ) renderer.shadowMap.type = project.shadowType;
			if ( project.toneMapping !== undefined ) renderer.toneMapping = project.toneMapping;
			if ( project.toneMappingExposure !== undefined ) renderer.toneMappingExposure = project.toneMappingExposure;
		}

		
		const viewportCameraUuid = editor.camera.uuid;
		const sceneCameras = [];
		editor.scene.traverse( function ( object ) {
			if ( ( object.isPerspectiveCamera || object.isOrthographicCamera ) && object.uuid !== viewportCameraUuid ) {
				sceneCameras.push( object );
			}
		} );
		
		let sceneCamera = null;
		
		
		if ( editor.selected && ( editor.selected.isPerspectiveCamera || editor.selected.isOrthographicCamera ) && editor.selected.uuid !== viewportCameraUuid ) {
			sceneCamera = editor.selected;
		}
		
		else if ( sceneCameras.length > 0 ) {
			sceneCamera = sceneCameras[ 0 ];
		}
		
		else {
			sceneCamera = editor.camera;
		}

		
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
		
		
		if ( camera ) {
			camera.aspect = this.width / this.height;
			camera.updateProjectionMatrix();
		}
	};

	
	this.setCamera = function ( value ) {

		camera = value;
		if ( app && camera ) {
			app.setCamera( camera );
			camera.aspect = this.width / this.height;
			camera.updateProjectionMatrix();
		}

	};

	
	this.setScene = function ( value ) {

		scene = value;
		if ( app && scene ) {
			app.loadScene( scene );
		}

	};

	
	this.setPixelRatio = function ( pixelRatio ) {

		if ( renderer ) {
			renderer.setPixelRatio( pixelRatio );
		}

	};

	
	this.setSize = function ( width, height ) {

		this.width = width;
		this.height = height;

		
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

	
	var time, startTime, prevTime;

	function animate() {

		time = performance.now();

		
		if ( app ) {
			const deltaTime = prevTime ? ( time - prevTime ) / 1000 : 0;
			app.update( deltaTime );
		}

		
		if ( scene && camera && renderer ) {
			renderer.render( scene, camera );
		}

		prevTime = time;

	}

	
	this.play = function () {

		startTime = prevTime = performance.now();

		if ( renderer ) {
			renderer.setAnimationLoop( animate );
		}

	};

	
	this.stop = function () {

		if ( renderer ) {
			renderer.setAnimationLoop( null );
		}

	};

	
	this.render = function ( time ) {

		if ( scene && camera ) {

			renderer.render( scene, camera );

		}

	};

	
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

		
		const editorCanvas = viewport.querySelector( 'canvas' );
		if ( editorCanvas && editorCanvas !== this.canvas ) {
			editorCanvas.style.display = 'none';
		}

		
		dom.style.display = '';

		
		const json = editor.toJSON();
		this.load( json );
		
		
		this.setSize( viewport.clientWidth, viewport.clientHeight );
		this.play();

	}.bind( this ) );

	signals.stopPlayer.add( function () {

		isPlaying = false;

		
		const editorCanvas = viewport.querySelector( 'canvas' );
		if ( editorCanvas && editorCanvas !== this.canvas ) {
			editorCanvas.style.display = '';
		}

		
		dom.style.display = 'none';

		
		this.stop();

	}.bind( this ) );

	
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
