
import { pc, App, SceneLoader } from '../../engine/dist/three-engine.js';
import { WebGPURenderer } from 'three/webgpu';

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
	
	async function initEngine() {
		if ( !app ) {
			await pc.init( canvas, {
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
	
	// Initialize engine asynchronously but don't block constructor
	initEngine().catch( err => {
		console.error( '[Player] Failed to initialize engine:', err );
	} );
	
	
	window.pc = pc;

	this.dom = dom;
	this.canvas = renderer ? renderer.domElement : canvas;
	this.width = 500;
	this.height = 500;

	
	this.load = async function ( json ) {

		const project = json.project;

		
		
		if ( project && renderer ) {
			if ( project.shadows !== undefined ) renderer.shadowMap.enabled = project.shadows;
			if ( project.shadowType !== undefined ) renderer.shadowMap.type = project.shadowType;
			if ( project.toneMapping !== undefined ) renderer.toneMapping = project.toneMapping;
			if ( project.toneMappingExposure !== undefined ) renderer.toneMappingExposure = project.toneMappingExposure;
		}

		if ( editor.controls && editor.controls.update ) {
			editor.controls.update();
		}

		if ( editor.viewportCamera && editor.controls && editor.controls.object ) {
			editor.viewportCamera.position.copy( editor.controls.object.position );
			editor.viewportCamera.quaternion.copy( editor.controls.object.quaternion );
			editor.viewportCamera.scale.copy( editor.controls.object.scale );
			editor.viewportCamera.updateProjectionMatrix();
		}

		const viewportCamera = editor.viewportCamera || editor.camera;
		const viewportCameraUuid = viewportCamera.uuid;
		
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
			sceneCamera = viewportCamera;
		}

		json.camera = sceneCamera.toJSON();

		await initEngine();
		
		const projectPath = editor.storage && editor.storage.getProjectPath ? editor.storage.getProjectPath() : null;
		if ( projectPath && typeof window !== 'undefined' ) {
			window.__editorProjectPath = projectPath;
			if ( typeof sessionStorage !== 'undefined' ) {
				sessionStorage.setItem( 'editor_project_path', projectPath );
			}
		}
		
		if ( typeof window !== 'undefined' && window.__TAURI__ ) {
			if ( typeof window.ScriptCompiler === 'undefined' ) {
				import( './ScriptCompiler.js' ).then( module => {
					window.ScriptCompiler = module;
				} ).catch( err => {
					console.warn( '[Player] Failed to load ScriptCompiler:', err );
				} );
			}
		}
		
		if ( app && app.scene ) {
			// Clean up particle sprites first (they have WebGPU buffers)
			const particlesToRemove = [];
			app.scene.traverse( ( object ) => {
				if ( object.userData && object.userData.skipSerialization && 
					 ( object.name && (object.name.includes('_Particles') || object.name.includes('ParticleSprite')) ) ) {
					particlesToRemove.push( object );
				}
			} );
			
			console.log('[Player] Cleaning up', particlesToRemove.length, 'particle sprites before reload');
			
			particlesToRemove.forEach( ( sprite ) => {
				if ( sprite.parent ) {
					sprite.parent.remove( sprite );
				}
				if ( sprite.geometry ) {
					try {
						sprite.geometry.dispose();
					} catch (e) {
						console.warn('[Player] Error disposing geometry:', e);
					}
				}
				if ( sprite.material ) {
					try {
						if ( Array.isArray( sprite.material ) ) {
							sprite.material.forEach( m => m.dispose() );
						} else {
							sprite.material.dispose();
						}
					} catch (e) {
						console.warn('[Player] Error disposing material:', e);
					}
				}
			} );
			
			// Now destroy entities
			if ( app.getEntities ) {
				const entities = app.getEntities();
				console.log('[Player] Destroying', entities?.length || 0, 'entities');
				if ( entities && entities.length > 0 ) {
					entities.forEach( entity => {
						try {
							if ( entity && typeof entity.destroy === 'function' ) {
								entity.destroy();
							} else if ( entity && typeof entity.dispose === 'function' ) {
								entity.dispose();
							}
						} catch ( e ) {
							console.warn( '[Player] Error destroying entity:', e );
						}
					} );
				}
			}
			
			while ( app.scene.children.length > 0 ) {
				const child = app.scene.children[ 0 ];
				app.scene.remove( child );
				if ( child && typeof child.dispose === 'function' ) {
					try {
						child.dispose();
					} catch ( e ) {
					}
				}
			}
			
			console.log('[Player] Scene cleared, children count:', app.scene.children.length);
		}
		
		try {
			await SceneLoader.loadScene( app, json );
		} catch ( error ) {
			console.error( '[Player] Failed to load scene:', error );
			throw error;
		}
		
		scene = app.scene;
		camera = app.getCamera();
		
		if ( json.camera && camera ) {
			const expectedCamera = json.camera;
			if ( camera instanceof THREE.PerspectiveCamera || camera instanceof THREE.OrthographicCamera ) {
				if ( expectedCamera.object && expectedCamera.object.matrix ) {
					const matrix = new THREE.Matrix4().fromArray( expectedCamera.object.matrix );
					matrix.decompose( camera.position, camera.quaternion, camera.scale );
				}
				camera.updateProjectionMatrix();
			}
		}
		
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
			renderer.clear();
			
			if ( scene && camera ) {
				renderer.render( scene, camera );
			}
			
			renderer.setAnimationLoop( animate );
		}

	};

	
	this.stop = function () {

		if ( renderer ) {
			renderer.setAnimationLoop( null );
		}
		
		// Clean up particle system sprites to prevent buffer reuse errors
		if ( scene ) {
			const particlesToRemove = [];
			scene.traverse( ( object ) => {
				if ( object.userData && object.userData.skipSerialization && 
					 ( object.name.includes('_Particles') || object.name.includes('ParticleSprite') ) ) {
					particlesToRemove.push( object );
				}
			} );
			
			particlesToRemove.forEach( ( sprite ) => {
				if ( sprite.parent ) {
					sprite.parent.remove( sprite );
				}
				if ( sprite.geometry ) sprite.geometry.dispose();
				if ( sprite.material ) sprite.material.dispose();
			} );
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

	signals.startPlayer.add( async function () {

		if ( isPlaying ) {
			this.stop();
		}

		isPlaying = true;

		if ( editor.controls && editor.controls.update ) {
			editor.controls.update();
		}

		if ( editor.viewportCamera && editor.controls && editor.controls.object ) {
			editor.viewportCamera.position.copy( editor.controls.object.position );
			editor.viewportCamera.quaternion.copy( editor.controls.object.quaternion );
			editor.viewportCamera.scale.copy( editor.controls.object.scale );
			editor.viewportCamera.updateProjectionMatrix();
		}

		
		const editorCanvas = viewport.querySelector( 'canvas' );
		if ( editorCanvas && editorCanvas !== this.canvas ) {
			editorCanvas.style.display = 'none';
		}

		
		
		
		
		if ( renderer && renderer.domElement ) {
			
			
			const canvasEl = renderer.domElement;
			const oldWidth = canvasEl.width;
			const oldHeight = canvasEl.height;
			canvasEl.width = 1;
			canvasEl.height = 1;
			canvasEl.width = oldWidth;
			canvasEl.height = oldHeight;
			
			renderer.clear();
		}
		
		
		dom.style.display = '';

		const json = editor.toJSON();
		
		try {
			await this.load( json );
			
			this.setSize( viewport.clientWidth, viewport.clientHeight );
			
			this.play();
		} catch ( error ) {
			console.error( '[Player] Failed to start play mode:', error );
			isPlaying = false;
			alert( 'Failed to start play mode: ' + ( error.message || error ) );
		}

	}.bind( this ) );

	signals.stopPlayer.add( async function () {

		isPlaying = false;

		
		const editorCanvas = viewport.querySelector( 'canvas' );
		if ( editorCanvas && editorCanvas !== this.canvas ) {
			editorCanvas.style.display = '';
		}

		
		dom.style.display = 'none';

		
		this.stop();
		
		// After stopping, clean up any particle sprites that might be lingering in the editor scene
		if ( editor && editor.scene ) {
			const particlesToRemove = [];
			editor.scene.traverse( ( object ) => {
				if ( object.userData && object.userData.skipSerialization && 
					 ( object.name && (object.name.includes('_Particles') || object.name.includes('ParticleSprite') || object.name.includes('ParticlePreview')) ) ) {
					particlesToRemove.push( object );
				}
			} );
			
			console.log('[Player] Cleaning up', particlesToRemove.length, 'particle sprites from editor scene after stop');
			
			particlesToRemove.forEach( ( sprite ) => {
				if ( sprite.parent ) {
					sprite.parent.remove( sprite );
				}
				if ( sprite.geometry ) {
					try {
						sprite.geometry.dispose();
					} catch (e) {}
				}
				if ( sprite.material ) {
					try {
						if ( Array.isArray( sprite.material ) ) {
							sprite.material.forEach( m => m.dispose() );
						} else {
							sprite.material.dispose();
						}
					} catch (e) {}
				}
			} );
		}

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
