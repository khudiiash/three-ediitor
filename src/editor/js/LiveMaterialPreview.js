/**
 * Live WebGPU preview for NodeMaterials (animated shaders).
 * Single source: shared animation time is set by the Viewport; all previews and thumbnails use it.
 */

import * as THREE from 'three/webgpu';
import { WebGPURenderer } from 'three/webgpu';

// Shared animation time – set by Viewport on every frame so all previews and thumbnails use the same time
let _sharedTime = undefined;
let _sharedDeltaTime = undefined;

export function setSharedAnimationTime( time, deltaTime ) {
	_sharedTime = time;
	_sharedDeltaTime = deltaTime;
}

export function getSharedAnimationTime() {
	return { time: _sharedTime, deltaTime: _sharedDeltaTime };
}

/**
 * @param {object} nodeMaterial - NodeMaterial data (graph, type: 'NodeMaterial')
 * @param {number} width
 * @param {number} height
 * @param {function} generateMaterialFromNodes - editor.generateMaterialFromNodes
 * @param {{ editor?: object }} [options] - If options.editor is set, preview uses the viewport's animation time (synced with main viewport).
 * @returns {Promise<{ element: HTMLElement, stop: function }>}
 */
export async function createLiveMaterialPreview( nodeMaterial, width, height, generateMaterialFromNodes, options ) {

	const div = document.createElement( 'div' );
	div.style.width = width + 'px';
	div.style.height = height + 'px';
	div.style.minWidth = width + 'px';
	div.style.minHeight = height + 'px';
	div.style.overflow = 'hidden';
	div.style.background = '#1a1a1a';
	div.style.borderRadius = '4px';
	div.style.display = 'flex';
	div.style.alignItems = 'center';
	div.style.justifyContent = 'center';

	const renderer = new WebGPURenderer( { antialias: true, alpha: true } );
	renderer.setSize( width, height );
	renderer.setPixelRatio( Math.min( window.devicePixelRatio || 1, 2 ) );
	renderer.setClearColor( 0x1a1a1a, 1 );
	renderer.domElement.style.width = '100%';
	renderer.domElement.style.height = '100%';
	renderer.domElement.style.display = 'block';
	div.appendChild( renderer.domElement );

	const scene = new THREE.Scene();
	const camera = new THREE.PerspectiveCamera( 50, width / height, 0.1, 1000 );
	camera.position.set( 0, 0, 3 );
	camera.lookAt( 0, 0, 0 );

	const ambientLight = new THREE.AmbientLight( 0xffffff, 0.5 );
	scene.add( ambientLight );
	const directionalLight = new THREE.DirectionalLight( 0xffffff, 0.8 );
	directionalLight.position.set( 1, 1, 1 );
	scene.add( directionalLight );

	const geometry = new THREE.SphereGeometry( 1, 64, 64 );
	let material = generateMaterialFromNodes( nodeMaterial );
	if ( ! material ) {
		// Fallback: avoid white so thumbnails/previews don't look like "no preview"
		const fallbackColor = nodeMaterial.color !== undefined ? nodeMaterial.color : 0x333333;
		material = new THREE.MeshStandardMaterial( {
			color: fallbackColor,
			roughness: nodeMaterial.roughness !== undefined ? nodeMaterial.roughness : 1,
			metalness: nodeMaterial.metalness !== undefined ? nodeMaterial.metalness : 0
		} );
	}
	const mesh = new THREE.Mesh( geometry, material );
	scene.add( mesh );

	await renderer.init();

	let animationFrameId = null;
	let stopped = false;
	let unregisterAnimationFrame = null;
	const useSharedTime = options && options.editor && options.editor.signals && options.editor.signals.animationFrame;
	let lastSharedTime = undefined;
	let lastSharedDeltaTime = undefined;
	if ( useSharedTime ) {
		unregisterAnimationFrame = options.editor.signals.animationFrame.add( ( { time, deltaTime } ) => {
			lastSharedTime = time;
			lastSharedDeltaTime = deltaTime;
		} );
	}

	function renderFrame( frameTime, frameDeltaTime ) {
		if ( stopped ) return;
		// Use only shared time when editor provided – no independent clock so all previews stay in sync
		if ( renderer.nodes && renderer.nodes.nodeFrame ) {
			const nf = renderer.nodes.nodeFrame;
			let t = frameTime;
			let dt = frameDeltaTime;
			if ( useSharedTime ) {
				if ( t === undefined || dt === undefined ) {
					const shared = getSharedAnimationTime();
					t = shared.time;
					dt = shared.deltaTime;
				}
				if ( t === undefined ) t = performance.now() / 1000;
				if ( dt === undefined ) dt = 1 / 60;
			} else {
				const now = performance.now() / 1000;
				dt = nf.lastTime !== undefined ? Math.min( now - nf.lastTime, 0.1 ) : 1 / 60;
				t = nf.time !== undefined ? nf.time + dt : now;
			}
			nf.time = t;
			nf.deltaTime = dt;
			nf.lastTime = performance.now();
		}
		mesh.rotation.y += 0.005;
		renderer.render( scene, camera );
	}

	// One loop: when using shared time we only apply it from the signal; rAF just keeps painting with that time
	function animate() {
		if ( stopped ) return;
		animationFrameId = requestAnimationFrame( animate );
		renderFrame( lastSharedTime, lastSharedDeltaTime );
	}
	animate();

	function stop() {
		stopped = true;
		if ( unregisterAnimationFrame ) {
			if ( typeof unregisterAnimationFrame.detach === 'function' ) unregisterAnimationFrame.detach();
			unregisterAnimationFrame = null;
		}
		if ( animationFrameId !== null ) {
			cancelAnimationFrame( animationFrameId );
			animationFrameId = null;
		}
		geometry.dispose();
		if ( material.dispose ) material.dispose();
		renderer.dispose();
		if ( div.contains( renderer.domElement ) ) div.removeChild( renderer.domElement );
	}

	return { element: div, stop };
}

