import { UIPanel, UIRow, UIText, UIButton, UIInput, UISelect, UIColor } from './libs/ui.js';
import * as THREE from 'three';
import { WebGPURenderer } from 'three/webgpu';
import { getCategories, createNodeConfig, HEADER_H, SOCKET_SPACING } from './tsl/nodes.js';
import { generateMaterialFromNodes } from './Editor.js';

/**
 * TSL Node Editor
 * Visual node-based material editor for WebGPU using Three.js Shading Language
 */
function TSLEditor( editor ) {

	const signals = editor.signals;
	
	let currentMaterial = null;
	let editorWindow = null;
	let nodeCanvas = null;
	let nodeCanvasContainer = null;
	let nodeOverlaysContainer = null;
	let selectedNode = null;
	let propertiesPanel = null;
	
	// Node graph state
	const nodes = [];
	let connections = [];
	let nodeIdCounter = 0;
	
	// Interaction state
	let isDragging = false;
	let draggedNode = null;
	let panOffset = { x: 0, y: 0 };
	let isPanning = false;
	let panStart = { x: 0, y: 0 };
	let zoom = 1.0;
	let isDraggingConnection = false;
	let connectionStart = null;

	// Canvas context
	let ctx = null;
	
	// Preview references (WebGPU for live TSL / NodeMaterial)
	let previewRenderer = null;
	let previewScene = null;
	let previewMaterial = null;
	let previewMesh = null;
	let previewNodeMaterial = null;
	let previewReady = false;
	let unregisterPreviewAnimationFrame = null;
	let sharedFrameTime = undefined;
	let sharedFrameDeltaTime = undefined;

	// History for undo/redo
	const history = [];
	let historyIndex = -1;
	const maxHistorySize = 50;

	// Clipboard
	let clipboard = null;

	// Autosave
	let autosaveTimeout = null;

	// Public API
	const api = {
		open: openEditor,
		close: closeEditor,
		isOpen: () => editorWindow !== null
	};

	function openEditor( material ) {

		if ( editorWindow ) {

			editorWindow.style.display = 'block';
			updateEditorContent( material );
			return;

		}

		currentMaterial = material;

		// Create fullscreen overlay
		editorWindow = document.createElement( 'div' );
		editorWindow.style.position = 'fixed';
		editorWindow.style.top = '0';
		editorWindow.style.left = '0';
		editorWindow.style.width = '100%';
		editorWindow.style.height = '100%';
		editorWindow.style.backgroundColor = '#1a1a1a';
		editorWindow.style.zIndex = '100000'; // Much higher to be above everything
		editorWindow.style.display = 'flex';
		editorWindow.style.flexDirection = 'column';

		// Header
		const header = createHeader( material );
		editorWindow.appendChild( header );

		// Main content area
		const mainContent = document.createElement( 'div' );
		mainContent.style.flex = '1';
		mainContent.style.display = 'flex';
		mainContent.style.overflow = 'hidden';

		// Left sidebar - Node library
		const sidebar = createNodeLibrary();
		mainContent.appendChild( sidebar );

		// Center - Canvas area
		const canvasContainer = createCanvasArea();
		mainContent.appendChild( canvasContainer );

		// Right panel - Properties
		propertiesPanel = createPropertiesPanel();
		mainContent.appendChild( propertiesPanel );

		editorWindow.appendChild( mainContent );

		document.body.appendChild( editorWindow );

		// Initialize the canvas
		initCanvas();
		
		// Load material data
		loadMaterialNodes( material );
		
		// Update preview to match loaded nodes
		updatePreviewMaterial();
		
		// Setup keyboard shortcuts
		setupKeyboardShortcuts();
		
		// Save initial history state
		saveHistoryState();
		
		// Start render loop
		requestAnimationFrame( renderLoop );

	}

	async function closeEditor() {

		if ( ! editorWindow ) return;

		// Save and sync immediately so meshes and all previews update before the window closes
		await saveMaterial();

		if ( currentMaterial && currentMaterial.assetPath ) {

			const assetPath = currentMaterial.assetPath.replace( /^\/+/, '' ).replace( /\/+/g, '/' );
			if ( editor.signals && editor.signals.assetFileChanged ) {

				editor.signals.assetFileChanged.dispatch( assetPath );

			}
			// If Asset Inspector is showing this material, force it to refresh
			if ( window.selectedAsset && window.selectedAsset.path ) {

				const selectedPath = ( window.selectedAsset.path || '' ).replace( /^\/+/, '' );
				if ( selectedPath === assetPath ) {

					const currentSelection = window.selectedAsset;
					window.selectedAsset = null;
					setTimeout( () => { window.selectedAsset = currentSelection; }, 0 );
					if ( editor.signals && editor.signals.sceneGraphChanged ) {

						editor.signals.sceneGraphChanged.dispatch();

					}

				}

			}

		}

		// Remove keyboard and window listeners
		document.removeEventListener( 'keydown', handleKeyDown );
		window.removeEventListener( 'mouseup', onMouseUp );

		if ( previewNodeMaterial ) {

			previewNodeMaterial.dispose();
			previewNodeMaterial = null;

		}
		if ( unregisterPreviewAnimationFrame ) {
			if ( typeof unregisterPreviewAnimationFrame.detach === 'function' ) unregisterPreviewAnimationFrame.detach();
			unregisterPreviewAnimationFrame = null;
		}
		sharedFrameTime = undefined;
		sharedFrameDeltaTime = undefined;
		previewReady = false;
		document.body.removeChild( editorWindow );
		editorWindow = null;
		nodeCanvas = null;
		selectedNode = null;
		currentMaterial = null;
		nodes.length = 0;
		connections = [];
		ctx = null;

		// Clear history
		history.length = 0;
		historyIndex = -1;

		// Clear autosave timeout
		if ( autosaveTimeout ) {

			clearTimeout( autosaveTimeout );
			autosaveTimeout = null;

		}

	}

	function setupKeyboardShortcuts() {

		document.addEventListener( 'keydown', handleKeyDown );

	}

	function handleKeyDown( e ) {

		// Don't intercept if typing in input field
		if ( e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' ) return;

		const isMac = navigator.platform.toUpperCase().indexOf( 'MAC' ) >= 0;
		const modifier = isMac ? e.metaKey : e.ctrlKey;

		// Undo: Ctrl/Cmd + Z
		if ( modifier && e.key === 'z' && ! e.shiftKey ) {

			e.preventDefault();
			undo();
			return;

		}

		// Redo: Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y
		if ( ( modifier && e.key === 'z' && e.shiftKey ) || ( modifier && e.key === 'y' ) ) {

			e.preventDefault();
			redo();
			return;

		}

		// Copy: Ctrl/Cmd + C
		if ( modifier && e.key === 'c' ) {

			e.preventDefault();
			copySelectedNode();
			return;

		}

		// Cut: Ctrl/Cmd + X
		if ( modifier && e.key === 'x' ) {

			e.preventDefault();
			cutSelectedNode();
			return;

		}

		// Paste: Ctrl/Cmd + V
		if ( modifier && e.key === 'v' ) {

			e.preventDefault();
			pasteNode();
			return;

		}

		// Delete: Delete or Backspace
		if ( ( e.key === 'Delete' || e.key === 'Backspace' ) && selectedNode ) {

			e.preventDefault();
			deleteSelectedNode();
			return;

		}

	}

	function deleteSelectedNode() {

		if ( ! selectedNode ) return;

		const index = nodes.indexOf( selectedNode );
		if ( index > - 1 ) {

			nodes.splice( index, 1 );
			connections = connections.filter( conn => 
				conn.fromNode !== selectedNode.id && conn.toNode !== selectedNode.id
			);
			
			selectedNode = null;
			updatePropertiesPanel( null );
			updatePreviewMaterial();
			buildNodeOverlays();
			saveHistoryState();
			triggerAutosave();

		}

	}

	function createHeader( material ) {

		const header = document.createElement( 'div' );
		header.style.height = '48px';
		header.style.backgroundColor = '#0a0a0a';
		header.style.borderBottom = '1px solid #2a2a2a';
		header.style.display = 'flex';
		header.style.alignItems = 'center';
		header.style.padding = '0 16px';
		header.style.justifyContent = 'space-between';
		header.style.flexShrink = '0'; // Prevent header from being hidden
		header.style.zIndex = '1'; // Ensure header is above canvas

		// Left side - Logo and title
		const leftSide = document.createElement( 'div' );
		leftSide.style.display = 'flex';
		leftSide.style.alignItems = 'center';
		leftSide.style.gap = '12px';

		const logo = document.createElement( 'div' );
		logo.textContent = 'TSL';
		logo.style.fontSize = '14px';
		logo.style.fontWeight = '700';
		logo.style.color = '#fff';
		logo.style.backgroundColor = '#2ea8ff';
		logo.style.padding = '4px 8px';
		logo.style.borderRadius = '4px';
		leftSide.appendChild( logo );

		const graphLabel = document.createElement( 'div' );
		graphLabel.textContent = 'GRAPH';
		graphLabel.style.fontSize = '10px';
		graphLabel.style.color = '#666';
		graphLabel.style.fontWeight = '600';
		leftSide.appendChild( graphLabel );

		const title = document.createElement( 'input' );
		title.type = 'text';
		title.value = material ? ( material.name || 'Untitled' ) : 'Untitled';
		title.style.backgroundColor = 'transparent';
		title.style.border = 'none';
		title.style.color = '#ddd';
		title.style.fontSize = '14px';
		title.style.outline = 'none';
		title.style.padding = '4px 8px';
		title.style.borderRadius = '3px';
		title.style.width = '200px';
		title.onchange = () => {

			if ( currentMaterial ) currentMaterial.name = title.value;

		};
		title.onfocus = () => title.style.backgroundColor = '#222';
		title.onblur = () => title.style.backgroundColor = 'transparent';
		leftSide.appendChild( title );

		header.appendChild( leftSide );

		// Right side - Actions
		const rightSide = document.createElement( 'div' );
		rightSide.style.display = 'flex';
		rightSide.style.alignItems = 'center';
		rightSide.style.gap = '12px';

		// Autosave status indicator
		const autosaveStatus = document.createElement( 'div' );
		autosaveStatus.id = 'tsl-autosave-status';
		autosaveStatus.style.fontSize = '11px';
		autosaveStatus.style.color = '#666';
		autosaveStatus.textContent = 'Autosaving...';
		autosaveStatus.style.display = 'none';
		rightSide.appendChild( autosaveStatus );

		const closeBtn = document.createElement( 'button' );
		closeBtn.textContent = '×';
		closeBtn.style.fontSize = '24px';
		closeBtn.style.color = '#999';
		closeBtn.style.backgroundColor = 'transparent';
		closeBtn.style.border = 'none';
		closeBtn.style.cursor = 'pointer';
		closeBtn.style.padding = '4px 12px';
		closeBtn.style.borderRadius = '3px';
		closeBtn.onclick = closeEditor;
		closeBtn.onmouseenter = () => {

			closeBtn.style.backgroundColor = '#2a2a2a';
			closeBtn.style.color = '#fff';

		};
		closeBtn.onmouseleave = () => {

			closeBtn.style.backgroundColor = 'transparent';
			closeBtn.style.color = '#999';

		};
		rightSide.appendChild( closeBtn );

		header.appendChild( rightSide );

		return header;

	}

	function createNodeLibrary() {

		const sidebar = document.createElement( 'div' );
		sidebar.style.width = '240px';
		sidebar.style.backgroundColor = '#0f0f0f';
		sidebar.style.borderRight = '1px solid #2a2a2a';
		sidebar.style.overflowY = 'auto';
		sidebar.style.display = 'flex';
		sidebar.style.flexDirection = 'column';

		// Header
		const sidebarHeader = document.createElement( 'div' );
		sidebarHeader.style.padding = '12px 16px';
		sidebarHeader.style.borderBottom = '1px solid #2a2a2a';
		sidebarHeader.style.position = 'sticky';
		sidebarHeader.style.top = '0';
		sidebarHeader.style.backgroundColor = '#0f0f0f';
		sidebarHeader.style.zIndex = '1';

		const headerTitle = document.createElement( 'div' );
		headerTitle.textContent = 'Nodes';
		headerTitle.style.fontSize = '14px';
		headerTitle.style.fontWeight = '600';
		headerTitle.style.color = '#ddd';
		headerTitle.style.marginBottom = '8px';
		sidebarHeader.appendChild( headerTitle );

		const searchInput = document.createElement( 'input' );
		searchInput.type = 'text';
		searchInput.placeholder = 'Search...';
		searchInput.style.width = '100%';
		searchInput.style.padding = '6px 8px';
		searchInput.style.backgroundColor = '#1a1a1a';
		searchInput.style.border = '1px solid #2a2a2a';
		searchInput.style.borderRadius = '4px';
		searchInput.style.color = '#ddd';
		searchInput.style.fontSize = '12px';
		searchInput.style.outline = 'none';
		searchInput.style.boxSizing = 'border-box';
		sidebarHeader.appendChild( searchInput );

		sidebar.appendChild( sidebarHeader );

		// Get categories from node registry
		const categories = getCategories();

		categories.forEach( category => {

			const categoryHeader = document.createElement( 'div' );
			categoryHeader.style.padding = '8px 16px';
			categoryHeader.style.fontSize = '11px';
			categoryHeader.style.fontWeight = '600';
			categoryHeader.style.color = '#888';
			categoryHeader.style.textTransform = 'uppercase';
			categoryHeader.style.cursor = 'pointer';
			categoryHeader.style.userSelect = 'none';
			categoryHeader.textContent = category.name;

			const nodeList = document.createElement( 'div' );
			nodeList.style.display = 'block';

			category.nodes.forEach( nodeInfo => {

				const nodeItem = document.createElement( 'div' );
				nodeItem.textContent = nodeInfo.name;
				nodeItem.style.padding = '8px 24px';
				nodeItem.style.fontSize = '12px';
				nodeItem.style.color = '#aaa';
				nodeItem.style.cursor = 'pointer';
				nodeItem.style.userSelect = 'none';
				nodeItem.onmouseenter = () => nodeItem.style.backgroundColor = '#1a1a1a';
				nodeItem.onmouseleave = () => nodeItem.style.backgroundColor = 'transparent';
				nodeItem.onclick = () => {

					addNode( nodeInfo.type, nodeInfo.name, nodeInfo.color );

				};
				nodeList.appendChild( nodeItem );

			} );

			categoryHeader.onclick = () => {

				nodeList.style.display = nodeList.style.display === 'none' ? 'block' : 'none';

			};

			sidebar.appendChild( categoryHeader );
			sidebar.appendChild( nodeList );

		} );

		return sidebar;

	}

	function createCanvasArea() {

		const container = document.createElement( 'div' );
		container.style.flex = '1';
		container.style.position = 'relative';
		container.style.backgroundColor = '#0a0a0a';
		nodeCanvasContainer = container;

		const canvas = document.createElement( 'canvas' );
		canvas.style.width = '100%';
		canvas.style.height = '100%';
		canvas.style.display = 'block';
		container.appendChild( canvas );

		nodeCanvas = canvas;

		// Overlay for in-node value editing (Unity/Blender style)
		const overlay = document.createElement( 'div' );
		overlay.style.position = 'absolute';
		overlay.style.left = '0';
		overlay.style.top = '0';
		overlay.style.width = '100%';
		overlay.style.height = '100%';
		overlay.style.pointerEvents = 'none';
		overlay.style.overflow = 'hidden';
		overlay.id = 'tsl-node-overlays';
		container.appendChild( overlay );
		nodeOverlaysContainer = overlay;

		return container;

	}

	function createPropertiesPanel() {

		const panel = document.createElement( 'div' );
		panel.style.width = '300px';
		panel.style.backgroundColor = '#0f0f0f';
		panel.style.borderLeft = '1px solid #2a2a2a';
		panel.style.overflowY = 'auto';
		panel.style.display = 'flex';
		panel.style.flexDirection = 'column';

		// Material Preview Section
		const previewSection = document.createElement( 'div' );
		previewSection.style.padding = '16px';
		previewSection.style.borderBottom = '1px solid #2a2a2a';

		const previewTitle = document.createElement( 'div' );
		previewTitle.textContent = 'Preview';
		previewTitle.style.fontSize = '14px';
		previewTitle.style.fontWeight = '600';
		previewTitle.style.color = '#ddd';
		previewTitle.style.marginBottom = '12px';
		previewSection.appendChild( previewTitle );

		// Preview canvas container
		const previewContainer = document.createElement( 'div' );
		previewContainer.style.width = '100%';
		previewContainer.style.height = '200px';
		previewContainer.style.backgroundColor = '#1a1a1a';
		previewContainer.style.borderRadius = '8px';
		previewContainer.style.display = 'flex';
		previewContainer.style.alignItems = 'center';
		previewContainer.style.justifyContent = 'center';
		previewContainer.style.border = '1px solid #2a2a2a';

		// WebGPU preview renderer for live TSL / NodeMaterial (time, animations)
		const previewWidth = 268;
		const previewHeight = 200;
		previewRenderer = new WebGPURenderer( { antialias: true, alpha: true } );
		previewRenderer.setSize( previewWidth, previewHeight );
		previewRenderer.setClearColor( 0x1a1a1a, 1 );
		previewContainer.appendChild( previewRenderer.domElement );

		// Setup preview scene
		previewScene = new THREE.Scene();
		const previewCamera = new THREE.PerspectiveCamera( 45, previewWidth / previewHeight, 0.1, 1000 );
		previewCamera.position.set( 0, 0, 3 );

		const ambientLight = new THREE.AmbientLight( 0xffffff, 0.5 );
		previewScene.add( ambientLight );

		const directionalLight = new THREE.DirectionalLight( 0xffffff, 0.8 );
		directionalLight.position.set( 1, 1, 1 );
		previewScene.add( directionalLight );

		// Preview sphere; fallback material until NodeMaterial is assigned
		const previewGeometry = new THREE.SphereGeometry( 1, 64, 64 );
		previewMaterial = new THREE.MeshStandardMaterial( {
			color: currentMaterial && currentMaterial.color !== undefined ? currentMaterial.color : 0xffffff,
			roughness: currentMaterial && currentMaterial.roughness !== undefined ? currentMaterial.roughness : 1,
			metalness: currentMaterial && currentMaterial.metalness !== undefined ? currentMaterial.metalness : 0
		} );
		previewMesh = new THREE.Mesh( previewGeometry, previewMaterial );
		previewScene.add( previewMesh );

		// WebGPU init is async; then run live preview loop
		( async () => {

			if ( ! previewRenderer || ! editorWindow ) return;
			try {

				await previewRenderer.init();
				previewReady = true;
				updatePreviewMaterial();
				// Sync preview time with viewport so NodeMaterial `time` matches main viewport / other previews
				if ( signals.animationFrame ) {
					unregisterPreviewAnimationFrame = signals.animationFrame.add( ( { time, deltaTime } ) => {
						sharedFrameTime = time;
						sharedFrameDeltaTime = deltaTime;
					} );
				}

			} catch ( err ) {

				console.warn( '[TSLEditor] WebGPU preview init failed:', err );

			}
			function animatePreview() {

				if ( ! editorWindow ) return;
				if ( previewReady && previewRenderer ) {

					if ( previewRenderer.nodes && previewRenderer.nodes.nodeFrame ) {
						const nf = previewRenderer.nodes.nodeFrame;
						if ( sharedFrameTime !== undefined && sharedFrameDeltaTime !== undefined ) {
							nf.time = sharedFrameTime;
							nf.deltaTime = sharedFrameDeltaTime;
						} else {
							// Fallback when viewport hasn't ticked yet or isn't running (e.g. only node editor open)
							const t = performance.now() / 1000;
							nf.deltaTime = nf.lastTime !== undefined ? t - nf.lastTime : 1 / 60;
							nf.time = nf.time !== undefined ? nf.time + nf.deltaTime : t;
							nf.lastTime = t;
						}
					}
					previewMesh.rotation.y += 0.005;
					previewRenderer.render( previewScene, previewCamera );

				}
				requestAnimationFrame( animatePreview );

			}
			animatePreview();

		} )();

		previewSection.appendChild( previewContainer );
		panel.appendChild( previewSection );

		// Properties Section
		const propertiesSection = document.createElement( 'div' );
		propertiesSection.style.padding = '16px';
		propertiesSection.style.flex = '1';

		const title = document.createElement( 'div' );
		title.textContent = 'Properties';
		title.style.fontSize = '14px';
		title.style.fontWeight = '600';
		title.style.color = '#ddd';
		title.style.marginBottom = '16px';
		propertiesSection.appendChild( title );

		const noSelection = document.createElement( 'div' );
		noSelection.textContent = 'Select a node to edit properties';
		noSelection.style.fontSize = '12px';
		noSelection.style.color = '#666';
		noSelection.style.textAlign = 'center';
		noSelection.style.marginTop = '40px';
		noSelection.id = 'noSelection';
		propertiesSection.appendChild( noSelection );

		panel.appendChild( propertiesSection );

		return panel;

	}

	function initCanvas() {

		if ( ! nodeCanvas ) return;

		// Set canvas size with proper DPI scaling
		const rect = nodeCanvas.getBoundingClientRect();
		const dpr = window.devicePixelRatio || 1;
		
		nodeCanvas.width = rect.width * dpr;
		nodeCanvas.height = rect.height * dpr;
		
		nodeCanvas.style.width = rect.width + 'px';
		nodeCanvas.style.height = rect.height + 'px';

		ctx = nodeCanvas.getContext( '2d' );
		
		// Scale context to match DPI
		ctx.scale( dpr, dpr );

		// Event listeners (mouseup on window so drag/pan/connection end when pointer released anywhere)
		nodeCanvas.addEventListener( 'mousedown', onMouseDown );
		nodeCanvas.addEventListener( 'mousemove', onMouseMove );
		nodeCanvas.addEventListener( 'mouseup', onMouseUp );
		window.addEventListener( 'mouseup', onMouseUp );
		nodeCanvas.addEventListener( 'wheel', onWheel );
		nodeCanvas.addEventListener( 'dblclick', onDoubleClick );

		// Handle window resize
		window.addEventListener( 'resize', () => {

			if ( nodeCanvas ) {

				const rect = nodeCanvas.getBoundingClientRect();
				const dpr = window.devicePixelRatio || 1;
				
				nodeCanvas.width = rect.width * dpr;
				nodeCanvas.height = rect.height * dpr;
				
				nodeCanvas.style.width = rect.width + 'px';
				nodeCanvas.style.height = rect.height + 'px';
				
				if ( ctx ) {

					ctx.scale( dpr, dpr );

				}

			}

		} );

	}


	function addNode( type, name, color, x = 0, y = 0 ) {

		const rect = nodeCanvas ? nodeCanvas.getBoundingClientRect() : { width: 800, height: 600 };
		
		// Get node configuration from registry
		const nodeConfig = createNodeConfig( type );

		const node = {
			id: nodeIdCounter++,
			type: type,
			name: name,
			color: color || '#4dabf7',
			x: x || rect.width / 2 + Math.random() * 100 - 50,
			y: y || rect.height / 2 + Math.random() * 100 - 50,
			width: nodeConfig.width, // Width from node config
			height: nodeConfig.height,
			inputs: nodeConfig.inputs,
			outputs: nodeConfig.outputs,
			properties: nodeConfig.properties,
			showLabels: true
		};

		nodes.push( node );
		console.log( '[TSLEditor] Added node:', node );

		// Save to history and trigger autosave
		saveHistoryState();
		triggerAutosave();
		buildNodeOverlays();

	}

	function loadMaterialNodes( material ) {

		if ( ! material ) return;

		console.log( '[TSLEditor] Loading material nodes. Material:', material );
		console.log( '[TSLEditor] Material.nodes:', material.nodes );
		console.log( '[TSLEditor] Material.connections:', material.connections );

		// Clear existing nodes
		nodes.length = 0;
		connections = [];
		nodeIdCounter = 0;

		// Load from material.nodes if it exists
		if ( material.nodes && typeof material.nodes === 'object' ) {

			console.log( '[TSLEditor] Loading nodes from material:', material.nodes );

			// Recreate nodes from saved data
			Object.keys( material.nodes ).forEach( nodeId => {

				const savedNode = material.nodes[ nodeId ];
				const id = parseInt( nodeId );
				const pos = savedNode.position;
				const px = ( pos && typeof pos.x === 'number' ) ? pos.x : 0;
				const py = ( pos && typeof pos.y === 'number' ) ? pos.y : 0;

				// Get node configuration from registry
				const nodeConfig = createNodeConfig( savedNode.type );

				const node = {
					id: id,
					type: savedNode.type,
					name: savedNode.name,
					color: savedNode.color || nodeConfig.color || '#4dabf7',
					x: px,
					y: py,
					width: savedNode.width || nodeConfig.width,
					height: nodeConfig.height,
					inputs: nodeConfig.inputs,
					outputs: nodeConfig.outputs,
					properties: savedNode.properties || {},
					showLabels: true
				};

				nodes.push( node );
				
				// Update nodeIdCounter to avoid ID collisions
				if ( id >= nodeIdCounter ) {

					nodeIdCounter = id + 1;

				}

			} );

			// Recreate connections from saved data
			if ( material.connections && Array.isArray( material.connections ) ) {

				material.connections.forEach( conn => {

					connections.push( {
						fromNode: conn.fromNode, // Support both new and old formats
						fromOutput: conn.fromOutput,
						toNode: conn.toNode, // Support both new and old formats
						toInput: conn.toInput
					} );

				} );

			}

			console.log( `[TSLEditor] Loaded ${nodes.length} nodes and ${connections.length} connections` );
			console.log('Connections:', connections)
			
			// Update preview after loading nodes
			updatePreviewMaterial();
			buildNodeOverlays();

		}

		// Always add a Material Output node if there isn't one
		const hasOutput = nodes.some( n => n.type.startsWith( 'output' ) );
		if ( ! hasOutput ) {

			const rect = nodeCanvas ? nodeCanvas.getBoundingClientRect() : { width: 800, height: 600 };
			// Default to MeshStandardMaterial output
			addNode( 'outputStandard', 'MeshStandardMaterial', '#ff6b6b', rect.width - 250, rect.height / 2 );

		}

	}

	/**
	 * Updates currentMaterial from graph, optionally writes to file, and syncs scene + previews.
	 * @returns {Promise<void>} Resolves when save and sync are complete (so callers can await before closing).
	 */
	function saveMaterial() {

		if ( ! currentMaterial ) return Promise.resolve();

		// Convert nodes to material data structure
		const materialNodes = {};
		
		nodes.forEach( node => {

			materialNodes[ node.id ] = {
				type: node.type,
				name: node.name,
				color: node.color,
				width: node.width, // Save width
				position: { x: node.x, y: node.y },
				properties: node.properties
			};

		} );

		// Save connections
		const materialConnections = connections.map( conn => ( {
			fromNode: conn.fromNode,
			fromOutput: conn.fromOutput,
			toNode: conn.toNode,
			toInput: conn.toInput
		} ) );

		// Update material in memory (so sync uses latest graph even before file write)
		currentMaterial.nodes = materialNodes;
		currentMaterial.connections = materialConnections;

		console.log( '[TSLEditor] Material data updated with nodes:', Object.keys( materialNodes ).length, 'connections:', materialConnections.length );

		const assetPath = currentMaterial.assetPath || currentMaterial.sourceFile;
		const materialJSON = JSON.stringify( currentMaterial, null, '\t' );

		function syncAssetAndScene() {

			const cleanPath = ( assetPath || '' ).replace( /^\/+/, '' ).replace( /\/+/g, '/' );
			if ( ! cleanPath ) return Promise.resolve();

			// Always sync scene from in-memory graph (does not depend on asset being in registry)
			const graphData = JSON.parse( materialJSON );
			const newMaterial = generateMaterialFromNodes( graphData );
			if ( ! newMaterial ) return Promise.resolve();
			newMaterial.nodeMaterialData = graphData;
			newMaterial.assetPath = cleanPath;
			editor.addMaterial( newMaterial );

			const normalized = ( p ) => ( p || '' ).replace( /^\/+/, '' ).replace( /\/+/g, '/' );
			editor.scene.traverse( ( object ) => {

				if ( ! object.material ) return;
				const materials = Array.isArray( object.material ) ? object.material : [ object.material ];
				materials.forEach( ( current, index ) => {

					if ( ! current ) return;
					const matPath = normalized( current.assetPath || ( current.nodeMaterialData && current.nodeMaterialData.assetPath ) );
					if ( matPath !== cleanPath ) return;
					if ( current === newMaterial ) return;
					editor.removeMaterial( current );
					if ( Array.isArray( object.material ) ) {

						object.material[ index ] = newMaterial;

					} else {

						object.material = newMaterial;

					}
					editor.signals.materialChanged.dispatch( object, index );

				} );

			} );

			// Update asset in registry if present so inspector and future loads stay in sync
			const materialAsset = editor.assets.getByUrl( cleanPath ) || editor.assets.getByUrl( '/' + cleanPath );
			if ( materialAsset ) {

				try {

					materialAsset.data = graphData;
					materialAsset.data.assetPath = cleanPath;
					if ( typeof materialAsset.setMaterial === 'function' ) {

						materialAsset.setMaterial( newMaterial ).catch( () => {} );

					}

				} catch ( e ) {

					console.warn( '[TSLEditor] Failed to update material asset:', e );

				}

			}

			// Refresh all preview thumbnails (use same newMaterial so preview matches scene)
			const refreshPromise = typeof window.refreshMaterialPreviewByPath === 'function'
				? window.refreshMaterialPreviewByPath( cleanPath, newMaterial )
				: ( materialAsset && typeof window.refreshMaterialPreviewForAsset === 'function'
					? window.refreshMaterialPreviewForAsset( materialAsset )
					: Promise.resolve() );
			return refreshPromise.then( () => {

				editor.signals.materialChanged.dispatch( editor.selected, 0 );

			} );

		}

		if ( ! assetPath ) {

			console.warn( '[TSLEditor] No asset path found, cannot save material' );
			return Promise.resolve();

		}

		const isTauri = typeof window.__TAURI__ !== 'undefined';
		const projectPath = editor.storage && editor.storage.getProjectPath ? editor.storage.getProjectPath() : null;

		if ( isTauri && projectPath ) {

			const invoke = window.__TAURI__.core.invoke;
			let cleanPath = assetPath.startsWith( '/' ) ? assetPath.slice( 1 ) : assetPath;
			cleanPath = cleanPath.replace( /\/+/g, '/' );

			return invoke( 'write_asset_file', {
				projectPath: projectPath,
				assetPath: cleanPath,
				content: Array.from( new TextEncoder().encode( materialJSON ) )
			} ).then( () => {

				console.log( '[TSLEditor] Material saved to file:', cleanPath );
				showAutosaveStatus( 'Saved' );
				if ( window.updateFileContent ) window.updateFileContent( assetPath, materialJSON );
				return syncAssetAndScene();

			} ).catch( err => {

				console.error( '[TSLEditor] Failed to save material:', err );
				showAutosaveStatus( 'Error saving', true );
				// Still sync from in-memory data so scene updates even if file write failed
				return syncAssetAndScene();

			} );

		}

		// No Tauri: sync from memory only so scene and previews update immediately
		console.warn( '[TSLEditor] Tauri not available or no project path' );
		return syncAssetAndScene();

	}

	function showAutosaveStatus( message, isError = false ) {

		const statusEl = document.getElementById( 'tsl-autosave-status' );
		if ( ! statusEl ) return;

		statusEl.textContent = message;
		statusEl.style.color = isError ? '#ff6b6b' : '#4ade80';
		statusEl.style.display = 'block';

		setTimeout( () => {

			statusEl.style.display = 'none';

		}, 2000 );

	}

	function triggerAutosave() {

		// Clear existing timeout
		if ( autosaveTimeout ) {

			clearTimeout( autosaveTimeout );

		}

		// Show autosaving indicator
		showAutosaveStatus( 'Autosaving...' );

		// Save after 1 second of inactivity
		autosaveTimeout = setTimeout( () => {

			saveMaterial();

		}, 1000 );

	}

	function saveHistoryState() {

		// Create snapshot of current state
		const state = {
			nodes: JSON.parse( JSON.stringify( nodes ) ),
			connections: JSON.parse( JSON.stringify( connections ) ),
			nodeIdCounter: nodeIdCounter
		};

		// Remove future history if we're not at the end
		if ( historyIndex < history.length - 1 ) {

			history.splice( historyIndex + 1 );

		}

		// Add new state
		history.push( state );

		// Limit history size
		if ( history.length > maxHistorySize ) {

			history.shift();

		} else {

			historyIndex ++;

		}

		console.log( `[TSLEditor] History saved (${historyIndex + 1}/${history.length})` );

	}

	function undo() {

		if ( historyIndex <= 0 ) {

			console.log( '[TSLEditor] Nothing to undo' );
			return;

		}

		historyIndex --;
		restoreHistoryState( history[ historyIndex ] );
		console.log( `[TSLEditor] Undo (${historyIndex + 1}/${history.length})` );

	}

	function redo() {

		if ( historyIndex >= history.length - 1 ) {

			console.log( '[TSLEditor] Nothing to redo' );
			return;

		}

		historyIndex ++;
		restoreHistoryState( history[ historyIndex ] );
		console.log( `[TSLEditor] Redo (${historyIndex + 1}/${history.length})` );

	}

	function restoreHistoryState( state ) {

		// Restore nodes
		nodes.length = 0;
		nodes.push( ...JSON.parse( JSON.stringify( state.nodes ) ) );

		// Restore connections
		connections = JSON.parse( JSON.stringify( state.connections ) );

		// Restore counter
		nodeIdCounter = state.nodeIdCounter;

		// Clear selection
		selectedNode = null;
		updatePropertiesPanel( null );

		// Update preview and in-node overlays
		updatePreviewMaterial();
		buildNodeOverlays();

		// Trigger autosave
		triggerAutosave();

	}

	function copySelectedNode() {

		if ( ! selectedNode ) {

			console.log( '[TSLEditor] No node selected to copy' );
			return;

		}

		clipboard = JSON.parse( JSON.stringify( selectedNode ) );
		console.log( '[TSLEditor] Node copied:', clipboard );

	}

	function cutSelectedNode() {

		if ( ! selectedNode ) {

			console.log( '[TSLEditor] No node selected to cut' );
			return;

		}

		copySelectedNode();
		
		// Delete the node
		const index = nodes.indexOf( selectedNode );
		if ( index > - 1 ) {

			nodes.splice( index, 1 );
			connections = connections.filter( conn => 
				conn.fromNode !== selectedNode.id && conn.toNode !== selectedNode.id
			);
			
			selectedNode = null;
			updatePropertiesPanel( null );
			updatePreviewMaterial();
			buildNodeOverlays();
			saveHistoryState();
			triggerAutosave();

		}

	}

	function pasteNode() {

		if ( ! clipboard ) {

			console.log( '[TSLEditor] Clipboard is empty' );
			return;

		}

		// Create new node from clipboard with new ID and offset position
		const newNode = JSON.parse( JSON.stringify( clipboard ) );
		newNode.id = nodeIdCounter ++;
		newNode.x += 50;
		newNode.y += 50;

		nodes.push( newNode );

		// Select the new node
		selectedNode = newNode;
		updatePropertiesPanel( newNode );
		buildNodeOverlays();

		console.log( '[TSLEditor] Node pasted:', newNode );

		saveHistoryState();
		triggerAutosave();

	}

	function updateEditorContent( material ) {

		currentMaterial = material;
		loadMaterialNodes( material );

	}

	// Canvas rendering
	function renderLoop() {

		if ( ! editorWindow || ! ctx ) return;

		render();
		requestAnimationFrame( renderLoop );

	}

	function render() {

		if ( ! ctx ) return;

		const rect = nodeCanvas.getBoundingClientRect();
		const canvasWidth = rect.width;
		const canvasHeight = rect.height;

		// Clear canvas
		ctx.fillStyle = '#0a0a0a';
		ctx.fillRect( 0, 0, canvasWidth, canvasHeight );

		// Save context state
		ctx.save();

		// Apply zoom and pan transformations
		ctx.translate( panOffset.x, panOffset.y );
		ctx.scale( zoom, zoom );

		// Draw grid (before transform, in screen space)
		ctx.restore();
		ctx.save();
		drawGrid();
		
		// Reapply transform for nodes
		ctx.translate( panOffset.x, panOffset.y );
		ctx.scale( zoom, zoom );

		// Draw connections
		connections.forEach( conn => drawConnection( conn ) );

		// Draw connection being dragged
		if ( isDraggingConnection && connectionStart ) {

			drawDraggingConnection();

		}

		// Draw nodes
		nodes.forEach( node => drawNode( node ) );

		// Keep overlay in sync with pan/zoom
		updateNodeOverlayTransform();

		// Restore context state
		ctx.restore();

	}

	// Helper: get socket color by type; when dimmed (unconnected) use same hue but dimmed
	function getSocketColor( type, dimmed = false ) {

		const colors = {
			'float': { main: '#74c0fc', border: '#1e40af', glow: 'rgba(116, 192, 252, 0.3)' },
			'int': { main: '#66d9ef', border: '#1e3a8a', glow: 'rgba(102, 217, 239, 0.3)' },
			'vec2': { main: '#a9e34b', border: '#3d5a00', glow: 'rgba(169, 227, 75, 0.3)' },
			'vec3': { main: '#69db7c', border: '#2b8a3e', glow: 'rgba(105, 219, 124, 0.3)' },
			'vec4': { main: '#51cf66', border: '#2f9e44', glow: 'rgba(81, 207, 102, 0.3)' },
			'color': { main: '#ffd43b', border: '#e67700', glow: 'rgba(255, 212, 59, 0.3)' },
			'bool': { main: '#ff6b6b', border: '#c92a2a', glow: 'rgba(255, 107, 107, 0.3)' },
			'texture': { main: '#ff8787', border: '#e03131', glow: 'rgba(255, 135, 135, 0.3)' }
		};
		const c = colors[ type ] || { main: '#8b5cf6', border: '#5b21b6', glow: 'rgba(139, 92, 246, 0.3)' };
		if ( ! dimmed ) return c;
		// Dimmed: still clearly show type (blue/green/etc.) – use 0.65 so sockets stay recognizable
		return {
			main: c.main.replace( /^#(.{2})(.{2})(.{2})$/, ( _, r, g, b ) => {
				const dim = ( n ) => Math.round( parseInt( n, 16 ) * 0.65 ).toString( 16 ).padStart( 2, '0' );
				return '#' + dim( r ) + dim( g ) + dim( b );
			} ),
			border: '#333',
			glow: 'rgba(80, 80, 80, 0.25)'
		};
	}

	function drawGrid() {

		const rect = nodeCanvas.getBoundingClientRect();
		const canvasWidth = rect.width;
		const canvasHeight = rect.height;
		
		const gridSize = 20 * zoom;
		const offsetX = panOffset.x % gridSize;
		const offsetY = panOffset.y % gridSize;

		ctx.strokeStyle = '#1a1a1a';
		ctx.lineWidth = 1;

		// Vertical lines
		for ( let x = offsetX; x < canvasWidth; x += gridSize ) {

			ctx.beginPath();
			ctx.moveTo( x, 0 );
			ctx.lineTo( x, canvasHeight );
			ctx.stroke();

		}

		// Horizontal lines
		for ( let y = offsetY; y < canvasHeight; y += gridSize ) {

			ctx.beginPath();
			ctx.moveTo( 0, y );
			ctx.lineTo( canvasWidth, y );
			ctx.stroke();

		}

	}

	const bodyStart = HEADER_H;
	const socketSpacing = SOCKET_SPACING;
	const valueInputLeft = 18;
	const valueInputWidth = 28;
	const valueInputHeight = 10;
	// Row center Y: first row offset by half spacing so it clears the header
	const rowCenterY = ( index ) => bodyStart + ( index + 0.5 ) * socketSpacing;
	const valueInputTop = ( index ) => rowCenterY( index ) - valueInputHeight / 2;

	function buildNodeOverlays() {

		if ( ! nodeOverlaysContainer ) return;
		nodeOverlaysContainer.innerHTML = '';
		const editableTypes = [ 'color', 'float', 'int', 'vec2', 'vec3', 'vec4' ];

		const baseInputStyle = {
			padding: '1px 3px',
			fontSize: '9px',
			backgroundColor: '#1a1a1a',
			border: '1px solid #2a2a2a',
			borderRadius: '3px',
			color: '#e0e0e0',
			boxSizing: 'border-box',
			outline: 'none',
			width: valueInputWidth + 'px',
			height: valueInputHeight + 'px',
			display: 'block'
		};

		const applyChange = () => {
			updatePreviewMaterial();
			saveHistoryState();
			triggerAutosave();
		};

		nodes.forEach( node => {

			if ( ! editableTypes.includes( node.type ) ) return;

			const wrap = document.createElement( 'div' );
			wrap.style.position = 'absolute';
			wrap.style.left = '0';
			wrap.style.top = '0';
			wrap.style.width = '0';
			wrap.style.height = '0';
			wrap.style.pointerEvents = 'none';
			wrap.dataset.nodeId = String( node.id );

			if ( node.type === 'color' ) {

				const locked = isInputConnected( node.id, 0 );
				const row = document.createElement( 'div' );
				row.style.position = 'absolute';
				row.style.left = ( node.x + valueInputLeft ) + 'px';
				row.style.top = ( node.y + valueInputTop( 0 ) ) + 'px';
				row.style.pointerEvents = 'auto';
				row.style.display = 'flex';
				row.style.gap = '3px';
				row.style.alignItems = 'center';
				const colorIn = document.createElement( 'input' );
				colorIn.type = 'color';
				colorIn.value = node.properties.color || '#ffffff';
				colorIn.disabled = locked;
				Object.assign( colorIn.style, baseInputStyle, { width: '18px', height: '12px', padding: '0', cursor: locked ? 'not-allowed' : 'pointer', opacity: locked ? 0.6 : 1, flexShrink: 0 } );
				colorIn.title = locked ? 'Connected' : 'Color';
				colorIn.onchange = () => { node.properties.color = colorIn.value; hexIn.value = colorIn.value; applyChange(); };
				row.appendChild( colorIn );
				const hexIn = document.createElement( 'input' );
				hexIn.type = 'text';
				hexIn.placeholder = '#hex';
				hexIn.value = ( node.properties.color || '#ffffff' ).toLowerCase();
				hexIn.disabled = locked;
				Object.assign( hexIn.style, baseInputStyle, { width: '44px', opacity: locked ? 0.6 : 1 } );
				hexIn.title = 'Paste hex (e.g. #ff5500)';
				const commitHex = () => {
					let hex = hexIn.value.trim().replace( /^#/, '' );
					if ( /^[0-9a-fA-F]{3}$/.test( hex ) ) hex = hex[ 0 ] + hex[ 0 ] + hex[ 1 ] + hex[ 1 ] + hex[ 2 ] + hex[ 2 ];
					if ( /^[0-9a-fA-F]{6}$/.test( hex ) ) {
						const v = '#' + hex.toLowerCase();
						node.properties.color = v;
						colorIn.value = v;
						hexIn.value = v;
						applyChange();
					} else hexIn.value = colorIn.value;
				};
				hexIn.onchange = commitHex;
				hexIn.onblur = commitHex;
				hexIn.onkeydown = ( e ) => { if ( e.key === 'Enter' ) commitHex(); };
				row.appendChild( hexIn );
				wrap.appendChild( row );

			} else if ( node.type === 'float' || node.type === 'int' ) {

				const locked = isInputConnected( node.id, 0 );
				const row = document.createElement( 'div' );
				row.style.position = 'absolute';
				row.style.left = ( node.x + valueInputLeft ) + 'px';
				row.style.top = ( node.y + valueInputTop( 0 ) ) + 'px';
				row.style.pointerEvents = 'auto';
				const val = document.createElement( 'input' );
				val.type = 'number';
				val.step = node.type === 'int' ? '1' : '0.01';
				val.value = node.properties.value;
				val.disabled = locked;
				Object.assign( val.style, baseInputStyle, { opacity: locked ? 0.6 : 1 } );
				val.onchange = () => {
					node.properties.value = node.type === 'int' ? parseInt( val.value, 10 ) : parseFloat( val.value );
					applyChange();
				};
				row.appendChild( val );
				wrap.appendChild( row );

			} else if ( node.type === 'vec2' || node.type === 'vec3' || node.type === 'vec4' ) {

				const comps = node.type === 'vec2' ? [ { key: 'x', i: 0 }, { key: 'y', i: 1 } ]
					: node.type === 'vec3' ? [ { key: 'x', i: 0 }, { key: 'y', i: 1 }, { key: 'z', i: 2 } ]
					: [ { key: 'x', i: 0 }, { key: 'y', i: 1 }, { key: 'z', i: 2 }, { key: 'w', i: 3 } ];
				comps.forEach( ( { key, i } ) => {
					const locked = isInputConnected( node.id, i );
					const row = document.createElement( 'div' );
					row.style.position = 'absolute';
					row.style.left = ( node.x + valueInputLeft ) + 'px';
					row.style.top = ( node.y + valueInputTop( i ) ) + 'px';
					row.style.pointerEvents = 'auto';
					const el = document.createElement( 'input' );
					el.type = 'number';
					el.step = '0.01';
					el.value = node.properties[ key ];
					el.placeholder = key.toUpperCase();
					el.disabled = locked;
					Object.assign( el.style, baseInputStyle, { opacity: locked ? 0.6 : 1 } );
					el.onchange = () => { node.properties[ key ] = parseFloat( el.value ); applyChange(); };
					row.appendChild( el );
					wrap.appendChild( row );
				} );

			}

			nodeOverlaysContainer.appendChild( wrap );

		} );

	}

	function updateNodeOverlayTransform() {

		if ( ! nodeOverlaysContainer ) return;
		nodeOverlaysContainer.style.transform = `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`;
		nodeOverlaysContainer.style.transformOrigin = '0 0';

	}

	function updateNodeOverlayPosition( node ) {

		const wrap = nodeOverlaysContainer && nodeOverlaysContainer.querySelector( `[data-node-id="${node.id}"]` );
		if ( ! wrap || ! wrap.children.length ) return;
		const editableTypes = [ 'color', 'float', 'int', 'vec2', 'vec3', 'vec4' ];
		if ( ! editableTypes.includes( node.type ) ) return;
		if ( node.type === 'color' || node.type === 'float' || node.type === 'int' ) {
			wrap.children[ 0 ].style.left = ( node.x + valueInputLeft ) + 'px';
			wrap.children[ 0 ].style.top = ( node.y + valueInputTop( 0 ) ) + 'px';
		} else {
			for ( let i = 0; i < wrap.children.length; i ++ ) {
				wrap.children[ i ].style.left = ( node.x + valueInputLeft ) + 'px';
				wrap.children[ i ].style.top = ( node.y + valueInputTop( i ) ) + 'px';
			}
		}

	}

	function drawNodeContent( node, x, y, bodyStart, rowCenterY ) {

		if ( node.type === 'uv' ) {

			ctx.fillStyle = '#888';
			ctx.font = `${8}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
			ctx.textAlign = 'left';
			ctx.fillText( 'INDEX (0)', x + 8, rowCenterY( 0 ) + 3 );

		}

	}

	function drawNode( node ) {

		const x = node.x;
		const y = node.y;

		// Node shadow
		ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
		ctx.shadowBlur = 15 / zoom; // Adjust shadow blur for zoom
		ctx.shadowOffsetX = 0;
		ctx.shadowOffsetY = 4 / zoom; // Adjust shadow offset for zoom

		// Node background - darker, more professional
		ctx.fillStyle = '#0d0d0d';
		ctx.beginPath();
		ctx.roundRect( x, y, node.width, node.height, 6 );
		ctx.fill();

		// Reset shadow for other elements
		ctx.shadowColor = 'transparent';
		ctx.shadowBlur = 0;
		ctx.shadowOffsetX = 0;
		ctx.shadowOffsetY = 0;

		// Node header - compact, darkened color
		const headerColor = node.color;
		let r, g, b;
		
		if ( headerColor.startsWith( '#' ) ) {

			const hex = headerColor.slice( 1 );
			r = parseInt( hex.slice( 0, 2 ), 16 );
			g = parseInt( hex.slice( 2, 4 ), 16 );
			b = parseInt( hex.slice( 4, 6 ), 16 );

		} else {

			r = 77; g = 171; b = 247;

		}

		// Header: much darker for contrast, so title stays readable
		r = Math.floor( r * 0.4 );
		g = Math.floor( g * 0.4 );
		b = Math.floor( b * 0.4 );

		ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
		ctx.beginPath();
		ctx.roundRect( x, y, node.width, HEADER_H, [ 6, 6, 0, 0 ] );
		ctx.fill();

		// Node border – light visible outline (reference: rounded, clear edge)
		ctx.strokeStyle = selectedNode === node ? '#6ba3ff' : '#2d3a3a';
		ctx.lineWidth = ( selectedNode === node ? 2 : 1 ) / zoom;
		ctx.beginPath();
		ctx.roundRect( x, y, node.width, node.height, 6 );
		ctx.stroke();

		// Node title - smaller font so it fits; clipped so it never overlaps socket areas
		const headerPad = 12;
		ctx.save();
		ctx.beginPath();
		ctx.rect( x + headerPad, y, node.width - headerPad * 2, HEADER_H );
		ctx.clip();
		ctx.fillStyle = '#ffffff';
		ctx.font = `bold ${8}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
		ctx.textAlign = 'center';
		ctx.fillText( node.name, x + node.width / 2, y + Math.floor( HEADER_H / 2 ) + 3 );
		if ( node.subtitle ) {

			ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
			ctx.font = `${7}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
			ctx.fillText( node.subtitle, x + node.width / 2, y + HEADER_H - 4 );

		}
		ctx.restore();

		const bodyStart = HEADER_H;
		const socketSize = 4;
		const socketSpacing = SOCKET_SPACING;
		// Row center Y: offset by half a row so first row clears the header (no overlap)
		const rowCenterY = ( index ) => y + bodyStart + ( index + 0.5 ) * socketSpacing;

		// Draw node-specific content (color preview, values, etc.)
		drawNodeContent( node, x, y, bodyStart, rowCenterY );

		// Draw inputs on the left
		node.inputs.forEach( ( input, index ) => {

			const inputY = rowCenterY( index );
			const socketX = x + 1; // Inside the node edge
			
			// Check if this input is connected
			const isConnected = connections.some( c => 
				c.toNode === node.id && c.toInput === index
			);
			// Always show type color; dim when not connected
			const socketColor = getSocketColor( input.type, ! isConnected );
			
			// Input socket outer glow
			ctx.fillStyle = socketColor.glow;
			ctx.beginPath();
			ctx.arc( socketX, inputY, socketSize + 2, 0, Math.PI * 2 );
			ctx.fill();
			
			// Input socket
			ctx.fillStyle = socketColor.main;
			ctx.beginPath();
			ctx.arc( socketX, inputY, socketSize, 0, Math.PI * 2 );
			ctx.fill();
			
			// Socket border
			ctx.strokeStyle = socketColor.border;
			ctx.lineWidth = 1.5 / zoom; // Adjust for zoom
			ctx.stroke();

			// Input label (same row as value input; label between socket and value)
			if ( node.showLabels && input.label ) {

				ctx.fillStyle = '#b8b8b8';
				ctx.font = `${8}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
				ctx.textAlign = 'left';
				ctx.fillText( input.label, x + 8, inputY + 3 );

			}

		} );

		// Draw outputs on the right
		node.outputs.forEach( ( output, index ) => {

			const outputY = rowCenterY( index );
			const socketX = x + node.width - 1; // Inside the node edge

			// Check if this output is connected
			const isConnected = connections.some( c => 
				c.fromNode === node.id && c.fromOutput === index
			);
			// Always show type color; dim when not connected
			const socketColor = getSocketColor( output.type, ! isConnected );

			// Output socket outer glow
			ctx.fillStyle = socketColor.glow;
			ctx.beginPath();
			ctx.arc( socketX, outputY, socketSize + 2, 0, Math.PI * 2 );
			ctx.fill();

			// Output socket
			ctx.fillStyle = socketColor.main;
			ctx.beginPath();
			ctx.arc( socketX, outputY, socketSize, 0, Math.PI * 2 );
			ctx.fill();
			
			// Socket border
			ctx.strokeStyle = socketColor.border;
			ctx.lineWidth = 1.5 / zoom; // Adjust for zoom
			ctx.stroke();

			// Output label
			if ( node.showLabels && output.label ) {

				ctx.fillStyle = '#b8b8b8';
				ctx.font = `${8}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
				ctx.textAlign = 'right';
				ctx.fillText( output.label, x + node.width - 8, outputY + 3 );

			}

		} );

	}

	function drawConnection( conn ) {

		const fromNode = nodes.find( n => n.id === conn.fromNode );
		const toNode = nodes.find( n => n.id === conn.toNode );

		if ( ! fromNode || ! toNode ) return;

		const bodyStart = HEADER_H;
		const socketSpacing = SOCKET_SPACING;
		const rowCenterY = ( node, index ) => node.y + bodyStart + ( index + 0.5 ) * socketSpacing;

		const fromY = rowCenterY( fromNode, conn.fromOutput );
		const toY = rowCenterY( toNode, conn.toInput );

		const x1 = fromNode.x + fromNode.width - 1; // Match new output socket position
		const y1 = fromY;
		const x2 = toNode.x + 1; // Match new input socket position
		const y2 = toY;

		// Get socket colors based on types
		const outputSocket = fromNode.outputs[ conn.fromOutput ];
		const inputSocket = toNode.inputs[ conn.toInput ];
		
		const outputColor = getSocketColor( outputSocket.type );
		const inputColor = getSocketColor( inputSocket.type );

		// Draw bezier curve with gradient based on socket types
		const gradient = ctx.createLinearGradient( x1, y1, x2, y2 );
		gradient.addColorStop( 0, outputColor.main );  // Color from output
		gradient.addColorStop( 1, inputColor.main );   // Color to input

		ctx.strokeStyle = gradient;
		ctx.lineWidth = 2.5 / zoom; // Adjust for zoom
		ctx.beginPath();
		ctx.moveTo( x1, y1 );
		
		const distance = Math.abs( x2 - x1 );
		const cp1x = x1 + Math.min( distance * 0.5, 200 );
		const cp2x = x2 - Math.min( distance * 0.5, 200 );
		
		ctx.bezierCurveTo( cp1x, y1, cp2x, y2, x2, y2 );
		ctx.stroke();

	}

	function drawDraggingConnection() {

		// Transform mouse coordinates to world space
		const x1 = connectionStart.worldX;
		const y1 = connectionStart.worldY;
		const x2 = connectionStart.currentWorldX;
		const y2 = connectionStart.currentWorldY;

		// Get the output socket type and its color
		const outputSocket = connectionStart.node.outputs[ connectionStart.output ];
		const socketColor = getSocketColor( outputSocket.type );

		ctx.strokeStyle = socketColor.main;
		ctx.lineWidth = 2.5 / zoom; // Adjust for zoom
		ctx.setLineDash( [ 8, 4 ] );
		ctx.beginPath();
		ctx.moveTo( x1, y1 );

		const distance = Math.abs( x2 - x1 );
		const cp1x = x1 + Math.min( distance * 0.5, 200 );
		const cp2x = x2 - Math.min( distance * 0.5, 200 );

		ctx.bezierCurveTo( cp1x, y1, cp2x, y2, x2, y2 );
		ctx.stroke();
		ctx.setLineDash( [] );

	}

	// Coordinate transformation helpers
	function screenToWorld( screenX, screenY ) {

		return {
			x: ( screenX - panOffset.x ) / zoom,
			y: ( screenY - panOffset.y ) / zoom
		};

	}

	function worldToScreen( worldX, worldY ) {

		return {
			x: worldX * zoom + panOffset.x,
			y: worldY * zoom + panOffset.y
		};

	}

	// Input handling
	function onMouseDown( e ) {

		const rect = nodeCanvas.getBoundingClientRect();
		const mouseX = e.clientX - rect.left;
		const mouseY = e.clientY - rect.top;

		// Convert to world coordinates
		const worldPos = screenToWorld( mouseX, mouseY );

		// Check if clicking on a node or socket (check sockets first)
		for ( let i = nodes.length - 1; i >= 0; i -- ) {

			const node = nodes[ i ];
			const x = node.x;
			const y = node.y;

			const bodyStart = HEADER_H;
			const socketSpacing = SOCKET_SPACING;
			const rowCenterY = ( index ) => y + bodyStart + ( index + 0.5 ) * socketSpacing;

			// Check if clicking on output socket (now at node edge)
			for ( let j = 0; j < node.outputs.length; j ++ ) {

				const outputY = rowCenterY( j );
				const socketX = x + node.width - 1; // Updated position
				const dist = Math.sqrt( ( worldPos.x - socketX ) ** 2 + ( worldPos.y - outputY ) ** 2 );

				if ( dist < 10 / zoom ) {

					isDraggingConnection = true;
					connectionStart = {
						node: node,
						output: j,
						worldX: socketX,
						worldY: outputY,
						currentWorldX: worldPos.x,
						currentWorldY: worldPos.y
					};
					return;

				}

			}

			// Check if clicking on input socket (now at node edge)
			for ( let j = 0; j < node.inputs.length; j ++ ) {

				const inputY = rowCenterY( j );
				const socketX = x + 1; // Updated position
				const dist = Math.sqrt( ( worldPos.x - socketX ) ** 2 + ( worldPos.y - inputY ) ** 2 );

				if ( dist < 10 / zoom ) {

					// Remove existing connection to this input
					connections = connections.filter( conn => 
						! ( conn.toNode === node.id && conn.toInput === j )
					);
					updatePreviewMaterial(); // Update preview when connection removed
					saveHistoryState();
					triggerAutosave();
					return;

				}

			}

			// Check if clicking on node body
			if ( worldPos.x >= x && worldPos.x <= x + node.width &&
				 worldPos.y >= y && worldPos.y <= y + node.height ) {

				// Start dragging node
				isDragging = true;
				draggedNode = node;
				selectedNode = node;
				updatePropertiesPanel( node );
				return;

			}

		}

		// Start panning
		if ( e.button === 0 || e.button === 1 ) {

			isPanning = true;
			panStart = { x: mouseX - panOffset.x, y: mouseY - panOffset.y };
			selectedNode = null;
			updatePropertiesPanel( null );

		}

	}

	function onMouseMove( e ) {

		const rect = nodeCanvas.getBoundingClientRect();
		const mouseX = e.clientX - rect.left;
		const mouseY = e.clientY - rect.top;

		// Convert to world coordinates
		const worldPos = screenToWorld( mouseX, mouseY );

		if ( isDragging && draggedNode ) {

			draggedNode.x = worldPos.x - draggedNode.width / 2;
			draggedNode.y = worldPos.y - draggedNode.height / 2;
			updateNodeOverlayPosition( draggedNode );

		} else if ( isPanning ) {

			panOffset.x = mouseX - panStart.x;
			panOffset.y = mouseY - panStart.y;

		} else if ( isDraggingConnection && connectionStart ) {

			connectionStart.currentWorldX = worldPos.x;
			connectionStart.currentWorldY = worldPos.y;

		}

	}

	function onMouseUp( e ) {

		const rect = nodeCanvas.getBoundingClientRect();
		const mouseX = e.clientX - rect.left;
		const mouseY = e.clientY - rect.top;

		// Convert to world coordinates
		const worldPos = screenToWorld( mouseX, mouseY );

		if ( isDraggingConnection && connectionStart ) {

			const bodyStart = HEADER_H;
			const socketSpacing = SOCKET_SPACING;
			const rowCenterY = ( n, index ) => n.y + bodyStart + ( index + 0.5 ) * socketSpacing;

			// Check if dropped on an input socket
			for ( let i = 0; i < nodes.length; i ++ ) {

				const node = nodes[ i ];
				const x = node.x;
				const y = node.y;

				for ( let j = 0; j < node.inputs.length; j ++ ) {

					const inputY = rowCenterY( node, j );
					const socketX = x + 1; // Updated position
					const dist = Math.sqrt( ( worldPos.x - socketX ) ** 2 + ( worldPos.y - inputY ) ** 2 );

					if ( dist < 12 / zoom ) {

						const outSocket = connectionStart.node.outputs[ connectionStart.output ];
						const inSocket = node.inputs[ j ];
						const outType = outSocket ? outSocket.type : 'float';
						const inType = inSocket ? inSocket.type : 'float';

						if ( ! canConnectSocket( outType, inType ) ) {

							// Incompatible (e.g. float -> texture); don't create connection
							break;

						}

						// Remove any existing connection to this input socket
						// (only one connection allowed per input)
						connections = connections.filter( conn => 
							! ( conn.toNode === node.id && conn.toInput === j )
						);

						// Create new connection (types are compatible; coercion handled at compile time)
						connections.push( {
							fromNode: connectionStart.node.id,
							fromOutput: connectionStart.output,
							toNode: node.id,
							toInput: j
						} );
						updatePreviewMaterial(); // Update preview when connection made
						saveHistoryState();
						triggerAutosave();
						updatePropertiesPanel( selectedNode ); // Refresh so value inputs lock when connected
						buildNodeOverlays(); // In-node inputs lock when connected
						break;

					}

				}

			}

			isDraggingConnection = false;
			connectionStart = null;

		}

		// Save history if a node was dragged
		if ( isDragging && draggedNode ) {

			saveHistoryState();
			triggerAutosave();

		}

		isDragging = false;
		draggedNode = null;
		isPanning = false;

	}

	function onWheel( e ) {

		e.preventDefault();
		
		const rect = nodeCanvas.getBoundingClientRect();
		const mouseX = e.clientX - rect.left;
		const mouseY = e.clientY - rect.top;

		// Get world position before zoom
		const worldPosBefore = screenToWorld( mouseX, mouseY );

		// Apply zoom
		const delta = e.deltaY > 0 ? 0.9 : 1.1;
		const oldZoom = zoom;
		zoom *= delta;
		zoom = Math.max( 0.1, Math.min( 2, zoom ) );

		// Get world position after zoom (would be different without pan adjustment)
		const worldPosAfter = {
			x: ( mouseX - panOffset.x ) / zoom,
			y: ( mouseY - panOffset.y ) / zoom
		};

		// Adjust pan to keep the world position under the mouse constant
		panOffset.x += ( worldPosAfter.x - worldPosBefore.x ) * zoom;
		panOffset.y += ( worldPosAfter.y - worldPosBefore.y ) * zoom;

	}

	function onDoubleClick( e ) {

		const rect = nodeCanvas.getBoundingClientRect();
		const mouseX = e.clientX - rect.left;
		const mouseY = e.clientY - rect.top;

		// Add a new node at double-click position
		// For now, just log - could open a quick node selector
		console.log( '[TSLEditor] Double click at', mouseX - panOffset.x, mouseY - panOffset.y );

	}

	/**
	 * Whether an output socket type can be connected to an input socket type (with coercion).
	 * e.g. vec2 -> vec3 (take xy, z=0), vec4 -> float (take x), float -> vec3 (x,0,0).
	 * Incompatible: e.g. float/int/vec* <-> texture.
	 */
	function canConnectSocket( outputType, inputType ) {

		if ( outputType === inputType ) return true;
		// Texture only accepts texture
		if ( inputType === 'texture' ) return outputType === 'texture';
		if ( outputType === 'texture' ) return inputType === 'texture';

		const numeric = [ 'float', 'int', 'vec2', 'vec3', 'vec4', 'color', 'bool' ];
		if ( ! numeric.includes( outputType ) || ! numeric.includes( inputType ) ) return false;

		// float input: accept float, int, vec2/3/4/color (take x)
		if ( inputType === 'float' ) return [ 'float', 'int', 'vec2', 'vec3', 'vec4', 'color', 'bool' ].includes( outputType );
		// int input: accept int, float, bool
		if ( inputType === 'int' ) return [ 'int', 'float', 'bool' ].includes( outputType );
		// bool input: accept bool, float
		if ( inputType === 'bool' ) return [ 'bool', 'float', 'int' ].includes( outputType );

		// vec2 input: vec2, float (x), vec3 (xy), vec4 (xy)
		if ( inputType === 'vec2' ) return [ 'float', 'int', 'vec2', 'vec3', 'vec4', 'color' ].includes( outputType );
		// vec3 input: vec3, vec2 (xy,z=0), vec4 (xyz), float (x,0,0), color
		if ( inputType === 'vec3' ) return [ 'float', 'int', 'vec2', 'vec3', 'vec4', 'color' ].includes( outputType );
		// vec4 input: vec4, vec3 (xyz,w=1), vec2 (xy,0,1), float (x,0,0,1), color (rgb,1)
		if ( inputType === 'vec4' ) return [ 'float', 'int', 'vec2', 'vec3', 'vec4', 'color' ].includes( outputType );
		// color input: same as vec3
		if ( inputType === 'color' ) return [ 'float', 'int', 'vec2', 'vec3', 'vec4', 'color' ].includes( outputType );

		return false;

	}

	function isInputConnected( nodeId, inputIndex ) {

		return connections.some( c => c.toNode === nodeId && c.toInput === inputIndex );

	}

	function updatePropertiesPanel( node ) {

		if ( ! propertiesPanel ) return;

		// Find the properties section (second child after preview section)
		const propertiesSection = propertiesPanel.children[ 1 ];
		if ( ! propertiesSection ) return;

		// Clear only the properties section
		propertiesSection.innerHTML = '';

		// Add properties title
		propertiesSection.style.padding = '16px';
		
		const title = document.createElement( 'div' );
		title.textContent = 'Properties';
		title.style.fontSize = '14px';
		title.style.fontWeight = '600';
		title.style.color = '#ddd';
		title.style.marginBottom = '16px';
		propertiesSection.appendChild( title );

		if ( ! node ) {

			const noSelection = document.createElement( 'div' );
			noSelection.textContent = 'Select a node to edit properties';
			noSelection.style.fontSize = '12px';
			noSelection.style.color = '#666';
			noSelection.style.textAlign = 'center';
			noSelection.style.marginTop = '40px';
			propertiesSection.appendChild( noSelection );
			return;

		}

		// Node name
		const nameLabel = document.createElement( 'div' );
		nameLabel.textContent = 'Name';
		nameLabel.style.fontSize = '11px';
		nameLabel.style.color = '#888';
		nameLabel.style.marginBottom = '4px';
		propertiesSection.appendChild( nameLabel );

		const nameInput = document.createElement( 'input' );
		nameInput.type = 'text';
		nameInput.value = node.name;
		nameInput.style.width = '100%';
		nameInput.style.padding = '6px 8px';
		nameInput.style.backgroundColor = '#1a1a1a';
		nameInput.style.border = '1px solid #2a2a2a';
		nameInput.style.borderRadius = '4px';
		nameInput.style.color = '#ddd';
		nameInput.style.fontSize = '12px';
		nameInput.style.marginBottom = '16px';
		nameInput.style.boxSizing = 'border-box';
		nameInput.onchange = () => node.name = nameInput.value;
		propertiesSection.appendChild( nameInput );

		// Node-specific properties (locked when corresponding input is connected)
		if ( node.type === 'color' && node.properties.color !== undefined ) {

			const colorLocked = isInputConnected( node.id, 0 );
			const colorLabel = document.createElement( 'div' );
			colorLabel.textContent = colorLocked ? 'Color (connected)' : 'Color';
			colorLabel.style.fontSize = '11px';
			colorLabel.style.color = '#888';
			colorLabel.style.marginBottom = '4px';
			propertiesSection.appendChild( colorLabel );

			const colorInput = document.createElement( 'input' );
			colorInput.type = 'color';
			colorInput.value = node.properties.color;
			colorInput.disabled = colorLocked;
			colorInput.style.width = '100%';
			colorInput.style.height = '32px';
			colorInput.style.border = '1px solid #2a2a2a';
			colorInput.style.borderRadius = '4px';
			colorInput.style.cursor = colorLocked ? 'not-allowed' : 'pointer';
			colorInput.style.opacity = colorLocked ? '0.6' : '1';
			colorInput.style.marginBottom = '8px';
			if ( ! colorLocked ) colorInput.onchange = () => {
				node.properties.color = colorInput.value;
				hexInput.value = colorInput.value.toLowerCase();
				updatePreviewMaterial();
				saveHistoryState();
				triggerAutosave();
			};
			propertiesSection.appendChild( colorInput );

			const hexLabel = document.createElement( 'div' );
			hexLabel.textContent = 'Hex';
			hexLabel.style.fontSize = '11px';
			hexLabel.style.color = '#888';
			hexLabel.style.marginBottom = '4px';
			propertiesSection.appendChild( hexLabel );

			const hexInput = document.createElement( 'input' );
			hexInput.type = 'text';
			hexInput.placeholder = '#rrggbb or rrggbb';
			hexInput.value = ( node.properties.color || '#ffffff' ).toLowerCase();
			hexInput.disabled = colorLocked;
			hexInput.style.width = '100%';
			hexInput.style.padding = '6px 8px';
			hexInput.style.backgroundColor = '#1a1a1a';
			hexInput.style.border = '1px solid #2a2a2a';
			hexInput.style.borderRadius = '4px';
			hexInput.style.color = '#ddd';
			hexInput.style.fontSize = '12px';
			hexInput.style.boxSizing = 'border-box';
			hexInput.style.fontFamily = 'monospace';
			hexInput.style.opacity = colorLocked ? '0.6' : '1';
			hexInput.title = 'Paste hex (e.g. #ff5500 or ff5500)';
			const commitHex = () => {
				let hex = hexInput.value.trim().replace( /^#/, '' );
				if ( /^[0-9a-fA-F]{3}$/.test( hex ) ) hex = hex[ 0 ] + hex[ 0 ] + hex[ 1 ] + hex[ 1 ] + hex[ 2 ] + hex[ 2 ];
				if ( /^[0-9a-fA-F]{6}$/.test( hex ) ) {
					const v = '#' + hex.toLowerCase();
					node.properties.color = v;
					colorInput.value = v;
					hexInput.value = v;
					updatePreviewMaterial();
					saveHistoryState();
					triggerAutosave();
				} else hexInput.value = ( node.properties.color || '#ffffff' ).toLowerCase();
			};
			hexInput.onchange = commitHex;
			hexInput.onblur = commitHex;
			hexInput.onkeydown = ( e ) => { if ( e.key === 'Enter' ) commitHex(); };
			propertiesSection.appendChild( hexInput );

		}

		if ( node.type === 'float' && node.properties.value !== undefined ) {

			const valueLocked = isInputConnected( node.id, 0 );
			const valueLabel = document.createElement( 'div' );
			valueLabel.textContent = valueLocked ? 'Value (connected)' : 'Value';
			valueLabel.style.fontSize = '11px';
			valueLabel.style.color = '#888';
			valueLabel.style.marginBottom = '4px';
			propertiesSection.appendChild( valueLabel );

			const valueInput = document.createElement( 'input' );
			valueInput.type = 'number';
			valueInput.value = node.properties.value;
			valueInput.step = '0.1';
			valueInput.disabled = valueLocked;
			valueInput.style.width = '100%';
			valueInput.style.padding = '6px 8px';
			valueInput.style.backgroundColor = '#1a1a1a';
			valueInput.style.border = '1px solid #2a2a2a';
			valueInput.style.borderRadius = '4px';
			valueInput.style.color = '#ddd';
			valueInput.style.fontSize = '12px';
			valueInput.style.boxSizing = 'border-box';
			valueInput.style.opacity = valueLocked ? '0.6' : '1';
			if ( ! valueLocked ) valueInput.onchange = () => {
				node.properties.value = parseFloat( valueInput.value );
				updatePreviewMaterial();
				saveHistoryState();
				triggerAutosave();
			};
			propertiesSection.appendChild( valueInput );

		}

		if ( node.type === 'int' && node.properties.value !== undefined ) {

			const valueLocked = isInputConnected( node.id, 0 );
			const valueLabel = document.createElement( 'div' );
			valueLabel.textContent = valueLocked ? 'Value (connected)' : 'Value';
			valueLabel.style.fontSize = '11px';
			valueLabel.style.color = '#888';
			valueLabel.style.marginBottom = '4px';
			propertiesSection.appendChild( valueLabel );

			const valueInput = document.createElement( 'input' );
			valueInput.type = 'number';
			valueInput.value = node.properties.value;
			valueInput.step = '1';
			valueInput.disabled = valueLocked;
			valueInput.style.width = '100%';
			valueInput.style.padding = '6px 8px';
			valueInput.style.backgroundColor = '#1a1a1a';
			valueInput.style.border = '1px solid #2a2a2a';
			valueInput.style.borderRadius = '4px';
			valueInput.style.color = '#ddd';
			valueInput.style.fontSize = '12px';
			valueInput.style.boxSizing = 'border-box';
			valueInput.style.opacity = valueLocked ? '0.6' : '1';
			if ( ! valueLocked ) valueInput.onchange = () => {
				node.properties.value = parseInt( valueInput.value );
				updatePreviewMaterial();
				saveHistoryState();
				triggerAutosave();
			};
			propertiesSection.appendChild( valueInput );

		}

		if ( node.type === 'vec2' && node.properties.x !== undefined ) {

			const xLocked = isInputConnected( node.id, 0 );
			const yLocked = isInputConnected( node.id, 1 );
			// X value
			const xLabel = document.createElement( 'div' );
			xLabel.textContent = xLocked ? 'X (connected)' : 'X';
			xLabel.style.fontSize = '11px';
			xLabel.style.color = '#888';
			xLabel.style.marginBottom = '4px';
			propertiesSection.appendChild( xLabel );

			const xInput = document.createElement( 'input' );
			xInput.type = 'number';
			xInput.value = node.properties.x;
			xInput.step = '0.1';
			xInput.disabled = xLocked;
			xInput.style.width = '100%';
			xInput.style.padding = '6px 8px';
			xInput.style.backgroundColor = '#1a1a1a';
			xInput.style.border = '1px solid #2a2a2a';
			xInput.style.borderRadius = '4px';
			xInput.style.color = '#ddd';
			xInput.style.fontSize = '12px';
			xInput.style.marginBottom = '12px';
			xInput.style.boxSizing = 'border-box';
			xInput.style.opacity = xLocked ? '0.6' : '1';
			if ( ! xLocked ) xInput.onchange = () => {
				node.properties.x = parseFloat( xInput.value );
				updatePreviewMaterial();
				saveHistoryState();
				triggerAutosave();
			};
			propertiesSection.appendChild( xInput );

			// Y value
			const yLabel = document.createElement( 'div' );
			yLabel.textContent = yLocked ? 'Y (connected)' : 'Y';
			yLabel.style.fontSize = '11px';
			yLabel.style.color = '#888';
			yLabel.style.marginBottom = '4px';
			propertiesSection.appendChild( yLabel );

			const yInput = document.createElement( 'input' );
			yInput.type = 'number';
			yInput.value = node.properties.y;
			yInput.step = '0.1';
			yInput.disabled = yLocked;
			yInput.style.width = '100%';
			yInput.style.padding = '6px 8px';
			yInput.style.backgroundColor = '#1a1a1a';
			yInput.style.border = '1px solid #2a2a2a';
			yInput.style.borderRadius = '4px';
			yInput.style.color = '#ddd';
			yInput.style.fontSize = '12px';
			yInput.style.boxSizing = 'border-box';
			yInput.style.opacity = yLocked ? '0.6' : '1';
			if ( ! yLocked ) yInput.onchange = () => {
				node.properties.y = parseFloat( yInput.value );
				updatePreviewMaterial();
				saveHistoryState();
				triggerAutosave();
			};
			propertiesSection.appendChild( yInput );

		}

		if ( node.type === 'vec3' && node.properties.x !== undefined ) {

			const xLocked = isInputConnected( node.id, 0 );
			const yLocked = isInputConnected( node.id, 1 );
			const zLocked = isInputConnected( node.id, 2 );
			// X value
			const xLabel = document.createElement( 'div' );
			xLabel.textContent = xLocked ? 'X (connected)' : 'X';
			xLabel.style.fontSize = '11px';
			xLabel.style.color = '#888';
			xLabel.style.marginBottom = '4px';
			propertiesSection.appendChild( xLabel );

			const xInput = document.createElement( 'input' );
			xInput.type = 'number';
			xInput.value = node.properties.x;
			xInput.step = '0.1';
			xInput.disabled = xLocked;
			xInput.style.width = '100%';
			xInput.style.padding = '6px 8px';
			xInput.style.backgroundColor = '#1a1a1a';
			xInput.style.border = '1px solid #2a2a2a';
			xInput.style.borderRadius = '4px';
			xInput.style.color = '#ddd';
			xInput.style.fontSize = '12px';
			xInput.style.marginBottom = '12px';
			xInput.style.boxSizing = 'border-box';
			xInput.style.opacity = xLocked ? '0.6' : '1';
			if ( ! xLocked ) xInput.onchange = () => {
				node.properties.x = parseFloat( xInput.value );
				updatePreviewMaterial();
				saveHistoryState();
				triggerAutosave();
			};
			propertiesSection.appendChild( xInput );

			// Y value
			const yLabel = document.createElement( 'div' );
			yLabel.textContent = yLocked ? 'Y (connected)' : 'Y';
			yLabel.style.fontSize = '11px';
			yLabel.style.color = '#888';
			yLabel.style.marginBottom = '4px';
			propertiesSection.appendChild( yLabel );

			const yInput = document.createElement( 'input' );
			yInput.type = 'number';
			yInput.value = node.properties.y;
			yInput.step = '0.1';
			yInput.disabled = yLocked;
			yInput.style.width = '100%';
			yInput.style.padding = '6px 8px';
			yInput.style.backgroundColor = '#1a1a1a';
			yInput.style.border = '1px solid #2a2a2a';
			yInput.style.borderRadius = '4px';
			yInput.style.color = '#ddd';
			yInput.style.fontSize = '12px';
			yInput.style.marginBottom = '12px';
			yInput.style.boxSizing = 'border-box';
			yInput.style.opacity = yLocked ? '0.6' : '1';
			if ( ! yLocked ) yInput.onchange = () => {
				node.properties.y = parseFloat( yInput.value );
				updatePreviewMaterial();
				saveHistoryState();
				triggerAutosave();
			};
			propertiesSection.appendChild( yInput );

			// Z value
			const zLabel = document.createElement( 'div' );
			zLabel.textContent = zLocked ? 'Z (connected)' : 'Z';
			zLabel.style.fontSize = '11px';
			zLabel.style.color = '#888';
			zLabel.style.marginBottom = '4px';
			propertiesSection.appendChild( zLabel );

			const zInput = document.createElement( 'input' );
			zInput.type = 'number';
			zInput.value = node.properties.z;
			zInput.step = '0.1';
			zInput.disabled = zLocked;
			zInput.style.width = '100%';
			zInput.style.padding = '6px 8px';
			zInput.style.backgroundColor = '#1a1a1a';
			zInput.style.border = '1px solid #2a2a2a';
			zInput.style.borderRadius = '4px';
			zInput.style.color = '#ddd';
			zInput.style.fontSize = '12px';
			zInput.style.boxSizing = 'border-box';
			zInput.style.opacity = zLocked ? '0.6' : '1';
			if ( ! zLocked ) zInput.onchange = () => {
				node.properties.z = parseFloat( zInput.value );
				updatePreviewMaterial();
				saveHistoryState();
				triggerAutosave();
			};
			propertiesSection.appendChild( zInput );

		}

		if ( node.type === 'vec4' && node.properties.x !== undefined ) {

			const xLocked = isInputConnected( node.id, 0 );
			const yLocked = isInputConnected( node.id, 1 );
			const zLocked = isInputConnected( node.id, 2 );
			const wLocked = isInputConnected( node.id, 3 );
			// X value
			const xLabel = document.createElement( 'div' );
			xLabel.textContent = xLocked ? 'X (connected)' : 'X';
			xLabel.style.fontSize = '11px';
			xLabel.style.color = '#888';
			xLabel.style.marginBottom = '4px';
			propertiesSection.appendChild( xLabel );

			const xInput = document.createElement( 'input' );
			xInput.type = 'number';
			xInput.value = node.properties.x;
			xInput.step = '0.1';
			xInput.disabled = xLocked;
			xInput.style.width = '100%';
			xInput.style.padding = '6px 8px';
			xInput.style.backgroundColor = '#1a1a1a';
			xInput.style.border = '1px solid #2a2a2a';
			xInput.style.borderRadius = '4px';
			xInput.style.color = '#ddd';
			xInput.style.fontSize = '12px';
			xInput.style.marginBottom = '12px';
			xInput.style.boxSizing = 'border-box';
			xInput.style.opacity = xLocked ? '0.6' : '1';
			if ( ! xLocked ) xInput.onchange = () => {
				node.properties.x = parseFloat( xInput.value );
				updatePreviewMaterial();
				saveHistoryState();
				triggerAutosave();
			};
			propertiesSection.appendChild( xInput );

			// Y value
			const yLabel = document.createElement( 'div' );
			yLabel.textContent = yLocked ? 'Y (connected)' : 'Y';
			yLabel.style.fontSize = '11px';
			yLabel.style.color = '#888';
			yLabel.style.marginBottom = '4px';
			propertiesSection.appendChild( yLabel );

			const yInput = document.createElement( 'input' );
			yInput.type = 'number';
			yInput.value = node.properties.y;
			yInput.step = '0.1';
			yInput.disabled = yLocked;
			yInput.style.width = '100%';
			yInput.style.padding = '6px 8px';
			yInput.style.backgroundColor = '#1a1a1a';
			yInput.style.border = '1px solid #2a2a2a';
			yInput.style.borderRadius = '4px';
			yInput.style.color = '#ddd';
			yInput.style.fontSize = '12px';
			yInput.style.marginBottom = '12px';
			yInput.style.boxSizing = 'border-box';
			yInput.style.opacity = yLocked ? '0.6' : '1';
			if ( ! yLocked ) yInput.onchange = () => {
				node.properties.y = parseFloat( yInput.value );
				updatePreviewMaterial();
				saveHistoryState();
				triggerAutosave();
			};
			propertiesSection.appendChild( yInput );

			// Z value
			const zLabel = document.createElement( 'div' );
			zLabel.textContent = zLocked ? 'Z (connected)' : 'Z';
			zLabel.style.fontSize = '11px';
			zLabel.style.color = '#888';
			zLabel.style.marginBottom = '4px';
			propertiesSection.appendChild( zLabel );

			const zInput = document.createElement( 'input' );
			zInput.type = 'number';
			zInput.value = node.properties.z;
			zInput.step = '0.1';
			zInput.disabled = zLocked;
			zInput.style.width = '100%';
			zInput.style.padding = '6px 8px';
			zInput.style.backgroundColor = '#1a1a1a';
			zInput.style.border = '1px solid #2a2a2a';
			zInput.style.borderRadius = '4px';
			zInput.style.color = '#ddd';
			zInput.style.fontSize = '12px';
			zInput.style.marginBottom = '12px';
			zInput.style.boxSizing = 'border-box';
			zInput.style.opacity = zLocked ? '0.6' : '1';
			if ( ! zLocked ) zInput.onchange = () => {
				node.properties.z = parseFloat( zInput.value );
				updatePreviewMaterial();
				saveHistoryState();
				triggerAutosave();
			};
			propertiesSection.appendChild( zInput );

			// W value
			const wLabel = document.createElement( 'div' );
			wLabel.textContent = wLocked ? 'W (connected)' : 'W';
			wLabel.style.fontSize = '11px';
			wLabel.style.color = '#888';
			wLabel.style.marginBottom = '4px';
			propertiesSection.appendChild( wLabel );

			const wInput = document.createElement( 'input' );
			wInput.type = 'number';
			wInput.value = node.properties.w;
			wInput.step = '0.1';
			wInput.disabled = wLocked;
			wInput.style.width = '100%';
			wInput.style.padding = '6px 8px';
			wInput.style.backgroundColor = '#1a1a1a';
			wInput.style.border = '1px solid #2a2a2a';
			wInput.style.borderRadius = '4px';
			wInput.style.color = '#ddd';
			wInput.style.fontSize = '12px';
			wInput.style.boxSizing = 'border-box';
			wInput.style.opacity = wLocked ? '0.6' : '1';
			if ( ! wLocked ) wInput.onchange = () => {
				node.properties.w = parseFloat( wInput.value );
				updatePreviewMaterial();
				saveHistoryState();
				triggerAutosave();
			};
			propertiesSection.appendChild( wInput );

		}

		// Delete button
		const deleteBtn = document.createElement( 'button' );
		deleteBtn.textContent = 'Delete Node';
		deleteBtn.style.width = '100%';
		deleteBtn.style.padding = '8px';
		deleteBtn.style.marginTop = '24px';
		deleteBtn.style.backgroundColor = '#ff6b6b';
		deleteBtn.style.border = 'none';
		deleteBtn.style.borderRadius = '4px';
		deleteBtn.style.color = '#fff';
		deleteBtn.style.fontSize = '12px';
		deleteBtn.style.cursor = 'pointer';
		deleteBtn.onclick = () => {

			deleteSelectedNode();

		};
		propertiesSection.appendChild( deleteBtn );

	}

	function updatePreviewMaterial() {

		if ( ! previewMesh || ! currentMaterial ) return;

		const nodeMaterialData = {
			type: 'NodeMaterial',
			nodes: {},
			connections: connections
		};
		nodes.forEach( node => { nodeMaterialData.nodes[ node.id ] = node; } );

		const generatedMaterial = generateMaterialFromNodes( nodeMaterialData );

		if ( generatedMaterial ) {

			if ( previewNodeMaterial && previewNodeMaterial !== generatedMaterial ) {

				previewNodeMaterial.dispose();

			}
			previewMesh.material = generatedMaterial;
			previewNodeMaterial = generatedMaterial;

		} else {

			previewMesh.material = previewMaterial;

		}

	}

	// Listen for material selection signals
	signals.materialChanged.add( function ( object, slot ) {

		if ( object && object.material ) {

			const material = Array.isArray( object.material ) ? object.material[ slot ] : object.material;
			
			// Check if it's a node material (has nodes property)
			if ( material && ( material.nodes || material.type === 'NodeMaterial' ) ) {

				// Material is node-based, could be opened in TSL editor
				console.log( '[TSLEditor] Node material detected:', material );

			}

		}

	} );

	return api;

}

export { TSLEditor };
