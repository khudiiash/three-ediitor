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
import { ParticleSystem, BatchedRenderer } from 'three.quarks';
import { ParticleSystemFactory } from './ParticleSystemFactory.js';

function Viewport( editor ) {

	const selector = editor.selector;
	const signals = editor.signals;

	const container = new UIPanel();
	container.setId( 'viewport' );
	container.setPosition( 'absolute' );

	container.add( new ViewportControls( editor ) );
	container.add( new ViewportInfo( editor ) );

	//

	let renderer = null;
	let pmremGenerator = null;
	let pathtracer = null;
	let particleRenderer = null;
	let currentParticleSystem = null;
	let particleTexture = null;

	const camera = editor.camera;
	const scene = editor.scene;
	const sceneHelpers = editor.sceneHelpers;
	
	function createParticleTexture() {
		if ( particleTexture ) return particleTexture;
		
		const canvas = document.createElement( 'canvas' );
		canvas.width = 64;
		canvas.height = 64;
		const context = canvas.getContext( '2d' );
		
		const gradient = context.createRadialGradient( 32, 32, 0, 32, 32, 32 );
		gradient.addColorStop( 0, 'rgba(255, 255, 255, 1)' );
		gradient.addColorStop( 0.5, 'rgba(255, 255, 255, 0.8)' );
		gradient.addColorStop( 1, 'rgba(255, 255, 255, 0)' );
		
		context.fillStyle = gradient;
		context.fillRect( 0, 0, 64, 64 );
		
		particleTexture = new THREE.CanvasTexture( canvas );
		particleTexture.needsUpdate = true;
		
		return particleTexture;
	}

	// helpers

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

	// Camera preview
	let previewCamera = null;
	let previewRenderer = null;
	const previewContainer = document.createElement( 'div' );
	previewContainer.id = 'camera-preview';
	previewContainer.style.cssText = 'position: absolute; bottom: 20px; right: 20px; width: 200px; height: 150px; border: 2px solid #08f; background: #000; display: none; cursor: pointer; z-index: 1000;';
	previewContainer.title = 'Click to switch to this camera';
	container.dom.appendChild( previewContainer );

	const previewCanvas = document.createElement( 'canvas' );
	previewCanvas.style.cssText = 'width: 100%; height: 100%; display: block;';
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

	// TransformControls requires domElement in constructor, but renderer doesn't exist yet
	// Use container.dom as placeholder - will be reconnected when renderer is created
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

		objectPositionOnDown = object.position.clone();
		objectRotationOnDown = object.rotation.clone();
		objectScaleOnDown = object.scale.clone();

		isTransformInProgress = true;
		transformObject = object;

		controls.enabled = false;

	} );
	transformControls.addEventListener( 'mouseUp', function () {

		const object = transformControls.object;

		if ( object !== undefined ) {

			switch ( transformControls.getMode() ) {

				case 'translate':

					if ( ! objectPositionOnDown.equals( object.position ) ) {

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

		isTransformInProgress = false;
		transformObject = null;
		controls.enabled = true;

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

	// TransformControls helper - getHelper() was added in r169
	// If it doesn't exist, the helper is part of the controls object itself
	try {
		if ( typeof transformControls.getHelper === 'function' ) {
			sceneHelpers.add( transformControls.getHelper() );
		} else {
			// Fallback: add the controls object directly (it contains the helper mesh)
			sceneHelpers.add( transformControls );
		}
	} catch ( e ) {
		console.warn( 'TransformControls.getHelper() failed, using fallback:', e );
		sceneHelpers.add( transformControls );
	}

	//

	const xr = new XR( editor, transformControls ); // eslint-disable-line no-unused-vars

	// events

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

		// event.preventDefault();

		if ( event.target !== renderer.domElement ) return;

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

	// controls need to be added *after* main logic,
	// otherwise controls.enabled doesn't work.

	const controls = new EditorControls( camera );
	controls.addEventListener( 'change', function () {

		signals.cameraChanged.dispatch( camera );
		signals.refreshSidebarObject3D.dispatch( camera );

	} );
	viewHelper.center = controls.center;

	editor.controls = controls;

	// signals

	signals.editorCleared.add( function () {

		controls.center.set( 0, 0, 0 );
		pathtracer.reset();

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
			pmremGenerator.dispose();

			container.dom.removeChild( renderer.domElement );

		}

		controls.connect( newRenderer.domElement );
		// Reconnect TransformControls to the actual renderer canvas
		// TransformControls requires domElement in constructor, so we need to reconnect it
		if ( transformControls.disconnect ) {
			transformControls.disconnect();
		}
		transformControls.connect( newRenderer.domElement );

		renderer = newRenderer;

		// Create preview renderer
		if ( previewRenderer !== null ) {
			previewRenderer.dispose();
		}
		previewRenderer = new THREE.WebGLRenderer( { canvas: previewCanvas, antialias: true } );
		previewRenderer.setSize( 200, 150 );
		previewRenderer.setPixelRatio( window.devicePixelRatio );

		renderer.setAnimationLoop( animate );
		renderer.setClearColor( 0xaaaaaa );

		if ( window.matchMedia ) {

			const mediaQuery = window.matchMedia( '(prefers-color-scheme: dark)' );
			mediaQuery.addEventListener( 'change', function ( event ) {

				renderer.setClearColor( event.matches ? 0x333333 : 0xaaaaaa );
				updateGridColors( grid1, grid2, event.matches ? GRID_COLORS_DARK : GRID_COLORS_LIGHT );

				render();

			} );

			renderer.setClearColor( mediaQuery.matches ? 0x333333 : 0xaaaaaa );
			updateGridColors( grid1, grid2, mediaQuery.matches ? GRID_COLORS_DARK : GRID_COLORS_LIGHT );

		}

		renderer.setPixelRatio( window.devicePixelRatio );
		renderer.setSize( container.dom.offsetWidth, container.dom.offsetHeight );

		pmremGenerator = new THREE.PMREMGenerator( renderer );
		pmremGenerator.compileEquirectangularShader();

		pathtracer = new ViewportPathtracer( renderer );

		container.dom.appendChild( renderer.domElement );

		render();

	} );

	signals.rendererDetectKTX2Support.add( function ( ktx2Loader ) {

		ktx2Loader.detectSupport( renderer );

	} );

	// Listen for play/stop signals to hide/show gizmos
	signals.startPlayer.add( function () {

		isPlaying = true;
		transformControls.visible = false;
		viewHelper.visible = false;
		// Hide camera preview when playing
		previewContainer.style.display = 'none';

	} );

	signals.stopPlayer.add( function () {

		isPlaying = false;
		transformControls.visible = true;
		viewHelper.visible = true;
		// Show camera preview again if a camera is selected
		if ( previewCamera !== null ) {

			previewContainer.style.display = 'block';

		}

	} );

	signals.objectAdded.add( function ( object ) {

		if ( object && object.userData && object.userData.isParticleSystem ) {
			if ( !particleRenderer ) {
				particleRenderer = new BatchedRenderer();
				particleRenderer.visible = true;
				particleRenderer.name = 'BatchedRenderer';
				particleRenderer.userData.skipSerialization = true;
				scene.add( particleRenderer );
			} else if ( scene.children.indexOf( particleRenderer ) === -1 ) {
				scene.add( particleRenderer );
			}
		}

	} );

	signals.sceneGraphChanged.add( function () {

		initPT();
		render();

	} );

	signals.cameraChanged.add( function () {

		pathtracer.reset();

		render();

	} );

	signals.objectSelected.add( function ( object ) {

		selectionBox.visible = false;
		transformControls.detach();

		if ( currentParticleSystem && particleRenderer ) {
			if ( particleRenderer.removeSystem ) {
					particleRenderer.removeSystem( currentParticleSystem );
			}
			if ( currentParticleSystem.emitter.parent ) {
				currentParticleSystem.emitter.parent.remove( currentParticleSystem.emitter );
			}
			currentParticleSystem = null;
		}

		if ( object !== null && object.userData && object.userData.isParticleSystem ) {
			if ( !particleRenderer ) {
				particleRenderer = new BatchedRenderer();
				particleRenderer.visible = true;
				particleRenderer.name = 'BatchedRenderer';
				particleRenderer.userData.skipSerialization = true;
				scene.add( particleRenderer );
			} else if ( scene.children.indexOf( particleRenderer ) === -1 ) {
				scene.add( particleRenderer );
			}

		const particleData = object.userData.particleSystem || {};

		// Use the factory to create the particle system
		if ( !particleTexture ) {
			particleTexture = ParticleSystemFactory.createParticleTexture();
		}
		
		currentParticleSystem = ParticleSystemFactory.createParticleSystem( particleData, particleTexture );
			
			currentParticleSystem.emitter.name = object.name || 'ParticleSystem';
			currentParticleSystem.emitter.__entity = null;
			currentParticleSystem.emitter.userData.skipSerialization = true;
			currentParticleSystem.emitter.visible = true;
			
			object.getWorldPosition( currentParticleSystem.emitter.position );
			object.getWorldQuaternion( currentParticleSystem.emitter.quaternion );

			scene.add( currentParticleSystem.emitter );
			particleRenderer.addSystem( currentParticleSystem );
			
			if ( scene.children.indexOf( particleRenderer ) === -1 ) {
				scene.add( particleRenderer );
			}
			
			for ( let i = 0; i < 20; i++ ) {
				particleRenderer.update( 0.016 );
			}
			
			render();
		}

		if ( object !== null && ( object.isPerspectiveCamera || object.isOrthographicCamera ) && object !== camera ) {

			previewCamera = object;
			previewContainer.style.display = 'block';

		} else {

			previewCamera = null;
			previewContainer.style.display = 'none';

		}

		if ( object !== null && object !== scene && object !== camera ) {

			box.setFromObject( object, true );

			if ( box.isEmpty() === false ) {

				selectionBox.visible = true;

			}

			transformControls.attach( object );

		}

		render();

	} );

	signals.objectChanged.add( function ( object ) {

		if ( object && object.userData && object.userData.isParticleSystem ) {
			if ( !currentParticleSystem && editor.selected === object ) {
				signals.objectSelected.dispatch( object );
				return;
			}
			
			if ( !currentParticleSystem ) return;
			if ( !particleRenderer ) {
				particleRenderer = new BatchedRenderer();
				particleRenderer.visible = true;
				particleRenderer.name = 'BatchedRenderer';
				particleRenderer.userData.skipSerialization = true;
				scene.add( particleRenderer );
			} else if ( scene.children.indexOf( particleRenderer ) === -1 ) {
				scene.add( particleRenderer );
			}

			const particleData = object.userData.particleSystem || {};
			
			if ( particleRenderer.removeSystem ) {
				particleRenderer.removeSystem( currentParticleSystem );
			}
			if ( currentParticleSystem.emitter.parent ) {
				currentParticleSystem.emitter.parent.remove( currentParticleSystem.emitter );
			}

			// Use the factory to create the particle system
			if ( !particleTexture ) {
				particleTexture = ParticleSystemFactory.createParticleTexture();
			}
			
			currentParticleSystem = ParticleSystemFactory.createParticleSystem( particleData, particleTexture );
			
			currentParticleSystem.emitter.name = object.name || 'ParticleSystem';
			currentParticleSystem.emitter.__entity = null;
			currentParticleSystem.emitter.userData.skipSerialization = true;
			currentParticleSystem.emitter.visible = true;
			
			object.getWorldPosition( currentParticleSystem.emitter.position );
			object.getWorldQuaternion( currentParticleSystem.emitter.quaternion );
			// Don't copy scale when worldSpace is true - particles should maintain consistent size

			scene.add( currentParticleSystem.emitter );
			particleRenderer.addSystem( currentParticleSystem );
			
			if ( scene.children.indexOf( particleRenderer ) === -1 ) {
				scene.add( particleRenderer );
			}
			
			for ( let i = 0; i < 20; i++ ) {
				particleRenderer.update( 0.016 );
			}
			render();
		}

	} );

	signals.objectFocused.add( function ( object ) {

		controls.focus( object );

	} );

	signals.geometryChanged.add( function ( object ) {

		if ( object !== undefined ) {

			box.setFromObject( object, true );

		}

		initPT();
		render();

	} );

	signals.objectChanged.add( function ( object ) {

		if ( editor.selected === object ) {

			box.setFromObject( object, true );

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

	signals.objectRemoved.add( function ( object ) {

		if ( object === transformControls.object ) {

			transformControls.detach();

		}

		if ( object && object.userData && object.userData.isParticleSystem ) {
			if ( currentParticleSystem && currentParticleSystem.emitter ) {
				const emitterParent = currentParticleSystem.emitter.parent;
				if ( emitterParent === object || ( emitterParent && emitterParent.uuid === object.uuid ) ) {
					if ( particleRenderer && particleRenderer.removeSystem ) {
						particleRenderer.removeSystem( currentParticleSystem );
					}
					if ( currentParticleSystem.emitter.parent ) {
						currentParticleSystem.emitter.parent.remove( currentParticleSystem.emitter );
					}
					if ( scene.children.indexOf( currentParticleSystem.emitter ) !== -1 ) {
						scene.remove( currentParticleSystem.emitter );
					}
					currentParticleSystem = null;
				}
			}
			
			if ( particleRenderer && particleRenderer.systems ) {
				for ( let i = particleRenderer.systems.length - 1; i >= 0; i-- ) {
					const system = particleRenderer.systems[ i ];
					if ( system && system.emitter ) {
						const emitterParent = system.emitter.parent;
						if ( emitterParent === object || ( emitterParent && emitterParent.uuid === object.uuid ) ) {
							if ( particleRenderer.removeSystem ) {
								particleRenderer.removeSystem( system );
							}
							if ( system.emitter.parent ) {
								system.emitter.parent.remove( system.emitter );
							}
							if ( scene.children.indexOf( system.emitter ) !== -1 ) {
								scene.remove( system.emitter );
							}
						}
					}
				}
			}
			
			const emittersToRemove = [];
			scene.traverse( function ( child ) {
				if ( child.type === 'ParticleEmitter' ) {
					const emitterParent = child.parent;
					if ( emitterParent === object || ( emitterParent && emitterParent.uuid === object.uuid ) ) {
						emittersToRemove.push( child );
					}
				}
			} );
			
			for ( let i = 0; i < emittersToRemove.length; i++ ) {
				const emitter = emittersToRemove[ i ];
				if ( emitter.parent ) {
					emitter.parent.remove( emitter );
				}
				if ( scene.children.indexOf( emitter ) !== -1 ) {
					scene.remove( emitter );
				}
			}
			
			const entityObject = object;
			if ( entityObject && entityObject.parent ) {
				entityObject.parent.remove( entityObject );
			}
			if ( scene.children.indexOf( entityObject ) !== -1 ) {
				scene.remove( entityObject );
			}
			
			let hasParticleSystem = false;
			scene.traverse( function ( child ) {
				if ( child.userData && child.userData.isParticleSystem && child.parent !== null ) {
					hasParticleSystem = true;
				}
			} );
			
			if ( !hasParticleSystem && particleRenderer && scene.children.indexOf( particleRenderer ) !== -1 ) {
				scene.remove( particleRenderer );
			}
		}

		// Only re-enable controls if TransformControls is not active
		if ( transformControls.object === null ) {
			controls.enabled = true; // see #14180
		}

	} );

	signals.materialChanged.add( function () {

		updatePTMaterials();
		render();

	} );

	// background

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

	// environment

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

	// fog

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

		// disable EditorControls when setting a user camera
		// but don't re-enable if TransformControls is currently active
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
				pathtracer.init( scene, editor.viewportCamera );
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

		renderer.setSize( container.dom.offsetWidth, container.dom.offsetHeight );
		pathtracer.setSize( container.dom.offsetWidth, container.dom.offsetHeight );

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

					// not a helper, skip.

				}

			}

		} );


		render();

	} );

	signals.cameraResetted.add( updateAspectRatio );

	// animations

	let prevActionsInUse = 0;

	const clock = new THREE.Clock(); // only used for animations

	function animate() {

		const mixer = editor.mixer;
		const delta = clock.getDelta();

		let needsUpdate = false;

		if ( particleRenderer ) {
			try {
				particleRenderer.update( delta );
				if ( currentParticleSystem ) {
					needsUpdate = true;
				}
			} catch ( e ) {
				console.error( '[Viewport] Error updating particle system:', e );
			}
		}

		const actions = mixer.stats.actions;

		if ( actions.inUse > 0 || prevActionsInUse > 0 ) {

			prevActionsInUse = actions.inUse;

			mixer.update( delta );
			needsUpdate = true;

			if ( editor.selected !== null ) {

				editor.selected.updateWorldMatrix( false, true );
				selectionBox.box.setFromObject( editor.selected, true );

			}

		}

		if ( ! isPlaying && viewHelper.animating === true ) {

			viewHelper.update( delta );
			needsUpdate = true;

		}

		if ( renderer.xr.isPresenting === true ) {

			needsUpdate = true;

		}

		if ( needsUpdate === true ) render();

		updatePT();

	}

	function initPT() {

		if ( editor.viewportShading === 'realistic' ) {

			pathtracer.init( scene, editor.viewportCamera );

		}

	}

	function updatePTBackground() {

		if ( editor.viewportShading === 'realistic' ) {

			pathtracer.setBackground( scene.background, scene.backgroundBlurriness );

		}

	}

	function updatePTEnvironment() {

		if ( editor.viewportShading === 'realistic' ) {

			pathtracer.setEnvironment( scene.environment );

		}

	}

	function updatePTMaterials() {

		if ( editor.viewportShading === 'realistic' ) {

			pathtracer.updateMaterials();

		}

	}

	function updatePT() {

		if ( editor.viewportShading === 'realistic' ) {

			pathtracer.update();
			editor.signals.pathTracerUpdated.dispatch( pathtracer.getSamples() );

		}

	}

	//

	let startTime = 0;
	let endTime = 0;

	function render() {

		startTime = performance.now();

		if ( currentParticleSystem && currentParticleSystem.emitter && editor.selected && editor.selected.userData && editor.selected.userData.isParticleSystem ) {
			editor.selected.getWorldPosition( currentParticleSystem.emitter.position );
			editor.selected.getWorldQuaternion( currentParticleSystem.emitter.quaternion );
			// Don't copy scale when worldSpace is true - particles should maintain consistent size
		}

		renderer.setViewport( 0, 0, container.dom.offsetWidth, container.dom.offsetHeight );
		renderer.render( scene, editor.viewportCamera );

		if ( camera === editor.viewportCamera ) {

		renderer.autoClear = false;
		if ( grid.visible === true ) renderer.render( grid, camera );
		if ( ! isPlaying && sceneHelpers.visible === true ) renderer.render( sceneHelpers, camera );
		if ( ! isPlaying && renderer.xr.isPresenting !== true ) viewHelper.render( renderer );
		renderer.autoClear = true;

		}

		// Render camera preview (only when not playing)
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
