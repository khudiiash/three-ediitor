import { UIHorizontalRule, UIPanel, UIRow } from './libs/ui.js';

function MenubarView( editor ) {

	const signals = editor.signals;
	const strings = editor.strings;

	const container = new UIPanel();
	container.setClass( 'menu' );

	const title = new UIPanel();
	title.setClass( 'title' );
	title.setTextContent( strings.getKey( 'menubar/view' ) );
	container.add( title );

	const options = new UIPanel();
	options.setClass( 'options' );
	container.add( options );

	

	const states = {

		gridHelper: true,
		cameraHelpers: true,
		lightHelpers: true,
		skeletonHelpers: true

	};

	

	let option = new UIRow().addClass( 'option' ).addClass( 'toggle' ).setTextContent( strings.getKey( 'menubar/view/gridHelper' ) ).onClick( function () {

		states.gridHelper = ! states.gridHelper;

		this.toggleClass( 'toggle-on', states.gridHelper );

		signals.showHelpersChanged.dispatch( states );

	} ).toggleClass( 'toggle-on', states.gridHelper );

	options.add( option );

	

	option = new UIRow().addClass( 'option' ).addClass( 'toggle' ).setTextContent( strings.getKey( 'menubar/view/cameraHelpers' ) ).onClick( function () {

		states.cameraHelpers = ! states.cameraHelpers;

		this.toggleClass( 'toggle-on', states.cameraHelpers );

		signals.showHelpersChanged.dispatch( states );

	} ).toggleClass( 'toggle-on', states.cameraHelpers );

	options.add( option );

	

	option = new UIRow().addClass( 'option' ).addClass( 'toggle' ).setTextContent( strings.getKey( 'menubar/view/lightHelpers' ) ).onClick( function () {

		states.lightHelpers = ! states.lightHelpers;

		this.toggleClass( 'toggle-on', states.lightHelpers );

		signals.showHelpersChanged.dispatch( states );

	} ).toggleClass( 'toggle-on', states.lightHelpers );

	options.add( option );

	

	option = new UIRow().addClass( 'option' ).addClass( 'toggle' ).setTextContent( strings.getKey( 'menubar/view/skeletonHelpers' ) ).onClick( function () {

		states.skeletonHelpers = ! states.skeletonHelpers;

		this.toggleClass( 'toggle-on', states.skeletonHelpers );

		signals.showHelpersChanged.dispatch( states );

	} ).toggleClass( 'toggle-on', states.skeletonHelpers );

	options.add( option );

	
	
	

	signals.helperAdded.add( function () {

		signals.showHelpersChanged.dispatch( states );

	} );

	//

	options.add( new UIHorizontalRule() );

	option = new UIRow();
	option.setClass( 'option' );
	option.setTextContent( strings.getKey( 'menubar/view/fullscreen' ) );
	option.onClick( function () {

		if ( document.fullscreenElement === null ) {

			document.documentElement.requestFullscreen();

		} else if ( document.exitFullscreen ) {

			document.exitFullscreen();

		}

		

		if ( document.webkitFullscreenElement === null ) {

			document.documentElement.webkitRequestFullscreen();

		} else if ( document.webkitExitFullscreen ) {

			document.webkitExitFullscreen();

		}

	} );
	options.add( option );

	

	if ( 'xr' in navigator ) {

		if ( 'offerSession' in navigator.xr ) {

			signals.offerXR.dispatch( 'immersive-ar' );

		} else {

			navigator.xr.isSessionSupported( 'immersive-ar' )
				.then( function ( supported ) {

					if ( supported ) {

						const option = new UIRow();
						option.setClass( 'option' );
						option.setTextContent( 'AR' );
						option.onClick( function () {

							signals.enterXR.dispatch( 'immersive-ar' );

						} );
						options.add( option );

					} else {

						navigator.xr.isSessionSupported( 'immersive-vr' )
							.then( function ( supported ) {

								if ( supported ) {

									const option = new UIRow();
									option.setClass( 'option' );
									option.setTextContent( 'VR' );
									option.onClick( function () {

										signals.enterXR.dispatch( 'immersive-vr' );

									} );
									options.add( option );

								}

							} );

					}

				} );

		}

	}

	//

	return container;

}

export { MenubarView };
