import * as THREE from 'three';
import { WebGPURenderer } from 'three/webgpu';

import { UINumber, UIPanel, UIRow, UISelect, UIText } from './libs/ui.js';
import { UIBoolean } from './libs/ui.three.js';

let rendererCreationPromise = null;

function SidebarProjectRenderer( editor ) {

	const config = editor.config;
	const signals = editor.signals;
	const strings = editor.strings;

	let currentRenderer = null;

	const container = new UIPanel();
	container.setBorderTop( '0px' );

	
	

	async function createRenderer() {

		if ( rendererCreationPromise ) {
			console.log('[SidebarProjectRenderer] Renderer creation already in progress, waiting...');
			await rendererCreationPromise;
			console.log('[SidebarProjectRenderer] Using already created renderer');
			return;
		}

		rendererCreationPromise = (async () => {
			const antialias = config.getKey( 'project/renderer/antialias' ) !== undefined ? config.getKey( 'project/renderer/antialias' ) : true;
			const shadows = config.getKey( 'project/renderer/shadows' ) !== undefined ? config.getKey( 'project/renderer/shadows' ) : true;
			const shadowType = config.getKey( 'project/renderer/shadowType' ) !== undefined ? config.getKey( 'project/renderer/shadowType' ) : 1;
			const toneMapping = config.getKey( 'project/renderer/toneMapping' ) !== undefined ? config.getKey( 'project/renderer/toneMapping' ) : 0;
			const toneMappingExposure = config.getKey( 'project/renderer/toneMappingExposure' ) !== undefined ? config.getKey( 'project/renderer/toneMappingExposure' ) : 1;

			currentRenderer = new WebGPURenderer( { antialias: antialias } );
			console.log('[SidebarProjectRenderer] Renderer created', currentRenderer);
			await currentRenderer.init();
			
			currentRenderer.shadowMap.enabled = shadows;
			currentRenderer.shadowMap.type = shadowType;
			currentRenderer.toneMapping = toneMapping;
			currentRenderer.toneMappingExposure = toneMappingExposure;

			
			const shadowMapSize = config.getKey( 'project/shadowMapSize' ) || 2048;
			currentRenderer.shadowMap.width = shadowMapSize;
			currentRenderer.shadowMap.height = shadowMapSize;

			window.rendererInitialized = true;
			console.log('[SidebarProjectRenderer] Renderer fully initialized');

			signals.rendererCreated.dispatch( currentRenderer );
			signals.rendererUpdated.dispatch();
		})();

		await rendererCreationPromise;

	}

	createRenderer().catch( err => {
		console.error( '[SidebarProjectRenderer] Failed to create renderer:', err );
	} );


	

	signals.editorCleared.add( function () {

		if ( ! currentRenderer ) return;

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
