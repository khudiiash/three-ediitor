import { UIPanel, UIRow, UISelect, UIText, UINumber, UIButton } from './libs/ui.js';
import { UIBoolean } from './libs/ui.three.js';
import { UICollapsiblePanel } from './libs/UICollapsiblePanel.js';
import { AssetSelector } from './AssetSelector.js';
import * as THREE from 'three';

function SidebarSettings( editor ) {

	const config = editor.config;
	const strings = editor.strings;
	const signals = editor.signals;

	const container = new UIPanel();
	container.setBorderTop( '0' );
	container.setPaddingTop( '4px' );

	
	const renderingPanel = new UICollapsiblePanel( 'Rendering' );
	renderingPanel.collapse();

	
	const antialiasRow = new UIRow();
	const antialiasBoolean = new UIBoolean( config.getKey( 'project/renderer/antialias' ) || true ).onChange( function () {

		if ( currentRenderer ) {

			
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

	
	const shadowsRow = new UIRow();
	const shadowsBoolean = new UIBoolean( config.getKey( 'project/renderer/shadows' ) || true ).onChange( function () {

		if ( currentRenderer && currentRenderer.shadowMap ) {

			currentRenderer.shadowMap.enabled = this.getValue();
			config.setKey( 'project/renderer/shadows', this.getValue() );
			shadowEnabled.setValue( this.getValue() ); 
			signals.rendererUpdated.dispatch();

		}

	} );
	shadowsRow.add( new UIText( 'Shadows' ).setClass( 'Label' ) );
	shadowsRow.add( shadowsBoolean );
	renderingPanel.add( shadowsRow );

	
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

	
	const shadowPanel = new UICollapsiblePanel( 'Shadow' );
	shadowPanel.collapse();

	let currentRenderer = null;

	
	const shadowEnabledRow = new UIRow();
	const shadowEnabled = new UIBoolean( config.getKey( 'project/renderer/shadows' ) || true ).onChange( function () {

		if ( currentRenderer && currentRenderer.shadowMap ) {

			currentRenderer.shadowMap.enabled = this.getValue();
			config.setKey( 'project/renderer/shadows', this.getValue() );
			shadowsBoolean.setValue( this.getValue() ); 
			signals.rendererUpdated.dispatch();

		}

	} );
	shadowEnabledRow.add( new UIText( 'Enabled' ).setClass( 'Label' ) );
	shadowEnabledRow.add( shadowEnabled );
	shadowPanel.add( shadowEnabledRow );

	
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

		shadowType.setValue( '1' ); 

	}
	shadowTypeRow.add( new UIText( 'Type' ).setClass( 'Label' ) );
	shadowTypeRow.add( shadowType );
	shadowPanel.add( shadowTypeRow );

	
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

		shadowCullFace.setValue( '0' ); 

	}
	shadowCullFaceRow.add( new UIText( 'Cull Face' ).setClass( 'Label' ) );
	shadowCullFaceRow.add( shadowCullFace );
	shadowPanel.add( shadowCullFaceRow );

	
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

	
	const assetsPanel = new UICollapsiblePanel( 'Assets' );
	assetsPanel.collapse();
	
	container.add( assetsPanel );

	
	const physicsPanel = new UICollapsiblePanel( 'Physics' );
	physicsPanel.collapse();
	
	container.add( physicsPanel );

	const defaultsPanel = new UICollapsiblePanel( 'Defaults' );
	defaultsPanel.collapse();

	const defaultCastShadowsRow = new UIRow();
	const defaultCastShadows = new UIBoolean( config.getKey( 'project/defaults/castShadows' ) === true ).onChange( function () {
		config.setKey( 'project/defaults/castShadows', this.getValue() );
	} );
	defaultCastShadowsRow.add( new UIText( 'Default Cast Shadows' ).setClass( 'Label' ) );
	defaultCastShadowsRow.add( defaultCastShadows );
	defaultsPanel.add( defaultCastShadowsRow );

	const defaultReceiveShadowsRow = new UIRow();
	const defaultReceiveShadows = new UIBoolean( config.getKey( 'project/defaults/receiveShadows' ) === true ).onChange( function () {
		config.setKey( 'project/defaults/receiveShadows', this.getValue() );
	} );
	defaultReceiveShadowsRow.add( new UIText( 'Default Receive Shadows' ).setClass( 'Label' ) );
	defaultReceiveShadowsRow.add( defaultReceiveShadows );
	defaultsPanel.add( defaultReceiveShadowsRow );

	const defaultMaterialRow = new UIRow();
	const defaultMaterialButton = new UIButton( 'Select Material' ).setWidth( '150px' );
	const defaultMaterialText = new UIText( 'None' ).setMarginLeft( '8px' );
	
	let defaultMaterialUuid = config.getKey( 'project/defaults/material' );
	
	function updateDefaultMaterialText() {
		if ( defaultMaterialUuid && editor.materials[ defaultMaterialUuid ] ) {
			defaultMaterialText.setValue( editor.materials[ defaultMaterialUuid ].name || 'Material' );
		} else {
			defaultMaterialText.setValue( 'None' );
		}
	}
	
	updateDefaultMaterialText();

	defaultMaterialButton.onClick( function () {
		if ( ! editor.assetSelector ) {
			editor.assetSelector = new AssetSelector( editor );
		}

		editor.assetSelector.show( async function ( assetData ) {
			if ( ! assetData ) return;

			let newMaterial = null;

			if ( assetData && ( assetData.isMaterial || assetData instanceof THREE.Material ) ) {
				newMaterial = assetData;
			} else if ( assetData.type === 'default-material' && assetData.materialType ) {
				const materialClassesList = {
					'LineBasicMaterial': THREE.LineBasicMaterial,
					'LineDashedMaterial': THREE.LineDashedMaterial,
					'MeshBasicMaterial': THREE.MeshBasicMaterial,
					'MeshDepthMaterial': THREE.MeshDepthMaterial,
					'MeshNormalMaterial': THREE.MeshNormalMaterial,
					'MeshLambertMaterial': THREE.MeshLambertMaterial,
					'MeshMatcapMaterial': THREE.MeshMatcapMaterial,
					'MeshPhongMaterial': THREE.MeshPhongMaterial,
					'MeshToonMaterial': THREE.MeshToonMaterial,
					'MeshStandardMaterial': THREE.MeshStandardMaterial,
					'MeshPhysicalMaterial': THREE.MeshPhysicalMaterial,
					'RawShaderMaterial': THREE.RawShaderMaterial,
					'ShaderMaterial': THREE.ShaderMaterial,
					'ShadowMaterial': THREE.ShadowMaterial,
					'SpriteMaterial': THREE.SpriteMaterial,
					'PointsMaterial': THREE.PointsMaterial
				};
				const MaterialClass = materialClassesList[ assetData.materialType ];
				if ( MaterialClass ) {
					newMaterial = new MaterialClass();
					newMaterial.name = assetData.materialType;
				}
			}

			if ( newMaterial ) {
				editor.addMaterial( newMaterial );
				config.setKey( 'project/defaults/material', newMaterial.uuid );
				defaultMaterialUuid = newMaterial.uuid;
				defaultMaterialText.setValue( newMaterial.name || 'Material' );
			}
		}, null, 'material' );
	} );

	defaultMaterialRow.add( new UIText( 'Default Material' ).setClass( 'Label' ) );
	defaultMaterialRow.add( defaultMaterialButton );
	defaultMaterialRow.add( defaultMaterialText );
	defaultsPanel.add( defaultMaterialRow );

	signals.materialRemoved.add( function () {
		if ( defaultMaterialUuid && ! editor.materials[ defaultMaterialUuid ] ) {
			defaultMaterialUuid = null;
			config.setKey( 'project/defaults/material', null );
			updateDefaultMaterialText();
		}
	} );

	signals.materialAdded.add( function () {
		updateDefaultMaterialText();
	} );

	signals.sceneGraphChanged.add( function () {
		const currentUuid = config.getKey( 'project/defaults/material' );
		if ( currentUuid !== defaultMaterialUuid ) {
			defaultMaterialUuid = currentUuid;
			updateDefaultMaterialText();
		} else {
			updateDefaultMaterialText();
		}
	} );

	if ( typeof window !== 'undefined' && window.__TAURI__ ) {
		const updateDefaultsUI = function () {
			defaultCastShadows.setValue( config.getKey( 'project/defaults/castShadows' ) === true );
			defaultReceiveShadows.setValue( config.getKey( 'project/defaults/receiveShadows' ) === true );
			defaultMaterialUuid = config.getKey( 'project/defaults/material' );
			updateDefaultMaterialText();
		};

		const checkProjectPath = setInterval( function () {
			const projectPath = editor.storage && editor.storage.getProjectPath ? editor.storage.getProjectPath() : null;
			if ( projectPath ) {
				clearInterval( checkProjectPath );
				
				if ( editor.config && editor.config.loadProjectConfig ) {
					editor.config.loadProjectConfig().then( function () {
						updateDefaultsUI();
					} ).catch( function ( error ) {
						console.warn( '[Settings] Failed to load project config:', error );
						updateDefaultsUI();
					} );
				} else {
					setTimeout( updateDefaultsUI, 500 );
				}
			}
		}, 500 );
		
		setTimeout( function () {
			clearInterval( checkProjectPath );
		}, 10000 );
	}

	container.add( defaultsPanel );

	signals.rendererCreated.add( function ( renderer ) {

		currentRenderer = renderer;

		
		const size = config.getKey( 'project/shadowMapSize' ) || 2048;
		if ( renderer.shadowMap ) {

			renderer.shadowMap.width = size;
			renderer.shadowMap.height = size;

			
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
