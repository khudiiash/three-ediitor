/**
 * Live WebGPU preview for NodeMaterials (animated shaders).
 * Single source: shared animation time is set by the Viewport; all previews and thumbnails use it.
 */

import * as THREE from 'three/webgpu';
import { WebGPURenderer } from 'three/webgpu';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

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

/** Stable key for the graph so we only replace material when it actually changes. */
function getGraphKey( nodeMaterial ) {
	if ( ! nodeMaterial ) return '';
	try {
		if ( nodeMaterial.editorGraph && Array.isArray( nodeMaterial.nodes ) && Array.isArray( nodeMaterial.edges ) ) {
			return JSON.stringify( { editorGraph: true, nodes: nodeMaterial.nodes, edges: nodeMaterial.edges, _version: nodeMaterial._version } );
		}
		return JSON.stringify( { nodes: nodeMaterial.nodes || {}, connections: nodeMaterial.connections || [], _version: nodeMaterial._version } );
	} catch ( _ ) {
		return '';
	}
}

/**
 * Create geometry from preview options.
 * Each geometry type uses its own dimension/segment params from opts.
 * @param {Object} opts - geometry, plus geometry-specific: sphere (radius, segmentsW, segmentsH), box (boxSizeW/H/D, boxSegW/H/D), torusKnot (torusRadius, torusTube, torusSegT, torusSegR)
 * @returns {THREE.BufferGeometry}
 */
function createPreviewGeometry( opts ) {
	const o = opts || {};
	let geom = o.geometry || 'sphere';
	if ( geom === 'plane' ) geom = 'torusKnot';
	if ( geom === 'box' ) {
		const w = Math.max( 0.1, ( o.boxSizeW != null ? o.boxSizeW : 1 ) );
		const h = Math.max( 0.1, ( o.boxSizeH != null ? o.boxSizeH : 1 ) );
		const d = Math.max( 0.1, ( o.boxSizeD != null ? o.boxSizeD : 1 ) );
		const sw = Math.max( 1, ( o.boxSegW != null ? o.boxSegW : 8 ) | 0 );
		const sh = Math.max( 1, ( o.boxSegH != null ? o.boxSegH : 8 ) | 0 );
		const sd = Math.max( 1, ( o.boxSegD != null ? o.boxSegD : 8 ) | 0 );
		return new THREE.BoxGeometry( w, h, d, sw, sh, sd );
	}
	if ( geom === 'torusKnot' ) {
		const radius = Math.max( 0.1, ( o.torusRadius != null ? o.torusRadius : 0.6 ) );
		const tube = Math.max( 0.01, ( o.torusTube != null ? o.torusTube : 0.3 ) );
		const segT = Math.max( 2, ( o.torusSegT != null ? o.torusSegT : 32 ) | 0 );
		const segR = Math.max( 2, ( o.torusSegR != null ? o.torusSegR : 16 ) | 0 );
		return new THREE.TorusKnotGeometry( radius, tube, segT, segR, 2, 3 );
	}
	// sphere (default)
	const radius = Math.max( 0.1, ( o.radius != null ? o.radius : 1 ) );
	const segW = Math.max( 2, ( o.segmentsW != null ? o.segmentsW : 32 ) | 0 );
	const segH = Math.max( 2, ( o.segmentsH != null ? o.segmentsH : 16 ) | 0 );
	return new THREE.SphereGeometry( radius, segW, segH );
}

/**
 * @param {object|function} nodeMaterial - NodeMaterial data (graph) or getter () => nodeMaterial for live updates
 * @param {number} width
 * @param {number} height
 * @param {function} generateMaterialFromNodes - editor.generateMaterialFromNodes
 * @param {{ editor?: object, getNodeMaterial?: function, geometry?: string, radius?: number, segmentsW?: number, segmentsH?: number, showGrid?: boolean, showBackdrop?: boolean }} [options] - editor = use viewport time; getNodeMaterial = optional getter (overrides nodeMaterial when both); geometry options for preview shape.
 * @returns {Promise<{ element: HTMLElement, stop: function, updateMaterial: function, updateGeometry: function }>}
 */
