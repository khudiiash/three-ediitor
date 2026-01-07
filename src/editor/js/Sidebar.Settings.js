import { UIPanel, UIRow, UISelect, UIText, UINumber } from './libs/ui.js';
import { UIBoolean } from './libs/ui.three.js';
import { UICollapsiblePanel } from './libs/UICollapsiblePanel.js';
import { SidebarSceneSettings } from './Sidebar.Scene.Settings.js';
import * as THREE from 'three';

function SidebarSettings( editor ) {

	const config = editor.config;
	const strings = editor.strings;
	const signals = editor.signals;

	const container = new UIPanel();
	container.setBorderTop( '0' );
	container.setPaddingTop( '4px' );

	// Scene panel
	const scenePanel = new UICollapsiblePanel( 'Scene' );
	const sceneContent = new SidebarSceneSettings( editor );
	scenePanel.add( sceneContent );
	scenePanel.collapse();
	container.add( scenePanel );

	// Rendering panel
	const renderingPanel = new UICollapsiblePanel( 'Rendering' );
	renderingPanel.collapse();

	// Antialias
	const antialiasRow = new UIRow();
	const antialiasBoolean = new UIBoolean( config.getKey( 'project/renderer/antialias' ) || true ).onChange( function () {

		if ( currentRenderer ) {

			// Recreate renderer with new antialias setting
			const wasEnabled = currentRenderer.shadowMap ? currentRenderer.shadowMap.enabled : false;
			const shadowType = currentRenderer.shadowMap ? currentRenderer.shadowMap.type : 1;
			const toneMapping = currentRenderer.toneMapping;
			const toneMappingExposure = currentRenderer.toneMappingExposure;

			currentRenderer = new THREE.WebGLRenderer( { antialias: this.getValue() } );
			if ( currentRenderer.shadowMap ) {

				currentRenderer.shadowMap.enabled = wasEnabled;
				currentRenderer.shadowMap.type = shadowType;
				const size = config.getKey( 'project/shadowMapSize' ) || 2048;
				currentRenderer.shadowMap.width = size;
				currentRenderer.shadowMap.height = size;

			}
			currentRenderer.toneMapping = toneMapping;
			currentRenderer.toneMappingExposure = toneMappingExposure;

			config.setKey( 'project/renderer/antialias', this.getValue() );
			signals.rendererCreated.dispatch( currentRenderer );
			signals.rendererUpdated.dispatch();

		}

	} );
	antialiasRow.add( new UIText( 'Antialias' ).setClass( 'Label' ) );
	antialiasRow.add( antialiasBoolean );
	renderingPanel.add( antialiasRow );

	// Shadows (top-level in Rendering, before Shadow panel)
	const shadowsRow = new UIRow();
	const shadowsBoolean = new UIBoolean( config.getKey( 'project/renderer/shadows' ) || true ).onChange( function () {

		if ( currentRenderer && currentRenderer.shadowMap ) {

			currentRenderer.shadowMap.enabled = this.getValue();
			config.setKey( 'project/renderer/shadows', this.getValue() );
			shadowEnabled.setValue( this.getValue() ); // Sync with shadow panel
			signals.rendererUpdated.dispatch();

		}

	} );
	shadowsRow.add( new UIText( 'Shadows' ).setClass( 'Label' ) );
	shadowsRow.add( shadowsBoolean );
	renderingPanel.add( shadowsRow );

	// Tonemapping
	const toneMappingRow = new UIRow();
	const toneMappingSelect = new UISelect().setOptions( {
		[ THREE.NoToneMapping ]: 'No',
		[ THREE.LinearToneMapping ]: 'Linear',
		[ THREE.ReinhardToneMapping ]: 'Reinhard',
		[ THREE.CineonToneMapping ]: 'Cineon',
		[ THREE.ACESFilmicToneMapping ]: 'ACESFilmic',
		[ THREE.AgXToneMapping ]: 'AgX',
		[ THREE.NeutralToneMapping ]: 'Neutral'
	} ).setWidth( '120px' ).onChange( function () {

		if ( currentRenderer ) {

			currentRenderer.toneMapping = parseFloat( this.getValue() );
			config.setKey( 'project/renderer/toneMapping', parseFloat( this.getValue() ) );
			toneMappingExposure.setDisplay( this.getValue() === THREE.NoToneMapping.toString() ? 'none' : '' );
			signals.rendererUpdated.dispatch();

		}

	} );
	const toneMappingValue = config.getKey( 'project/renderer/toneMapping' );
	if ( toneMappingValue !== undefined ) {

		toneMappingSelect.setValue( toneMappingValue.toString() );

	} else {

		toneMappingSelect.setValue( THREE.NoToneMapping.toString() );

	}
	toneMappingRow.add( new UIText( 'Tone Mapping' ).setClass( 'Label' ) );
	toneMappingRow.add( toneMappingSelect );

	const toneMappingExposure = new UINumber( config.getKey( 'project/renderer/toneMappingExposure' ) || 1 ).setWidth( '30px' ).setMarginLeft( '10px' ).setRange( 0, 10 ).onChange( function () {

		if ( currentRenderer ) {

			currentRenderer.toneMappingExposure = this.getValue();
			config.setKey( 'project/renderer/toneMappingExposure', this.getValue() );
			signals.rendererUpdated.dispatch();

		}

	} );
	toneMappingExposure.setDisplay( toneMappingSelect.getValue() === THREE.NoToneMapping.toString() ? 'none' : '' );
	toneMappingRow.add( toneMappingExposure );
	renderingPanel.add( toneMappingRow );

	// Shadow panel (inside Rendering)
	const shadowPanel = new UICollapsiblePanel( 'Shadow' );
	shadowPanel.collapse();

	let currentRenderer = null;

	// Shadow Map Enabled (duplicate of top-level shadows, but more detailed)
	const shadowEnabledRow = new UIRow();
	const shadowEnabled = new UIBoolean( config.getKey( 'project/renderer/shadows' ) || true ).onChange( function () {

		if ( currentRenderer && currentRenderer.shadowMap ) {

			currentRenderer.shadowMap.enabled = this.getValue();
			config.setKey( 'project/renderer/shadows', this.getValue() );
			shadowsBoolean.setValue( this.getValue() ); // Sync with top-level shadows
			signals.rendererUpdated.dispatch();

		}

	} );
	shadowEnabledRow.add( new UIText( 'Enabled' ).setClass( 'Label' ) );
	shadowEnabledRow.add( shadowEnabled );
	shadowPanel.add( shadowEnabledRow );

	// Shadow Map Type
	const shadowTypeRow = new UIRow();
	const shadowType = new UISelect().setOptions( {
		0: 'Basic',
		1: 'PCF',
		2: 'PCF Soft',
		3: 'VSM'
	} ).setWidth( '125px' ).onChange( function () {

		if ( currentRenderer && currentRenderer.shadowMap ) {

			currentRenderer.shadowMap.type = parseFloat( this.getValue() );
			config.setKey( 'project/renderer/shadowType', parseFloat( this.getValue() ) );
			signals.rendererUpdated.dispatch();

		}

	} );
	if ( config.getKey( 'project/renderer/shadowType' ) !== undefined ) {

		shadowType.setValue( config.getKey( 'project/renderer/shadowType' ) );

	} else {

		shadowType.setValue( '1' ); // Default to PCF

	}
	shadowTypeRow.add( new UIText( 'Type' ).setClass( 'Label' ) );
	shadowTypeRow.add( shadowType );
	shadowPanel.add( shadowTypeRow );

	// Shadow Map Size
	const shadowMapSizeRow = new UIRow();
	const shadowMapSize = new UINumber( 2048 ).setWidth( '100px' ).setRange( 256, 8192 ).setStep( 256 ).onChange( function () {

		const value = this.getValue();
		config.setKey( 'project/shadowMapSize', value );

		if ( currentRenderer && currentRenderer.shadowMap ) {

			currentRenderer.shadowMap.width = value;
			currentRenderer.shadowMap.height = value;
			signals.rendererUpdated.dispatch();

		}

	} );
	if ( config.getKey( 'project/shadowMapSize' ) !== undefined ) {

		shadowMapSize.setValue( config.getKey( 'project/shadowMapSize' ) );

	}
	shadowMapSizeRow.add( new UIText( 'Map Size' ).setClass( 'Label' ) );
	shadowMapSizeRow.add( shadowMapSize );
	shadowPanel.add( shadowMapSizeRow );

	// Shadow Map Cull Face
	const shadowCullFaceRow = new UIRow();
	const shadowCullFace = new UISelect().setOptions( {
		0: 'Front',
		1: 'Back'
	} ).setWidth( '125px' ).onChange( function () {

		if ( currentRenderer && currentRenderer.shadowMap ) {

			currentRenderer.shadowMap.cullFace = parseFloat( this.getValue() );
			config.setKey( 'project/renderer/shadowCullFace', parseFloat( this.getValue() ) );
			signals.rendererUpdated.dispatch();

		}

	} );
	if ( config.getKey( 'project/renderer/shadowCullFace' ) !== undefined ) {

		shadowCullFace.setValue( config.getKey( 'project/renderer/shadowCullFace' ) );

	} else {

		shadowCullFace.setValue( '0' ); // Default to Front

	}
	shadowCullFaceRow.add( new UIText( 'Cull Face' ).setClass( 'Label' ) );
	shadowCullFaceRow.add( shadowCullFace );
	shadowPanel.add( shadowCullFaceRow );

	// Shadow Map Cascade
	const shadowCascadeRow = new UIRow();
	const shadowCascade = new UIBoolean( config.getKey( 'project/renderer/shadowCascade' ) || false ).onChange( function () {

		if ( currentRenderer && currentRenderer.shadowMap ) {

			currentRenderer.shadowMap.cascade = this.getValue();
			config.setKey( 'project/renderer/shadowCascade', this.getValue() );
			signals.rendererUpdated.dispatch();

		}

	} );
	shadowCascadeRow.add( new UIText( 'Cascade' ).setClass( 'Label' ) );
	shadowCascadeRow.add( shadowCascade );
	shadowPanel.add( shadowCascadeRow );

	// Shadow Map Auto Update
	const shadowAutoUpdateRow = new UIRow();
	const shadowAutoUpdate = new UIBoolean( config.getKey( 'project/renderer/shadowAutoUpdate' ) !== undefined ? config.getKey( 'project/renderer/shadowAutoUpdate' ) : true ).onChange( function () {

		if ( currentRenderer && currentRenderer.shadowMap ) {

			currentRenderer.shadowMap.autoUpdate = this.getValue();
			config.setKey( 'project/renderer/shadowAutoUpdate', this.getValue() );
			signals.rendererUpdated.dispatch();

		}

	} );
	shadowAutoUpdateRow.add( new UIText( 'Auto Update' ).setClass( 'Label' ) );
	shadowAutoUpdateRow.add( shadowAutoUpdate );
	shadowPanel.add( shadowAutoUpdateRow );

	renderingPanel.add( shadowPanel );
	container.add( renderingPanel );

	// Assets panel
	const assetsPanel = new UICollapsiblePanel( 'Assets' );
	assetsPanel.collapse();
	// TODO: Add asset settings here
	container.add( assetsPanel );

	// Physics panel
	const physicsPanel = new UICollapsiblePanel( 'Physics' );
	physicsPanel.collapse();
	// TODO: Add physics settings here
	container.add( physicsPanel );

	// Listen for renderer creation to set initial shadowmap settings
	signals.rendererCreated.add( function ( renderer ) {

		currentRenderer = renderer;

		// Set shadowmap size
		const size = config.getKey( 'project/shadowMapSize' ) || 2048;
		if ( renderer.shadowMap ) {

			renderer.shadowMap.width = size;
			renderer.shadowMap.height = size;

			// Set other shadowmap properties
			if ( config.getKey( 'project/renderer/shadows' ) !== undefined ) {

				renderer.shadowMap.enabled = config.getKey( 'project/renderer/shadows' );

			}
			if ( config.getKey( 'project/renderer/shadowType' ) !== undefined ) {

				renderer.shadowMap.type = config.getKey( 'project/renderer/shadowType' );

			}
			if ( config.getKey( 'project/renderer/shadowCullFace' ) !== undefined ) {

				renderer.shadowMap.cullFace = config.getKey( 'project/renderer/shadowCullFace' );

			}
			if ( config.getKey( 'project/renderer/shadowCascade' ) !== undefined ) {

				renderer.shadowMap.cascade = config.getKey( 'project/renderer/shadowCascade' );

			}
			if ( config.getKey( 'project/renderer/shadowAutoUpdate' ) !== undefined ) {

				renderer.shadowMap.autoUpdate = config.getKey( 'project/renderer/shadowAutoUpdate' );

			}

			// Update UI to match renderer state
			antialiasBoolean.setValue( renderer.antialias );
			shadowsBoolean.setValue( renderer.shadowMap.enabled );
			shadowEnabled.setValue( renderer.shadowMap.enabled );
			if ( renderer.toneMapping !== undefined ) {

				toneMappingSelect.setValue( renderer.toneMapping.toString() );
				toneMappingExposure.setDisplay( renderer.toneMapping === THREE.NoToneMapping ? 'none' : '' );

			}
			if ( renderer.toneMappingExposure !== undefined ) {

				toneMappingExposure.setValue( renderer.toneMappingExposure );

			}
			if ( renderer.shadowMap.type !== undefined ) {

				shadowType.setValue( renderer.shadowMap.type.toString() );

			}
			shadowMapSize.setValue( renderer.shadowMap.width );
			if ( renderer.shadowMap.cullFace !== undefined ) {

				shadowCullFace.setValue( renderer.shadowMap.cullFace.toString() );

			}
			if ( renderer.shadowMap.cascade !== undefined ) {

				shadowCascade.setValue( renderer.shadowMap.cascade );

			}
			if ( renderer.shadowMap.autoUpdate !== undefined ) {

				shadowAutoUpdate.setValue( renderer.shadowMap.autoUpdate );

			}

		}

	} );

	// Update shadowmap settings when renderer is updated
	signals.rendererUpdated.add( function () {

		if ( currentRenderer && currentRenderer.shadowMap ) {

			const size = config.getKey( 'project/shadowMapSize' ) || 2048;
			currentRenderer.shadowMap.width = size;
			currentRenderer.shadowMap.height = size;

		}

	} );

	return container;

}

export { SidebarSettings };
