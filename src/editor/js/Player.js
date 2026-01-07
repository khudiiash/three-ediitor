import { APP } from './libs/app.js';

function Player( editor ) {

	const signals = editor.signals;

	// Get viewport container
	const viewport = document.getElementById( 'viewport' );
	if ( ! viewport ) {

		console.error( 'Viewport not found' );
		return;

	}

	// Create player instance
	const player = new APP.Player();
	let isPlaying = false;

	// Hide player canvas initially
	player.dom.style.display = 'none';
	player.dom.style.position = 'absolute';
	player.dom.style.top = '0';
	player.dom.style.left = '0';
	player.dom.style.width = '100%';
	player.dom.style.height = '100%';
	player.dom.style.zIndex = '100';

	// Append player canvas to viewport
	viewport.appendChild( player.dom );

	window.addEventListener( 'resize', function () {

		if ( isPlaying ) {

			player.setSize( viewport.clientWidth, viewport.clientHeight );

		}

	} );

	signals.windowResize.add( function () {

		if ( isPlaying ) {

			player.setSize( viewport.clientWidth, viewport.clientHeight );

		}

	} );

	signals.startPlayer.add( function () {

		isPlaying = true;

		// Hide editor renderer and gizmos
		const editorCanvas = viewport.querySelector( 'canvas' );
		if ( editorCanvas && editorCanvas !== player.canvas ) {

			editorCanvas.style.display = 'none';

		}

		// Gizmos will be hidden by Viewport.js listening to startPlayer signal

		// Show player canvas
		player.dom.style.display = '';

		// Get JSON and replace viewport camera with scene camera
		const json = editor.toJSON();
		
		// Find first camera in the scene (not the viewport camera)
		let sceneCamera = null;
		editor.scene.traverse( function ( object ) {

			if ( ( object.isPerspectiveCamera || object.isOrthographicCamera ) && object !== editor.camera ) {

				sceneCamera = object;
				return; // Found first camera, stop traversing

			}

		} );

		// Use scene camera if found, otherwise use viewport camera as fallback
		if ( sceneCamera !== null ) {

			json.camera = sceneCamera.toJSON();

		}

		player.load( json );
		player.setSize( viewport.clientWidth, viewport.clientHeight );
		player.play();

	} );

	signals.stopPlayer.add( function () {

		isPlaying = false;

		// Show editor renderer
		const editorCanvas = viewport.querySelector( 'canvas' );
		if ( editorCanvas && editorCanvas !== player.canvas ) {

			editorCanvas.style.display = '';

		}

		// Gizmos will be shown by Viewport.js listening to stopPlayer signal

		// Hide player canvas
		player.dom.style.display = 'none';

		player.stop();
		player.dispose();

	} );

	// Return empty object for compatibility
	return {};

}

export { Player };
