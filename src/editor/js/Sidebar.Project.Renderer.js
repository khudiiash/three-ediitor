import * as THREE from 'three';

import { UINumber, UIPanel, UIRow, UISelect, UIText } from './libs/ui.js';
import { UIBoolean } from './libs/ui.three.js';

function SidebarProjectRenderer( editor ) {

	const config = editor.config;
	const signals = editor.signals;
	const strings = editor.strings;

	let currentRenderer = null;

	const container = new UIPanel();
	container.setBorderTop( '0px' );

	// Renderer settings have been moved to Settings/Rendering panel
	// This component now only handles renderer creation

	function createRenderer() {

		const antialias = config.getKey( 'project/renderer/antialias' ) !== undefined ? config.getKey( 'project/renderer/antialias' ) : true;
		const shadows = config.getKey( 'project/renderer/shadows' ) !== undefined ? config.getKey( 'project/renderer/shadows' ) : true;
		const shadowType = config.getKey( 'project/renderer/shadowType' ) !== undefined ? config.getKey( 'project/renderer/shadowType' ) : 1;
		const toneMapping = config.getKey( 'project/renderer/toneMapping' ) !== undefined ? config.getKey( 'project/renderer/toneMapping' ) : 0;
		const toneMappingExposure = config.getKey( 'project/renderer/toneMappingExposure' ) !== undefined ? config.getKey( 'project/renderer/toneMappingExposure' ) : 1;

		currentRenderer = new THREE.WebGLRenderer( { antialias: antialias } );
		currentRenderer.shadowMap.enabled = shadows;
		currentRenderer.shadowMap.type = shadowType;
		currentRenderer.toneMapping = toneMapping;
		currentRenderer.toneMappingExposure = toneMappingExposure;

		// Set shadowmap size from config
		const shadowMapSize = config.getKey( 'project/shadowMapSize' ) || 2048;
		currentRenderer.shadowMap.width = shadowMapSize;
		currentRenderer.shadowMap.height = shadowMapSize;

		signals.rendererCreated.dispatch( currentRenderer );
		signals.rendererUpdated.dispatch();

	}

	createRenderer();


	// Signals

	signals.editorCleared.add( function () {

		currentRenderer.shadowMap.enabled = true;
		currentRenderer.shadowMap.type = THREE.PCFShadowMap;
		currentRenderer.toneMapping = THREE.NoToneMapping;
		currentRenderer.toneMappingExposure = 1;

		config.setKey(
			'project/renderer/shadows', true,
			'project/renderer/shadowType', THREE.PCFShadowMap,
			'project/renderer/toneMapping', THREE.NoToneMapping,
			'project/renderer/toneMappingExposure', 1
		);

		signals.rendererUpdated.dispatch();

	} );

	return container;

}

export { SidebarProjectRenderer };
