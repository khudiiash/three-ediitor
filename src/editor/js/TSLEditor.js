import { UIPanel, UIRow, UIText, UIButton, UIInput, UISelect, UIColor } from './libs/ui.js';
import * as THREE from 'three';
import { getCategories, createNodeConfig } from './tsl/nodes.js';
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
	
	// Preview references
	let previewRenderer = null;
	let previewScene = null;
	let previewMaterial = null;
	let previewMesh = null;

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

	function closeEditor() {

		if ( editorWindow ) {

			// Save before closing
			saveMaterial();
			
			// Force reload of the material asset
			if ( currentMaterial && currentMaterial.assetPath ) {

				const assetPath = currentMaterial.assetPath.startsWith( '/' ) 
					? currentMaterial.assetPath.slice( 1 ) 
					: currentMaterial.assetPath;
				
				// Wait for file to be written, then force asset reload
				setTimeout( async () => {

					// Get the material asset
					const materialAsset = editor.assets.getByUrl( assetPath );
					
					if ( materialAsset ) {

						console.log( '[TSLEditor] Reloading material asset:', assetPath );

						// Force the asset to reload from file by clearing cached data
						materialAsset.state = 'not_loaded';
						
						if ( materialAsset.data ) {

							delete materialAsset.data;

						}
						
						// Read the file content from disk
						const isTauri = typeof window.__TAURI__ !== 'undefined';
						const projectPath = editor.storage && editor.storage.getProjectPath ? editor.storage.getProjectPath() : null;
						
						if ( isTauri && projectPath ) {

							try {

								const invoke = window.__TAURI__.core.invoke;
								const fileBytes = await invoke( 'read_asset_file', {
									projectPath: projectPath,
									assetPath: assetPath
								} );
								
								// Convert bytes to string
								const decoder = new TextDecoder();
								const fileContent = decoder.decode( new Uint8Array( fileBytes ) );
								
								// Parse and update the material data
								const materialData = JSON.parse( fileContent );
								materialAsset.data = materialData;
								materialAsset.data.assetPath = assetPath;
								
								console.log( '[TSLEditor] Material reloaded from file:', materialData );
								
								// Trigger change event (use emitAsync for async listeners)
								console.log( '[TSLEditor] Emitting changed event on materialAsset...' );
								materialAsset.emitAsync( 'changed' ).then( () => {

									console.log( '[TSLEditor] Changed event emitted successfully' );

								} ).catch( err => {

									console.error( '[TSLEditor] Error emitting changed event:', err );

								} );
								
								// Force Asset Inspector to refresh by temporarily clearing selection
								if ( window.selectedAsset && window.selectedAsset.path ) {

									const selectedPath = window.selectedAsset.path.startsWith( '/' )
										? window.selectedAsset.path.slice( 1 )
										: window.selectedAsset.path;
									
									if ( selectedPath === assetPath ) {

										console.log( '[TSLEditor] Material is selected in Asset Inspector, forcing refresh...' );
										
										// Save the current selection
										const currentSelection = window.selectedAsset;
										
										// Clear selection to force update detection
										window.selectedAsset = null;
										
										// Restore selection after a short delay
										setTimeout( () => {

											window.selectedAsset = currentSelection;
											console.log( '[TSLEditor] Selection restored, Asset Inspector should update' );

										}, 50 );

									}

								}

							} catch ( err ) {

								console.error( '[TSLEditor] Failed to reload material:', err );

							}

						}
						
						// Trigger signals
						if ( editor.signals && editor.signals.assetFileChanged ) {

							editor.signals.assetFileChanged.dispatch( assetPath );

						}
						
						// Refresh the assets panel to update preview
						if ( window.selectedAsset && window.selectedAsset.path ) {

							const selectedPath = window.selectedAsset.path.startsWith( '/' )
								? window.selectedAsset.path.slice( 1 )
								: window.selectedAsset.path;
							
							if ( selectedPath === assetPath ) {

								// Re-select the asset to trigger preview update
								editor.signals.sceneGraphChanged.dispatch();

							}

						}

					}

				}, 150 ); // Increased delay to ensure file is written

			}

			// Remove keyboard listener
			document.removeEventListener( 'keydown', handleKeyDown );

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

		const canvas = document.createElement( 'canvas' );
		canvas.style.width = '100%';
		canvas.style.height = '100%';
		canvas.style.display = 'block';
		container.appendChild( canvas );

		nodeCanvas = canvas;

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

		// Create Three.js preview renderer
		previewRenderer = new THREE.WebGLRenderer( { antialias: true, alpha: true } );
		previewRenderer.setSize( 268, 200 );
		previewRenderer.setClearColor( 0x1a1a1a, 1 );
		previewContainer.appendChild( previewRenderer.domElement );

		// Setup preview scene
		previewScene = new THREE.Scene();
		const previewCamera = new THREE.PerspectiveCamera( 45, 268 / 200, 0.1, 1000 );
		previewCamera.position.set( 0, 0, 3 );

		const ambientLight = new THREE.AmbientLight( 0xffffff, 0.5 );
		previewScene.add( ambientLight );

		const directionalLight = new THREE.DirectionalLight( 0xffffff, 0.8 );
		directionalLight.position.set( 1, 1, 1 );
		previewScene.add( directionalLight );

		// Preview sphere
		const previewGeometry = new THREE.SphereGeometry( 1, 64, 64 );
		previewMaterial = new THREE.MeshStandardMaterial( {
			color: currentMaterial && currentMaterial.color !== undefined ? currentMaterial.color : 0xffffff,
			roughness: currentMaterial && currentMaterial.roughness !== undefined ? currentMaterial.roughness : 1,
			metalness: currentMaterial && currentMaterial.metalness !== undefined ? currentMaterial.metalness : 0
		} );
		previewMesh = new THREE.Mesh( previewGeometry, previewMaterial );
		previewScene.add( previewMesh );

		// Animate preview
		function animatePreview() {

			if ( ! editorWindow ) return;
			
			previewMesh.rotation.y += 0.005;
			previewRenderer.render( previewScene, previewCamera );
			requestAnimationFrame( animatePreview );

		}
		animatePreview();

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

		// Event listeners
		nodeCanvas.addEventListener( 'mousedown', onMouseDown );
		nodeCanvas.addEventListener( 'mousemove', onMouseMove );
		nodeCanvas.addEventListener( 'mouseup', onMouseUp );
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
				
				// Get node configuration from registry
				const nodeConfig = createNodeConfig( savedNode.type );
				
				const node = {
					id: id,
					type: savedNode.type,
					name: savedNode.name,
					color: savedNode.color || nodeConfig.color || '#4dabf7',
					x: savedNode.position.x,
					y: savedNode.position.y,
					width: savedNode.width || nodeConfig.width, // Use saved width or config width
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

		}

		// Always add a Material Output node if there isn't one
		const hasOutput = nodes.some( n => n.type.startsWith( 'output' ) );
		if ( ! hasOutput ) {

			const rect = nodeCanvas ? nodeCanvas.getBoundingClientRect() : { width: 800, height: 600 };
			// Default to MeshStandardMaterial output
			addNode( 'outputStandard', 'MeshStandardMaterial', '#ff6b6b', rect.width - 250, rect.height / 2 );

		}

	}

	function saveMaterial() {

		if ( ! currentMaterial ) return;

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

		// Update material
		currentMaterial.nodes = materialNodes;
		currentMaterial.connections = materialConnections;

		console.log( '[TSLEditor] Material data updated with nodes:', Object.keys( materialNodes ).length, 'connections:', materialConnections.length );
		console.log( '[TSLEditor] Material saved:', currentMaterial );

		// Save to file using assetPath or uuid
		const assetPath = currentMaterial.assetPath || currentMaterial.sourceFile;
		
		console.log( '[TSLEditor] Attempting to save to path:', assetPath );
		
		if ( assetPath ) {

			// Save directly to file
			const materialJSON = JSON.stringify( currentMaterial, null, '\t' );
			
			console.log( '[TSLEditor] Saving JSON, length:', materialJSON.length );
			
			// Use Tauri invoke to write the file
			const isTauri = typeof window.__TAURI__ !== 'undefined';
			const projectPath = editor.storage && editor.storage.getProjectPath ? editor.storage.getProjectPath() : null;
			
			if ( isTauri && projectPath ) {

				const invoke = window.__TAURI__.core.invoke;
				
				// Clean up the asset path
				let cleanPath = assetPath.startsWith( '/' ) ? assetPath.slice( 1 ) : assetPath;
				cleanPath = cleanPath.replace( /\/+/g, '/' );
				
				invoke( 'write_asset_file', {
					projectPath: projectPath,
					assetPath: cleanPath,
					content: Array.from( new TextEncoder().encode( materialJSON ) )
				} ).then( () => {

					console.log( '[TSLEditor] Material saved to file:', cleanPath );
					showAutosaveStatus( 'Saved' );
					
					// Update the file content in the asset system so it reloads correctly
					if ( window.updateFileContent ) {

						window.updateFileContent( assetPath, materialJSON );

					}

				} ).catch( err => {

					console.error( '[TSLEditor] Failed to save material:', err );
					showAutosaveStatus( 'Error saving', true );

				} );

			} else {

				console.warn( '[TSLEditor] Tauri not available or no project path, cannot save material' );
				showAutosaveStatus( 'Error: No project', true );

			}

		} else {

			console.warn( '[TSLEditor] No asset path found, cannot save material' );

		}

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

		// Update preview
		updatePreviewMaterial();

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

		// Restore context state
		ctx.restore();

	}

	// Helper function to get socket color based on type
	function getSocketColor( type ) {

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

		// Default to purple if type not found
		return colors[ type ] || { main: '#8b5cf6', border: '#5b21b6', glow: 'rgba(139, 92, 246, 0.3)' };

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

	function drawNodeContent( node, x, y, bodyStart ) {

		// Draw node-specific inline content
		if ( node.type === 'color' && node.properties.color ) {

			// Color preview box - positioned below the input socket
			const contentY = y + bodyStart + 24; // Below first socket
			ctx.fillStyle = node.properties.color;
			ctx.fillRect( x + 8, contentY, 20, 16 );
			ctx.strokeStyle = '#444';
			ctx.lineWidth = 1 / zoom;
			ctx.strokeRect( x + 8, contentY, 20, 16 );

			// Color label
			ctx.fillStyle = '#bbb';
			ctx.font = `${9}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
			ctx.textAlign = 'left';
			ctx.fillText( 'COLOR', x + 32, contentY + 11 );

		} else if ( node.type === 'float' && node.properties.value !== undefined ) {

			// Value display - positioned below the input socket
			const contentY = y + bodyStart + 24;
			ctx.fillStyle = '#bbb';
			ctx.font = `${10}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
			ctx.textAlign = 'left';
			ctx.fillText( `VALUE (${node.properties.value.toFixed( 2 )})`, x + 8, contentY );

		} else if ( node.type === 'int' && node.properties.value !== undefined ) {

			// Integer value display - positioned below the input socket
			const contentY = y + bodyStart + 24;
			ctx.fillStyle = '#bbb';
			ctx.font = `${10}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
			ctx.textAlign = 'left';
			ctx.fillText( `INDEX (${Math.floor( node.properties.value )})`, x + 8, contentY );

		} else if ( ( node.type === 'vec2' || node.type === 'vec3' || node.type === 'vec4' ) && node.properties ) {

			// Vector components display - positioned below input sockets
			const numInputs = node.inputs.length;
			const contentY = y + bodyStart + numInputs * 20 + 10; // Below all input sockets
			
			ctx.fillStyle = '#888';
			ctx.font = `${8}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
			ctx.textAlign = 'left';
			
			let vecText = '';
			if ( node.type === 'vec2' ) vecText = `(${node.properties.x?.toFixed( 2 ) || 0}, ${node.properties.y?.toFixed( 2 ) || 0})`;
			else if ( node.type === 'vec3' ) vecText = `(${node.properties.x?.toFixed( 1 ) || 0}, ${node.properties.y?.toFixed( 1 ) || 0}, ${node.properties.z?.toFixed( 1 ) || 0})`;
			else if ( node.type === 'vec4' ) vecText = `(${node.properties.x?.toFixed( 1 ) || 0}, ${node.properties.y?.toFixed( 1 ) || 0}, ${node.properties.z?.toFixed( 1 ) || 0}, ${node.properties.w?.toFixed( 1 ) || 0})`;
			
			ctx.fillText( vecText, x + 8, contentY );

		} else if ( node.type === 'uv' ) {

			// UV label display  
			ctx.fillStyle = '#888';
			ctx.font = `${9}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
			ctx.textAlign = 'left';
			ctx.fillText( 'INDEX (0)', x + 8, y + 39 );

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

		// Darken by 40% for better readability
		r = Math.floor( r * 0.6 );
		g = Math.floor( g * 0.6 );
		b = Math.floor( b * 0.6 );

		ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
		ctx.beginPath();
		ctx.roundRect( x, y, node.width, 24, [ 6, 6, 0, 0 ] );
		ctx.fill();

		// Node border
		ctx.strokeStyle = selectedNode === node ? '#6ba3ff' : '#2a2a2a';
		ctx.lineWidth = ( selectedNode === node ? 2 : 1 ) / zoom; // Adjust line width for zoom
		ctx.beginPath();
		ctx.roundRect( x, y, node.width, node.height, 6 );
		ctx.stroke();

		// Node title - compact header
		ctx.fillStyle = '#ffffff';
		ctx.font = `bold ${10}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
		ctx.textAlign = 'center';
		ctx.fillText( node.name, x + node.width / 2, y + 15 );

		// Variable name subtitle below title (if any)
		if ( node.subtitle ) {

			ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
			ctx.font = `${8}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
			ctx.fillText( node.subtitle, x + node.width / 2, y + 26 );

		}

		const bodyStart = 32; // Header height with padding
		const socketSize = 5; // Slightly larger sockets
		const socketSpacing = 20; // More spacing for better readability

		// Draw node-specific content (color preview, values, etc.)
		drawNodeContent( node, x, y, bodyStart );

		// Draw inputs on the left
		node.inputs.forEach( ( input, index ) => {

			const inputY = y + bodyStart + index * socketSpacing;
			const socketX = x + 1; // Inside the node edge
			
			// Check if this input is connected
			const isConnected = connections.some( c => 
				c.toNode === node.id && c.toInput === index
			);
			
			// Get socket color based on type (grey if not connected)
			const socketColor = isConnected ? getSocketColor( input.type ) : {
				main: '#4a4a4a',
				border: '#2a2a2a',
				glow: 'rgba(74, 74, 74, 0.2)'
			};
			
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

			// Input label (if any)
			if ( node.showLabels && input.label ) {

				ctx.fillStyle = '#9ca3af';
				ctx.font = `${9}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
				ctx.textAlign = 'left';
				ctx.fillText( input.label, x + 10, inputY + 3 );

			}

		} );

		// Draw outputs on the right
		node.outputs.forEach( ( output, index ) => {

			const outputY = y + bodyStart + index * socketSpacing;
			const socketX = x + node.width - 1; // Inside the node edge

			// Check if this output is connected
			const isConnected = connections.some( c => 
				c.fromNode === node.id && c.fromOutput === index
			);

			// Get socket color based on type (grey if not connected)
			const socketColor = isConnected ? getSocketColor( output.type ) : {
				main: '#4a4a4a',
				border: '#2a2a2a',
				glow: 'rgba(74, 74, 74, 0.2)'
			};

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

			// Output label (if any)
			if ( node.showLabels && output.label ) {

				ctx.fillStyle = '#9ca3af';
				ctx.font = `${9}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
				ctx.textAlign = 'right';
				ctx.fillText( output.label, x + node.width - 10, outputY + 3 );

			}

		} );

	}

	function drawConnection( conn ) {

		const fromNode = nodes.find( n => n.id === conn.fromNode );
		const toNode = nodes.find( n => n.id === conn.toNode );

		if ( ! fromNode || ! toNode ) return;

		const bodyStart = 32;
		const socketSpacing = 20;

		const fromY = fromNode.y + bodyStart + conn.fromOutput * socketSpacing;
		const toY = toNode.y + bodyStart + conn.toInput * socketSpacing;

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

			const bodyStart = 32;
			const socketSpacing = 20;

			// Check if clicking on output socket (now at node edge)
			for ( let j = 0; j < node.outputs.length; j ++ ) {

				const outputY = y + bodyStart + j * socketSpacing;
				const socketX = x + node.width - 1; // Updated position
				const dist = Math.sqrt( ( worldPos.x - socketX ) ** 2 + ( worldPos.y - outputY ) ** 2 );

				if ( dist < 12 / zoom ) {

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

				const inputY = y + bodyStart + j * socketSpacing;
				const socketX = x + 1; // Updated position
				const dist = Math.sqrt( ( worldPos.x - socketX ) ** 2 + ( worldPos.y - inputY ) ** 2 );

				if ( dist < 12 / zoom ) {

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

			const bodyStart = 32;
			const socketSpacing = 20;

			// Check if dropped on an input socket
			for ( let i = 0; i < nodes.length; i ++ ) {

				const node = nodes[ i ];
				const x = node.x;
				const y = node.y;

				for ( let j = 0; j < node.inputs.length; j ++ ) {

					const inputY = y + bodyStart + j * socketSpacing;
					const socketX = x + 1; // Updated position
					const dist = Math.sqrt( ( worldPos.x - socketX ) ** 2 + ( worldPos.y - inputY ) ** 2 );

					if ( dist < 15 / zoom ) {

						// Remove any existing connection to this input socket
						// (only one connection allowed per input)
						connections = connections.filter( conn => 
							! ( conn.toNode === node.id && conn.toInput === j )
						);

						// Create new connection
						connections.push( {
							fromNode: connectionStart.node.id,
							fromOutput: connectionStart.output,
							toNode: node.id,
							toInput: j
						} );
						updatePreviewMaterial(); // Update preview when connection made
						saveHistoryState();
						triggerAutosave();
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

		// Node-specific properties
		if ( node.type === 'color' && node.properties.color !== undefined ) {

			const colorLabel = document.createElement( 'div' );
			colorLabel.textContent = 'Color';
			colorLabel.style.fontSize = '11px';
			colorLabel.style.color = '#888';
			colorLabel.style.marginBottom = '4px';
			propertiesSection.appendChild( colorLabel );

			const colorInput = document.createElement( 'input' );
			colorInput.type = 'color';
			colorInput.value = node.properties.color;
			colorInput.style.width = '100%';
			colorInput.style.height = '32px';
			colorInput.style.border = '1px solid #2a2a2a';
			colorInput.style.borderRadius = '4px';
			colorInput.style.cursor = 'pointer';
			colorInput.onchange = () => {
				node.properties.color = colorInput.value;
				updatePreviewMaterial();
				saveHistoryState();
				triggerAutosave();
			};
			propertiesSection.appendChild( colorInput );

		}

		if ( node.type === 'float' && node.properties.value !== undefined ) {

			const valueLabel = document.createElement( 'div' );
			valueLabel.textContent = 'Value';
			valueLabel.style.fontSize = '11px';
			valueLabel.style.color = '#888';
			valueLabel.style.marginBottom = '4px';
			propertiesSection.appendChild( valueLabel );

			const valueInput = document.createElement( 'input' );
			valueInput.type = 'number';
			valueInput.value = node.properties.value;
			valueInput.step = '0.1';
			valueInput.style.width = '100%';
			valueInput.style.padding = '6px 8px';
			valueInput.style.backgroundColor = '#1a1a1a';
			valueInput.style.border = '1px solid #2a2a2a';
			valueInput.style.borderRadius = '4px';
			valueInput.style.color = '#ddd';
			valueInput.style.fontSize = '12px';
			valueInput.style.boxSizing = 'border-box';
			valueInput.onchange = () => {
				node.properties.value = parseFloat( valueInput.value );
				updatePreviewMaterial();
				saveHistoryState();
				triggerAutosave();
			};
			propertiesSection.appendChild( valueInput );

		}

		if ( node.type === 'int' && node.properties.value !== undefined ) {

			const valueLabel = document.createElement( 'div' );
			valueLabel.textContent = 'Value';
			valueLabel.style.fontSize = '11px';
			valueLabel.style.color = '#888';
			valueLabel.style.marginBottom = '4px';
			propertiesSection.appendChild( valueLabel );

			const valueInput = document.createElement( 'input' );
			valueInput.type = 'number';
			valueInput.value = node.properties.value;
			valueInput.step = '1';
			valueInput.style.width = '100%';
			valueInput.style.padding = '6px 8px';
			valueInput.style.backgroundColor = '#1a1a1a';
			valueInput.style.border = '1px solid #2a2a2a';
			valueInput.style.borderRadius = '4px';
			valueInput.style.color = '#ddd';
			valueInput.style.fontSize = '12px';
			valueInput.style.boxSizing = 'border-box';
			valueInput.onchange = () => {
				node.properties.value = parseInt( valueInput.value );
				updatePreviewMaterial();
				saveHistoryState();
				triggerAutosave();
			};
			propertiesSection.appendChild( valueInput );

		}

		if ( node.type === 'vec2' && node.properties.x !== undefined ) {

			// X value
			const xLabel = document.createElement( 'div' );
			xLabel.textContent = 'X';
			xLabel.style.fontSize = '11px';
			xLabel.style.color = '#888';
			xLabel.style.marginBottom = '4px';
			propertiesSection.appendChild( xLabel );

			const xInput = document.createElement( 'input' );
			xInput.type = 'number';
			xInput.value = node.properties.x;
			xInput.step = '0.1';
			xInput.style.width = '100%';
			xInput.style.padding = '6px 8px';
			xInput.style.backgroundColor = '#1a1a1a';
			xInput.style.border = '1px solid #2a2a2a';
			xInput.style.borderRadius = '4px';
			xInput.style.color = '#ddd';
			xInput.style.fontSize = '12px';
			xInput.style.marginBottom = '12px';
			xInput.style.boxSizing = 'border-box';
			xInput.onchange = () => {
				node.properties.x = parseFloat( xInput.value );
				updatePreviewMaterial();
				saveHistoryState();
				triggerAutosave();
			};
			propertiesSection.appendChild( xInput );

			// Y value
			const yLabel = document.createElement( 'div' );
			yLabel.textContent = 'Y';
			yLabel.style.fontSize = '11px';
			yLabel.style.color = '#888';
			yLabel.style.marginBottom = '4px';
			propertiesSection.appendChild( yLabel );

			const yInput = document.createElement( 'input' );
			yInput.type = 'number';
			yInput.value = node.properties.y;
			yInput.step = '0.1';
			yInput.style.width = '100%';
			yInput.style.padding = '6px 8px';
			yInput.style.backgroundColor = '#1a1a1a';
			yInput.style.border = '1px solid #2a2a2a';
			yInput.style.borderRadius = '4px';
			yInput.style.color = '#ddd';
			yInput.style.fontSize = '12px';
			yInput.style.boxSizing = 'border-box';
			yInput.onchange = () => {
				node.properties.y = parseFloat( yInput.value );
				updatePreviewMaterial();
				saveHistoryState();
				triggerAutosave();
			};
			propertiesSection.appendChild( yInput );

		}

		if ( node.type === 'vec3' && node.properties.x !== undefined ) {

			// X value
			const xLabel = document.createElement( 'div' );
			xLabel.textContent = 'X';
			xLabel.style.fontSize = '11px';
			xLabel.style.color = '#888';
			xLabel.style.marginBottom = '4px';
			propertiesSection.appendChild( xLabel );

			const xInput = document.createElement( 'input' );
			xInput.type = 'number';
			xInput.value = node.properties.x;
			xInput.step = '0.1';
			xInput.style.width = '100%';
			xInput.style.padding = '6px 8px';
			xInput.style.backgroundColor = '#1a1a1a';
			xInput.style.border = '1px solid #2a2a2a';
			xInput.style.borderRadius = '4px';
			xInput.style.color = '#ddd';
			xInput.style.fontSize = '12px';
			xInput.style.marginBottom = '12px';
			xInput.style.boxSizing = 'border-box';
			xInput.onchange = () => {
				node.properties.x = parseFloat( xInput.value );
				updatePreviewMaterial();
				saveHistoryState();
				triggerAutosave();
			};
			propertiesSection.appendChild( xInput );

			// Y value
			const yLabel = document.createElement( 'div' );
			yLabel.textContent = 'Y';
			yLabel.style.fontSize = '11px';
			yLabel.style.color = '#888';
			yLabel.style.marginBottom = '4px';
			propertiesSection.appendChild( yLabel );

			const yInput = document.createElement( 'input' );
			yInput.type = 'number';
			yInput.value = node.properties.y;
			yInput.step = '0.1';
			yInput.style.width = '100%';
			yInput.style.padding = '6px 8px';
			yInput.style.backgroundColor = '#1a1a1a';
			yInput.style.border = '1px solid #2a2a2a';
			yInput.style.borderRadius = '4px';
			yInput.style.color = '#ddd';
			yInput.style.fontSize = '12px';
			yInput.style.marginBottom = '12px';
			yInput.style.boxSizing = 'border-box';
			yInput.onchange = () => {
				node.properties.y = parseFloat( yInput.value );
				updatePreviewMaterial();
				saveHistoryState();
				triggerAutosave();
			};
			propertiesSection.appendChild( yInput );

			// Z value
			const zLabel = document.createElement( 'div' );
			zLabel.textContent = 'Z';
			zLabel.style.fontSize = '11px';
			zLabel.style.color = '#888';
			zLabel.style.marginBottom = '4px';
			propertiesSection.appendChild( zLabel );

			const zInput = document.createElement( 'input' );
			zInput.type = 'number';
			zInput.value = node.properties.z;
			zInput.step = '0.1';
			zInput.style.width = '100%';
			zInput.style.padding = '6px 8px';
			zInput.style.backgroundColor = '#1a1a1a';
			zInput.style.border = '1px solid #2a2a2a';
			zInput.style.borderRadius = '4px';
			zInput.style.color = '#ddd';
			zInput.style.fontSize = '12px';
			zInput.style.boxSizing = 'border-box';
			zInput.onchange = () => {
				node.properties.z = parseFloat( zInput.value );
				updatePreviewMaterial();
				saveHistoryState();
				triggerAutosave();
			};
			propertiesSection.appendChild( zInput );

		}

		if ( node.type === 'vec4' && node.properties.x !== undefined ) {

			// X value
			const xLabel = document.createElement( 'div' );
			xLabel.textContent = 'X';
			xLabel.style.fontSize = '11px';
			xLabel.style.color = '#888';
			xLabel.style.marginBottom = '4px';
			propertiesSection.appendChild( xLabel );

			const xInput = document.createElement( 'input' );
			xInput.type = 'number';
			xInput.value = node.properties.x;
			xInput.step = '0.1';
			xInput.style.width = '100%';
			xInput.style.padding = '6px 8px';
			xInput.style.backgroundColor = '#1a1a1a';
			xInput.style.border = '1px solid #2a2a2a';
			xInput.style.borderRadius = '4px';
			xInput.style.color = '#ddd';
			xInput.style.fontSize = '12px';
			xInput.style.marginBottom = '12px';
			xInput.style.boxSizing = 'border-box';
			xInput.onchange = () => {
				node.properties.x = parseFloat( xInput.value );
				updatePreviewMaterial();
				saveHistoryState();
				triggerAutosave();
			};
			propertiesSection.appendChild( xInput );

			// Y value
			const yLabel = document.createElement( 'div' );
			yLabel.textContent = 'Y';
			yLabel.style.fontSize = '11px';
			yLabel.style.color = '#888';
			yLabel.style.marginBottom = '4px';
			propertiesSection.appendChild( yLabel );

			const yInput = document.createElement( 'input' );
			yInput.type = 'number';
			yInput.value = node.properties.y;
			yInput.step = '0.1';
			yInput.style.width = '100%';
			yInput.style.padding = '6px 8px';
			yInput.style.backgroundColor = '#1a1a1a';
			yInput.style.border = '1px solid #2a2a2a';
			yInput.style.borderRadius = '4px';
			yInput.style.color = '#ddd';
			yInput.style.fontSize = '12px';
			yInput.style.marginBottom = '12px';
			yInput.style.boxSizing = 'border-box';
			yInput.onchange = () => {
				node.properties.y = parseFloat( yInput.value );
				updatePreviewMaterial();
				saveHistoryState();
				triggerAutosave();
			};
			propertiesSection.appendChild( yInput );

			// Z value
			const zLabel = document.createElement( 'div' );
			zLabel.textContent = 'Z';
			zLabel.style.fontSize = '11px';
			zLabel.style.color = '#888';
			zLabel.style.marginBottom = '4px';
			propertiesSection.appendChild( zLabel );

			const zInput = document.createElement( 'input' );
			zInput.type = 'number';
			zInput.value = node.properties.z;
			zInput.step = '0.1';
			zInput.style.width = '100%';
			zInput.style.padding = '6px 8px';
			zInput.style.backgroundColor = '#1a1a1a';
			zInput.style.border = '1px solid #2a2a2a';
			zInput.style.borderRadius = '4px';
			zInput.style.color = '#ddd';
			zInput.style.fontSize = '12px';
			zInput.style.marginBottom = '12px';
			zInput.style.boxSizing = 'border-box';
			zInput.onchange = () => {
				node.properties.z = parseFloat( zInput.value );
				updatePreviewMaterial();
				saveHistoryState();
				triggerAutosave();
			};
			propertiesSection.appendChild( zInput );

			// W value
			const wLabel = document.createElement( 'div' );
			wLabel.textContent = 'W';
			wLabel.style.fontSize = '11px';
			wLabel.style.color = '#888';
			wLabel.style.marginBottom = '4px';
			propertiesSection.appendChild( wLabel );

			const wInput = document.createElement( 'input' );
			wInput.type = 'number';
			wInput.value = node.properties.w;
			wInput.step = '0.1';
			wInput.style.width = '100%';
			wInput.style.padding = '6px 8px';
			wInput.style.backgroundColor = '#1a1a1a';
			wInput.style.border = '1px solid #2a2a2a';
			wInput.style.borderRadius = '4px';
			wInput.style.color = '#ddd';
			wInput.style.fontSize = '12px';
			wInput.style.boxSizing = 'border-box';
			wInput.onchange = () => {
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

		if ( ! previewMaterial || ! currentMaterial ) {

			console.log( '[TSLEditor] updatePreviewMaterial: missing previewMaterial or currentMaterial' );
			return;

		}

		// Create a temporary NodeMaterial data structure from current editor state
		const nodeMaterialData = {
			type: 'NodeMaterial',
			nodes: {},
			connections: connections
		};

		// Convert nodes array to nodes object (with numeric keys)
		nodes.forEach( node => {

			nodeMaterialData.nodes[ node.id ] = node;

		} );

		console.log( '[TSLEditor] updatePreviewMaterial: nodes:', Object.keys( nodeMaterialData.nodes ).length, 'connections:', connections.length );
		console.log( '[TSLEditor] connections:', connections );

		// Use the same material generation logic as the main editor
		const generatedMaterial = generateMaterialFromNodes( nodeMaterialData );
		
		console.log( '[TSLEditor] generatedMaterial:', generatedMaterial );
		
		if ( generatedMaterial ) {

			// Copy properties to preview material
			previewMaterial.color.copy( generatedMaterial.color );
			previewMaterial.roughness = generatedMaterial.roughness;
			previewMaterial.metalness = generatedMaterial.metalness;
			previewMaterial.needsUpdate = true;

			console.log( '[TSLEditor] Preview material updated. Color:', previewMaterial.color );

			// Clean up temporary material
			generatedMaterial.dispose();

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