export async function createLiveMaterialPreview( nodeMaterial, width, height, generateMaterialFromNodes, options ) {

	const getNodeMaterial = ( options && options.getNodeMaterial ) || ( typeof nodeMaterial === 'function' ? nodeMaterial : null );
	const getMaterial = options && options.getMaterial;
	const initialNodeMaterial = getNodeMaterial ? getNodeMaterial() : nodeMaterial;
	const previewOpts = options || {};

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
	div.style.position = 'relative';

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
	directionalLight.shadow.mapSize.width = 1024;
	directionalLight.shadow.mapSize.height = 1024;
	directionalLight.shadow.camera.near = 0.5;
	directionalLight.shadow.camera.far = 10;
	directionalLight.shadow.camera.left = -3;
	directionalLight.shadow.camera.right = 3;
	directionalLight.shadow.camera.top = 3;
	directionalLight.shadow.camera.bottom = -3;
	scene.add( directionalLight );

	let gridHelper = null;
	let backdropInstance = null;
	const backdropFallback = new THREE.Mesh(
		new THREE.PlaneGeometry( 10, 10 ),
		new THREE.MeshBasicMaterial( { color: 0x2a2a2a, side: THREE.BackSide } )
	);
	backdropFallback.position.z = -2;
	backdropFallback.receiveShadow = true;

	let geometry = createPreviewGeometry( previewOpts );
	// Use a placeholder; we'll set the real material after init so we have the latest graph (avoids empty snapshot)
	let material = new THREE.MeshStandardMaterial( { color: 0x333333, roughness: 0.5, metalness: 0 } );
	let mesh = new THREE.Mesh( geometry, material );
	scene.add( mesh );
	let lastGraphKey = '';

	await renderer.init();
	// When panel provides getMaterial, use that single material (same instance as swatches). Else build from graph.
	if ( getMaterial ) {
		const mat = getMaterial();
		if ( mat ) {
			mesh.material.dispose();
			mesh.material = mat;
			if ( typeof mat.needsUpdate !== 'undefined' ) mat.needsUpdate = true;
		}
	} else {
		const currentGraph = getNodeMaterial ? getNodeMaterial() : initialNodeMaterial;
		if ( currentGraph ) {
			lastGraphKey = getGraphKey( currentGraph );
			const initialMat = generateMaterialFromNodes( currentGraph );
			if ( initialMat ) {
				mesh.material.dispose();
				mesh.material = initialMat;
				if ( typeof initialMat.needsUpdate !== 'undefined' ) initialMat.needsUpdate = true;
			}
		}
	}
	if ( renderer.shadowMap ) {
		if ( renderer.shadowMap.type !== undefined ) renderer.shadowMap.type = THREE.PCFSoftShadowMap;
	}

	// Preload all assets in parallel so switching has no delay
	const hdriLoader = new HDRLoader();
	const pmremGenerator = new THREE.PMREMGenerator( renderer );
	const loadHdr = ( name ) => {
		const filename = name === 'night' ? 'night.hdr' : name === 'spring' ? 'spring.hdr' : 'studio.hdr';
		const hdrUrl = new URL( `./nodes/hdr/${filename}`, import.meta.url ).href;
		return new Promise( ( resolve, reject ) => {
			hdriLoader.load( hdrUrl, resolve, undefined, reject );
		} ).then( ( texture ) => {
			const envMap = pmremGenerator.fromEquirectangular( texture ).texture;
			texture.dispose();
			return envMap;
		} ).catch( ( err ) => {
			console.warn( '[LiveMaterialPreview] HDR load failed:', name, err );
			return null;
		} );
	};
	const backdropUrl = new URL( './nodes/backdrop/backdrop.glb', import.meta.url ).href;
	const loadBackdrop = () => new Promise( ( resolve, reject ) => {
		new GLTFLoader().load( backdropUrl, ( gltf ) => {
			const scene = gltf.scene;
			scene.traverse( ( child ) => { if ( child.isMesh ) child.receiveShadow = true; } );
			resolve( scene );
		}, undefined, reject );
	} ).catch( ( err ) => {
		console.warn( '[LiveMaterialPreview] Backdrop GLB load failed:', backdropUrl, err );
		return null;
	} );

	const [ envMaps, backdropTemplate ] = await Promise.all( [
		Promise.all( [ loadHdr( 'night' ), loadHdr( 'spring' ), loadHdr( 'studio' ) ] ).then( ( [ night, spring, studio ] ) => ( { night, spring, studio } ) ),
		loadBackdrop()
	] );
	pmremGenerator.dispose();

	function applyPreviewOptions( opts ) {
		const showBackdrop = !! opts.showBackdrop;
		const envName = opts.environment;
		const showGrid = !! opts.showGrid;

		// Environment
		const envMap = ( envName && envName !== 'none' && envMaps[ envName ] ) ? envMaps[ envName ] : null;
		scene.environment = envMap;
		scene.background = envMap;

		// Backdrop
		if ( backdropInstance ) {
			scene.remove( backdropInstance );
			backdropInstance = null;
		}
		if ( showBackdrop ) {
			backdropInstance = backdropTemplate ? backdropTemplate.clone() : backdropFallback;
			backdropInstance.position.z = -2;
			scene.add( backdropInstance );
		}

		// Grid
		if ( gridHelper ) {
			scene.remove( gridHelper );
			gridHelper = null;
		}
		if ( showGrid ) {
			gridHelper = new THREE.GridHelper( 4, 8, 0x444444, 0x333333 );
			gridHelper.position.y = -1.5;
			scene.add( gridHelper );
		}

		// Shadows (only when backdrop on)
		const shadowsOn = showBackdrop && renderer.shadowMap;
		if ( renderer.shadowMap ) renderer.shadowMap.enabled = shadowsOn;
		directionalLight.castShadow = showBackdrop;
		mesh.castShadow = showBackdrop;
	}
	applyPreviewOptions( previewOpts );

	let controls = new OrbitControls( camera, renderer.domElement );
	controls.target.set( 0, 0, 0 );
	controls.enableDamping = true;
	controls.dampingFactor = 0.05;
	controls.minDistance = 0.5;
	controls.maxDistance = 20;

	let animationFrameId = null;
	let stopped = false;
	let unregisterAnimationFrame = null;
	const useSharedTime = options && options.editor && options.editor.signals && options.editor.signals.animationFrame;
	let lastSharedTime = undefined;
	let lastSharedDeltaTime = undefined;
	// Local clock for when viewport isn't driving time (e.g. node editor only) so Time node still animates
	const previewStartTime = performance.now() / 1000;
	let lastPreviewTime = previewStartTime;
	if ( useSharedTime ) {
		unregisterAnimationFrame = options.editor.signals.animationFrame.add( ( { time, deltaTime } ) => {
			lastSharedTime = time;
			lastSharedDeltaTime = deltaTime;
		} );
	}

	function renderFrame( frameTime, frameDeltaTime ) {
		if ( stopped ) return;
		// Material updates only via updateMaterial(graph) — panel pushes same nodes/edges as swatches each render
		// Drive nodeFrame.time so TSL Time node animates. Prefer shared viewport time; else use local clock.
		const now = performance.now() / 1000;
		let t;
		let dt;
		if ( useSharedTime && ( lastSharedTime !== undefined || lastSharedDeltaTime !== undefined ) ) {
			t = lastSharedTime !== undefined ? lastSharedTime : now;
			dt = lastSharedDeltaTime !== undefined ? lastSharedDeltaTime : 1 / 60;
		} else {
			// No viewport time (e.g. only node editor open): advance local clock so Time → Sin → Color still animates
			dt = Math.min( now - lastPreviewTime, 0.1 );
			t = lastPreviewTime - previewStartTime + dt;
			lastPreviewTime = now;
		}
		if ( renderer.nodes && renderer.nodes.nodeFrame ) {
			const nf = renderer.nodes.nodeFrame;
			nf.time = t;
			nf.deltaTime = dt;
			nf.lastTime = now;
		}
		// When using local clock, push time to shared so node display values (swatches) stay in sync with preview
		if ( ! useSharedTime ) setSharedAnimationTime( t, dt );
		// Notify so node editor display values use the exact time this preview frame used (single source of truth)
		if ( previewOpts.onTimeUpdate ) previewOpts.onTimeUpdate( t, dt );
		controls.update();
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
		if ( controls && controls.dispose ) controls.dispose();
		geometry.dispose();
		if ( ! getMaterial && mesh.material && mesh.material.dispose ) mesh.material.dispose();
		renderer.dispose();
		if ( div.contains( renderer.domElement ) ) div.removeChild( renderer.domElement );
	}

	function updateGeometry( opts ) {
		if ( stopped || ! mesh ) return;
		geometry.dispose();
		geometry = createPreviewGeometry( opts );
		mesh.geometry = geometry;
		mesh.position.set( 0, 0, 0 );
		camera.position.set( 0, 0, 3 );
		camera.lookAt( 0, 0, 0 );
		if ( controls && controls.dispose ) controls.dispose();
		controls = new OrbitControls( camera, renderer.domElement );
		controls.target.set( 0, 0, 0 );
		controls.enableDamping = true;
		controls.dampingFactor = 0.05;
		controls.minDistance = 0.5;
		controls.maxDistance = 20;
	}

	/**
	 * Update the preview material. When getMaterial was passed at creation (panel mode), just applies that single material — no build, no dispose.
	 * Otherwise builds material from graph payload so other callers (e.g. asset selector) still work.
	 */
	function updateMaterial( graphPayload ) {
		if ( ! mesh ) return;
		if ( getMaterial ) {
			const mat = getMaterial();
			if ( mat ) {
				mesh.material = mat;
				if ( typeof mat.needsUpdate !== 'undefined' ) mat.needsUpdate = true;
			}
			return;
		}
		const payload = ( graphPayload && Array.isArray( graphPayload.nodes ) && Array.isArray( graphPayload.edges ) )
			? graphPayload
			: ( getNodeMaterial ? getNodeMaterial() : null );
		if ( ! payload || ! Array.isArray( payload.nodes ) || ! Array.isArray( payload.edges ) ) return;
		const nextNodeMaterial = { editorGraph: true, nodes: payload.nodes, edges: payload.edges, _version: payload._version };
		const nextGraphKey = getGraphKey( nextNodeMaterial );
		if ( nextGraphKey === lastGraphKey ) return;
		lastGraphKey = nextGraphKey;
		const oldMat = mesh.material;
		let newMat = generateMaterialFromNodes( nextNodeMaterial );
		if ( ! newMat ) {
			const fallbackColor = nextNodeMaterial && nextNodeMaterial.color !== undefined ? nextNodeMaterial.color : 0x333333;
			newMat = new THREE.MeshStandardMaterial( {
				color: fallbackColor,
				roughness: ( nextNodeMaterial && nextNodeMaterial.roughness ) !== undefined ? nextNodeMaterial.roughness : 1,
				metalness: ( nextNodeMaterial && nextNodeMaterial.metalness ) !== undefined ? nextNodeMaterial.metalness : 0
			} );
		}
		mesh.material = newMat;
		if ( newMat && typeof newMat.needsUpdate !== 'undefined' ) newMat.needsUpdate = true;
		if ( oldMat && oldMat.dispose ) oldMat.dispose();
	}

	function setSize( w, h ) {
		if ( stopped || ! renderer || ! camera ) return;
		div.style.width = w + 'px';
		div.style.height = h + 'px';
		div.style.minWidth = w + 'px';
		div.style.minHeight = h + 'px';
		renderer.setSize( w, h );
		camera.aspect = w / h;
		camera.updateProjectionMatrix();
	}

	function updateOptions( opts ) {
		if ( stopped || ! opts ) return;
		applyPreviewOptions( opts );
	}

	return { element: div, stop, updateGeometry, updateMaterial, updateOptions, setSize };
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