/**
 * Render one or more frames of a NodeMaterial to a static image (for thumbnails).
 * Uses shared animation time when useSharedTime is true so thumbnails match viewport/live previews.
 *
 * @param {object} nodeMaterial - NodeMaterial data (graph, type: 'NodeMaterial')
 * @param {number} width
 * @param {number} height
 * @param {function} generateMaterialFromNodes - editor.generateMaterialFromNodes
 * @param {number|object} [framesOrOptions=30] - frame count or { frames?, useSharedTime? }
 * @returns {Promise<string|null>} data URL or null on failure
 */
export async function renderNodeMaterialPreviewOnce( nodeMaterial, width, height, generateMaterialFromNodes, framesOrOptions = 30 ) {
	const options = typeof framesOrOptions === 'object' ? framesOrOptions : { frames: framesOrOptions };
	const frames = options.frames ?? 30;
	const useSharedTime = options.useSharedTime !== false;
	const shared = useSharedTime ? getSharedAnimationTime() : {};
	const snapshotTime = options.time ?? shared.time;
	const snapshotDeltaTime = options.deltaTime ?? shared.deltaTime ?? 1 / 60;

	const renderer = new WebGPURenderer( { antialias: true, alpha: true } );
	renderer.setSize( width, height );
	renderer.setPixelRatio( 1 );
	renderer.setClearColor( 0x1a1a1a, 1 );

	const scene = new THREE.Scene();
	const camera = new THREE.PerspectiveCamera( 50, width / height, 0.1, 1000 );
	camera.position.set( 0, 0, 3 );
	camera.lookAt( 0, 0, 0 );

	const ambientLight = new THREE.AmbientLight( 0xffffff, 0.5 );
	scene.add( ambientLight );
	const directionalLight = new THREE.DirectionalLight( 0xffffff, 0.8 );
	directionalLight.position.set( 1, 1, 1 );
	scene.add( directionalLight );

	const geometry = new THREE.SphereGeometry( 1, 64, 64 );
	let material = generateMaterialFromNodes( nodeMaterial );
	if ( ! material ) {
		const fallbackColor = nodeMaterial.color !== undefined ? nodeMaterial.color : 0x333333;
		material = new THREE.MeshStandardMaterial( {
			color: fallbackColor,
			roughness: nodeMaterial.roughness !== undefined ? nodeMaterial.roughness : 1,
			metalness: nodeMaterial.metalness !== undefined ? nodeMaterial.metalness : 0
		} );
	}
	const mesh = new THREE.Mesh( geometry, material );
	scene.add( mesh );

	try {
		await renderer.init();

		// WebGPU canvas is not readable via toDataURL(); render to a render target and read back.
		const RenderTargetClass = THREE.RenderTarget || THREE.WebGLRenderTarget;
		const rt = new RenderTargetClass( width, height, {
			format: THREE.RGBAFormat,
			type: THREE.UnsignedByteType,
			colorSpace: THREE.SRGBColorSpace || THREE.LinearSRGBColorSpace,
			minFilter: THREE.LinearFilter,
			magFilter: THREE.LinearFilter,
			generateMipmaps: false,
			depthBuffer: true,
			stencilBuffer: false
		} );
		// WebGPU backend expects renderTarget.textures[] for readRenderTargetPixelsAsync
		if ( ! rt.textures && rt.texture ) rt.textures = [ rt.texture ];

		renderer.setRenderTarget( rt );
		const nf = renderer.nodes && renderer.nodes.nodeFrame ? renderer.nodes.nodeFrame : null;
		const timeToUse = snapshotTime !== undefined ? snapshotTime : ( performance.now() / 1000 );
		for ( let i = 0; i < frames; i ++ ) {
			if ( nf ) {
				nf.time = snapshotTime !== undefined ? timeToUse : ( performance.now() / 1000 + i / 60 );
				nf.deltaTime = snapshotDeltaTime;
				nf.lastTime = performance.now();
			}
			mesh.rotation.y += 0.02;
			renderer.render( scene, camera );
		}
		renderer.setRenderTarget( null );

		const pixels = await renderer.readRenderTargetPixelsAsync( rt, 0, 0, width, height );
		rt.dispose();

		if ( ! pixels || pixels.length !== width * height * 4 ) {
			return null;
		}

		// Copy to 2D canvas (readback may be BGRA or flipped; ImageData is RGBA)
		const offscreen = document.createElement( 'canvas' );
		offscreen.width = width;
		offscreen.height = height;
		const ctx = offscreen.getContext( '2d' );
		if ( ! ctx ) return null;

		const imageData = ctx.createImageData( width, height );
		const data = imageData.data;
		// readRenderTargetPixelsAsync often returns rows bottom-to-top; flip Y
		for ( let y = height - 1; y >= 0; y -- ) {
			for ( let x = 0; x < width; x ++ ) {
				const src = ( ( height - 1 - y ) * width + x ) * 4;
				const dst = ( y * width + x ) * 4;
				data[ dst ] = pixels[ src ];
				data[ dst + 1 ] = pixels[ src + 1 ];
				data[ dst + 2 ] = pixels[ src + 2 ];
				data[ dst + 3 ] = pixels[ src + 3 ];
			}
		}
		ctx.putImageData( imageData, 0, 0 );
		return offscreen.toDataURL( 'image/png' );
	} catch ( e ) {
		console.warn( '[LiveMaterialPreview] renderNodeMaterialPreviewOnce failed:', e );
		return null;
	} finally {
		geometry.dispose();
		if ( material && material.dispose ) material.dispose();
		renderer.dispose();
	}
}

/**
 * Single entry point for material preview images (thumbnails). Uses shared animation time so all previews match.
 * Use this everywhere: Assets panel, Asset selector, refreshMaterialPreviewForAsset.
 *
 * @param {object} nodeMaterial - NodeMaterial graph data
 * @param {number} width
 * @param {number} height
 * @param {function} generateMaterialFromNodes - editor.generateMaterialFromNodes
 * @param {{ frames?: number }} [options]
 * @returns {Promise<string|null>}
 */
export async function getMaterialPreviewImage( nodeMaterial, width, height, generateMaterialFromNodes, options = {} ) {
	return renderNodeMaterialPreviewOnce( nodeMaterial, width, height, generateMaterialFromNodes, { useSharedTime: true, frames: options.frames ?? 3, ...options } );
}
