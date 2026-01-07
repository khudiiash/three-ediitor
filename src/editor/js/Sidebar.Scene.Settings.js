/**
 * Scene Settings Panel
 * Contains Background, Environment, and Fog settings
 */

import * as THREE from 'three';

import { UIPanel, UIRow, UIColor, UISelect, UIText, UINumber, UIBreak } from './libs/ui.js';
import { UITexture } from './libs/ui.three.js';

function SidebarSceneSettings( editor ) {

	const signals = editor.signals;
	const strings = editor.strings;

	const container = new UIPanel();
	container.setBorderTop( '0' );
	container.setPaddingTop( '20px' );

	// Background

	const backgroundRow = new UIRow();

	const backgroundType = new UISelect().setOptions( {

		'None': '',
		'Color': 'Color',
		'Texture': 'Texture',
		'Equirectangular': 'Equirect'

	} ).setWidth( '150px' );
	backgroundType.setValue( 'None' );
	backgroundType.onChange( function () {

		onBackgroundChanged();
		refreshBackgroundUI();

	} );

	backgroundRow.add( new UIText( strings.getKey( 'sidebar/scene/background' ) ).setClass( 'Label' ) );
	backgroundRow.add( backgroundType );

	const backgroundColor = new UIColor().setValue( '#000000' ).setMarginLeft( '8px' ).onInput( onBackgroundChanged );
	backgroundRow.add( backgroundColor );

	const backgroundTexture = new UITexture( editor ).setMarginLeft( '8px' ).onChange( onBackgroundChanged );
	backgroundTexture.setDisplay( 'none' );
	backgroundRow.add( backgroundTexture );

	const backgroundEquirectangularTexture = new UITexture( editor ).setMarginLeft( '8px' ).onChange( onBackgroundChanged );
	backgroundEquirectangularTexture.setDisplay( 'none' );
	backgroundRow.add( backgroundEquirectangularTexture );

	container.add( backgroundRow );

	const backgroundColorSpaceRow = new UIRow();
	backgroundColorSpaceRow.setDisplay( 'none' );
	backgroundColorSpaceRow.setMarginLeft( '120px' );

	const backgroundColorSpace = new UISelect().setOptions( {

		[ THREE.NoColorSpace ]: 'No Color Space',
		[ THREE.LinearSRGBColorSpace ]: 'srgb-linear',
		[ THREE.SRGBColorSpace ]: 'srgb'

	} ).setWidth( '150px' );
	backgroundColorSpace.setValue( THREE.NoColorSpace );
	backgroundColorSpace.onChange( onBackgroundChanged );
	backgroundColorSpaceRow.add( backgroundColorSpace );

	container.add( backgroundColorSpaceRow );

	const backgroundEquirectRow = new UIRow();
	backgroundEquirectRow.setDisplay( 'none' );
	backgroundEquirectRow.setMarginLeft( '120px' );

	const backgroundBlurriness = new UINumber( 0 ).setWidth( '40px' ).setRange( 0, 1 ).onChange( onBackgroundChanged );
	backgroundEquirectRow.add( backgroundBlurriness );

	const backgroundIntensity = new UINumber( 1 ).setWidth( '40px' ).setRange( 0, Infinity ).onChange( onBackgroundChanged );
	backgroundEquirectRow.add( backgroundIntensity );

	const backgroundRotation = new UINumber( 0 ).setWidth( '40px' ).setRange( - 180, 180 ).setStep( 10 ).setNudge( 0.1 ).setUnit( '°' ).onChange( onBackgroundChanged );
	backgroundEquirectRow.add( backgroundRotation );

	container.add( backgroundEquirectRow );

	function onBackgroundChanged() {

		signals.sceneBackgroundChanged.dispatch(
			backgroundType.getValue(),
			backgroundColor.getHexValue(),
			backgroundTexture.getValue(),
			backgroundEquirectangularTexture.getValue(),
			backgroundColorSpace.getValue(),
			backgroundBlurriness.getValue(),
			backgroundIntensity.getValue(),
			backgroundRotation.getValue()
		);

	}

	function refreshBackgroundUI() {

		const type = backgroundType.getValue();

		backgroundType.setWidth( type === 'None' ? '150px' : '110px' );
		backgroundColor.setDisplay( type === 'Color' ? '' : 'none' );
		backgroundTexture.setDisplay( type === 'Texture' ? '' : 'none' );
		backgroundEquirectangularTexture.setDisplay( type === 'Equirectangular' ? '' : 'none' );
		backgroundEquirectRow.setDisplay( type === 'Equirectangular' ? '' : 'none' );

		if ( type === 'Texture' || type === 'Equirectangular' ) {

			backgroundColorSpaceRow.setDisplay( '' );

		} else {

			backgroundColorSpaceRow.setDisplay( 'none' );

		}

	}

	refreshBackgroundUI();

	container.add( new UIBreak() );

	// Environment

	const environmentRow = new UIRow();

	const environmentType = new UISelect().setOptions( {

		'None': '',
		'Background': 'Background',
		'Equirectangular': 'Equirect',
		'Room': 'Room'

	} ).setWidth( '150px' );
	environmentType.setValue( 'None' );
	environmentType.onChange( function () {

		onEnvironmentChanged();
		refreshEnvironmentUI();

	} );

	environmentRow.add( new UIText( strings.getKey( 'sidebar/scene/environment' ) ).setClass( 'Label' ) );
	environmentRow.add( environmentType );

	const environmentEquirectangularTexture = new UITexture( editor ).setMarginLeft( '8px' ).onChange( onEnvironmentChanged );
	environmentEquirectangularTexture.setDisplay( 'none' );
	environmentRow.add( environmentEquirectangularTexture );

	container.add( environmentRow );

	function onEnvironmentChanged() {

		signals.sceneEnvironmentChanged.dispatch(
			environmentType.getValue(),
			environmentEquirectangularTexture.getValue()
		);

	}

	function refreshEnvironmentUI() {

		const type = environmentType.getValue();

		environmentType.setWidth( type !== 'Equirectangular' ? '150px' : '110px' );
		environmentEquirectangularTexture.setDisplay( type === 'Equirectangular' ? '' : 'none' );

	}

	refreshEnvironmentUI();

	container.add( new UIBreak() );

	// Fog

	const fogTypeRow = new UIRow();
	const fogType = new UISelect().setOptions( {

		'None': '',
		'Fog': 'Linear',
		'FogExp2': 'Exponential'

	} ).setWidth( '150px' );
	fogType.onChange( function () {

		onFogChanged();
		refreshFogUI();

	} );

	fogTypeRow.add( new UIText( strings.getKey( 'sidebar/scene/fog' ) ).setClass( 'Label' ) );
	fogTypeRow.add( fogType );

	container.add( fogTypeRow );

	// fog color

	const fogPropertiesRow = new UIRow();
	fogPropertiesRow.setDisplay( 'none' );
	fogPropertiesRow.setMarginLeft( '120px' );
	container.add( fogPropertiesRow );

	const fogColor = new UIColor().setValue( '#aaaaaa' );
	fogColor.onInput( onFogSettingsChanged );
	fogPropertiesRow.add( fogColor );

	// fog near

	const fogNear = new UINumber( 0.1 ).setWidth( '40px' ).setRange( 0, Infinity ).onChange( onFogSettingsChanged );
	fogPropertiesRow.add( fogNear );

	// fog far

	const fogFar = new UINumber( 50 ).setWidth( '40px' ).setRange( 0, Infinity ).onChange( onFogSettingsChanged );
	fogPropertiesRow.add( fogFar );

	// fog density

	const fogDensity = new UINumber( 0.05 ).setWidth( '40px' ).setRange( 0, 0.1 ).setStep( 0.001 ).setPrecision( 3 ).onChange( onFogSettingsChanged );
	fogPropertiesRow.add( fogDensity );

	//

	function onFogChanged() {

		signals.sceneFogChanged.dispatch(
			fogType.getValue(),
			fogColor.getHexValue(),
			fogNear.getValue(),
			fogFar.getValue(),
			fogDensity.getValue()
		);

	}

	function onFogSettingsChanged() {

		signals.sceneFogSettingsChanged.dispatch(
			fogType.getValue(),
			fogColor.getHexValue(),
			fogNear.getValue(),
			fogFar.getValue(),
			fogDensity.getValue()
		);

	}

	function refreshFogUI() {

		const type = fogType.getValue();
		fogPropertiesRow.setDisplay( type === 'None' ? 'none' : '' );

	}

	refreshFogUI();

	return container;

}

export { SidebarSceneSettings };

