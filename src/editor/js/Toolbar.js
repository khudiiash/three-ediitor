import { UIPanel, UIButton, UICheckbox } from './libs/ui.js';

function Toolbar( editor ) {

	const signals = editor.signals;
	const strings = editor.strings;

	const container = new UIPanel();
	container.setId( 'toolbar' );

	

	const translateIcon = document.createElement( 'img' );
	translateIcon.title = strings.getKey( 'toolbar/translate' );
	translateIcon.src = 'images/translate.svg';

	const translate = new UIButton();
	translate.addClass( 'toolbar-button selected' );
	translate.dom.appendChild( translateIcon );
	translate.onClick( function () {

		signals.transformModeChanged.dispatch( 'translate' );

	} );
	container.add( translate );

	const rotateIcon = document.createElement( 'img' );
	rotateIcon.title = strings.getKey( 'toolbar/rotate' );
	rotateIcon.src = 'images/rotate.svg';

	const rotate = new UIButton();
	rotate.addClass( 'toolbar-button' );
	rotate.dom.appendChild( rotateIcon );
	rotate.onClick( function () {

		signals.transformModeChanged.dispatch( 'rotate' );

	} );
	container.add( rotate );

	const scaleIcon = document.createElement( 'img' );
	scaleIcon.title = strings.getKey( 'toolbar/scale' );
	scaleIcon.src = 'images/scale.svg';

	const scale = new UIButton();
	scale.addClass( 'toolbar-button' );
	scale.dom.appendChild( scaleIcon );
	scale.onClick( function () {

		signals.transformModeChanged.dispatch( 'scale' );

	} );
	container.add( scale );

	const local = new UICheckbox( false );
	local.dom.title = strings.getKey( 'toolbar/local' );
	local.onChange( function () {

		signals.spaceChanged.dispatch( this.getValue() === true ? 'local' : 'world' );

	} );
	container.add( local );

	//

	signals.transformModeChanged.add( function ( mode ) {

		translate.dom.classList.remove( 'selected' );
		rotate.dom.classList.remove( 'selected' );
		scale.dom.classList.remove( 'selected' );

		switch ( mode ) {

			case 'translate': translate.dom.classList.add( 'selected' ); break;
			case 'rotate': rotate.dom.classList.add( 'selected' ); break;
			case 'scale': scale.dom.classList.add( 'selected' ); break;

		}

	} );

	
	let isPlaying = false;
	const playButton = new UIButton( '▶' );
	playButton.addClass( 'toolbar-button' );
	playButton.dom.title = strings.getKey( 'sidebar/project/app/play' ) || 'Play';
	playButton.onClick( function () {

		if ( isPlaying === false ) {

			isPlaying = true;
			playButton.dom.textContent = '■';
			playButton.dom.title = strings.getKey( 'sidebar/project/app/stop' ) || 'Stop';
			signals.startPlayer.dispatch();

		} else {

			isPlaying = false;
			playButton.dom.textContent = '▶';
			playButton.dom.title = strings.getKey( 'sidebar/project/app/play' ) || 'Play';
			signals.stopPlayer.dispatch();

		}

	} );
	container.add( playButton );

	
	signals.startPlayer.add( function () {

		if ( ! isPlaying ) {

			isPlaying = true;
			playButton.dom.textContent = '■';
			playButton.dom.title = strings.getKey( 'sidebar/project/app/stop' ) || 'Stop';

		}

	} );

	signals.stopPlayer.add( function () {

		if ( isPlaying ) {

			isPlaying = false;
			playButton.dom.textContent = '▶';
			playButton.dom.title = strings.getKey( 'sidebar/project/app/play' ) || 'Play';

		}

	} );

	return container;

}

export { Toolbar };
