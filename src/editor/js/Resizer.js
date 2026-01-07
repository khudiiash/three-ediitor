import { UIElement } from './libs/ui.js';

function Resizer( editor ) {

	const signals = editor.signals;

	// Left sidebar resizer (resizes left sidebar width)
	const leftResizer = document.createElement( 'div' );
	leftResizer.id = 'resizer-left';
	leftResizer.style.cssText = 'position: absolute; z-index: 1001; top: 32px; left: 250px; width: 5px; bottom: 200px; transform: translatex(-2.5px); cursor: col-resize; pointer-events: auto; background: transparent;';

	function onLeftPointerDown( event ) {

		if ( event.isPrimary === false ) return;

		event.preventDefault();
		event.stopPropagation();

		leftResizer.ownerDocument.addEventListener( 'pointermove', onLeftPointerMove );
		leftResizer.ownerDocument.addEventListener( 'pointerup', onLeftPointerUp );

	}

	function onLeftPointerUp( event ) {

		if ( event.isPrimary === false ) return;

		leftResizer.ownerDocument.removeEventListener( 'pointermove', onLeftPointerMove );
		leftResizer.ownerDocument.removeEventListener( 'pointerup', onLeftPointerUp );

	}

	function onLeftPointerMove( event ) {

		if ( event.isPrimary === false ) return;

		const clientX = event.clientX;
		const minWidth = 200;
		const maxWidth = Math.min( 600, window.innerWidth * 0.5 );

		const width = Math.max( minWidth, Math.min( maxWidth, clientX ) );

		const sidebarLeft = document.getElementById( 'sidebar-left' );
		const viewport = document.getElementById( 'viewport' );
		const sidebarBottom = document.getElementById( 'sidebar-bottom' );

		if ( sidebarLeft && viewport && sidebarBottom ) {

			sidebarLeft.style.width = width + 'px';
			viewport.style.left = width + 'px';
			sidebarBottom.style.left = width + 'px';
			leftResizer.style.left = width + 'px';
			updateBottomResizerPosition();

			signals.windowResize.dispatch();

		}

	}

	leftResizer.addEventListener( 'pointerdown', onLeftPointerDown );

	// Right sidebar resizer (resizes right sidebar width)
	const rightResizer = document.createElement( 'div' );
	rightResizer.id = 'resizer';
	rightResizer.style.cssText = 'position: absolute; z-index: 1001; top: 32px; right: 350px; width: 5px; bottom: 200px; transform: translatex(2.5px); cursor: col-resize; pointer-events: auto; background: transparent;';

	function onRightPointerDown( event ) {

		if ( event.isPrimary === false ) return;

		event.preventDefault();
		event.stopPropagation();

		rightResizer.ownerDocument.addEventListener( 'pointermove', onRightPointerMove );
		rightResizer.ownerDocument.addEventListener( 'pointerup', onRightPointerUp );

	}

	function onRightPointerUp( event ) {

		if ( event.isPrimary === false ) return;

		rightResizer.ownerDocument.removeEventListener( 'pointermove', onRightPointerMove );
		rightResizer.ownerDocument.removeEventListener( 'pointerup', onRightPointerUp );

	}

	function onRightPointerMove( event ) {

		if ( event.isPrimary === false ) return;

		event.preventDefault();

		const offsetWidth = document.body.offsetWidth;
		const clientX = event.clientX;

		const cX = clientX < 0 ? 0 : clientX > offsetWidth ? offsetWidth : clientX;

		const minWidth = 300;
		const maxWidth = Math.min( 600, window.innerWidth * 0.5 );
		const width = Math.max( minWidth, Math.min( maxWidth, offsetWidth - cX ) );

		const sidebarRight = document.getElementById( 'sidebar-right' );
		const viewport = document.getElementById( 'viewport' );
		const sidebarBottom = document.getElementById( 'sidebar-bottom' );

		if ( sidebarRight && viewport && sidebarBottom ) {

			sidebarRight.style.width = width + 'px';
			viewport.style.right = width + 'px';
			sidebarBottom.style.right = width + 'px';
			rightResizer.style.right = width + 'px';
			updateBottomResizerPosition();

			signals.windowResize.dispatch();

		}

	}

	rightResizer.addEventListener( 'pointerdown', onRightPointerDown );

	// Bottom sidebar resizer (resizes bottom sidebar height)
	const bottomResizer = document.createElement( 'div' );
	bottomResizer.id = 'resizer-bottom';
	
	// Update bottom resizer position when sidebars change
	function updateBottomResizerPosition() {
		const sidebarLeft = document.getElementById( 'sidebar-left' );
		const sidebarRight = document.getElementById( 'sidebar-right' );
		if ( sidebarLeft && sidebarRight ) {
			bottomResizer.style.left = sidebarLeft.offsetWidth + 'px';
			bottomResizer.style.right = sidebarRight.offsetWidth + 'px';
		}
	}
	
	bottomResizer.style.cssText = 'position: absolute; bottom: 200px; height: 5px; z-index: 1001; cursor: row-resize; transform: translatey(2.5px); pointer-events: auto; background: transparent;';
	updateBottomResizerPosition();

	function onBottomPointerDown( event ) {

		if ( event.isPrimary === false ) return;

		event.preventDefault();
		event.stopPropagation();

		bottomResizer.setPointerCapture( event.pointerId );
		bottomResizer.ownerDocument.addEventListener( 'pointermove', onBottomPointerMove );
		bottomResizer.ownerDocument.addEventListener( 'pointerup', onBottomPointerUp );

	}

	function onBottomPointerUp( event ) {

		if ( event.isPrimary === false ) return;

		if ( bottomResizer.hasPointerCapture && bottomResizer.hasPointerCapture( event.pointerId ) ) {
			bottomResizer.releasePointerCapture( event.pointerId );
		}

		bottomResizer.ownerDocument.removeEventListener( 'pointermove', onBottomPointerMove );
		bottomResizer.ownerDocument.removeEventListener( 'pointerup', onBottomPointerUp );

	}

	function onBottomPointerMove( event ) {

		if ( event.isPrimary === false ) return;

		event.preventDefault();

		const windowHeight = window.innerHeight;
		const clientY = event.clientY;

		// Calculate height from bottom: window height - mouse Y position
		// The sidebar is at bottom: 0, so height = distance from mouse to bottom
		const rawHeight = windowHeight - clientY;

		const minHeight = 100;
		const maxHeight = Math.min( 500, windowHeight * 0.6 );
		const height = Math.max( minHeight, Math.min( maxHeight, rawHeight ) );

		const sidebarBottom = document.getElementById( 'sidebar-bottom' );
		const viewport = document.getElementById( 'viewport' );

		if ( sidebarBottom && viewport ) {

			sidebarBottom.style.height = height + 'px';
			viewport.style.bottom = height + 'px';
			// Position resizer at the top edge of the bottom sidebar
			bottomResizer.style.bottom = height + 'px';
			
			// Update left and right sidebars to extend to the new bottom
			const sidebarLeft = document.getElementById( 'sidebar-left' );
			const sidebarRight = document.getElementById( 'sidebar-right' );
			if ( sidebarLeft ) {
				sidebarLeft.style.bottom = height + 'px';
				leftResizer.style.bottom = height + 'px';
			}
			if ( sidebarRight ) {
				sidebarRight.style.bottom = height + 'px';
				rightResizer.style.bottom = height + 'px';
			}

			signals.windowResize.dispatch();

		}

	}

	bottomResizer.addEventListener( 'pointerdown', onBottomPointerDown );

	// Add hover styles
	[ leftResizer, rightResizer, bottomResizer ].forEach( resizer => {

		resizer.addEventListener( 'mouseenter', function () {

			this.style.backgroundColor = '#08f8';

		} );

		resizer.addEventListener( 'mouseleave', function () {

			this.style.backgroundColor = '';

		} );

		resizer.addEventListener( 'pointerdown', function () {

			this.style.backgroundColor = '#08f';

		} );

	} );

	// Add resizers directly to body
	document.body.appendChild( leftResizer );
	document.body.appendChild( rightResizer );
	document.body.appendChild( bottomResizer );

	// Return a dummy element for compatibility
	return new UIElement( document.createElement( 'div' ) );

}

export { Resizer };
