import * as THREE from 'three';

import { TransformControls } from 'three/addons/controls/TransformControls.js';

import { UIPanel } from './libs/ui.js';

import { EditorControls } from './EditorControls.js';

import { ViewportControls } from './Viewport.Controls.js';
import { ViewportInfo } from './Viewport.Info.js';

import { ViewHelper } from './Viewport.ViewHelper.js';
import { XR } from './Viewport.XR.js';

import { SetPositionCommand } from './commands/SetPositionCommand.js';
import { SetRotationCommand } from './commands/SetRotationCommand.js';
import { SetScaleCommand } from './commands/SetScaleCommand.js';

import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ViewportPathtracer } from './Viewport.Pathtracer.js';
import { setSharedAnimationTime } from './LiveMaterialPreview.js';

let ParticleSystem = null;
(async () => {
	try {
		const engine = await import('../../engine/dist/three-engine.js');
		ParticleSystem = engine.ParticleSystem;
	} catch (e) {
		console.warn('[Viewport] Could not import ParticleSystem:', e);
	}
})();

function Viewport( editor ) {

	const selector = editor.selector;
	const signals = editor.signals;

	const container = new UIPanel();
	container.setId( 'viewport' );
	container.setPosition( 'absolute' );

	container.add( new ViewportControls( editor ) );
	container.add( new ViewportInfo( editor ) );

let renderer = null;
let pmremGenerator = null;
let pathtracer = null;
let currentParticleSystem = null; // Currently visible particle system

const camera = editor.camera;
	const scene = editor.scene;
	const sceneHelpers = editor.sceneHelpers;
	
	const GRID_COLORS_LIGHT = [ 0x999999, 0x777777 ];
	const GRID_COLORS_DARK = [ 0x555555, 0x888888 ];

	const grid = new THREE.Group();

	const grid1 = new THREE.GridHelper( 30, 30 );
	grid1.material.color.setHex( GRID_COLORS_LIGHT[ 0 ] );
	grid1.material.vertexColors = false;
	grid.add( grid1 );

	const grid2 = new THREE.GridHelper( 30, 6 );
	grid2.material.color.setHex( GRID_COLORS_LIGHT[ 1 ] );
	grid2.material.vertexColors = false;
	grid.add( grid2 );

	const viewHelper = new ViewHelper( camera, container );
	let isPlaying = false;

	
	let previewCamera = null;
	let previewRenderer = null;
	const previewContainer = document.createElement( 'div' );
	previewContainer.id = 'camera-preview';
	previewContainer.title = 'Click to switch to this camera';
	container.dom.appendChild( previewContainer );

	const previewCanvas = document.createElement( 'canvas' );
	previewContainer.appendChild( previewCanvas );

	previewContainer.addEventListener( 'click', function () {

		if ( previewCamera !== null ) {

			editor.setViewportCamera( previewCamera.uuid );

		}

	} );

	//

	const box = new THREE.Box3();

	const selectionBox = new THREE.Box3Helper( box );
	selectionBox.material.depthTest = false;
	selectionBox.material.transparent = true;
	selectionBox.visible = false;
	sceneHelpers.add( selectionBox );

	let objectPositionOnDown = null;
	let objectRotationOnDown = null;
	let objectScaleOnDown = null;
	let isTransformInProgress = false;
	let transformObject = null;

	
	
	const transformControls = new TransformControls( camera, container.dom );
	transformControls.addEventListener( 'axis-changed', function () {

		if ( editor.viewportShading !== 'realistic' ) render();

	} );
	let isCtrlPressed = false;

	window.addEventListener( 'keydown', function ( event ) {
		if ( event.key === 'Control' || event.key === 'Meta' ) {
			isCtrlPressed = true;
		}
	} );

	window.addEventListener( 'keyup', function ( event ) {
		if ( event.key === 'Control' || event.key === 'Meta' ) {
			isCtrlPressed = false;
		}
	} );

	window.addEventListener( 'blur', function () {
		isCtrlPressed = false;
	} );

	transformControls.addEventListener( 'objectChange', function () {

		const object = transformControls.object;
		if ( !object ) return;

		if ( object.userData && object.userData.isParticleSystem ) {
			console.log('[TransformControls] objectChange - particle system position:', object.position.x.toFixed(2), object.position.y.toFixed(2), object.position.z.toFixed(2));
		}

		if ( isCtrlPressed ) {
			const mode = transformControls.getMode();

			if ( mode === 'translate' ) {
				object.position.x = Math.round( object.position.x );
				object.position.y = Math.round( object.position.y );
				object.position.z = Math.round( object.position.z );
			} else if ( mode === 'rotate' ) {
				const snapAngle = 45 * Math.PI / 180;
				object.rotation.x = Math.round( object.rotation.x / snapAngle ) * snapAngle;
				object.rotation.y = Math.round( object.rotation.y / snapAngle ) * snapAngle;
				object.rotation.z = Math.round( object.rotation.z / snapAngle ) * snapAngle;
			} else if ( mode === 'scale' ) {
				object.scale.x = Math.round( object.scale.x );
				object.scale.y = Math.round( object.scale.y );
				object.scale.z = Math.round( object.scale.z );
			}
		}

		signals.objectChanged.dispatch( transformControls.object );

	} );
	transformControls.addEventListener( 'mouseDown', function () {

		const object = transformControls.object;

		console.log('[TransformControls] mouseDown - object:', object?.name, 'isParticleSystem:', object?.userData?.isParticleSystem);
		console.log('[TransformControls] controls.enabled BEFORE disable:', controls.enabled);

		objectPositionOnDown = object.position.clone();
		objectRotationOnDown = object.rotation.clone();
		objectScaleOnDown = object.scale.clone();

		isTransformInProgress = true;
		transformObject = object;

		controls.enabled = false;
		console.log('[TransformControls] controls.enabled AFTER disable:', controls.enabled);

	} );
	transformControls.addEventListener( 'mouseUp', function () {

		const object = transformControls.object;

		console.log('[TransformControls] mouseUp - object:', object?.name, 'isParticleSystem:', object?.userData?.isParticleSystem);

		try {
			if ( object !== undefined ) {

				switch ( transformControls.getMode() ) {

					case 'translate':

						if ( ! objectPositionOnDown.equals( object.position ) ) {

							console.log('[TransformControls] Position changed from', objectPositionOnDown, 'to', object.position);
							editor.execute( new SetPositionCommand( editor, object, object.position, objectPositionOnDown ) );

						}

						break;

				case 'rotate':

					if ( ! objectRotationOnDown.equals( object.rotation ) ) {

						editor.execute( new SetRotationCommand( editor, object, object.rotation, objectRotationOnDown ) );

					}

					break;

				case 'scale':

					if ( ! objectScaleOnDown.equals( object.scale ) ) {

						editor.execute( new SetScaleCommand( editor, object, object.scale, objectScaleOnDown ) );

					}

					break;

			}

		}
		} catch ( error ) {
			console.error('[TransformControls] Error in mouseUp handler:', error);
		}

		isTransformInProgress = false;
		transformObject = null;
		controls.enabled = true;
		
		console.log('[TransformControls] mouseUp complete - controls.enabled:', controls.enabled);

	} );

	function cancelTransform() {

		if ( !isTransformInProgress || !transformObject ) return;

		const mode = transformControls.getMode();

		switch ( mode ) {

			case 'translate':

				if ( objectPositionOnDown !== null ) {

					transformObject.position.copy( objectPositionOnDown );
					transformObject.updateMatrixWorld( true );
					signals.objectChanged.dispatch( transformObject );

				}

				break;

			case 'rotate':

				if ( objectRotationOnDown !== null ) {

					transformObject.rotation.copy( objectRotationOnDown );
					transformObject.updateMatrixWorld( true );
					signals.objectChanged.dispatch( transformObject );

				}

				break;

			case 'scale':

				if ( objectScaleOnDown !== null ) {

					transformObject.scale.copy( objectScaleOnDown );
					transformObject.updateMatrixWorld( true );
					signals.objectChanged.dispatch( transformObject );

				}

				break;

		}

		isTransformInProgress = false;
		transformObject = null;
		controls.enabled = true;

		transformControls.detach();
		if ( editor.selected !== null ) {
			transformControls.attach( editor.selected );
		}

		render();

	}

	editor.cancelTransform = cancelTransform;

	
	
	try {
		if ( typeof transformControls.getHelper === 'function' ) {
			sceneHelpers.add( transformControls.getHelper() );
		} else {
			
			sceneHelpers.add( transformControls );
		}
	} catch ( e ) {
		console.warn( 'TransformControls.getHelper() failed, using fallback:', e );
		sceneHelpers.add( transformControls );
	}

	//

	const xr = new XR( editor, transformControls ); 

	

	function updateAspectRatio() {

		for ( const uuid in editor.cameras ) {

			const camera = editor.cameras[ uuid ];

			const aspect = container.dom.offsetWidth / container.dom.offsetHeight;

			if ( camera.isPerspectiveCamera ) {

				camera.aspect = aspect;

		} else {

			const orthoHeight = Math.abs( camera.top - camera.bottom ) / 2;
			const orthoWidth = orthoHeight * aspect;
			camera.left = - orthoWidth;
			camera.right = orthoWidth;
			camera.aspect = aspect;

		}

		camera.updateProjectionMatrix();

			const cameraHelper = editor.helpers[ camera.id ];
			if ( cameraHelper ) cameraHelper.update();

		}

	}

	const onDownPosition = new THREE.Vector2();
	const onUpPosition = new THREE.Vector2();
	const onDoubleClickPosition = new THREE.Vector2();

	function getMousePosition( dom, x, y ) {

		const rect = dom.getBoundingClientRect();
		return [ ( x - rect.left ) / rect.width, ( y - rect.top ) / rect.height ];

	}

	function handleClick() {

		if ( onDownPosition.distanceTo( onUpPosition ) === 0 ) {

			const intersects = selector.getPointerIntersects( onUpPosition, camera );
			signals.intersectionsDetected.dispatch( intersects );

			render();

		}

	}

	function onMouseDown( event ) {

		

		if ( !renderer || event.target !== renderer.domElement ) return;

		const array = getMousePosition( container.dom, event.clientX, event.clientY );
		onDownPosition.fromArray( array );

		document.addEventListener( 'mouseup', onMouseUp );

	}

	function onMouseUp( event ) {

		const array = getMousePosition( container.dom, event.clientX, event.clientY );
		onUpPosition.fromArray( array );

		handleClick();

		document.removeEventListener( 'mouseup', onMouseUp );

	}

	function onTouchStart( event ) {

		const touch = event.changedTouches[ 0 ];

		const array = getMousePosition( container.dom, touch.clientX, touch.clientY );
		onDownPosition.fromArray( array );

		document.addEventListener( 'touchend', onTouchEnd );

	}

	function onTouchEnd( event ) {

		const touch = event.changedTouches[ 0 ];

		const array = getMousePosition( container.dom, touch.clientX, touch.clientY );
		onUpPosition.fromArray( array );

		handleClick();

		document.removeEventListener( 'touchend', onTouchEnd );

	}

	function onDoubleClick( event ) {

		const array = getMousePosition( container.dom, event.clientX, event.clientY );
		onDoubleClickPosition.fromArray( array );

		const intersects = selector.getPointerIntersects( onDoubleClickPosition, camera );

		if ( intersects.length > 0 ) {

			const intersect = intersects[ 0 ];

			signals.objectFocused.dispatch( intersect.object );

		}

	}

	container.dom.addEventListener( 'mousedown', onMouseDown );
	container.dom.addEventListener( 'touchstart', onTouchStart, { passive: false } );
	container.dom.addEventListener( 'dblclick', onDoubleClick );

	
	

	const controls = new EditorControls( camera );
	controls.addEventListener( 'change', function () {

		signals.cameraChanged.dispatch( camera );
		signals.refreshSidebarObject3D.dispatch( camera );

	} );
	viewHelper.center = controls.center;

	editor.controls = controls;

	

	signals.editorCleared.add( function () {

		controls.center.set( 0, 0, 0 );
		if ( pathtracer ) pathtracer.reset();

		initPT();
		render();

	} );

	signals.transformModeChanged.add( function ( mode ) {

		transformControls.setMode( mode );

		render();

	} );


	signals.snapChanged.add( function ( dist ) {

		transformControls.setTranslationSnap( dist );

	} );

	signals.spaceChanged.add( function ( space ) {

		transformControls.setSpace( space );

		render();

	} );

	signals.rendererUpdated.add( function () {

		scene.traverse( function ( child ) {

			if ( child.material !== undefined ) {

				child.material.needsUpdate = true;

			}

		} );

		render();

	} );

	signals.rendererCreated.add( function ( newRenderer ) {

		if ( renderer !== null ) {

			renderer.setAnimationLoop( null );
			renderer.dispose();
			if ( pmremGenerator ) pmremGenerator.dispose();

			container.dom.removeChild( renderer.domElement );

		}

		controls.connect( newRenderer.domElement );
		

		if ( transformControls.disconnect ) {
			transformControls.disconnect();
		}
		transformControls.connect( newRenderer.domElement );

		renderer = newRenderer;

		
		if ( previewRenderer !== null ) {
			previewRenderer.dispose();
		}
		// Use WebGL for small camera preview window (not main viewport)
		// This is intentional - the preview doesn't need WebGPU overhead
		previewRenderer = new THREE.WebGLRenderer( { canvas: previewCanvas, antialias: true } );
		previewRenderer.setSize( 200, 150 );
		previewRenderer.setPixelRatio( window.devicePixelRatio );

		renderer.setAnimationLoop( animate );
		
		let clearColor = 0xaaaaaa;
		if ( window.matchMedia ) {
			const mediaQuery = window.matchMedia( '(prefers-color-scheme: dark)' );
			clearColor = mediaQuery.matches ? 0x333333 : 0xaaaaaa;
		}

		
		renderer.setClearColor( clearColor );
		previewRenderer.setClearColor( clearColor );

		if ( window.matchMedia ) {

			const mediaQuery = window.matchMedia( '(prefers-color-scheme: dark)' );
			mediaQuery.addEventListener( 'change', function ( event ) {

				const newClearColor = event.matches ? 0x333333 : 0xaaaaaa;
				if ( renderer ) renderer.setClearColor( newClearColor );
				if ( previewRenderer ) previewRenderer.setClearColor( newClearColor );
				updateGridColors( grid1, grid2, event.matches ? GRID_COLORS_DARK : GRID_COLORS_LIGHT );

				render();

			} );

			updateGridColors( grid1, grid2, mediaQuery.matches ? GRID_COLORS_DARK : GRID_COLORS_LIGHT );

		}

		renderer.setPixelRatio( window.devicePixelRatio );
		
		// Ensure container has valid dimensions before setting renderer size
		const width = Math.max( container.dom.offsetWidth, 1 );
		const height = Math.max( container.dom.offsetHeight, 1 );
		renderer.setSize( width, height );

		// Note: WebGPU renderer requires node-based materials and lights
		// Legacy lights (HemisphereLight, DirectionalLight, etc.) will show warnings
		// but basic lighting should still work through fallback systems
		
		pmremGenerator = new THREE.PMREMGenerator( renderer );
		pmremGenerator.compileEquirectangularShader();

		pathtracer = new ViewportPathtracer( renderer );

		container.dom.appendChild( renderer.domElement );

		
		renderer.domElement.addEventListener( 'dragover', function ( event ) {
			event.preventDefault();
			event.stopPropagation();
		} );

		renderer.domElement.addEventListener( 'dragleave', function ( event ) {
			event.preventDefault();
			event.stopPropagation();
		} );

		renderer.domElement.addEventListener( 'drop', async function ( event ) {
			event.preventDefault();
			event.stopPropagation();

			
			const assetData = event.dataTransfer.getData( 'text/plain' );
			if ( assetData ) {
				try {
					const asset = JSON.parse( assetData );
					
					
					if ( asset.type === 'model' ) {
						try {
							const { AddObjectCommand } = await import( './commands/AddObjectCommand.js' );
							const { ModelParser } = await import( './ModelParser.js' );
							
							const isTauri = typeof window !== 'undefined' && window.__TAURI__ && window.__TAURI__.core.invoke;
							if ( isTauri && editor.storage && editor.storage.getProjectPath ) {
								const projectPath = editor.storage.getProjectPath();
								let modelPath = asset.modelPath;
								
								if ( !modelPath && asset.path && asset.path.endsWith( '.mesh' ) ) {
									const baseName = asset.name.replace( /\.mesh$/, '' );
									const folderPath = asset.path.substring( 0, asset.path.lastIndexOf( '/' ) );
									const folderName = folderPath.substring( folderPath.lastIndexOf( '/' ) + 1 );
									if ( /\.(glb|gltf|fbx|obj)$/i.test( folderName ) ) {
										const ext = folderName.substring( folderName.lastIndexOf( '.' ) );
										modelPath = folderPath + '/' + baseName + ext;
									} else {
										const possibleExtensions = [ '.glb', '.gltf', '.fbx', '.obj' ];
										for ( const ext of possibleExtensions ) {
											const testPath = folderPath + '/' + baseName + ext;
											try {
												const testAssetPath = testPath.startsWith( '/' ) ? testPath.substring( 1 ) : testPath;
												await window.__TAURI__.core.invoke( 'read_asset_file', {
													projectPath: projectPath,
													assetPath: testAssetPath
												} );
												modelPath = testPath;
												break;
											} catch ( e ) {
											}
										}
									}
								}
								
								if ( !modelPath ) {
									modelPath = asset.path;
								}
								
								const model = await ModelParser.loadModelFromFile( asset, modelPath, projectPath );
								editor.execute( new AddObjectCommand( editor, model ) );
							}
						} catch ( error ) {
							console.error( '[Viewport] Failed to load model from asset:', error );
						}
						return;
					}
					
					
					
					
				} catch ( e ) {
					
				}
			}

			
			if ( event.dataTransfer.files && event.dataTransfer.files.length > 0 ) {
				editor.loader.loadFiles( Array.from( event.dataTransfer.files ) );
			}
		} );

		render();

	} );

	signals.rendererDetectKTX2Support.add( function ( ktx2Loader ) {

		ktx2Loader.detectSupport( renderer );

	} );

	
	signals.startPlayer.add( function () {

		isPlaying = true;
		transformControls.visible = false;
		viewHelper.visible = false;
		
		previewContainer.style.display = 'none';

	} );

	signals.stopPlayer.add( function () {

		isPlaying = false;
		transformControls.visible = true;
		viewHelper.visible = true;
		
		if ( previewCamera !== null ) {

			previewContainer.style.display = 'block';

		}

	} );

	signals.sceneGraphChanged.add( function () {

		initPT();
		render();

	} );

	signals.cameraChanged.add( function () {

		if ( pathtracer ) pathtracer.reset();

		render();

	} );

	signals.objectSelected.add( function ( object ) {

		console.log('[Viewport] objectSelected -', object?.name, 'isParticleSystem:', object?.userData?.isParticleSystem);

		selectionBox.visible = false;
		transformControls.detach();

		// Hide previous particle system when selecting something else
		if ( currentParticleSystem ) {
			const particles = currentParticleSystem.getPointsObject();
			if ( particles ) {
				particles.visible = false;
			}
		}

		if ( object !== null && object.userData && object.userData.isParticleSystem ) {
			const particleData = object.userData.particleSystem || {};
			
			if ( ParticleSystem && renderer && renderer.backend && renderer.backend.isWebGPUBackend ) {
				
				const config = {
					maxParticles: Math.min(particleData.maxParticles || 1000, 1000),
					emissionRate: particleData.emissionRate || 50,
					lifetime: particleData.lifetime || 2,
					startSize: particleData.startSize || 0.1,
					endSize: particleData.endSize || 0.05,
					startColor: particleData.startColor ? new THREE.Color(particleData.startColor) : new THREE.Color(0xffffff),
					endColor: particleData.endColor ? new THREE.Color(particleData.endColor) : new THREE.Color(0x888888),
					velocity: particleData.velocity ? new THREE.Vector3().fromArray(particleData.velocity) : new THREE.Vector3(0, 1, 0),
					gravity: particleData.gravity ? new THREE.Vector3().fromArray(particleData.gravity) : new THREE.Vector3(0, -9.8, 0),
					spread: particleData.spread !== undefined ? particleData.spread : 0.5
				};
				
				currentParticleSystem = new ParticleSystem(config);
				
				currentParticleSystem.initializeWithRenderer(renderer).then(() => {
					const particles = currentParticleSystem.getPointsObject();
					if ( particles ) {
						particles.name = 'ParticlePreview_WebGPU';
						particles.userData.skipSerialization = true;
						particles.userData.particleEntityUuid = object.uuid; // Track which entity this belongs to
						
						// Position at the particle system object
						object.getWorldPosition(particles.position);
						object.getWorldQuaternion(particles.quaternion);
						
						// Update emitter position
						object.getWorldPosition(currentParticleSystem.emitter.position);
						
						scene.add(particles);
						render();
						
						console.log('[Viewport] WebGPU particle system ready for entity:', object.uuid);
					}
				}).catch(e => {
					console.warn('[Viewport] Failed to initialize WebGPU particles:', e);
					currentParticleSystem = null;
				});
				
				return;
			}
		}

		if ( object !== null && ( object.isPerspectiveCamera || object.isOrthographicCamera ) && object !== camera ) {

			previewCamera = object;
			previewContainer.style.display = 'block';

		} else {

			previewCamera = null;
			previewContainer.style.display = 'none';

		}

		if ( object !== null && object !== scene && object !== camera ) {

			console.log('[Viewport] Setting up selection box and transform controls for:', object.name);

			// Skip bounding box for particle systems to prevent camera issues
			if ( !( object.userData && object.userData.isParticleSystem ) ) {
				box.setFromObject( object, true );
				console.log('[Viewport] Box from object:', box.min, box.max);

				if ( box.isEmpty() === false ) {

					selectionBox.visible = true;

				}
			} else {
				console.log('[Viewport] Particle system - skipping bounding box');
				selectionBox.visible = false;
			}

			transformControls.attach( object );
			console.log('[Viewport] TransformControls attached to:', object.name);

		}

		render();

	} );

	signals.objectFocused.add( function ( object ) {

		controls.focus( object );

	} );

	signals.geometryChanged.add( function ( object ) {

		if ( object !== undefined ) {

			// Skip bounding box for particle systems
			if ( !( object.userData && object.userData.isParticleSystem ) ) {
				box.setFromObject( object, true );
			}

		}

		initPT();
		render();

	} );

	signals.objectChanged.add( function ( object ) {

		if ( editor.selected === object ) {

			// Skip bounding box for particle systems
			if ( !( object.userData && object.userData.isParticleSystem ) ) {
				box.setFromObject( object, true );
			}

		}

		if ( object.isPerspectiveCamera ) {

			object.updateProjectionMatrix();

		}

		const helper = editor.helpers[ object.id ];

		if ( helper !== undefined && helper.isSkeletonHelper !== true ) {

			helper.update();

		}

		initPT();
		render();

	} );

	// Handle particle system parameter changes - recreate particle system immediately
	signals.particleSystemChanged.add( function ( object ) {
		if ( !object || !object.userData || !object.userData.isParticleSystem ) {
			return;
		}
		
		const entityUuid = object.uuid;
		const particleData = object.userData.particleSystem || {};
		
		console.log('[Viewport] Particle system parameters changed, recreating...', entityUuid);
		
		// Dispose current system if it exists
		if ( currentParticleSystem ) {
			const particles = currentParticleSystem.getPointsObject();
			if ( particles && particles.parent ) {
				particles.parent.remove(particles);
			}
			currentParticleSystem.dispose();
			currentParticleSystem = null;
		}
		
		// Recreate particle system with new parameters
		if ( ParticleSystem && renderer && renderer.backend && renderer.backend.isWebGPUBackend ) {
			const config = {
				maxParticles: Math.min(particleData.maxParticles || 1000, 1000),
				emissionRate: particleData.emissionRate || 50,
				lifetime: particleData.lifetime || 2,
				startSize: particleData.startSize || 0.1,
				endSize: particleData.endSize || 0.05,
				startColor: particleData.startColor ? new THREE.Color(particleData.startColor) : new THREE.Color(0xffffff),
				endColor: particleData.endColor ? new THREE.Color(particleData.endColor) : new THREE.Color(0x888888),
				velocity: particleData.velocity ? new THREE.Vector3().fromArray(particleData.velocity) : new THREE.Vector3(0, 1, 0),
				gravity: particleData.gravity ? new THREE.Vector3().fromArray(particleData.gravity) : new THREE.Vector3(0, -9.8, 0),
				spread: particleData.spread !== undefined ? particleData.spread : 0.5
			};
			
			currentParticleSystem = new ParticleSystem(config);
			
			// Initialize and add to scene
			currentParticleSystem.initializeWithRenderer(renderer).then(() => {
				const particles = currentParticleSystem.getPointsObject();
				if ( particles ) {
					particles.name = 'ParticlePreview_WebGPU';
					particles.userData.skipSerialization = true;
					particles.userData.particleEntityUuid = entityUuid;
					
					// Position at the particle system object
					object.getWorldPosition(particles.position);
					object.getWorldQuaternion(particles.quaternion);
					object.getWorldPosition(currentParticleSystem.emitter.position);
					
					scene.add(particles);
					render();
					
					console.log('[Viewport] Recreated WebGPU particle system with new parameters');
				}
			}).catch(e => {
				console.warn('[Viewport] Failed to recreate particle system:', e);
				currentParticleSystem = null;
			});
		}
	} );

	signals.objectRemoved.add( function ( object ) {

		if ( object === transformControls.object ) {

			transformControls.detach();

		}

		if ( object && object.userData && object.userData.isParticleSystem ) {
			// Dispose current particle system if it matches this object
			if ( currentParticleSystem ) {
				try {
					const particles = currentParticleSystem.getPointsObject();
					if ( particles && particles.parent ) {
						particles.parent.remove(particles);
					}
					currentParticleSystem.dispose();
					currentParticleSystem = null;
				} catch (e) {
					console.warn('[Viewport] Error disposing particle system:', e);
				}
			}
		}

		
		if ( transformControls.object === null ) {
			controls.enabled = true; 
		}

	} );

	let materialChangedRenderScheduled = false;
	signals.materialChanged.add( function () {

		if ( materialChangedRenderScheduled ) return;
		materialChangedRenderScheduled = true;
		requestAnimationFrame( function () {
			materialChangedRenderScheduled = false;
			updatePTMaterials();
			render();
		} );

	} );

	

	signals.sceneBackgroundChanged.add( function ( backgroundType, backgroundColor, backgroundTexture, backgroundEquirectangularTexture, backgroundColorSpace, backgroundBlurriness, backgroundIntensity, backgroundRotation ) {

		scene.background = null;

		switch ( backgroundType ) {

			case 'Color':

				scene.background = new THREE.Color( backgroundColor );

				break;

			case 'Texture':

				if ( backgroundTexture ) {

					backgroundTexture.colorSpace = backgroundColorSpace;
					backgroundTexture.needsUpdate = true;

					scene.background = backgroundTexture;

				}

				break;

			case 'Equirectangular':

				if ( backgroundEquirectangularTexture ) {

					backgroundEquirectangularTexture.mapping = THREE.EquirectangularReflectionMapping;
					backgroundEquirectangularTexture.colorSpace = backgroundColorSpace;
					backgroundEquirectangularTexture.needsUpdate = true;

					scene.background = backgroundEquirectangularTexture;
					scene.backgroundBlurriness = backgroundBlurriness;
					scene.backgroundIntensity = backgroundIntensity;
					scene.backgroundRotation.y = backgroundRotation * THREE.MathUtils.DEG2RAD;

					if ( useBackgroundAsEnvironment ) {

						scene.environment = scene.background;
						scene.environmentRotation.y = backgroundRotation * THREE.MathUtils.DEG2RAD;

					}


				}

				break;

		}

		updatePTBackground();
		render();

	} );

	

	let useBackgroundAsEnvironment = false;

	signals.sceneEnvironmentChanged.add( function ( environmentType, environmentEquirectangularTexture ) {

		scene.environment = null;

		useBackgroundAsEnvironment = false;

		switch ( environmentType ) {


			case 'Background':

				useBackgroundAsEnvironment = true;

				if ( scene.background !== null && scene.background.isTexture ) {

					scene.environment = scene.background;
					scene.environment.mapping = THREE.EquirectangularReflectionMapping;
					scene.environmentRotation.y = scene.backgroundRotation.y;

				}

				break;

			case 'Equirectangular':

				if ( environmentEquirectangularTexture ) {

					scene.environment = environmentEquirectangularTexture;
					scene.environment.mapping = THREE.EquirectangularReflectionMapping;

				}

				break;

			case 'Room':

				scene.environment = pmremGenerator.fromScene( new RoomEnvironment(), 0.04 ).texture;

				break;

		}

		updatePTEnvironment();
		render();

	} );

	

	signals.sceneFogChanged.add( function ( fogType, fogColor, fogNear, fogFar, fogDensity ) {

		switch ( fogType ) {

			case 'None':
				scene.fog = null;
				break;
			case 'Fog':
				scene.fog = new THREE.Fog( fogColor, fogNear, fogFar );
				break;
			case 'FogExp2':
				scene.fog = new THREE.FogExp2( fogColor, fogDensity );
				break;

		}

		render();

	} );

	signals.sceneFogSettingsChanged.add( function ( fogType, fogColor, fogNear, fogFar, fogDensity ) {

		switch ( fogType ) {

			case 'Fog':
				scene.fog.color.setHex( fogColor );
				scene.fog.near = fogNear;
				scene.fog.far = fogFar;
				break;
			case 'FogExp2':
				scene.fog.color.setHex( fogColor );
				scene.fog.density = fogDensity;
				break;

		}

		render();

	} );

	signals.viewportCameraChanged.add( function () {

		const viewportCamera = editor.viewportCamera;

		if ( viewportCamera.isPerspectiveCamera || viewportCamera.isOrthographicCamera ) {

			updateAspectRatio();

		}

		
		
		if ( transformControls.object === null ) {
			controls.enabled = ( viewportCamera === editor.camera );
		}

		initPT();
		render();

	} );

	signals.viewportShadingChanged.add( function () {

		const viewportShading = editor.viewportShading;

		switch ( viewportShading ) {

			case 'realistic':
				if ( pathtracer ) pathtracer.init( scene, editor.viewportCamera );
				break;

			case 'solid':
				scene.overrideMaterial = null;
				break;

			case 'normals':
				scene.overrideMaterial = new THREE.MeshNormalMaterial();
				break;

			case 'wireframe':
				scene.overrideMaterial = new THREE.MeshBasicMaterial( { color: 0x000000, wireframe: true } );
				break;

		}

		render();

	} );

	//

	signals.windowResize.add( function () {

		updateAspectRatio();

		if ( renderer ) {
			const width = Math.max( container.dom.offsetWidth, 1 );
			const height = Math.max( container.dom.offsetHeight, 1 );
			renderer.setSize( width, height );
		}
		if ( pathtracer ) {
			const width = Math.max( container.dom.offsetWidth, 1 );
			const height = Math.max( container.dom.offsetHeight, 1 );
			pathtracer.setSize( width, height );
		}

		render();

	} );

	signals.showHelpersChanged.add( function ( appearanceStates ) {

		grid.visible = appearanceStates.gridHelper;

		sceneHelpers.traverse( function ( object ) {

			switch ( object.type ) {

				case 'CameraHelper':

				{

					object.visible = appearanceStates.cameraHelpers;
					break;

				}

				case 'PointLightHelper':
				case 'DirectionalLightHelper':
				case 'SpotLightHelper':
				case 'HemisphereLightHelper':

				{

					object.visible = appearanceStates.lightHelpers;
					break;

				}

				case 'SkeletonHelper':

				{

					object.visible = appearanceStates.skeletonHelpers;
					break;

				}

				default:

				{

					

				}

			}

		} );


		render();

	} );

	signals.cameraResetted.add( updateAspectRatio );

	

	let prevActionsInUse = 0;

	const clock = new THREE.Clock(); 

	function animate() {

		const delta = clock.getDelta();
		// Sync TSL time for live previews (Inspector, node editor, asset selector): always dispatch so time is synced
		let time = clock.getElapsedTime();
		let deltaTime = delta;
		if ( renderer && renderer.nodes && renderer.nodes.nodeFrame ) {
			const nf = renderer.nodes.nodeFrame;
			time = nf.time;
			deltaTime = nf.deltaTime;
		}
		if ( editor.signals.animationFrame ) editor.signals.animationFrame.dispatch( { time, deltaTime } );
		setSharedAnimationTime( time, deltaTime );

		const mixer = editor.mixer;

		const renderMode = editor.config.getKey( 'project/viewport/renderMode' ) || 'continuous';
		let needsUpdate = ( renderMode === 'continuous' );

		// Update WebGPU particle system if active
		if ( currentParticleSystem ) {
			const particles = currentParticleSystem.getPointsObject();
			// Only update if particles are visible (i.e., particle system is selected)
			if ( particles && particles.visible && editor.selected && editor.selected.userData && editor.selected.userData.isParticleSystem ) {
				try {
					// Update emitter position to follow selected object
					editor.selected.getWorldPosition(currentParticleSystem.emitter.position);
					currentParticleSystem.update(delta);
					needsUpdate = true;
				} catch (e) {
					console.warn('[Viewport] Error updating WebGPU particle system:', e);
				}
			}
		}

		const actions = mixer.stats.actions;

		if ( actions.inUse > 0 || prevActionsInUse > 0 ) {

			prevActionsInUse = actions.inUse;

			mixer.update( delta );
			needsUpdate = true;

		}

		if ( ! isPlaying && viewHelper.animating === true ) {

			viewHelper.update( delta );
			needsUpdate = true;

		}

		if ( renderer && renderer.xr && renderer.xr.isPresenting === true ) {

			needsUpdate = true;

		}

		if ( needsUpdate === true ) render();

		updatePT();

	}

	function initPT() {

		if ( editor.viewportShading === 'realistic' && pathtracer ) {

			pathtracer.init( scene, editor.viewportCamera );

		}

	}

	function updatePTBackground() {

		if ( editor.viewportShading === 'realistic' && pathtracer ) {

			pathtracer.setBackground( scene.background, scene.backgroundBlurriness );

		}

	}

	function updatePTEnvironment() {

		if ( editor.viewportShading === 'realistic' && pathtracer ) {

			pathtracer.setEnvironment( scene.environment );

		}

	}

	function updatePTMaterials() {

		if ( editor.viewportShading === 'realistic' && pathtracer ) {

			pathtracer.updateMaterials();

		}

	}

	function updatePT() {

		if ( editor.viewportShading === 'realistic' && pathtracer ) {

			pathtracer.update();
			editor.signals.pathTracerUpdated.dispatch( pathtracer.getSamples() );

		}

	}

	//

	let startTime = 0;
	let endTime = 0;

	function render() {

		// Don't render if renderer isn't ready yet
		if ( ! renderer ) return;

		startTime = performance.now();

		renderer.setViewport( 0, 0, container.dom.offsetWidth, container.dom.offsetHeight );
		renderer.render( scene, editor.viewportCamera );

		if ( camera === editor.viewportCamera ) {

		renderer.autoClear = false;
		if ( grid.visible === true ) renderer.render( grid, camera );
		if ( ! isPlaying && sceneHelpers.visible === true ) renderer.render( sceneHelpers, camera );
		if ( ! isPlaying && renderer.xr && renderer.xr.isPresenting !== true ) viewHelper.render( renderer );
		renderer.autoClear = true;

		}

		
		if ( ! isPlaying && previewCamera !== null && previewRenderer !== null && previewContainer.style.display !== 'none' ) {

			previewRenderer.render( scene, previewCamera );

		}

		endTime = performance.now();
		editor.signals.sceneRendered.dispatch( endTime - startTime );

	}

	return container;

}

function updateGridColors( grid1, grid2, colors ) {

	grid1.material.color.setHex( colors[ 0 ] );
	grid2.material.color.setHex( colors[ 1 ] );

}

export { Viewport };
