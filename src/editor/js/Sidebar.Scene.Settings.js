/**
 * Scene Settings Panel
 * Contains Background, Environment, and Fog settings
 */

import * as THREE from 'three';

import { UIPanel, UIRow, UIColor, UISelect, UIText, UINumber, UIBreak, UIDiv } from './libs/ui.js';
import { UITexture } from './libs/ui.three.js';

function SidebarSceneSettings( editor ) {

	const signals = editor.signals;
	const strings = editor.strings;

	const container = new UIPanel();
	container.setBorderTop( '0' );
	container.setPaddingTop( '20px' );

	

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
	
	const backgroundInputsContainer = new UIDiv();
	backgroundInputsContainer.addClass( 'input-group' );
	backgroundInputsContainer.add( backgroundType );
	
	const backgroundColor = new UIColor().setValue( '#000000' ).onInput( onBackgroundChanged );
	backgroundInputsContainer.add( backgroundColor );

	const backgroundTexture = new UITexture( editor ).onChange( onBackgroundChanged );
	backgroundTexture.setDisplay( 'none' );
	backgroundInputsContainer.add( backgroundTexture );

	const backgroundEquirectangularTexture = new UITexture( editor ).onChange( onBackgroundChanged );
	backgroundEquirectangularTexture.setDisplay( 'none' );
	backgroundInputsContainer.add( backgroundEquirectangularTexture );
	
	backgroundRow.add( backgroundInputsContainer );

	container.add( backgroundRow );

	const backgroundColorSpaceRow = new UIRow();
	backgroundColorSpaceRow.setDisplay( 'none' );

	const backgroundColorSpace = new UISelect().setOptions( {

		[ THREE.NoColorSpace ]: 'No Color Space',
		[ THREE.LinearSRGBColorSpace ]: 'srgb-linear',
		[ THREE.SRGBColorSpace ]: 'srgb'

	} ).setWidth( '150px' );
	backgroundColorSpace.setValue( THREE.NoColorSpace );
	backgroundColorSpace.onChange( onBackgroundChanged );
	backgroundColorSpaceRow.add( new UIText( 'Color Space' ).setClass( 'Label' ) );
	backgroundColorSpaceRow.add( backgroundColorSpace );

	container.add( backgroundColorSpaceRow );

	const backgroundEquirectRow = new UIRow();
	backgroundEquirectRow.setDisplay( 'none' );

	const backgroundBlurriness = new UINumber( 0 ).setWidth( '40px' ).setRange( 0, 1 ).onChange( onBackgroundChanged );
	const backgroundIntensity = new UINumber( 1 ).setWidth( '40px' ).setRange( 0, Infinity ).onChange( onBackgroundChanged );
	const backgroundRotation = new UINumber( 0 ).setWidth( '40px' ).setRange( - 180, 180 ).setStep( 10 ).setNudge( 0.1 ).setUnit( '°' ).onChange( onBackgroundChanged );
	
	const backgroundEquirectInputsContainer = new UIDiv();
	backgroundEquirectInputsContainer.addClass( 'input-group' );
	backgroundEquirectInputsContainer.add( backgroundBlurriness, backgroundIntensity, backgroundRotation );
	
	backgroundEquirectRow.add( new UIText( 'Blur / Intensity / Rotation' ).setClass( 'Label' ) );
	backgroundEquirectRow.add( backgroundEquirectInputsContainer );

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
	
	const environmentInputsContainer = new UIDiv();
	environmentInputsContainer.addClass( 'input-group' );
	environmentInputsContainer.add( environmentType );
	
	const environmentEquirectangularTexture = new UITexture( editor ).onChange( onEnvironmentChanged );
	environmentEquirectangularTexture.setDisplay( 'none' );
	environmentInputsContainer.add( environmentEquirectangularTexture );
	
	environmentRow.add( environmentInputsContainer );

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

	const fogColor = new UIColor().setValue( '#aaaaaa' );
	fogColor.onInput( onFogSettingsChanged );
	const fogNear = new UINumber( 0.1 ).setWidth( '50px' ).setRange( 0, Infinity ).onChange( onFogSettingsChanged );
	const fogFar = new UINumber( 50 ).setWidth( '50px' ).setRange( 0, Infinity ).onChange( onFogSettingsChanged );
	const fogDensity = new UINumber( 0.05 ).setWidth( '50px' ).setRange( 0, 0.1 ).setStep( 0.001 ).setPrecision( 3 ).onChange( onFogSettingsChanged );
	
	const fogColorRow = new UIRow().setStyle("margin-left: 8px");
	const fogNearRow = new UIRow().setStyle("margin-left: 8px");
	const fogFarRow = new UIRow().setStyle("margin-left: 8px");
	const fogDensityRow = new UIRow().setStyle("margin-left: 8px");

	fogColorRow.add( new UIText( 'Fog Color' ).setClass( 'Label' ), fogColor);
	fogNearRow.add( new UIText( 'Fog Near' ).setClass( 'Label' ), fogNear);
	fogFarRow.add( new UIText( 'Fog Far' ).setClass( 'Label' ), fogFar);
	fogDensityRow.add( new UIText( 'Fog Density' ).setClass( 'Label' ), fogDensity);

	container.add(fogColorRow)
	container.add(fogFarRow)
	container.add(fogNearRow)
	container.add(fogDensityRow)

	refreshFogUI()

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
		fogColorRow.setDisplay( type === 'None' ? 'none' : '' );
		fogNearRow.setDisplay( type === 'None' ? 'none' : '' );
		fogFarRow.setDisplay( type === 'None' ? 'none' : '' );
		fogDensityRow.setDisplay( type === 'None' ? 'none' : '' );

	}

	refreshFogUI();

	return container;

}

export { SidebarSceneSettings };

