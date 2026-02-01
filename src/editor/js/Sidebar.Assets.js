import * as THREE from 'three';
import { UIPanel, UIRow, UIButton, UIText, UIInput, UISelect, UIBreak } from './libs/ui.js';
import { ScriptCompiler } from './ScriptCompiler.js';
import { ModelParser } from './ModelParser.js';
import { getAssetPreviewRenderer } from './AssetPreviewRenderer.js';
import { assetManager } from '@engine/three-engine.js';

import { Modal } from './Modal.js';
import { MaterialAsset, TextureAsset, AssetType } from '@engine/three-engine.js';
import { generateMaterialFromNodes } from './Editor.js';

	function getAssetTypeFromFile( file ) {
		const ext = file.name ? file.name.split( '.' ).pop()?.toLowerCase() : '';
		if ( file.type === 'material' || file.name.endsWith( '.mat' ) || file.name.endsWith( '.nodemat' ) ) {
			return AssetType.MATERIAL;
		}
		if ( file.type === 'texture' || [ 'jpg', 'jpeg', 'png', 'gif', 'webp', 'hdr', 'exr', 'tga', 'ktx2' ].includes( ext ) ) {
			return AssetType.TEXTURE;
		}
		if ( file.type === 'geometry' || file.name.endsWith( '.geo' ) ) {
			return AssetType.GEOMETRY;
		}
		if ( file.type === 'model' || file.name.endsWith( '.mesh' ) || [ 'glb', 'gltf', 'fbx', 'obj' ].includes( ext ) ) {
			return AssetType.MODEL;
		}
		if ( file.type === 'script' || [ 'ts', 'tsx', 'js', 'jsx' ].includes( ext ) ) {
			return AssetType.SCRIPT;
		}
		return AssetType.DATA;
	}

	function createAssetFromFile( file ) {
		const assetPath = file.path.startsWith( '/' ) ? file.path.slice( 1 ) : file.path;
		const assetName = file.name.replace( /\.[^/.]+$/, '' );
		const assetType = getAssetTypeFromFile( file );
		
		if ( assetType === AssetType.MATERIAL ) {
			let materialType = 'MeshStandardMaterial';
			if ( file.content ) {
				try {
					const materialData = JSON.parse( file.content );
					if ( materialData.type ) {
						materialType = materialData.type;
					}
				} catch ( e ) {
				}
			}
			return new MaterialAsset( assetName, assetPath, {
				name: assetName,
				path: assetPath,
				source: file.name,
				dateCreated: file.dateCreated || Date.now(),
				dateModified: file.dateModified || Date.now(),
				materialType: materialType
			} );
		}
		
		if ( assetType === AssetType.TEXTURE ) {
			return new TextureAsset( assetName, assetPath, {
				name: assetName,
				path: assetPath,
				source: file.name,
				dateCreated: file.dateCreated || Date.now(),
				dateModified: file.dateModified || Date.now(),
				width: file.metadata?.texture?.width,
				height: file.metadata?.texture?.height,
				colorSpace: file.metadata?.texture?.colorSpace,
				flipY: file.metadata?.texture?.flipY,
				generateMipmaps: file.metadata?.texture?.generateMipmaps,
				minFilter: file.metadata?.texture?.minFilter,
				magFilter: file.metadata?.texture?.magFilter,
				wrapS: file.metadata?.texture?.wrapS,
				wrapT: file.metadata?.texture?.wrapT,
				anisotropy: file.metadata?.texture?.anisotropy
			} );
		}
		
		return null;
	}

	async function registerAssetFromFile( file ) {
		if ( file.modelMaterial || file.modelTexture || file.modelGeometry || file.modelObject ) {
			return;
		}
		
		const assetPath = file.path.startsWith( '/' ) ? file.path.slice( 1 ) : file.path;
		const existingAsset = editor.assets.getByUrl( assetPath );
		if ( existingAsset ) {
			if ( existingAsset.state === 'not_loaded' ) {
				try {
					if ( file.content && existingAsset instanceof MaterialAsset ) {
						try {
						const materialData = JSON.parse( file.content );
						if ( materialData && materialData.type && materialData.type.includes( 'Material' ) ) {
							
							// Handle NodeMaterial - store as data, don't instantiate
							if ( materialData.type === 'NodeMaterial' ) {

								existingAsset.data = materialData;
								existingAsset.data.assetPath = assetPath;
								existingAsset.data.sourceFile = file.name;
								return;

							}

							const loader = new THREE.MaterialLoader();
								loader.setTextures( {} );
								let material = loader.parse( materialData );
								if ( !material ) {
									const objectLoader = new THREE.ObjectLoader();
									const parsed = objectLoader.parseMaterials( [ materialData ], {} );
									material = parsed && parsed.length > 0 ? parsed[ 0 ] : null;
								}
								if ( material ) {
									material.assetPath = assetPath;
									material.sourceFile = file.name;
									material.isMaterial = true;
									await existingAsset.setMaterial( material );
									editor.syncMaterialAssetToScene( existingAsset );
									return;
								}
							}
						} catch ( parseError ) {
							console.warn( '[Assets] Failed to parse material content, loading from file:', parseError );
						}
					}
					await editor.assets.load( existingAsset.id );
					if ( existingAsset instanceof MaterialAsset ) editor.syncMaterialAssetToScene( existingAsset );
				} catch ( error ) {
					console.warn( '[Assets] Failed to load existing asset:', assetPath, error );
				}
			}
			return;
		}
		
		const asset = createAssetFromFile( file );
		if ( asset ) {
			editor.assets.register( asset );
			try {
				if ( file.content && asset instanceof MaterialAsset ) {
					try {
						const materialData = JSON.parse( file.content );
						if ( materialData && materialData.type && materialData.type.includes( 'Material' ) ) {
							
							if ( materialData.type === 'NodeMaterial' ) {

								asset.data = materialData;
								asset.data.assetPath = assetPath;
								asset.data.sourceFile = file.name;
								return;

							}

							const loader = new THREE.MaterialLoader();
							loader.setTextures( {} );
							let material = loader.parse( materialData );
							if ( !material ) {
								const objectLoader = new THREE.ObjectLoader();
								const parsed = objectLoader.parseMaterials( [ materialData ], {} );
								material = parsed && parsed.length > 0 ? parsed[ 0 ] : null;
							}
							if ( !material && materialData.type ) {
								const MaterialClass = THREE[ materialData.type ];
								if ( MaterialClass ) {
									material = new MaterialClass();
									if ( materialData.color !== undefined ) material.color.setHex( materialData.color );
									if ( materialData.roughness !== undefined ) material.roughness = materialData.roughness;
									if ( materialData.metalness !== undefined ) material.metalness = materialData.metalness;
									if ( materialData.emissive !== undefined ) material.emissive.setHex( materialData.emissive );
									if ( materialData.name !== undefined ) material.name = materialData.name;
								}
							}
							if ( material ) {
								material.assetPath = assetPath;
								material.sourceFile = file.name;
								material.isMaterial = true;
								await asset.setMaterial( material );
								editor.syncMaterialAssetToScene( asset );
								return;
							}
						}
					} catch ( parseError ) {
						console.warn( '[Assets] Failed to parse material content, loading from file:', parseError );
					}
				}
				await editor.assets.load( asset.id );
				if ( asset instanceof MaterialAsset ) editor.syncMaterialAssetToScene( asset );
			} catch ( error ) {
				console.warn( '[Assets] Failed to load asset:', assetPath, error );
			}
		}
	}

	function unregisterAssetFromFile( file ) {
		const assetPath = file.path.startsWith( '/' ) ? file.path.slice( 1 ) : file.path;
		editor.assets.unregisterByUrl( assetPath );
	}

function SidebarAssets( editor ) {

	const signals = editor.signals;
	const strings = editor.strings;

	const container = new UIPanel();
	container.setId( 'assets-container' );
	container.addClass( 'assets-panel' );

	const headerBar = new UIRow();
	headerBar.setId( 'assets-header' );
	headerBar.addClass( 'assets-header' );

	const headerLeft = document.createElement( 'div' );
	headerLeft.className = 'assets-toolbar';

	const collapseBtn = document.createElement( 'button' );
	collapseBtn.className = 'btn btn-ghost btn-icon btn-sm';
	collapseBtn.textContent = '▼';
	headerLeft.appendChild( collapseBtn );

	const assetsTitle = new UIText( 'ASSETS' );
	assetsTitle.addClass( 'panel-title' );
	headerLeft.appendChild( assetsTitle.dom );

	const addBtn = new UIButton( '+' );
	addBtn.addClass( 'btn-icon btn-sm' );
	
	const addMenu = document.createElement( 'div' );
	addMenu.className = 'context-menu';
	
	const menuItems = [
		{ label: 'Script', action: 'script' },
		{ label: 'Folder', action: 'folder' },
		{ label: 'Import File...', action: 'import' }
	];
	
	menuItems.forEach( item => {
		const menuItem = document.createElement( 'div' );
		menuItem.className = 'context-menu-item';
		menuItem.textContent = item.label;
		menuItem.addEventListener( 'click', async () => {
			addMenu.classList.remove( 'active' );
			if ( item.action === 'script' ) {
				await createScriptAsset();
			} else if ( item.action === 'folder' ) {
				await createFolder();
			} else if ( item.action === 'import' ) {
				addAsset();
			}
		} );
		addMenu.appendChild( menuItem );
	} );
	
	addBtn.onClick( function ( event ) {
		const rect = addBtn.dom.getBoundingClientRect();
		addMenu.style.left = rect.left + 'px';
		addMenu.style.top = ( rect.bottom + 2 ) + 'px';
		addMenu.classList.toggle( 'active' );
		event.stopPropagation();
	} );
	
	document.addEventListener( 'click', function ( event ) {
		if ( !addMenu.contains( event.target ) && event.target !== addBtn.dom ) {
			addMenu.classList.remove( 'active' );
		}
	} );
	
	document.body.appendChild( addMenu );
	headerLeft.appendChild( addBtn.dom );

	const deleteBtn = document.createElement( 'button' );
	deleteBtn.className = 'btn btn-ghost btn-icon btn-sm';
	deleteBtn.innerHTML = '🗑️';
	deleteBtn.title = 'Delete';
	deleteBtn.addEventListener( 'click', function () {
		if ( window.selectedAsset ) {
			editor.deleteAsset( window.selectedAsset.path );
		}
	} );
	headerLeft.appendChild( deleteBtn );

	const undoBtn = document.createElement( 'button' );
	undoBtn.className = 'btn btn-ghost btn-icon btn-sm';
	undoBtn.innerHTML = '↶';
	undoBtn.title = 'Undo';
	headerLeft.appendChild( undoBtn );

	const headerCenter = document.createElement( 'div' );
	headerCenter.className = 'assets-header-center';

	const viewGridBtn = document.createElement( 'button' );
	viewGridBtn.innerHTML = '⊞';
	viewGridBtn.className = 'assets-view-btn';
	viewGridBtn.title = 'Grid View';
	headerCenter.appendChild( viewGridBtn );

	const viewListBtn = document.createElement( 'button' );
	viewListBtn.innerHTML = '☰';
	viewListBtn.className = 'assets-view-btn';
	viewListBtn.title = 'List View';
	headerCenter.appendChild( viewListBtn );

	const viewDetailedBtn = document.createElement( 'button' );
	viewDetailedBtn.innerHTML = '☷';
	viewDetailedBtn.className = 'assets-view-btn';
	viewDetailedBtn.title = 'Detailed View';
	headerCenter.appendChild( viewDetailedBtn );

	const filterSelect = new UISelect();
	filterSelect.setOptions( { 'all': 'All' } );
	filterSelect.setValue( 'all' );
	filterSelect.dom.style.marginLeft = 'var(--space-2)';
	headerCenter.appendChild( filterSelect.dom );

	const searchInput = new UIInput( '' );
	searchInput.dom.type = 'text';
	searchInput.dom.placeholder = 'Search';
	searchInput.addClass( 'input' );
	headerCenter.appendChild( searchInput.dom );

	const headerRight = document.createElement( 'div' );
	headerRight.className = 'assets-toolbar';

	const starBtn = document.createElement( 'button' );
	starBtn.className = 'btn btn-ghost btn-icon btn-sm';
	starBtn.innerHTML = '★';
	starBtn.title = 'Favorites';
	headerRight.appendChild( starBtn );

	const settingsText = new UIText( 'ASSET SETTINGS' );
	settingsText.addClass( 'text-xs text-tertiary' );
	headerRight.appendChild( settingsText.dom );

	headerBar.dom.appendChild( headerLeft );
	headerBar.dom.appendChild( headerCenter );
	headerBar.dom.appendChild( headerRight );

	container.add( headerBar );

	const contentArea = new UIPanel();
	contentArea.addClass( 'assets-content-area' );

	const folderPanel = new UIPanel();
	folderPanel.setId( 'assets-folders' );
	folderPanel.addClass( 'assets-folder-panel' );

	const folderTree = document.createElement( 'div' );
	folderTree.id = 'assets-folder-tree';
	folderTree.className = 'assets-folder-tree';
	folderPanel.dom.appendChild( folderTree );

	const filesPanel = new UIPanel();
	filesPanel.setId( 'assets-files' );
	filesPanel.addClass( 'assets-content' );

	const filesTable = document.createElement( 'table' );
	filesTable.id = 'assets-files-table';
	filesTable.className = 'assets-table';

	const tableHeader = document.createElement( 'thead' );
	tableHeader.className = 'assets-table-header';
	const headerRow = document.createElement( 'tr' );

	const nameHeader = document.createElement( 'th' );
	nameHeader.textContent = 'Name';
	nameHeader.className = 'assets-table-cell-name';

	const typeHeader = document.createElement( 'th' );
	typeHeader.textContent = 'Type';
	typeHeader.className = 'assets-table-cell-type';

	const sizeHeader = document.createElement( 'th' );
	sizeHeader.textContent = 'Size';
	sizeHeader.className = 'assets-table-cell-size';

	headerRow.appendChild( nameHeader );
	headerRow.appendChild( typeHeader );
	headerRow.appendChild( sizeHeader );
	tableHeader.appendChild( headerRow );
	filesTable.appendChild( tableHeader );

	const tableBody = document.createElement( 'tbody' );
	tableBody.id = 'assets-files-tbody';
	filesTable.appendChild( tableBody );

	filesPanel.dom.appendChild( filesTable );

	const filesTableBody = tableBody;

	const filesGrid = document.createElement( 'div' );
	filesGrid.id = 'assets-files-grid';
	filesGrid.className = 'assets-grid';
	filesPanel.dom.appendChild( filesGrid );

	const filesLargeGrid = document.createElement( 'div' );
	filesLargeGrid.id = 'assets-files-large-grid';
	filesLargeGrid.className = 'assets-grid assets-grid-large';
	filesPanel.dom.appendChild( filesLargeGrid);

	const dropZone = document.createElement( 'div' );
	dropZone.id = 'assets-drop-zone';
	dropZone.className = 'assets-drop-zone';
	filesPanel.dom.appendChild( dropZone );
	
	filesPanel.dom.classList.add( 'files-panel-relative' );
	filesPanel.dom.setAttribute('data-drop-zone', 'true');

	const contextMenu = new UIPanel();
	contextMenu.setId( 'assets-context-menu' );
	contextMenu.setPosition( 'fixed' );
	contextMenu.dom.className = 'context-menu';
	contextMenu.dom.style.display = 'none';
	document.body.appendChild( contextMenu.dom );

	function createMenuItem( text, onClick ) {

		const item = new UIRow();
		item.setClass( 'context-menu-item' );
		item.setTextContent( text );
		item.onClick( function () {
			onClick();
			hideContextMenu();
		} );
		return item;

	}

	const newFolderItem = createMenuItem( 'New Folder', async function () {
		await createNewFolder();
	} );

	const newAssetSubmenuTitle = new UIRow();
	newAssetSubmenuTitle.setClass( 'context-menu-item' );
	newAssetSubmenuTitle.addClass( 'submenu-title' );
	newAssetSubmenuTitle.setTextContent( 'New Asset' );

	const newAssetSubmenu = new UIPanel();
	newAssetSubmenu.setId( 'assets-submenu' );
	newAssetSubmenu.setPosition( 'fixed' );
	newAssetSubmenu.setClass( 'options' );
	newAssetSubmenu.setDisplay( 'none' );
	newAssetSubmenu.dom.className = 'options';
	newAssetSubmenu.dom.classList.add( 'submenu-hidden' );

	const assetTypes = [
		{ name: 'Upload', icon: '📤', action: () => addAsset() },
		{ name: 'CSS', icon: '📄', action: async () => await createAssetFile( 'css', '' ) },
		{ name: 'CubeMap', icon: '🌐', action: async () => await createAssetFile( 'cubemap', '' ) },
		{ name: 'HTML', icon: '🌐', action: async () => await createAssetFile( 'html', '' ) },
		{ name: 'JSON', icon: '📄', action: async () => await createAssetFile( 'json', '{}' ) },
		{ name: 'Material', icon: '🎨', action: async () => await createMaterialOfType( 'standard' ) },
		{ name: 'Node Material', icon: '🎨', action: async () => await createMaterialOfType( 'node' ) },
		{ name: 'Script', icon: '📜', action: async () => await createScriptAsset() },
		{ name: 'Shader', icon: '📄', action: async () => await createAssetFile( 'shader', '' ) },
		{ name: 'Text', icon: '📝', action: async () => await createAssetFile( 'txt', '' ) }
	];

	assetTypes.forEach( assetType => {
		const item = new UIRow();
		item.setClass( 'context-menu-item' );
		item.setTextContent( assetType.name );
		item.onClick( async function () {
			await assetType.action();
			hideContextMenu();
		} );
		newAssetSubmenu.add( item );
	} );

	let submenuTimeout;

	function showSubmenu() {
		clearTimeout( submenuTimeout );
		
		const menuRect = contextMenu.dom.getBoundingClientRect();
		const itemRect = newAssetSubmenuTitle.dom.getBoundingClientRect();
		const windowWidth = window.innerWidth;
		const windowHeight = window.innerHeight;
		
		newAssetSubmenu.dom.style.left = '-9999px';
		newAssetSubmenu.dom.style.top = '0px';
		newAssetSubmenu.dom.style.display = 'block';
		newAssetSubmenu.dom.classList.remove( 'submenu-hidden' );
		newAssetSubmenu.dom.classList.add( 'submenu-visible' );
		
		newAssetSubmenu.dom.offsetHeight;
		
		const submenuRect = newAssetSubmenu.dom.getBoundingClientRect();
		
		let left = menuRect.right + 2;
		let top = itemRect.top;
		
		if ( left + submenuRect.width > windowWidth ) {
			left = menuRect.left - submenuRect.width - 2;
			if ( left < 10 ) {
				left = 10;
			}
		}
		
		if ( top + submenuRect.height > windowHeight ) {
			top = windowHeight - submenuRect.height - 10;
		}
		
		if ( top < 10 ) {
			top = 10;
		}
		
		newAssetSubmenu.dom.style.left = left + 'px';
		newAssetSubmenu.dom.style.top = top + 'px';
	}

	newAssetSubmenuTitle.dom.addEventListener( 'mouseenter', showSubmenu );
	newAssetSubmenuTitle.dom.addEventListener( 'mouseover', showSubmenu );

	newAssetSubmenuTitle.dom.addEventListener( 'mouseleave', function () {
		submenuTimeout = setTimeout( function () {
			if ( ! newAssetSubmenu.dom.matches( ':hover' ) ) {
				newAssetSubmenu.dom.classList.remove( 'submenu-visible' );
				newAssetSubmenu.dom.classList.add( 'submenu-hidden' );
			}
		}, 150 );
	} );

	newAssetSubmenu.dom.addEventListener( 'mouseenter', function () {
		clearTimeout( submenuTimeout );
		newAssetSubmenu.dom.classList.remove( 'submenu-hidden' );
		newAssetSubmenu.dom.classList.add( 'submenu-visible' );
	} );

	newAssetSubmenu.dom.addEventListener( 'mouseleave', function () {
		newAssetSubmenu.dom.classList.remove( 'submenu-visible' );
		newAssetSubmenu.dom.classList.add( 'submenu-hidden' );
		newAssetSubmenu.dom.style.display = 'none';
	} );

	newAssetSubmenuTitle.add( newAssetSubmenu );
	
	document.body.appendChild( newAssetSubmenu.dom );
	
	contextMenu.add( newFolderItem );
	contextMenu.add( newAssetSubmenuTitle );

	const copyItem = createMenuItem( 'Copy', function () {
		console.log( 'Copy clicked' );
	} );

	const pasteItem = createMenuItem( 'Paste', function () {
		console.log( 'Paste clicked' );
	} );

	contextMenu.add( copyItem );
	contextMenu.add( pasteItem );

	function showContextMenu( x, y, asset = null ) {

		contextMenu.clear();
		contextMenu.add( newFolderItem );
		contextMenu.add( newAssetSubmenuTitle );

		if ( asset && asset.assetType ) {

			const extensions = editor.modules.getAssetMenuExtensions( asset.assetType );

			if ( extensions.length > 0 ) {

				const separator = new UIBreak();
				separator.dom.style.margin = '4px 0';
				separator.dom.style.borderTop = '1px solid #444';
				contextMenu.add( separator );

				extensions.forEach( ext => {

					const extItem = createMenuItem( `${ext.icon ? ext.icon + ' ' : ''}${ext.label}`, function () {

						ext.callback( asset );

					} );
					contextMenu.add( extItem );

				} );

			}

		}

		contextMenu.add( copyItem );
		contextMenu.add( pasteItem );

		contextMenu.dom.style.left = x + 'px';
		contextMenu.dom.style.top = y + 'px';
		contextMenu.dom.style.display = 'block';
		contextMenu.dom.classList.add( 'active' );

		const rect = contextMenu.dom.getBoundingClientRect();
		const windowWidth = window.innerWidth;
		const windowHeight = window.innerHeight;

		newAssetSubmenu.dom.style.display = 'block';
		const submenuRect = newAssetSubmenu.dom.getBoundingClientRect();
		newAssetSubmenu.dom.style.display = 'none';

		const submenuWidth = submenuRect.width;
		const menuWidth = rect.width;
		const totalWidth = menuWidth + submenuWidth + 2;

		let menuLeft = x;
		let menuTop = y;

		if ( menuLeft + totalWidth > windowWidth ) {
			menuLeft = windowWidth - totalWidth - 10;
			if ( menuLeft < 10 ) {
				menuLeft = 10;
			}
		}

		if ( menuTop + rect.height > windowHeight ) {
			menuTop = windowHeight - rect.height - 10;
		}

		if ( menuTop < 10 ) {
			menuTop = 10;
		}

		contextMenu.dom.style.left = menuLeft + 'px';
		contextMenu.dom.style.top = menuTop + 'px';

	}


	function hideContextMenu() {
		contextMenu.dom.classList.remove( 'active' );
		contextMenu.dom.style.display = 'none';
		newAssetSubmenu.dom.classList.remove( 'submenu-visible' );
		newAssetSubmenu.dom.classList.add( 'submenu-hidden' );
		newAssetSubmenu.dom.style.display = 'none';
	}

	container.dom.addEventListener( 'contextmenu', function ( event ) {

		event.preventDefault();
		event.stopPropagation();
		showContextMenu( event.clientX, event.clientY, selectedAsset );

	} );

	folderTree.addEventListener( 'contextmenu', function ( event ) {

		event.preventDefault();
		event.stopPropagation();
		showContextMenu( event.clientX, event.clientY, selectedAsset );

	} );

	filesTable.addEventListener( 'contextmenu', function ( event ) {

		event.preventDefault();
		event.stopPropagation();
		showContextMenu( event.clientX, event.clientY, selectedAsset );

	} );

	const handleLeftClick = function ( event ) {
		const target = event.target;
		const isClickOnItem = target.closest( '.asset-grid-item' ) || 
		                      target.closest( '.assets-table-row' ) || 
		                      target.closest( '.assets-folder-item' ) ||
		                      target.closest( '.context-menu' ) ||
		                      target.closest( 'button' ) ||
		                      target.closest( 'input' ) ||
		                      target.closest( 'select' );
		
		if ( !isClickOnItem && ( event.target === container.dom || 
		                         event.target === filesPanel.dom || 
		                         event.target === folderTree || 
		                         event.target === filesTable ||
		                         container.dom.contains( event.target ) ) ) {
			event.preventDefault();
			event.stopPropagation();
			showContextMenu( event.clientX, event.clientY, selectedAsset );
		}
	};

	container.dom.addEventListener( 'click', handleLeftClick );
	filesPanel.dom.addEventListener( 'click', handleLeftClick );
	folderTree.addEventListener( 'click', handleLeftClick );
	filesTable.addEventListener( 'click', handleLeftClick );

	document.addEventListener( 'click', function ( event ) {

		if ( ! contextMenu.dom.contains( event.target ) ) {
			hideContextMenu();
		}

	} );

	document.addEventListener( 'keydown', function ( event ) {

		if ( event.key === 'Escape' ) {
			hideContextMenu();
		}

	} );

	contentArea.add( folderPanel );
	contentArea.add( filesPanel );
	container.add( contentArea );

	let assetsRoot = {
		name: '/',
		path: '/',
		children: [],
		files: [],
		expanded: true
	};

	window.assetsRoot = assetsRoot;

	let currentFolder = assetsRoot;
	window.currentFolder = currentFolder;
	let viewMode = 'list'; 
	let selectedAsset = null;
	window.selectedAsset = selectedAsset;
	
	// Global preview cache: filePath -> dataUrl (200px, scaled down by CSS for thumbnails)
	const previewCache = new Map();
	window.assetPreviewCache = previewCache;
	
	// Store references to preview images for live updates: filePath -> Set of img elements
	const previewImageRefs = new Map();
	window.assetPreviewImageRefs = previewImageRefs;

	function getAssetType( filename ) {

		if ( filename.endsWith( '.mat' ) || filename.endsWith( '.nodemat' ) ) return 'material';
		if ( filename.endsWith( '.glb' ) || filename.endsWith( '.gltf' ) ) return 'model';
		if ( filename.endsWith( '.png' ) || filename.endsWith( '.jpg' ) || filename.endsWith( '.jpeg' ) ) return 'texture';
		if ( filename.endsWith( '.js' ) ) return 'script';
		return 'file';

	}
	const previewRenderer = getAssetPreviewRenderer();
	
	window.assetManager = assetManager;
	
	// Function to generate and cache material preview
	async function generateAndCacheMaterialPreview( file, material, size = 200 ) {

		const filePath = file.path;
		
		console.log( '[Preview Cache] Generating preview for:', filePath, 'size:', size );
		
		// Generate THREE.Material from NodeMaterial if needed
		let previewMaterial = material;
		if ( material && ( material.type === 'NodeMaterial' || material.isNodeMaterial ) ) {

			previewMaterial = generateMaterialFromNodes( material );
			if ( ! previewMaterial ) {

				console.warn( '[Preview Cache] Failed to generate material from nodes' );
				return null;

			}

		}
		
		// Render preview at requested size (always 200px for quality)
		const dataUrl = await previewRenderer.renderMaterialPreview( previewMaterial, size, size );
		
		if ( dataUrl ) {

			// Cache the preview
			previewCache.set( filePath, dataUrl );
			console.log( '[Preview Cache] Cached preview for:', filePath, 'Length:', dataUrl.length );
			
			// Store in file object too for persistence
			file.previewUrl = dataUrl;
			file.previewTimestamp = Date.now();
			
			// Update all existing img elements that reference this preview
			if ( previewImageRefs.has( filePath ) ) {

				const imgElements = previewImageRefs.get( filePath );
				
				imgElements.forEach( img => {

					if ( img && img.parentNode ) {

						// Only update if the element is still in the DOM
						img.src = dataUrl;

					}

				} );

			}

		}
		
		return dataUrl;

	}
	
	// Export for use in other modules
	window.generateAndCacheMaterialPreview = generateAndCacheMaterialPreview;
	
	function initializeDefaultAssets() {
		const defaultGeometries = [
			{ name: 'BoxGeometry', create: () => new THREE.BoxGeometry(1, 1, 1) },
			{ name: 'SphereGeometry', create: () => new THREE.SphereGeometry(0.5, 32, 16) },
			{ name: 'CylinderGeometry', create: () => new THREE.CylinderGeometry(0.5, 0.5, 1, 32) },
			{ name: 'PlaneGeometry', create: () => new THREE.PlaneGeometry(1, 1) },
			{ name: 'ConeGeometry', create: () => new THREE.ConeGeometry(0.5, 1, 32) },
			{ name: 'TorusGeometry', create: () => new THREE.TorusGeometry(0.5, 0.2, 16, 100) },
			{ name: 'TorusKnotGeometry', create: () => new THREE.TorusKnotGeometry(0.5, 0.15, 100, 16) },
			{ name: 'OctahedronGeometry', create: () => new THREE.OctahedronGeometry(0.5) },
			{ name: 'TetrahedronGeometry', create: () => new THREE.TetrahedronGeometry(0.5) },
			{ name: 'IcosahedronGeometry', create: () => new THREE.IcosahedronGeometry(0.5) },
			{ name: 'DodecahedronGeometry', create: () => new THREE.DodecahedronGeometry(0.5) },
			{ name: 'CapsuleGeometry', create: () => new THREE.CapsuleGeometry(0.5, 1, 4, 8) },
			{ name: 'CircleGeometry', create: () => new THREE.CircleGeometry(0.5, 32) },
			{ name: 'RingGeometry', create: () => new THREE.RingGeometry(0.3, 0.5, 32) }
		];
		
		defaultGeometries.forEach(({ name, create }) => {
			const geometry = create();
			assetManager.registerGeometry(`default/${name}`, geometry, {
				name,
				source: 'default',
				isDefault: true
			});
		});
		
		const defaultMaterials = [
			{ name: 'MeshBasicMaterial', create: () => new THREE.MeshBasicMaterial({ color: 0xffffff }) },
			{ name: 'MeshLambertMaterial', create: () => new THREE.MeshLambertMaterial({ color: 0xffffff }) },
			{ name: 'MeshPhongMaterial', create: () => new THREE.MeshPhongMaterial({ color: 0xffffff }) },
			{ name: 'MeshStandardMaterial', create: () => new THREE.MeshStandardMaterial({ color: 0xffffff }) },
			{ name: 'MeshPhysicalMaterial', create: () => new THREE.MeshPhysicalMaterial({ color: 0xffffff }) },
			{ name: 'MeshMatcapMaterial', create: () => new THREE.MeshMatcapMaterial({ color: 0xffffff }) },
			{ name: 'MeshToonMaterial', create: () => new THREE.MeshToonMaterial({ color: 0xffffff }) },
			{ name: 'MeshNormalMaterial', create: () => new THREE.MeshNormalMaterial() },
			{ name: 'MeshDepthMaterial', create: () => new THREE.MeshDepthMaterial() },
			{ name: 'LineBasicMaterial', create: () => new THREE.LineBasicMaterial({ color: 0xffffff }) },
			{ name: 'LineDashedMaterial', create: () => new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 3, gapSize: 1 }) },
			{ name: 'PointsMaterial', create: () => new THREE.PointsMaterial({ color: 0xffffff, size: 1 }) },
			{ name: 'SpriteMaterial', create: () => new THREE.SpriteMaterial({ color: 0xffffff }) },
			{ name: 'ShadowMaterial', create: () => new THREE.ShadowMaterial({ color: 0x000000 }) }
	];
		
		defaultMaterials.forEach(({ name, create }) => {
			const material = create();
			assetManager.registerMaterial(`default/${name}`, material, {
				name,
				source: 'default',
				isDefault: true
			});
		});
		
	}
	
	function initializeUserAssets() {
		function traverseFolder(folder) {
			folder.files.forEach(file => {
				if (file.modelContents) {
					const modelPath = file.path;
					assetManager.registerParsedModel(modelPath, file.modelContents);
				}
				
				if (file.type === 'material' && file.modelMaterial) {
					const matId = file.path;
							const matName = file.modelMaterial.name || file.name.replace( /\.(mat|nodemat)$/, '' );
					if (file.modelMaterial.material) {
						assetManager.registerMaterial(matId, file.modelMaterial.material, {
							name: matName,
							path: file.path,
							modelPath: file.modelPath,
							source: 'user'
						});
					}
				}
				
				if (file.type === 'geometry' && file.modelGeometry) {
					const geoId = file.path;
					const geoName = file.modelGeometry.name || file.name.replace( /\.geo$/, '' );
					if (file.modelGeometry.geometry) {
						assetManager.registerGeometry(geoId, file.modelGeometry.geometry, {
							name: geoName,
							path: file.path,
							modelPath: file.modelPath,
							source: 'user'
						});
					}
				}
				
				if (file.type === 'model' && file.modelObject) {
					const modelId = file.path;
					assetManager.registerModel(modelId, file.modelObject, {
						name: file.name.replace(/\.(model|mesh)$/, ''),
						path: file.path,
						modelPath: file.modelPath,
						source: 'user'
					});
				}
			});
			
			if (folder.children) {
				folder.children.forEach(child => traverseFolder(child));
			}
		}
		
		if (window.assetsRoot) {
			traverseFolder(window.assetsRoot);
		}
		
	}
	
	window.initializeAssetManager = function() {
		assetManager.clear();
	async function refreshAssets() {
		if ( isTauri && invoke ) {
			const projectPath = editor.storage && editor.storage.getProjectPath ? editor.storage.getProjectPath() : null;
			if ( projectPath ) {
				await syncFilesystemWithMetadata();
				refreshFolderTree();
				refreshFiles();
			}
		} else if ( ! assetsDatabase ) {
			return;
		} else {
			await loadAssets();
		}
	}

	window.refreshAssets = refreshAssets;

	initializeDefaultAssets();
	initializeUserAssets();
	};
	
	const isTauri = typeof window !== 'undefined' && window.__TAURI__;
	const assetsDBName = 'threejs-editor-assets';
	const assetsDBVersion = 1;
	let assetsDatabase;
	
	const invoke = isTauri ? window.__TAURI__.core.invoke : null;

	function buildFolderTree( folder, parentElement, level = 0 ) {

		const folderItem = document.createElement( 'div' );
		folderItem.className = 'assets-folder-item';
		folderItem.style.paddingLeft = `${level * 16 + 8}px`;
		folderItem.dataset.path = folder.path;

		
		const expandIcon = document.createElement( 'span' );
		expandIcon.className = 'assets-folder-expand-icon';
		const hasChildren = folder.children.length > 0 || folder.files.length > 0;
		expandIcon.textContent = hasChildren ? ( folder.expanded ? '−' : '+' ) : ' ';
		folderItem.appendChild( expandIcon );

		
		const icon = document.createElement( 'span' );
		icon.textContent = '📁';
		folderItem.appendChild( icon );

		
		const name = document.createElement( 'span' );
		name.textContent = folder.name;
		folderItem.appendChild( name );

		
		folderItem.addEventListener( 'click', function ( e ) {

			
			const hasChildren = folder.children.length > 0 || folder.files.length > 0;
			if ( ( e.target === expandIcon || e.target === icon || e.target === folderItem ) && hasChildren ) {
				folder.expanded = ! folder.expanded;
				refreshFolderTree();
				currentFolder = folder;
				window.currentFolder = currentFolder;
				refreshFiles();
				return;
			}

			
			{
				Array.from( folderTree.querySelectorAll( '.assets-folder-item' ) ).forEach( item => {
					item.classList.remove( 'active' );
				} );

				folderItem.classList.add( 'active' );
				currentFolder = folder;
				window.currentFolder = currentFolder;
				refreshFiles();
			}

		} );

		parentElement.appendChild( folderItem );

		
		if ( folder.expanded ) {
			folder.children.forEach( child => {
				buildFolderTree( child, parentElement, level + 1 );
			} );
		}

	}

	
	function refreshFolderTree() {

		folderTree.innerHTML = '';
		buildFolderTree( assetsRoot, folderTree );

		
		const currentItem = folderTree.querySelector( `[data-path="${currentFolder.path}"]` );
		if ( currentItem ) {
			currentItem.classList.add( 'active' );
		}

	}

	
	function formatFileSize( bytes ) {

		if ( bytes === 0 ) return '0 B';
		const k = 1024;
		const sizes = [ 'B', 'KB', 'MB', 'GB' ];
		const i = Math.floor( Math.log( bytes ) / Math.log( k ) );
		return Math.round( bytes / Math.pow( k, i ) * 100 ) / 100 + ' ' + sizes[ i ];

	}

	async function createAssetPreview( file, size = 128 ) {
		if ( !file || !file.name ) {
			return null;
		}
		
		const thumbnail = document.createElement( 'div' );
		thumbnail.className = 'asset-thumbnail-container';
		thumbnail.style.width = `${size}px`;
		thumbnail.style.height = `${size}px`;
		thumbnail.style.borderRadius = 'var(--radius-sm)';

		let texture = file.modelTexture && file.modelTexture.texture;
		
		if ( !texture && file.type === 'texture' && file.modelPath ) {
			const cachedModel = assetManager.getParsedModel( file.modelPath );
			if ( cachedModel && cachedModel.textures ) {
				const texName = file.name.replace( '.texture', '' );
				const texEntry = cachedModel.textures.find( t => t.name === texName );
				if ( texEntry && texEntry.texture ) {
					texture = texEntry.texture;
				}
			}
		}
		
		if ( texture && texture.image ) {
			if ( texture.image ) {
				const img = document.createElement( 'img' );
				if ( texture.image instanceof Image || texture.image instanceof HTMLImageElement ) {
					img.src = texture.image.src;
				} else if ( texture.image instanceof HTMLCanvasElement ) {
					img.src = texture.image.toDataURL();
				} else {
					try {
						const tempCanvas = document.createElement( 'canvas' );
						tempCanvas.width = texture.image.width || size;
						tempCanvas.height = texture.image.height || size;
						const tempCtx = tempCanvas.getContext( '2d' );
						tempCtx.drawImage( texture.image, 0, 0 );
						img.src = tempCanvas.toDataURL();
					} catch ( e ) {
						thumbnail.appendChild(createFileBadge(file.name, size));
						return thumbnail;
					}
				}
				
				img.className = 'asset-thumbnail-img-cover';
				img.onerror = () => {
					thumbnail.innerHTML = '';
					thumbnail.appendChild(createFileBadge(file.name, size));
				};
				thumbnail.appendChild( img );
				return thumbnail;
			}
		}

		const ext = file.name ? file.name.split( '.' ).pop()?.toLowerCase() : '';
		const isImageFile = file.type === 'texture' || 
		                   file.type === 'image' || 
		                   [ 'jpg', 'jpeg', 'png', 'gif', 'webp', 'hdr', 'exr', 'tga', 'ktx2' ].includes( ext );

		if ( isImageFile ) {
			let imageSrc = file.url || file.content;
			
			if ( !imageSrc && invoke && editor.storage && editor.storage.getProjectPath ) {
				try {
					const projectPath = editor.storage.getProjectPath();
					if ( projectPath ) {
						let assetPath = file.path;
						if ( assetPath.startsWith( '/' ) ) assetPath = assetPath.slice( 1 );
						
						const fileBytes = await invoke( 'read_asset_file', {
							projectPath: projectPath,
							assetPath: assetPath
						} );
						
						const blob = new Blob( [ new Uint8Array( fileBytes ) ] );
						imageSrc = URL.createObjectURL( blob );
						file.url = imageSrc;
					}
				} catch ( e ) {
					console.warn( '[Preview] Failed to load image from file system:', e );
				}
			}
			
			if ( imageSrc ) {
				const img = document.createElement( 'img' );
				img.src = imageSrc;
				img.className = 'asset-thumbnail-img-cover';
				img.onerror = () => {
					thumbnail.innerHTML = '';
					thumbnail.appendChild(createFileBadge(file.name, size));
				};
				thumbnail.appendChild( img );
				return thumbnail;
			}
		}

		if ( file.type === 'material' ) {
			try {
				const assetPath = file.path.startsWith( '/' ) ? file.path.slice( 1 ) : file.path;
				const materialAsset = editor.assets.getByUrl( assetPath );
				
				// Check cache first
				const cachedPreview = previewCache.get( file.path );
				
				if ( cachedPreview ) {

					console.log( '[createAssetPreview] Using cached preview for:', file.path );
					const img = document.createElement( 'img' );
					img.src = cachedPreview;
					img.className = 'asset-thumbnail-img-contain';
					thumbnail.appendChild( img );
					
					// Register this img element for live updates
					if ( ! previewImageRefs.has( file.path ) ) {

						previewImageRefs.set( file.path, new Set() );

					}
					previewImageRefs.get( file.path ).add( img );
					
					// Add "NODES" badge for NodeMaterials
					if ( file.name.endsWith( '.nodemat' ) ) {

						const badge = document.createElement( 'div' );
						badge.style.cssText = `
							position: absolute;
							bottom: 4px;
							right: 4px;
							background: rgba(139, 92, 246, 0.9);
							color: white;
							padding: 2px 6px;
							border-radius: 4px;
							font-size: 10px;
							font-weight: 600;
						`;
						badge.textContent = 'NODES';
						thumbnail.style.position = 'relative';
						thumbnail.appendChild( badge );

					}
					
					return thumbnail;

				}
				
				if ( materialAsset && materialAsset instanceof MaterialAsset ) {
					let assetMaterial = materialAsset.getMaterial();
					
					if ( ! assetMaterial && file.content ) {
						
						try {
							const materialData = JSON.parse( file.content );
							if ( materialData.type === 'NodeMaterial' ) {
								materialAsset.data = materialData;
								materialAsset.data.assetPath = assetPath;
								assetMaterial = materialAsset.data;
								console.log( '[createAssetPreview] Loaded NodeMaterial from file:', assetMaterial );

							}

						} catch ( e ) {

							console.error( '[createAssetPreview] Failed to parse material:', e );

						}

					}
					
					if ( assetMaterial && ( assetMaterial.type === 'NodeMaterial' || assetMaterial.isNodeMaterial ) ) {

						console.log( '[createAssetPreview] NodeMaterial detected in assets panel' );

						// Generate and cache preview (at 200px, scaled by CSS)
						const dataUrl = await generateAndCacheMaterialPreview( file, assetMaterial, 200 );
						
						if ( dataUrl ) {

							const img = document.createElement( 'img' );
							img.src = dataUrl;
							img.className = 'asset-thumbnail-img-contain';
							thumbnail.appendChild( img );
							
							// Register this img element for live updates
							if ( ! previewImageRefs.has( file.path ) ) {

								previewImageRefs.set( file.path, new Set() );

							}
							previewImageRefs.get( file.path ).add( img );
							
							// Add "NODES" badge overlay
							const badge = document.createElement( 'div' );
							badge.style.cssText = `
								position: absolute;
								bottom: 4px;
								right: 4px;
								background: rgba(139, 92, 246, 0.9);
								color: white;
								padding: 2px 6px;
								border-radius: 4px;
								font-size: 10px;
								font-weight: 600;
							`;
							badge.textContent = 'NODES';
							thumbnail.style.position = 'relative';
							thumbnail.appendChild( badge );
							
							// Note: Live updates now handled by previewImageRefs system
							// No need for materialAsset.on('changed') listener here
							
							return thumbnail;

						} else {

							// Fallback to badge if material generation fails
							thumbnail.appendChild( createFileBadge( file.name, size ) );
							
							const badge = document.createElement( 'div' );
							badge.style.cssText = `
								position: absolute;
								bottom: 4px;
								right: 4px;
								background: #8b5cf6;
								color: white;
								padding: 2px 6px;
								border-radius: 4px;
								font-size: 10px;
								font-weight: 600;
							`;
							badge.textContent = 'NODES';
							thumbnail.style.position = 'relative';
							thumbnail.appendChild( badge );
							
							return thumbnail;

						}

					} else if ( assetMaterial ) {

						const dataUrl = await previewRenderer.renderMaterialPreview( assetMaterial, size, size );
						const img = document.createElement( 'img' );
						img.src = dataUrl;
						img.className = 'asset-thumbnail-img-contain';
						thumbnail.appendChild( img );
						
						materialAsset.on( 'changed', async function onMaterialAssetChanged() {
							try {
								const updatedMaterial = materialAsset.getMaterial();
								if ( updatedMaterial ) {
									const newDataUrl = await previewRenderer.renderMaterialPreview( updatedMaterial, size, size );
									img.src = newDataUrl;
								}
							} catch ( error ) {
								console.warn( '[Preview] Failed to update material preview:', error );
							}
						} );
						
						return thumbnail;

					}
				}
				
				let material = file.modelMaterial && file.modelMaterial.material;
				
				if ( !material && file.modelPath ) {
					let cachedModel = assetManager.getParsedModel( file.modelPath );

					if ( !cachedModel ) {
						const projectPath = editor.storage && editor.storage.getProjectPath ? editor.storage.getProjectPath() : null;
						if ( projectPath && invoke ) {
							try {
								let modelPathToLoad = file.modelPath;
								
								if ( !modelPathToLoad.match( /\.(glb|gltf|fbx|obj)$/i ) ) {
									const folderName = file.modelName || modelPathToLoad.split( '/' ).pop();
									modelPathToLoad = modelPathToLoad + '/' + folderName;
								}
								
								const modelContents = await ModelParser.parseModel( modelPathToLoad, file.modelName || file.name, projectPath );
								if ( modelContents ) {
									assetManager.registerParsedModel( file.modelPath, modelContents );
									if (file.modelPath !== modelPathToLoad) {
										assetManager.registerParsedModel( modelPathToLoad, modelContents );
									}
									cachedModel = modelContents;
								}
							} catch ( error ) {
								console.warn('[Preview] Failed to load model for preview:', error);
							}
						}
					}
					
					if ( cachedModel && cachedModel.materials ) {
						const matName = file.name.replace( /\.(mat|nodemat)$/, '' );
						const matEntry = cachedModel.materials.find( m => m.name === matName );
						if ( matEntry && matEntry.material ) {
							material = matEntry.material;
						}
					}
				}
				
				if ( material && material instanceof THREE.Material ) {
					const dataUrl = await previewRenderer.renderMaterialPreview( material, size, size );
					const img = document.createElement( 'img' );
					img.src = dataUrl;
					img.className = 'asset-thumbnail-img-contain';
					thumbnail.appendChild( img );
					return thumbnail;
				}
				
				const projectPath = editor.storage && editor.storage.getProjectPath ? editor.storage.getProjectPath() : null;
				if ( projectPath && invoke ) {
					let assetPath = file.path;
					if ( assetPath.startsWith( '/' ) ) assetPath = assetPath.slice( 1 );
					
					const fileBytes = await invoke( 'read_asset_file', {
						projectPath: projectPath,
						assetPath: assetPath
					} );
					const materialContent = new TextDecoder().decode( new Uint8Array( fileBytes ) );
					
					const dataUrl = await previewRenderer.renderMaterialPreview( materialContent, size, size );
					const img = document.createElement( 'img' );
					img.src = dataUrl;
					img.className = 'asset-thumbnail-img-contain';
					thumbnail.appendChild( img );
					return thumbnail;
				}
			} catch ( error ) {
				console.warn( '[Preview] Failed to render material preview:', error );
			}
		}

		if ( file.type === 'geometry' ) {
			try {
				let geometry = file.modelGeometry && file.modelGeometry.geometry;
				
				if ( !geometry && file.modelPath ) {
					const cachedModel = assetManager.getParsedModel( file.modelPath );
					if ( cachedModel && cachedModel.geometries ) {
						const geoName = file.name.replace( /\.geo$/, '' );
						const geoEntry = cachedModel.geometries.find( g => g.name === geoName );
						if ( geoEntry && geoEntry.geometry ) {
							geometry = geoEntry.geometry;
						}
					}
				}
				
				if ( geometry && geometry instanceof THREE.BufferGeometry ) {
					const dataUrl = await previewRenderer.renderGeometryPreview( geometry, size, size );
					const img = document.createElement( 'img' );
					img.src = dataUrl;
					img.className = 'asset-thumbnail-img-contain';
					thumbnail.appendChild( img );
					return thumbnail;
				}
				
				const projectPath = editor.storage && editor.storage.getProjectPath ? editor.storage.getProjectPath() : null;
				if ( projectPath && invoke ) {
					let assetPath = file.path;
					if ( assetPath.startsWith( '/' ) ) assetPath = assetPath.slice( 1 );
					
					const fileBytes = await invoke( 'read_asset_file', {
						projectPath: projectPath,
						assetPath: assetPath
					} );
					const geometryContent = new TextDecoder().decode( new Uint8Array( fileBytes ) );
					
					const dataUrl = await previewRenderer.renderGeometryPreview( geometryContent, size, size );
					const img = document.createElement( 'img' );
					img.src = dataUrl;
					img.className = 'asset-thumbnail-img-contain';
					thumbnail.appendChild( img );
					return thumbnail;
				}
			} catch ( error ) {
				console.warn( '[Preview] Failed to render geometry preview:', error );
			}
		}

		if ( file.type === 'model' || file.modelPath ) {
			try {
			let model = file.modelObject || (file.modelContents && file.modelContents.model);

			if ( !model && file.modelPath ) {
				model = assetManager.getModel( file.modelPath );
				}
				
				if ( model && model instanceof THREE.Object3D ) {
					const dataUrl = await previewRenderer.renderModelPreview( model, size, size );
					const img = document.createElement( 'img' );
					img.src = dataUrl;
					img.className = 'asset-thumbnail-img-contain';
					thumbnail.appendChild( img );
					return thumbnail;
				}
				
				thumbnail.appendChild(createFileBadge(file.name, size));
				return thumbnail;
			} catch ( error ) {
				console.warn( '[Preview] Failed to render model preview:', error );
				thumbnail.appendChild(createFileBadge(file.name, size));
				return thumbnail;
			}
		}

		thumbnail.appendChild(createFileBadge(file.name, size));
		return thumbnail;
	}

	async function createGridItem( file, size = 120 ) {
		const item = document.createElement( 'div' );
		item.className = 'asset-grid-item';
		item.dataset.file = file.name;
		item.dataset.path = file.path;
		item.draggable = true;

		const thumbnailContainer = document.createElement( 'div' );
		thumbnailContainer.className = 'asset-grid-item-thumbnail';
		
		thumbnailContainer.appendChild(createFileBadge(file.name, size - 16));
		item.appendChild( thumbnailContainer );

		(async () => {
			try {
				const thumbnail = await createAssetPreview( file, size - 16 );
				if ( thumbnail ) {
					thumbnailContainer.innerHTML = '';
					thumbnailContainer.appendChild( thumbnail );
				} else {
					thumbnailContainer.innerHTML = '';
					thumbnailContainer.appendChild(createFileBadge(file.name, size - 16));
				}
			} catch ( error ) {
				console.error( '[Assets] Failed to create preview for', file.name, error );
				thumbnailContainer.innerHTML = '';
				thumbnailContainer.appendChild(createFileBadge(file.name, size - 16));
			}
		})();

		const name = document.createElement( 'div' );
		name.className = 'asset-grid-item-name';
		name.textContent = file.name;
		item.appendChild( name );

		item.addEventListener( 'click', function ( e ) {
			document.querySelectorAll( '#assets-files-grid > div, #assets-files-large-grid > div' ).forEach( r => {
				r.classList.remove( 'selected' );
			} );
			item.classList.add( 'selected' );
			selectedAsset = { 
				type: 'file', 
				assetType: getAssetType( file.name ),
				path: file.path, 
				name: file.name, 
				folder: currentFolder 
			};
			window.selectedAsset = selectedAsset;
		} );

		item.addEventListener( 'dragstart', function ( e ) {
			e.dataTransfer.effectAllowed = 'copy';
			item.classList.remove( 'asset-item-normal' );
			item.classList.add( 'asset-item-dragging' );
			const ext = file.name ? file.name.split( '.' ).pop()?.toLowerCase() : '';
			const assetData = {
				path: file.path,
				name: file.name,
				type: file.type || 'file',
				extension: ext,
				url: file.url || null,
				content: file.content || null,
				modelPath: file.modelPath || null,
				modelName: file.modelName || null
			};
			try {
				e.dataTransfer.setData( 'text/plain', JSON.stringify( assetData ) );
			} catch ( error ) {
				console.error( '[Assets] Failed to serialize asset data:', error );
			}
		} );

		item.addEventListener( 'dragend', function ( e ) {
			item.classList.remove( 'asset-item-dragging' );
			item.classList.add( 'asset-item-normal' );
		} );

		item.addEventListener( 'dblclick', function ( e ) {
			e.stopPropagation();
			openFile( file.path );
		} );

		return item;
	}

	
	function refreshFiles() {
		if ( ! filesTableBody ) {
			return;
		}
		
		if ( ! currentFolder ) {
			return;
		}
		
		filesTableBody.innerHTML = '';
		if ( filesGrid ) filesGrid.innerHTML = '';
		if ( filesLargeGrid ) filesLargeGrid.innerHTML = '';
		
		if ( viewMode === 'list' ) {
			filesTable.style.display = 'table';
			if ( filesGrid ) filesGrid.style.display = 'none';
			if ( filesLargeGrid ) filesLargeGrid.style.display = 'none';
		} else if ( viewMode === 'grid' ) {
			filesTable.style.display = 'none';
			if ( filesGrid ) {
				filesGrid.style.display = 'grid';
				filesGrid.classList.remove( 'assets-grid-large' );
			}
			if ( filesLargeGrid ) filesLargeGrid.style.display = 'none';
		} else if ( viewMode === 'large-grid' ) {
			filesTable.style.display = 'none';
			if ( filesGrid ) filesGrid.style.display = 'none';
			if ( filesLargeGrid ) {
				filesLargeGrid.style.display = 'grid';
				filesLargeGrid.classList.add( 'assets-grid-large' );
			}
		}

		if ( currentFolder.children ) {
			currentFolder.children.forEach( folder => {
				if ( viewMode === 'list' ) {
					createFolderRow( folder );
				} else {
					createFolderGridItem( folder );
				}
			} );
		}

		if ( ! currentFolder.files ) {
			currentFolder.files = [];
		}
		
		const filesToShow = currentFolder.files.filter( file => {
			if ( file.name.endsWith( '.js' ) || file.name.endsWith( '.jsx' ) ) {
				const baseName = file.name.replace( /\.jsx?$/, '' );
				const hasCorrespondingTs = currentFolder.files.some( f => {
					const fBase = f.name.replace( /\.tsx?$/, '' );
					return fBase === baseName && ( f.name.endsWith( '.ts' ) || f.name.endsWith( '.tsx' ) );
				} );
				return !hasCorrespondingTs;
			}
			return true;
		} );
		
		if ( viewMode === 'list' ) {
			filesToShow.forEach( file => {
				createListRow( file );
			} );
		} else {
			const previewSize = viewMode === 'large-grid' ? 200 : 120;
			const gridContainer = viewMode === 'large-grid' ? filesLargeGrid : filesGrid;
			
			if ( gridContainer ) {
				Promise.all( filesToShow.map( async ( file ) => {
					try {
						const item = await createGridItem( file, previewSize );
						gridContainer.appendChild( item );
					} catch ( error ) {
						console.error( '[Assets] Failed to create grid item for', file.name, error );
						const fallbackItem = document.createElement( 'div' );
						fallbackItem.style.cssText = `
							display: flex;
							flex-direction: column;
							align-items: center;
							padding: 8px;
							background: #1e1e1e;
							border: 2px solid transparent;
							border-radius: 4px;
						`;
						fallbackItem.textContent = file.name;
						gridContainer.appendChild( fallbackItem );
					}
				} ) );
			} else {
				console.error( '[Assets] Grid container is null!' );
			}
		}

	}

	function createFolderRow( folder ) {
		const row = document.createElement( 'tr' );
		row.className = 'assets-table-row';
		row.dataset.path = folder.path;

		const nameCell = document.createElement( 'td' );
		nameCell.className = 'assets-table-cell-name';
		
		const icon = document.createElement( 'span' );
		icon.textContent = '📁';
		nameCell.appendChild( icon );
		
		const nameSpan = document.createElement( 'span' );
		nameSpan.className = 'assets-table-cell-name-text';
		nameSpan.textContent = folder.name;
		nameCell.appendChild( nameSpan );

		const typeCell = document.createElement( 'td' );
		typeCell.className = 'assets-table-cell-type';
		typeCell.textContent = 'Folder';

		const sizeCell = document.createElement( 'td' );
		sizeCell.className = 'assets-table-cell-size';
		sizeCell.textContent = '';

		row.appendChild( nameCell );
		row.appendChild( typeCell );
		row.appendChild( sizeCell );

		let clickTimeout = null;
		row.addEventListener( 'click', function ( e ) {
			if ( clickTimeout ) {
				clearTimeout( clickTimeout );
				clickTimeout = null;
				currentFolder = folder;
				window.currentFolder = currentFolder;
				selectedAsset = null;
				window.selectedAsset = null;
				refreshFolderTree();
				refreshFiles();
				return;
			}
			clickTimeout = setTimeout( function () {
				clickTimeout = null;
				document.querySelectorAll( '#assets-files-tbody tr' ).forEach( r => {
					r.classList.remove( 'selected' );
				} );
				row.classList.add( 'selected' );
				selectedAsset = { type: 'folder', path: folder.path, name: folder.name, folder: currentFolder };
				window.selectedAsset = selectedAsset;
			}, 300 );
		} );

		filesTableBody.appendChild( row );
	}

	function createFolderGridItem( folder ) {
		const previewSize = viewMode === 'large-grid' ? 200 : 120;
		const gridContainer = viewMode === 'large-grid' ? filesLargeGrid : filesGrid;
		
		const item = document.createElement( 'div' );
		item.className = 'asset-grid-item';
		item.dataset.path = folder.path;

		const thumbnail = document.createElement( 'div' );
		thumbnail.className = 'asset-grid-item-thumbnail';
		thumbnail.textContent = '📁';
		thumbnail.style.fontSize = '48px';
		item.appendChild( thumbnail );

		const name = document.createElement( 'div' );
		name.className = 'asset-grid-item-name';
		name.textContent = folder.name;
		item.appendChild( name );

		let clickTimeout = null;
		item.addEventListener( 'click', function ( e ) {
			if ( clickTimeout ) {
				clearTimeout( clickTimeout );
				clickTimeout = null;
				currentFolder = folder;
				window.currentFolder = currentFolder;
				selectedAsset = null;
				window.selectedAsset = null;
				refreshFolderTree();
				refreshFiles();
				return;
			}
			clickTimeout = setTimeout( function () {
				clickTimeout = null;
				document.querySelectorAll( '#assets-files-grid > div, #assets-files-large-grid > div' ).forEach( r => {
					r.style.background = '';
					r.style.borderColor = 'transparent';
				} );
				item.style.background = '#444';
				item.style.borderColor = '#ff8800';
				selectedAsset = { type: 'folder', path: folder.path, name: folder.name, folder: currentFolder };
				window.selectedAsset = selectedAsset;
			}, 300 );
		} );

		item.addEventListener( 'mouseenter', function () {
			if ( selectedAsset === null || selectedAsset.path !== folder.path ) {
				item.style.background = '#333';
			}
		} );

		item.addEventListener( 'mouseleave', function () {
			if ( selectedAsset === null || selectedAsset.path !== folder.path ) {
				item.style.background = '#1e1e1e';
			} else {
				item.style.background = '#444';
			}
		} );

		gridContainer.appendChild( item );
	}

	function createListRow( file ) {

		// Ensure file has a type set based on extension
		if ( ! file.type || file.type === 'file' ) {

			const ext = file.name ? file.name.split( '.' ).pop()?.toLowerCase() : '';
			if ( file.name.endsWith( '.mat' ) || file.name.endsWith( '.nodemat' ) ) {

				file.type = 'material';

			} else if ( [ 'jpg', 'jpeg', 'png', 'gif', 'webp', 'hdr', 'exr', 'tga', 'ktx2' ].includes( ext ) ) {

				file.type = 'texture';

			} else if ( [ 'ts', 'tsx', 'js', 'jsx' ].includes( ext ) ) {

				file.type = 'script';

			} else if ( [ 'glb', 'gltf', 'fbx', 'obj' ].includes( ext ) ) {

				file.type = 'model';

			}

		}

		const row = document.createElement( 'tr' );
		row.className = 'assets-table-row';
		row.draggable = true;
		row.dataset.file = file.name;
		row.dataset.path = file.path;

		const nameCell = document.createElement( 'td' );
		nameCell.className = 'assets-table-cell-name';
		
		const thumbnailContainer = document.createElement( 'span' );
		thumbnailContainer.className = 'assets-table-thumbnail';
		thumbnailContainer.appendChild(createFileBadge(file.name, 24));
		
		(async () => {
			try {
				const thumbnail = await createAssetPreview( file, 24 );
				if ( thumbnail ) {
					const img = thumbnail.querySelector( 'img' );
					if ( img ) {
						thumbnailContainer.innerHTML = '';
						img.style.cssText = 'width: 24px; height: 24px; object-fit: cover; display: block;';
						thumbnailContainer.appendChild( img );
					} else {
						if ( thumbnail.children.length > 0 ) {
							thumbnailContainer.innerHTML = '';
							Array.from( thumbnail.children ).forEach( child => {
								thumbnailContainer.appendChild( child.cloneNode( true ) );
							} );
						}
					}
				}
			} catch ( error ) {
				console.error( '[Assets] Failed to create list preview for', file.name, error );
			}
		})();
		
		const nameSpan = document.createElement( 'span' );
		nameSpan.className = 'assets-table-cell-name-text';
		nameSpan.textContent = file.name;
		nameCell.appendChild( thumbnailContainer );
		nameCell.appendChild( nameSpan );

		const typeCell = document.createElement( 'td' );
		typeCell.className = 'assets-table-cell-type';
		typeCell.textContent = file.type || 'File';

		const sizeCell = document.createElement( 'td' );
		sizeCell.className = 'assets-table-cell-size';
		
		const sizeText = document.createElement( 'span' );
		sizeText.textContent = formatFileSize( file.size || 0 );
		sizeCell.appendChild( sizeText );

		const isScript = file.type === 'script' || file.name.endsWith( '.ts' ) || file.name.endsWith( '.tsx' ) || file.name.endsWith( '.js' );

		row.appendChild( nameCell );
		row.appendChild( typeCell );
		row.appendChild( sizeCell );

		let isDragging = false;
		
		row.addEventListener( 'mousedown', function ( e ) {
			isDragging = false;
		} );
		
		row.addEventListener( 'dragstart', function ( e ) {
			isDragging = true;
			e.dataTransfer.effectAllowed = 'copy';
			row.style.opacity = '0.5';
			const ext = file.name ? file.name.split( '.' ).pop()?.toLowerCase() : '';
			const assetData = {
				path: file.path,
				name: file.name,
				type: file.type || 'file',
				extension: ext,
				url: file.url || null,
				content: file.content || null,
				modelPath: file.modelPath || null,
				modelName: file.modelName || null
			};
			try {
				e.dataTransfer.setData( 'text/plain', JSON.stringify( assetData ) );
			} catch ( error ) {
				console.error( '[Assets] Failed to serialize asset data:', error );
			}
		} );
		
		row.addEventListener( 'dragend', function ( e ) {
			isDragging = false;
			row.style.opacity = '1';
		} );
		
		row.addEventListener( 'click', function ( e ) {
			if ( isDragging ) {
				isDragging = false;
				return;
			}
			document.querySelectorAll( '#assets-files-tbody tr' ).forEach( r => {
				r.classList.remove( 'selected' );
			} );
			row.classList.add( 'selected' );
			selectedAsset = { 
				type: 'file', 
				assetType: getAssetType( file.name ),
				path: file.path, 
				name: file.name, 
				folder: currentFolder 
			};
			window.selectedAsset = selectedAsset;
		} );
		
		row.addEventListener( 'dblclick', function ( e ) {
			e.stopPropagation();
			openFile( file.path );
		} );

		filesTableBody.appendChild( row );
	}

	async function openFile( filePath ) {
		if ( !isTauri || !invoke ) return;
		
		const projectPath = editor.storage && editor.storage.getProjectPath ? editor.storage.getProjectPath() : null;
		if ( !projectPath ) return;
		
		let assetPath = filePath;
		if ( assetPath.startsWith( '/' ) ) {
			assetPath = assetPath.slice( 1 );
		}
		assetPath = assetPath.replace( /\/+/g, '/' );
		
		try {
			await invoke( 'open_file', {
				projectPath: projectPath,
				assetPath: assetPath
			} );
		} catch ( error ) {
			console.warn( '[Assets] Failed to open file:', error );
		}
	}

	
	function createFileBadge( filename, size = 60 ) {
		const ext = (filename.split('.').pop() || 'FILE').toUpperCase();
		
		const colorMap = {
			'GLB': '#667eea',
			'GLTF': '#667eea',
			'FBX': '#764ba2',
			'OBJ': '#f093fb',
			'JPG': '#4facfe',
			'JPEG': '#4facfe',
			'PNG': '#43e97b',
			'GIF': '#fa709a',
			'WEBP': '#30cfd0',
			'MP3': '#a8edea',
			'WAV': '#fed6e3',
			'OGG': '#c471ed',
			'MP4': '#f77062',
			'WEBM': '#fe5196',
			'JSON': '#ffa726',
			'JS': '#ffd93d',
			'TS': '#3b82f6',
			'CSS': '#ec4899',
			'HTML': '#f97316',
			'TXT': '#94a3b8'
		};
		
		const color1 = colorMap[ext] || '#667eea';
		const color2 = colorMap[ext] ? adjustColor(colorMap[ext], -20) : '#764ba2';
		
		const width = size * 0.7;
		const height = size;
		
		const container = document.createElement('div');
		container.style.cssText = `
			width: ${width}px;
			height: ${height}px;
			background: linear-gradient(135deg, ${color1} 0%, ${color2} 100%);
			border-radius: ${width * 0.12}px;
			display: flex;
			align-items: center;
			justify-content: center;
			color: white;
			font-weight: bold;
			position: relative;
		`;
		
		const extBadge = document.createElement('div');
		extBadge.style.cssText = `
			position: absolute;
			bottom: ${height * 0.08}px;
			left: 50%;
			transform: translateX(-50%);
			background: rgba(0, 0, 0, 0.75);
			color: white;
			padding: ${height * 0.03}px ${width * 0.15}px;
			border-radius: ${width * 0.15}px;
			font-size: ${height * 0.12}px;
			font-weight: 600;
			letter-spacing: 0.5px;
		`;
		extBadge.textContent = ext.length > 4 ? ext.substring(0, 4) : ext;
		
		container.appendChild(extBadge);
		return container;
	}
	
	function adjustColor(color, amount) {
		const num = parseInt(color.replace('#', ''), 16);
		const r = Math.max(0, Math.min(255, (num >> 16) + amount));
		const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
		const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
		return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
	}
	
	function getFileIcon( filename ) {
		const ext = filename.split( '.' ).pop()?.toLowerCase();
		const icons = {
			'jpg': '🖼️',
			'jpeg': '🖼️',
			'png': '🖼️',
			'gif': '🖼️',
			'webp': '🖼️',
			'glb': '🎨',
			'gltf': '🎨',
			'obj': '🎨',
			'fbx': '🎨',
			'mp3': '🎵',
			'wav': '🎵',
			'ogg': '🎵',
			'mp4': '🎬',
			'webm': '🎬',
			'json': '📄',
			'js': '📜',
			'ts': '📜',
			'css': '🎨',
			'html': '🌐',
			'txt': '📝'
		};
		return icons[ ext ] || '📄';
	}

	
	function handleDragOver( event ) {
		event.preventDefault();
		event.stopPropagation();
		event.dataTransfer.dropEffect = 'copy';
		dropZone.style.display = 'block';
	}

	function handleDragLeave( event ) {
		event.preventDefault();
		event.stopPropagation();
		if ( ! filesPanel.dom.contains( event.relatedTarget ) ) {
			dropZone.style.display = 'none';
		}
	}

	filesPanel.dom.addEventListener( 'dragover', handleDragOver, true );
	filesTable.addEventListener( 'dragover', handleDragOver, true );
	tableBody.addEventListener( 'dragover', handleDragOver, true );

	filesPanel.dom.addEventListener( 'dragleave', handleDragLeave, true );
	filesTable.addEventListener( 'dragleave', handleDragLeave, true );
	tableBody.addEventListener( 'dragleave', handleDragLeave, true );

	function handleDrop( event ) {
		event.preventDefault();
		event.stopPropagation();
		event.stopImmediatePropagation();
		dropZone.style.display = 'none';

		const files = event.dataTransfer.files;

		if ( files.length > 0 ) {

			Array.from( files ).forEach( file => {

				const objectURL = URL.createObjectURL( file );
				const ext = file.name.split( '.' ).pop()?.toLowerCase();
				const isModel = [ 'glb', 'gltf', 'fbx', 'obj' ].includes( ext );

				
				let normalizedPath = currentFolder.path;
				if ( normalizedPath === '/' ) {
					normalizedPath = '';
				} else if ( normalizedPath.endsWith( '/' ) ) {
					normalizedPath = normalizedPath.slice( 0, -1 );
				}
				const filePath = normalizedPath + '/' + file.name;
				
				const fileEntry = {
					name: file.name,
					url: objectURL,
					path: filePath,
					size: file.size,
					type: file.type || 'File',
					isBinary: file.type.startsWith( 'image/' ) || file.type.startsWith( 'audio/' ) || file.type.startsWith( 'video/' ) || isModel
				};

				
				if ( isModel ) {
					const arrayBufferReader = new FileReader();
					arrayBufferReader.onload = async function( arrayBufferEvent ) {
						const arrayBuffer = arrayBufferEvent.target.result;
						
						
						const dataUrlReader = new FileReader();
						dataUrlReader.onload = async function( dataUrlEvent ) {
							fileEntry.content = dataUrlEvent.target.result;
							
							try {
								const projectPath = editor.storage && editor.storage.getProjectPath ? editor.storage.getProjectPath() : null;
								const isTauri = typeof window !== 'undefined' && window.__TAURI__ && window.__TAURI__.core && window.__TAURI__.core.invoke;
								const invoke = isTauri ? window.__TAURI__.core.invoke : null;
								
								let modelContents = null;
								
								if ( ext === 'glb' || ext === 'gltf' ) {
									const { GLTFLoader } = await import( 'three/addons/loaders/GLTFLoader.js' );
									const { DRACOLoader } = await import( 'three/addons/loaders/DRACOLoader.js' );
									const { KTX2Loader } = await import( 'three/addons/loaders/KTX2Loader.js' );
									const { MeshoptDecoder } = await import( 'three/addons/libs/meshopt_decoder.module.js' );

									const dracoLoader = new DRACOLoader();
									dracoLoader.setDecoderPath( '../examples/jsm/libs/draco/gltf/' );

									const ktx2Loader = new KTX2Loader();
									ktx2Loader.setTranscoderPath( '../examples/jsm/libs/basis/' );

									if ( editor.signals ) {
										editor.signals.rendererDetectKTX2Support.dispatch( ktx2Loader );
									}

									const loader = new GLTFLoader();
									loader.setDRACOLoader( dracoLoader );
									loader.setKTX2Loader( ktx2Loader );
									loader.setMeshoptDecoder( MeshoptDecoder );

									modelContents = await new Promise( ( resolve, reject ) => {
										let parseData;
										if ( ext === 'glb' ) {
											parseData = arrayBuffer;
										} else {
											parseData = new TextDecoder().decode( new Uint8Array( arrayBuffer ) );
										}
										
										loader.parse( parseData, '', ( result ) => {
											const scene = result.scene;
											const contents = {
												geometries: [],
												textures: [],
												materials: [],
												model: scene,
												scenes: result.scenes || [],
												animations: result.animations || [],
												gltf: result
											};

											
											const geometryMap = new Map();
											const textureMap = new Map();
											const materialMap = new Map();

											scene.traverse( ( child ) => {
												if ( child.isMesh && child.geometry ) {
													const geoName = child.geometry.name || `Geometry_${geometryMap.size}`;
													if ( ! geometryMap.has( geoName ) ) {
														geometryMap.set( geoName, {
															name: geoName,
															geometry: child.geometry,
															uuid: THREE.MathUtils.generateUUID()
														} );
													}
												}

												if ( child.isMesh && child.material ) {
													const materials = Array.isArray( child.material ) ? child.material : [ child.material ];
													materials.forEach( ( material ) => {
														const matName = material.name || `Material_${materialMap.size}`;
														if ( ! materialMap.has( matName ) ) {
															materialMap.set( matName, {
																name: matName,
																material: material,
																uuid: THREE.MathUtils.generateUUID()
															} );
														}

														const textureProps = [ 'map', 'normalMap', 'roughnessMap', 'metalnessMap', 
															'aoMap', 'emissiveMap', 'displacementMap', 'alphaMap', 'envMap', 
															'lightMap', 'clearcoatMap', 'clearcoatNormalMap', 'clearcoatRoughnessMap',
															'sheenColorMap', 'sheenRoughnessMap', 'specularColorMap', 'specularIntensityMap',
															'transmissionMap', 'thicknessMap', 'iridescenceMap', 'iridescenceThicknessMap' ];
														
														textureProps.forEach( ( prop ) => {
															const texture = material[ prop ];
															if ( texture && texture.isTexture ) {
																const texName = texture.name || `Texture_${textureMap.size}`;
																if ( ! textureMap.has( texName ) ) {
																	textureMap.set( texName, {
																		name: texName,
																		texture: texture,
																		uuid: THREE.MathUtils.generateUUID()
																	} );
																}
															}
														} );
													} );
												}
											} );

											contents.geometries = Array.from( geometryMap.values() );
											contents.textures = Array.from( textureMap.values() );
											contents.materials = Array.from( materialMap.values() );

											if ( loader.dracoLoader ) loader.dracoLoader.dispose();
											if ( loader.ktx2Loader ) loader.ktx2Loader.dispose();

											resolve( contents );
										}, ( error ) => {
											reject( error );
										} );
									} );
								} else if ( ext === 'fbx' ) {
									modelContents = await ModelParser.parseFBX( new Uint8Array( arrayBuffer ), filePath, file.name );
								} else if ( ext === 'obj' ) {
									modelContents = await ModelParser.parseOBJ( new Uint8Array( arrayBuffer ), filePath, file.name );
								}

								if ( modelContents ) {
									
									const baseName = file.name.replace( /\.(glb|gltf|fbx|obj)$/i, '' );
									const modelFolder = {
										name: file.name,
										path: filePath,
										type: 'folder',
										expanded: false,
										files: [],
										children: []
									};
									
									modelContents.geometries.forEach( geo => {
										modelFolder.files.push( {
											name: geo.name + '.geo',
											path: modelFolder.path + '/' + geo.name + '.geo',
											type: 'geometry',
											size: 0,
											isBinary: false,
											modelGeometry: geo,
											modelPath: null,
											modelName: file.name
										} );
									} );
									
									modelContents.textures.forEach( tex => {
										modelFolder.files.push( {
											name: tex.name + '.texture',
											path: modelFolder.path + '/' + tex.name + '.texture',
											type: 'texture',
											size: 0,
											isBinary: true,
											modelTexture: tex,
											modelPath: null,
											modelName: file.name
										} );
									} );
									
									modelContents.materials.forEach( mat => {
										const materialFile = {
											name: mat.name + '.mat',
											path: modelFolder.path + '/' + mat.name + '.mat',
											type: 'material',
											size: 0,
											isBinary: false,
											modelMaterial: mat,
											modelPath: null,
											modelName: file.name
										};
										modelFolder.files.push( materialFile );
									} );
									
									
									modelFolder.files.push( {
										name: baseName + '.mesh',
										path: modelFolder.path + '/' + baseName + '.mesh',
										type: 'model',
										size: file.size || 0,
										isBinary: true,
										modelObject: modelContents.model,
										modelPath: null,
										modelName: file.name,
										modelContents: modelContents
									} );
									
									
									fileEntry.path = modelFolder.path + '/' + file.name;
									const glbPath = fileEntry.path;
									modelFolder.files.push( fileEntry );
									
									const existingFolder = currentFolder.children.find( f => f.path === modelFolder.path );
									if ( !existingFolder ) {
										currentFolder.children.push( modelFolder );
										if ( currentFolder.path === '/' || currentFolder.path === '' ) {
											currentFolder.files = currentFolder.files.filter( f => {
												if ( f.name === file.name && /\.(glb|gltf|fbx|obj)$/i.test( f.name ) ) {
													return false;
												}
												return true;
											} );
										}
									}
									
									assetManager.registerParsedModel( glbPath, modelContents );
									modelFolder.files.forEach( f => {
										if ( f.modelPath === null || f.modelPath === filePath ) {
											f.modelPath = glbPath;
										}
									} );
									
									if ( projectPath && isTauri && invoke ) {
										const base64Data = fileEntry.content.split( ',' )[ 1 ] || fileEntry.content;
										const byteCharacters = atob( base64Data );
										const byteNumbers = new Array( byteCharacters.length );
										for ( let i = 0; i < byteCharacters.length; i ++ ) {
											byteNumbers[ i ] = byteCharacters.charCodeAt( i );
										}
										const fileContent = Array.from( new Uint8Array( byteNumbers ) );
										
										let assetPath = fileEntry.path;
										if ( assetPath.startsWith( '/' ) ) {
											assetPath = assetPath.slice( 1 );
										}
										assetPath = assetPath.replace( /\/+/g, '/' );
										
										await invoke( 'write_asset_file', {
											projectPath: projectPath,
											assetPath: assetPath,
											content: fileContent
										} );
									}
								} else {
									
									currentFolder.files.push( fileEntry );
									
									if ( projectPath && isTauri && invoke ) {
										const base64Data = fileEntry.content.split( ',' )[ 1 ] || fileEntry.content;
										const byteCharacters = atob( base64Data );
										const byteNumbers = new Array( byteCharacters.length );
										for ( let i = 0; i < byteCharacters.length; i ++ ) {
											byteNumbers[ i ] = byteCharacters.charCodeAt( i );
										}
										const fileContent = Array.from( new Uint8Array( byteNumbers ) );
										
										let assetPath = filePath;
										if ( assetPath.startsWith( '/' ) ) {
											assetPath = assetPath.slice( 1 );
										}
										assetPath = assetPath.replace( /\/+/g, '/' );
										
										await invoke( 'write_asset_file', {
											projectPath: projectPath,
											assetPath: assetPath,
											content: fileContent
										} );
									}
								}
								
								await saveAssets();
								refreshFolderTree();
								refreshFiles();
							} catch ( error ) {
								console.error( '[Assets] Failed to parse/save model:', error );
								currentFolder.files.push( fileEntry );
								await saveAssets();
								refreshFiles();
							}
						};
						dataUrlReader.readAsDataURL( file );
					};
					arrayBufferReader.readAsArrayBuffer( file );
				} else {
					const reader = new FileReader();
					reader.onload = async function ( e ) {
						fileEntry.content = e.target.result;
						currentFolder.files.push( fileEntry );
						
						const projectPath = editor.storage && editor.storage.getProjectPath ? editor.storage.getProjectPath() : null;
						const isTauri = typeof window !== 'undefined' && window.__TAURI__ && window.__TAURI__.core && window.__TAURI__.core.invoke;
						const invoke = isTauri ? window.__TAURI__.core.invoke : null;
						
						if ( projectPath && invoke ) {
							let assetPath = filePath;
							if ( assetPath.startsWith( '/' ) ) {
								assetPath = assetPath.slice( 1 );
							}
							assetPath = assetPath.replace( /\/+/g, '/' );
							
							let fileContent;
							if ( file.type.startsWith( 'text/' ) || file.type === '' ) {
								const textContent = e.target.result;
								fileContent = Array.from( new TextEncoder().encode( textContent ) );
							} else {
								const base64Data = e.target.result.split( ',' )[ 1 ] || e.target.result;
								const byteCharacters = atob( base64Data );
								const byteNumbers = new Array( byteCharacters.length );
								for ( let i = 0; i < byteCharacters.length; i ++ ) {
									byteNumbers[ i ] = byteCharacters.charCodeAt( i );
								}
								fileContent = Array.from( new Uint8Array( byteNumbers ) );
							}
							
							try {
								await invoke( 'write_asset_file', {
									projectPath: projectPath,
									assetPath: assetPath,
									content: fileContent
								} );
							} catch ( error ) {
								console.error( '[Assets] Failed to write asset file:', error );
							}
						}
						
						await saveAssets().catch( error => {
							console.error( '[Assets] Error saving assets:', error );
						} );
						refreshFiles();
					};

					if ( file.type.startsWith( 'text/' ) || file.type === '' ) {
						reader.readAsText( file );
					} else {
						reader.readAsDataURL( file );
					}
				}

			} );

		}

	}

	filesPanel.dom.addEventListener( 'drop', handleDrop, true );
	filesTable.addEventListener( 'drop', handleDrop, true );
	tableBody.addEventListener( 'drop', handleDrop, true );

	
	async function createNewFolder() {

		const folderName = await Modal.showPrompt( 'Enter Folder Name', '', 'New Folder', 'New Folder' );

		if ( folderName && folderName.trim() !== '' ) {

			
			const existingFolder = currentFolder.children.find( f => f.name === folderName.trim() );
			if ( existingFolder ) {
				alert( 'A folder with this name already exists!' );
				return;
			}

			
			let normalizedPath = currentFolder.path;
			if ( normalizedPath === '/' ) {
				normalizedPath = '';
			} else if ( normalizedPath.endsWith( '/' ) ) {
				normalizedPath = normalizedPath.slice( 0, -1 );
			}
			const folderPath = normalizedPath + '/' + folderName.trim();
			
			const newFolder = {
				name: folderName.trim(),
				path: folderPath,
				children: [],
				files: [],
				expanded: false
			};

			currentFolder.children.push( newFolder );
			saveAssets().catch( error => {
				console.error( '[Assets] Error saving assets:', error );
			} );
			refreshFolderTree();
			refreshFiles();

		}

	}

	
	function addAsset() {

		const fileInput = document.createElement( 'input' );
		fileInput.type = 'file';
		fileInput.multiple = true;
		fileInput.style.display = 'none';

		fileInput.addEventListener( 'change', function ( event ) {

			const files = event.target.files;

			if ( files.length > 0 ) {

				Array.from( files ).forEach( file => {

					const ext = file.name.split( '.' ).pop()?.toLowerCase();
					const isModel = [ 'glb', 'gltf', 'fbx', 'obj' ].includes( ext );

					
					let normalizedPath = currentFolder.path;
					if ( normalizedPath === '/' ) {
						normalizedPath = '';
					} else if ( normalizedPath.endsWith( '/' ) ) {
						normalizedPath = normalizedPath.slice( 0, -1 );
					}
					const filePath = normalizedPath + '/' + file.name;

					
					if ( isModel ) {
						const fileEntry = {
							name: file.name,
							path: filePath,
							size: file.size,
							type: ext,
							isBinary: true,
							isModelContainer: true,
							url: URL.createObjectURL( file )
						};

						
						const reader = new FileReader();
						reader.onload = async function( e ) {
							const arrayBuffer = e.target.result;
							
							
							const dataUrlReader = new FileReader();
							dataUrlReader.onload = async function( dataUrlEvent ) {
								fileEntry.content = dataUrlEvent.target.result;
								
								try {
									const projectPath = editor.storage && editor.storage.getProjectPath ? editor.storage.getProjectPath() : null;
									
									
									let modelContents = null;
									
									if ( ext === 'glb' || ext === 'gltf' ) {
										const { GLTFLoader } = await import( 'three/addons/loaders/GLTFLoader.js' );
										const { DRACOLoader } = await import( 'three/addons/loaders/DRACOLoader.js' );
										const { KTX2Loader } = await import( 'three/addons/loaders/KTX2Loader.js' );
										const { MeshoptDecoder } = await import( 'three/addons/libs/meshopt_decoder.module.js' );

										const dracoLoader = new DRACOLoader();
										dracoLoader.setDecoderPath( '../examples/jsm/libs/draco/gltf/' );

										const ktx2Loader = new KTX2Loader();
										ktx2Loader.setTranscoderPath( '../examples/jsm/libs/basis/' );

										if ( editor.signals ) {
											editor.signals.rendererDetectKTX2Support.dispatch( ktx2Loader );
										}

										const loader = new GLTFLoader();
										loader.setDRACOLoader( dracoLoader );
										loader.setKTX2Loader( ktx2Loader );
										loader.setMeshoptDecoder( MeshoptDecoder );

										
										modelContents = await new Promise( ( resolve, reject ) => {
											let parseData;
											if ( ext === 'glb' ) {
												parseData = arrayBuffer;
											} else {
												parseData = new TextDecoder().decode( new Uint8Array( arrayBuffer ) );
											}
											
											loader.parse( parseData, '', ( result ) => {
												const scene = result.scene;
												const contents = {
													geometries: [],
													textures: [],
													materials: [],
													model: scene,
													scenes: result.scenes || [],
													animations: result.animations || [],
													gltf: result
												};

												
												const geometryMap = new Map();
												const textureMap = new Map();
												const materialMap = new Map();

												scene.traverse( ( child ) => {
													if ( child.isMesh && child.geometry ) {
														const geoName = child.geometry.name || `Geometry_${geometryMap.size}`;
														if ( ! geometryMap.has( geoName ) ) {
															geometryMap.set( geoName, {
																name: geoName,
																geometry: child.geometry,
																uuid: THREE.MathUtils.generateUUID()
															} );
														}
													}

													if ( child.isMesh && child.material ) {
														const materials = Array.isArray( child.material ) ? child.material : [ child.material ];
														materials.forEach( ( material ) => {
															const matName = material.name || `Material_${materialMap.size}`;
															if ( ! materialMap.has( matName ) ) {
																materialMap.set( matName, {
																	name: matName,
																	material: material,
																	uuid: THREE.MathUtils.generateUUID()
																} );
															}

															const textureProps = [ 'map', 'normalMap', 'roughnessMap', 'metalnessMap', 
																'aoMap', 'emissiveMap', 'displacementMap', 'alphaMap', 'envMap', 
																'lightMap', 'clearcoatMap', 'clearcoatNormalMap', 'clearcoatRoughnessMap',
																'sheenColorMap', 'sheenRoughnessMap', 'specularColorMap', 'specularIntensityMap',
																'transmissionMap', 'thicknessMap', 'iridescenceMap', 'iridescenceThicknessMap' ];
															
															textureProps.forEach( ( prop ) => {
																const texture = material[ prop ];
																if ( texture && texture.isTexture ) {
																	const texName = texture.name || `Texture_${textureMap.size}`;
																	if ( ! textureMap.has( texName ) ) {
																		textureMap.set( texName, {
																			name: texName,
																			texture: texture,
																			uuid: THREE.MathUtils.generateUUID()
																		} );
																	}
																}
															} );
														} );
													}
												} );

												contents.geometries = Array.from( geometryMap.values() );
												contents.textures = Array.from( textureMap.values() );
												contents.materials = Array.from( materialMap.values() );

												if ( loader.dracoLoader ) loader.dracoLoader.dispose();
												if ( loader.ktx2Loader ) loader.ktx2Loader.dispose();

												resolve( contents );
											}, ( error ) => {
												reject( error );
											} );
										} );
									} else if ( ext === 'fbx' ) {
										modelContents = await ModelParser.parseFBX( new Uint8Array( arrayBuffer ), filePath, file.name );
									} else if ( ext === 'obj' ) {
										modelContents = await ModelParser.parseOBJ( new Uint8Array( arrayBuffer ), filePath, file.name );
									}

									if ( modelContents ) {
										
										const baseName = file.name.replace( /\.(glb|gltf|fbx|obj)$/i, '' );
										const modelFolder = {
											name: file.name,
											path: filePath,
											type: 'folder',
											expanded: false,
											files: [],
											children: []
										};
										
										assetManager.registerParsedModel( filePath, modelContents );
										
										
										modelContents.geometries.forEach( geo => {
											modelFolder.files.push( {
												name: geo.name + '.geo',
												path: modelFolder.path + '/' + geo.name + '.geo',
												type: 'geometry',
												size: 0,
												isBinary: false,
												modelGeometry: geo,
												modelPath: filePath,
												modelName: file.name
											} );
										} );
										
										modelContents.textures.forEach( tex => {
											modelFolder.files.push( {
												name: tex.name + '.texture',
												path: modelFolder.path + '/' + tex.name + '.texture',
												type: 'texture',
												size: 0,
												isBinary: true,
												modelTexture: tex,
												modelPath: filePath,
												modelName: file.name
											} );
										} );
										
										modelContents.materials.forEach( mat => {
											const materialFile = {
												name: mat.name + '.mat',
												path: modelFolder.path + '/' + mat.name + '.mat',
												type: 'material',
												size: 0,
												isBinary: false,
												modelMaterial: mat,
												modelPath: filePath,
												modelName: file.name
											};
											modelFolder.files.push( materialFile );
										} );
										
										
										modelFolder.files.push( {
											name: baseName + '.mesh',
											path: modelFolder.path + '/' + baseName + '.mesh',
											type: 'model',
											size: file.size || 0,
											isBinary: true,
											modelObject: modelContents.model,
											modelPath: filePath,
											modelName: file.name,
											modelContents: modelContents
										} );
										
										
										fileEntry.path = modelFolder.path + '/' + file.name;
										const glbPath = fileEntry.path;
										modelFolder.files.push( fileEntry );
										
										const existingFolder = currentFolder.children.find( f => f.path === modelFolder.path );
										if ( !existingFolder ) {
											currentFolder.children.push( modelFolder );
											if ( currentFolder.path === '/' || currentFolder.path === '' ) {
												currentFolder.files = currentFolder.files.filter( f => {
													if ( f.name === file.name && /\.(glb|gltf|fbx|obj)$/i.test( f.name ) ) {
														return false;
													}
													return true;
												} );
											}
										}
										
										const modelFile = modelFolder.files.find( f => f.type === 'model' );
										if ( modelFile ) {
											modelFile.modelPath = glbPath;
										}
										
										if ( projectPath && isTauri && invoke ) {
											const base64Data = fileEntry.content.split( ',' )[ 1 ] || fileEntry.content;
											const byteCharacters = atob( base64Data );
											const byteNumbers = new Array( byteCharacters.length );
											for ( let i = 0; i < byteCharacters.length; i ++ ) {
												byteNumbers[ i ] = byteCharacters.charCodeAt( i );
											}
											const fileContent = Array.from( new Uint8Array( byteNumbers ) );
											
											
											let assetPath = fileEntry.path;
											if ( assetPath.startsWith( '/' ) ) {
												assetPath = assetPath.slice( 1 );
											}
											assetPath = assetPath.replace( /\/+/g, '/' );
											
											await invoke( 'write_asset_file', {
												projectPath: projectPath,
												assetPath: assetPath,
												content: fileContent
											} );
										}
									} else {
										
										currentFolder.files.push( fileEntry );
										
										if ( projectPath && isTauri && invoke ) {
											const base64Data = fileEntry.content.split( ',' )[ 1 ] || fileEntry.content;
											const byteCharacters = atob( base64Data );
											const byteNumbers = new Array( byteCharacters.length );
											for ( let i = 0; i < byteCharacters.length; i ++ ) {
												byteNumbers[ i ] = byteCharacters.charCodeAt( i );
											}
											const fileContent = Array.from( new Uint8Array( byteNumbers ) );
											
											let assetPath = filePath;
											if ( assetPath.startsWith( '/' ) ) {
												assetPath = assetPath.slice( 1 );
											}
											assetPath = assetPath.replace( /\/+/g, '/' );
											
											await invoke( 'write_asset_file', {
												projectPath: projectPath,
												assetPath: assetPath,
												content: fileContent
											} );
										}
									}
									
									await saveAssets();
									refreshFolderTree();
									refreshFiles();
								} catch ( error ) {
									console.error( '[Assets] Failed to parse/save model:', error );
									
									currentFolder.files.push( fileEntry );
									await saveAssets();
									refreshFiles();
								}
							};
							dataUrlReader.readAsDataURL( file );
						};
						
						
						reader.readAsArrayBuffer( file );
					} else {
						
						const reader = new FileReader();
						reader.onload = function ( e ) {
							
							const fileEntry = {
								name: file.name,
								content: e.target.result,
								path: filePath,
								size: file.size,
								type: file.type || 'File',
								isBinary: file.type.startsWith( 'image/' ) || file.type.startsWith( 'audio/' ) || file.type.startsWith( 'video/' )
							};

							
							if ( fileEntry.isBinary ) {
								const objectURL = URL.createObjectURL( file );
								fileEntry.url = objectURL;
								fileEntry.content = e.target.result; 
							}

							currentFolder.files.push( fileEntry );
							saveAssets();
							refreshFiles();

						};

						if ( file.type.startsWith( 'text/' ) || file.type === '' ) {
							reader.readAsText( file );
						} else {
							reader.readAsDataURL( file );
						}
					}

				} );

			}

			
			document.body.removeChild( fileInput );

		} );

		document.body.appendChild( fileInput );
		fileInput.click();

	}

	async function createMaterialOfType( materialType ) {

		if ( materialType === 'standard' ) {

			// Default standard material
			await createAssetFile( 'material', '', 'standard' );

		} else if ( materialType === 'node' ) {

			// Node material with TSL support
			await createAssetFile( 'material', '', 'node' );

		} else {

			// Check if it's a module-provided material type
			const extensions = editor.modules.getMaterialTypeExtensions();
			const extension = extensions.find( ext => ext.type === materialType );

			if ( extension && typeof extension.createMaterial === 'function' ) {

				await extension.createMaterial( createAssetFile );

			} else {

				console.warn( `Unknown material type: ${materialType}` );
				await createAssetFile( 'material', '', 'standard' );

			}

		}

	}
	
	async function createAssetFile( type, defaultContent, materialSubType = null ) {

		const extMap = {
			'css': 'css',
			'html': 'html',
			'json': 'json',
			'js': 'js',
			'shader': 'glsl',
			'txt': 'txt',
			'material': 'mat',
			'cubemap': 'cubemap'
		};

		// Use different extension for node materials
		let ext = extMap[ type ] || 'txt';
		if ( type === 'material' && materialSubType === 'node' ) {

			ext = 'nodemat';

		}

		const defaultFileName = `new.${ext}`;
		const fileName = await Modal.showPrompt( `Enter ${type.toUpperCase()} File Name`, '', defaultFileName, defaultFileName );

		if ( fileName && fileName.trim() !== '' ) {

			let finalFileName = fileName.trim();
			
			if ( !finalFileName.includes( '.' ) ) {
				finalFileName = `${finalFileName}.${ext}`;
			}
			
			let normalizedPath = currentFolder.path;
			if ( normalizedPath === '/' ) {
				normalizedPath = '';
			} else if ( normalizedPath.endsWith( '/' ) ) {
				normalizedPath = normalizedPath.slice( 0, -1 );
			}
			const filePath = normalizedPath + '/' + finalFileName;
			
			let content = defaultContent;
			
			if ( !content && type === 'material' ) {
				
				if ( materialSubType === 'node' ) {

					// Create node material structure
					const nodeMaterial = {
						metadata: {
							version: 4.6,
							type: 'Material',
							generator: 'Material.toJSON'
						},
						uuid: THREE.MathUtils.generateUUID(),
						type: 'NodeMaterial',
						name: finalFileName.replace( /\.[^/.]+$/, '' ),
						color: 16777215,
						metalness: 0,
						roughness: 1,
						nodes: {}
					};
					content = JSON.stringify( nodeMaterial, null, '\t' );

				} else {

					// Standard Three.js material
					const defaultMaterial = new THREE.MeshStandardMaterial( { color: 0xffffff } );
					defaultMaterial.name = finalFileName.replace( /\.[^/.]+$/, '' );
					const materialJson = defaultMaterial.toJSON();
					content = JSON.stringify( materialJson, null, '\t' );

				}

			} else if ( !content && type === 'html' ) {
				content = `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Document</title>
</head>
<body>
	
</body>
</html>`;
			} else if ( !content && type === 'css' ) {
				content = `/* ${finalFileName} */`;
			} else if ( !content && type === 'shader' ) {
				content = `// Vertex Shader
void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}

// Fragment Shader
void main() {
	gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
}`;
			} else if ( !content && type === 'txt' ) {
				content = '';
			} else if ( !content && type === 'cubemap' ) {
				content = JSON.stringify( {
					type: 'cubemap',
					images: {
						px: '',
						nx: '',
						py: '',
						ny: '',
						pz: '',
						nz: ''
					}
				}, null, '\t' );
			}
			
			const now = Date.now();
			const fileEntry = {
				name: finalFileName,
				content: content || '',
				path: filePath,
				size: ( content || '' ).length,
				type: type,
				isBinary: false,
				dateCreated: now,
				dateModified: now
			};

			currentFolder.files.push( fileEntry );
			await registerAssetFromFile( fileEntry );
			await saveAssets().catch( error => {
				console.error( '[Assets] Error saving assets:', error );
			} );
			refreshFiles();
			
			if ( type === 'material' ) {
				window.selectedAsset = {
					type: 'file',
					path: fileEntry.path,
					name: fileEntry.name,
					folder: currentFolder
				};
				if ( editor.signals && editor.signals.sceneGraphChanged ) {
					editor.signals.sceneGraphChanged.dispatch();
				}
			}

		}

	}

	async function createScriptAsset() {
		const fileName = await Modal.showPrompt( 'Enter Script Name', '', 'NewScript.ts', 'NewScript.ts' );
		
		if ( fileName && fileName.trim() !== '' ) {
			let name = fileName.trim();
			if ( !name.endsWith( '.ts' ) && !name.endsWith( '.js' ) ) {
				name += '.ts';
			}

			const className = name.replace( /\.tsx?$/, '' ).replace( /[^a-zA-Z0-9_$]/g, '' );
			const validClassName = className || 'NewScript';

			const scriptTemplate = `import { registerComponent, attribute } from '@engine/core/decorators';
import { Script } from '@engine/core/Script';

@registerComponent
export default class ${validClassName} extends Script {
    awake() {
    }

    start() {
    }

    update() {
    }
}
`;

			let normalizedPath = currentFolder.path;
			if ( normalizedPath === '/' ) {
				normalizedPath = '';
			} else if ( normalizedPath.endsWith( '/' ) ) {
				normalizedPath = normalizedPath.slice( 0, -1 );
			}
			const filePath = normalizedPath + '/' + name;
			
			const fileEntry = {
				name: name,
				content: scriptTemplate,
				path: filePath,
				size: scriptTemplate.length,
				type: 'script',
				isBinary: false
			};

			currentFolder.files.push( fileEntry );
			saveAssets().catch( error => {
				console.error( '[Assets] Error saving script:', error );
			} );
			refreshFiles();
		}
	}

	async function createFolder() {
		const folderName = await Modal.showPrompt( 'Enter Folder Name', '', 'New Folder', 'New Folder' );
		
		if ( folderName && folderName.trim() !== '' ) {
			let normalizedPath = currentFolder.path;
			if ( normalizedPath === '/' ) {
				normalizedPath = '';
			} else if ( normalizedPath.endsWith( '/' ) ) {
				normalizedPath = normalizedPath.slice( 0, -1 );
			}
			const folderPath = normalizedPath + '/' + folderName.trim();
			
			const newFolder = {
				name: folderName.trim(),
				path: folderPath,
				expanded: false,
				children: [],
				files: []
			};

			currentFolder.children.push( newFolder );
			saveAssets().catch( error => {
				console.error( '[Assets] Error saving folder:', error );
			} );
			refreshFolderTree();
		}
	}

	addBtn.onClick( function ( event ) {
		const rect = addBtn.dom.getBoundingClientRect();
		addMenu.style.left = rect.left + 'px';
		addMenu.style.top = ( rect.bottom + 2 ) + 'px';
		addMenu.style.display = addMenu.style.display === 'none' ? 'block' : 'none';
		event.stopPropagation();
	} );

	
	viewGridBtn.addEventListener( 'click', function () {
		viewMode = 'grid';
		viewGridBtn.classList.add( 'active' );
		viewListBtn.classList.remove( 'active' );
		viewDetailedBtn.classList.remove( 'active' );
		refreshFiles();
	} );

	viewListBtn.addEventListener( 'click', function () {
		viewMode = 'list';
		viewGridBtn.classList.remove( 'active' );
		viewListBtn.classList.add( 'active' );
		viewDetailedBtn.classList.remove( 'active' );
		refreshFiles();
	} );

	viewDetailedBtn.addEventListener( 'click', function () {
		viewMode = 'large-grid';
		viewGridBtn.classList.remove( 'active' );
		viewListBtn.classList.remove( 'active' );
		viewDetailedBtn.classList.add( 'active' );
		refreshFiles();
	} );

	viewListBtn.classList.add( 'active' );

	
	function initAssetsStorage( callback ) {

		if ( isTauri && invoke ) {
			
			callback();
			return;
		}

		const indexedDB = window.indexedDB;

		if ( indexedDB === undefined ) {
			console.warn( 'Assets Storage: IndexedDB not available.' );
			callback();
			return;
		}

		const request = indexedDB.open( assetsDBName, assetsDBVersion );

		request.onupgradeneeded = function ( event ) {

			const db = event.target.result;

			if ( ! db.objectStoreNames.contains( 'assets' ) ) {
				db.createObjectStore( 'assets' );
			}

		};

		request.onsuccess = function ( event ) {

			assetsDatabase = event.target.result;
			callback();

		};

		request.onerror = function ( event ) {

			console.error( 'Assets Storage: IndexedDB error', event );
			callback();

		};

	}

	window.saveAssets = saveAssets;
	
	// Function to update file content in memory (for TSL editor saves)
	window.updateFileContent = function( filePath, newContent ) {

		console.log( '[Assets] Updating file content in memory for:', filePath, 'Length:', newContent ? newContent.length : 0 );
		
		// Find and update the file in the folder structure
		function findAndUpdateFile( folder, targetPath ) {

			// Check files in current folder
			if ( folder.files ) {

				const file = folder.files.find( f => f.path === targetPath );
				if ( file ) {

					console.log( '[Assets] Found file to update:', file.name, 'Old length:', file.content ? file.content.length : 0, 'New length:', newContent.length );
					file.content = newContent;
					file.size = newContent.length;
					file.dateModified = Date.now();
					
					// Invalidate preview cache
					if ( previewCache.has( targetPath ) ) {

						console.log( '[Assets] Invalidating cached preview for:', targetPath );
						previewCache.delete( targetPath );

					}
					
					// Regenerate preview if it's a material
					if ( file.type === 'material' && file.name.endsWith( '.nodemat' ) ) {

						console.log( '[Assets] Regenerating preview for NodeMaterial:', file.name );
						
						// Parse the material data
						try {

							const materialData = JSON.parse( newContent );
							
							// Generate preview at highest quality (200px) only
							// Smaller sizes will scale down via CSS
							generateAndCacheMaterialPreview( file, materialData, 200 ).then( dataUrl => {

								if ( dataUrl ) {

									console.log( '[Assets] Preview regenerated and cached (200x200):', file.name );

								}

							} ).catch( err => {

								console.error( '[Assets] Failed to regenerate preview:', err );

							} );

						} catch ( e ) {

							console.error( '[Assets] Failed to parse material for preview:', e );

						}

					}
					
					return true;

				}

			}

			// Recursively search child folders
			if ( folder.children ) {

				for ( const child of folder.children ) {

					if ( findAndUpdateFile( child, targetPath ) ) {

						return true;

					}

				}

			}

			return false;

		}

		// Update the file content
		const updated = findAndUpdateFile( window.assetsRoot, filePath );
		
		if ( updated ) {

			console.log( '[Assets] File content updated in memory successfully' );
			
			// Trigger asset file changed signal
			if ( editor.signals && editor.signals.assetFileChanged ) {

				editor.signals.assetFileChanged.dispatch( filePath );

			}

		} else {

			console.warn( '[Assets] File not found in folder structure:', filePath );

		}

	};
	
	async function syncFilesystemWithMetadata() {
		if ( !isTauri || !invoke ) return;
		
		const projectPath = editor.storage && editor.storage.getProjectPath ? editor.storage.getProjectPath() : null;
		if ( !projectPath ) return;
		
		async function syncFolder( folder, dirPath ) {
			try {
				const dirListing = await invoke( 'list_assets_directory', {
					projectPath: projectPath,
					dirPath: dirPath
				} );
				
				const existingFiles = new Set( folder.files.map( f => f.name ) );
				const allFiles = ( dirListing.files || [] ).map( f => f.name );
				
				for ( const fileInfo of dirListing.files || [] ) {
					if ( !existingFiles.has( fileInfo.name ) && fileInfo.name !== 'assets.json' ) {
						const ext = fileInfo.name.split( '.' ).pop()?.toLowerCase() || '';
						
						if ( ext === 'js' || ext === 'jsx' ) {
							const baseName = fileInfo.name.replace( /\.jsx?$/, '' );
							const hasCorrespondingTs = allFiles.some( f => {
								const fBase = f.replace( /\.tsx?$/, '' );
								return fBase === baseName && ( f.endsWith( '.ts' ) || f.endsWith( '.tsx' ) );
							} );
							
							if ( hasCorrespondingTs ) {
								continue;
							}
						}
						
						if ( [ 'glb', 'gltf', 'obj', 'fbx' ].includes( ext ) ) {
							if ( dirPath === '/' || dirPath === '' ) {
								const fileBaseName = fileInfo.name.replace( /\.(glb|gltf|fbx|obj)$/i, '' );
								const hasModelFolder = ( folder.children.some( child => {
									if ( child.type === 'folder' && /\.(glb|gltf|fbx|obj)$/i.test( child.name ) ) {
										const childBaseName = child.name.replace( /\.(glb|gltf|fbx|obj)$/i, '' );
										return childBaseName === fileBaseName || child.name === fileInfo.name;
									}
									return false;
								} ) ) || ( ( dirListing.directories || [] ).some( dirName => {
									if ( /\.(glb|gltf|fbx|obj)$/i.test( dirName ) ) {
										const dirBaseName = dirName.replace( /\.(glb|gltf|fbx|obj)$/i, '' );
										return dirBaseName === fileBaseName || dirName === fileInfo.name;
									}
									return false;
								} ) );
								if ( hasModelFolder ) {
									continue;
								}
							}
						}
						
						const filePath = dirPath === '/' || dirPath === '' ? '/' + fileInfo.name : dirPath + '/' + fileInfo.name;
						
						let fileType = 'text';
						if ( [ 'ts', 'tsx', 'js', 'jsx' ].includes( ext ) ) {
							fileType = 'script';
						} else if ( [ 'png', 'jpg', 'jpeg', 'gif', 'webp' ].includes( ext ) ) {
							fileType = 'image';
						} else if ( [ 'glb', 'gltf', 'obj', 'fbx' ].includes( ext ) ) {
							fileType = 'model';
						} else if ( [ 'mp3', 'wav', 'ogg' ].includes( ext ) ) {
							fileType = 'audio';
						} else if ( [ 'mp4', 'webm' ].includes( ext ) ) {
							fileType = 'video';
						}
						
						const now = Date.now();
						const fileEntry = {
							name: fileInfo.name,
							path: filePath,
							size: fileInfo.size || 0,
							type: fileType,
							isBinary: [ 'image', 'model', 'audio', 'video' ].includes( fileType ),
							content: '',
							dateCreated: now,
							dateModified: now
						};
						
						folder.files.push( fileEntry );
					}
				}
				
				for ( const dirName of dirListing.directories || [] ) {
					let subFolder = folder.children.find( c => c.name === dirName );
					if ( !subFolder ) {
						const subPath = dirPath === '/' || dirPath === '' ? '/' + dirName : dirPath + '/' + dirName;
						subFolder = {
							name: dirName,
							path: subPath,
							expanded: false,
							children: [],
							files: []
						};
						folder.children.push( subFolder );
					}
					await syncFolder( subFolder, dirPath === '/' || dirPath === '' ? dirName : dirPath + '/' + dirName );
				}
			} catch ( error ) {
			}
		}
		
		if ( !assetsRoot ) {
			assetsRoot = {
				name: '/',
				path: '/',
				expanded: true,
				children: [],
				files: []
			};
		}
		
		await syncFolder( assetsRoot, '/' );
		
		let cleaned = false;
		if ( assetsRoot.path === '/' || assetsRoot.path === '' ) {
			const glbFilesAtRoot = assetsRoot.files.filter( f => /\.(glb|gltf|fbx|obj)$/i.test( f.name ) );
			for ( const glbFile of glbFilesAtRoot ) {
				const fileBaseName = glbFile.name.replace( /\.(glb|gltf|fbx|obj)$/i, '' );
				const hasModelFolder = assetsRoot.children.some( child => {
					if ( child.type === 'folder' && /\.(glb|gltf|fbx|obj)$/i.test( child.name ) ) {
						const childBaseName = child.name.replace( /\.(glb|gltf|fbx|obj)$/i, '' );
						return childBaseName === fileBaseName || child.name === glbFile.name;
					}
					return false;
				} );
				if ( hasModelFolder ) {
					assetsRoot.files = assetsRoot.files.filter( f => f !== glbFile );
					cleaned = true;
					try {
						const assetPath = glbFile.path.startsWith( '/' ) ? glbFile.path.slice( 1 ) : glbFile.path;
						await invoke( 'delete_asset_file', {
							projectPath: projectPath,
							assetPath: assetPath
						} );
					} catch ( error ) {
					}
				}
			}
		}
		
		window.assetsRoot = assetsRoot;
		window.currentFolder = currentFolder || assetsRoot;
		
		if ( cleaned && window.saveAssets ) {
			await window.saveAssets();
		}
		
		await saveAssets();
		
		if (window.initializeAssetManager) {
			window.initializeAssetManager();
		}
	}
	
	async function saveAssets() {

		if ( isTauri && invoke ) {
			
			const projectPath = editor.storage && editor.storage.getProjectPath ? editor.storage.getProjectPath() : null;
			
			if ( ! projectPath ) {
				console.warn( '[Assets] No project path set, cannot save assets to file' );
				return;
			}

			function serializeFolder( folder ) {
				const filesToSave = folder.files.filter( file => {
					if ( file.name.endsWith( '.js' ) || file.name.endsWith( '.jsx' ) ) {
						const baseName = file.name.replace( /\.jsx?$/, '' );
						const hasCorrespondingTs = folder.files.some( f => {
							const fBase = f.name.replace( /\.tsx?$/, '' );
							return fBase === baseName && ( f.name.endsWith( '.ts' ) || f.name.endsWith( '.tsx' ) );
						} );
						return !hasCorrespondingTs;
					}
					if ( file.name && /\.(glb|gltf|fbx|obj)$/i.test( file.name ) ) {
						if ( folder.path === '/' || folder.path === '' ) {
							const fileBaseName = file.name.replace( /\.(glb|gltf|fbx|obj)$/i, '' );
							const hasModelFolder = folder.children.some( child => {
								if ( child.type === 'folder' && /\.(glb|gltf|fbx|obj)$/i.test( child.name ) ) {
									const childBaseName = child.name.replace( /\.(glb|gltf|fbx|obj)$/i, '' );
									return childBaseName === fileBaseName || child.name === file.name;
								}
								return false;
							} );
							if ( hasModelFolder ) {
								return false;
							}
						}
					}
					return true;
				} );
				
				return {
					name: folder.name,
					path: folder.path,
					expanded: folder.expanded,
					children: folder.children.map( serializeFolder ),
					files: filesToSave.map( file => {
						const assetPath = file.path.startsWith( '/' ) ? file.path.slice( 1 ) : file.path;
						const asset = editor.assets.getByUrl( assetPath );
						
						const fileData = {
							name: file.name,
							path: file.path,
							size: file.size,
							type: file.type,
							isBinary: file.isBinary || false,
							content: '',
							url: null,
							modelPath: file.modelPath || null,
							modelName: file.modelName || null,
							metadata: file.metadata || null,
							dateCreated: file.dateCreated || null,
							dateModified: file.dateModified || null
						};
						
						if ( asset ) {
							fileData.assetId = asset.id;
							fileData.assetType = asset.type;
							fileData.dateCreated = asset.createdAt;
							fileData.dateModified = asset.modifiedAt;
							
							if ( asset instanceof MaterialAsset ) {
								fileData.metadata = {
									...fileData.metadata,
									material: {
										materialType: asset.metadata.materialType
									}
								};
							} else if ( asset instanceof TextureAsset ) {
								fileData.metadata = {
									...fileData.metadata,
									texture: {
										width: asset.metadata.width,
										height: asset.metadata.height,
										colorSpace: asset.metadata.colorSpace,
										flipY: asset.metadata.flipY,
										generateMipmaps: asset.metadata.generateMipmaps,
										minFilter: asset.metadata.minFilter,
										magFilter: asset.metadata.magFilter,
										wrapS: asset.metadata.wrapS,
										wrapT: asset.metadata.wrapT,
										anisotropy: asset.metadata.anisotropy
									}
								};
							}
						}
						
						return fileData;
					} )
				};
			}

			const serialized = serializeFolder( assetsRoot );
			
			try {
				await invoke( 'write_assets_metadata', {
					projectPath: projectPath,
					content: JSON.stringify( serialized, null, '\t' )
				} );

				async function saveFolderFiles( folder ) {
					for ( const file of folder.files ) {
						try {
							
							
							if ( file.modelGeometry || file.modelTexture || file.modelMaterial || file.modelObject ) {
								continue; 
							}
							
							
							
							
							if ( folder.type === 'model-container' ) {
								
								continue;
							}
							
							if ( file.name && /\.(glb|gltf|fbx|obj)$/i.test( file.name ) ) {
								const fileBaseName = file.name.replace( /\.(glb|gltf|fbx|obj)$/i, '' );
								const folderBaseName = folder.name.replace( /\.(glb|gltf|fbx|obj)$/i, '' );
								if ( fileBaseName === folderBaseName || folder.name === file.name ) {
									continue;
								}
								if ( folder.path === '/' || folder.path === '' ) {
									const hasModelFolder = assetsRoot.children.some( child => {
										if ( child.type === 'folder' && /\.(glb|gltf|fbx|obj)$/i.test( child.name ) ) {
											const childBaseName = child.name.replace( /\.(glb|gltf|fbx|obj)$/i, '' );
											return childBaseName === fileBaseName || child.name === file.name;
										}
										return false;
									} );
									if ( hasModelFolder ) {
										continue;
									}
								}
								if ( file.path && file.path.includes( '/' ) && !file.path.startsWith( '/' + file.name ) ) {
									const pathParts = file.path.split( '/' ).filter( p => p );
									if ( pathParts.length > 1 ) {
										const parentFolderName = pathParts[ pathParts.length - 2 ];
										if ( parentFolderName === file.name || parentFolderName.replace( /\.(glb|gltf|fbx|obj)$/i, '' ) === fileBaseName ) {
											continue;
										}
									}
								}
							}
							
							if ( file.path && (
								file.path.endsWith( '.geo' ) ||
								file.path.endsWith( '.texture' ) || 
								file.path.endsWith( '.mat' ) ||
								file.path.endsWith( '.nodemat' ) ||
								file.path.endsWith( '.mesh' )
							) ) {
								
								const pathMatch = file.path.match( /\/([^\/]+)\.(glb|gltf|fbx|obj)/ );
								if ( pathMatch ) {
									continue; 
								}
							}
							
							let fileContent;
							if ( file.isBinary && file.content ) {
								try {
									let base64Data;
									if ( file.content.includes( ',' ) ) {
										base64Data = file.content.split( ',' )[ 1 ];
									} else {
										base64Data = file.content;
									}
									
									base64Data = base64Data.trim();
									
									if ( !/^[A-Za-z0-9+/]*={0,2}$/.test( base64Data ) ) {
										console.warn( '[Assets] File content is not valid base64, skipping:', file.path );
										continue;
									}
									
									const byteCharacters = atob( base64Data );
									const byteNumbers = new Array( byteCharacters.length );
									for ( let i = 0; i < byteCharacters.length; i ++ ) {
										byteNumbers[ i ] = byteCharacters.charCodeAt( i );
									}
									fileContent = Array.from( new Uint8Array( byteNumbers ) );
								} catch ( decodeError ) {
									console.error( '[Assets] Failed to decode base64 content for file:', file.path, decodeError );
									continue;
								}
							} else {
								fileContent = Array.from( new TextEncoder().encode( file.content || '' ) );
							}

							let assetPath = file.path;
							if ( assetPath.startsWith( '/' ) ) {
								assetPath = assetPath.slice( 1 );
							}
							assetPath = assetPath.replace( /\/+/g, '/' );
							
							if ( file.name && /\.(glb|gltf|fbx|obj)$/i.test( file.name ) && folder.path === '/' ) {
								const fileBaseName = file.name.replace( /\.(glb|gltf|fbx|obj)$/i, '' );
								const hasModelFolder = assetsRoot.children.some( child => {
									if ( child.type === 'folder' && /\.(glb|gltf|fbx|obj)$/i.test( child.name ) ) {
										const childBaseName = child.name.replace( /\.(glb|gltf|fbx|obj)$/i, '' );
										return childBaseName === fileBaseName || child.name === file.name;
									}
									return false;
								} );
								if ( hasModelFolder ) {
									continue;
								}
							}
							
							await invoke( 'write_asset_file', {
								projectPath: projectPath,
								assetPath: assetPath,
								content: fileContent
							} );
							
							if ( file.dateCreated === undefined || file.dateCreated === null ) {
								file.dateCreated = Date.now();
							}
							file.dateModified = Date.now();

							if ( ( file.type === 'script' || file.name.endsWith( '.ts' ) || file.name.endsWith( '.tsx' ) ) && !file.isBinary ) {
								try {
									const compiled = await ScriptCompiler.compileScript( assetPath, file.content || '' );
									if ( compiled ) {
										const compiledContent = Array.from( new TextEncoder().encode( compiled.content ) );
										await invoke( 'write_asset_file', {
											projectPath: projectPath,
											assetPath: compiled.path,
											content: compiledContent
										} );

										if ( window.pc && window.pc.app ) {
											const app = window.pc.app;
											if ( app ) {
												const assetRegistry = app.assets;
												const scriptName = assetPath.split( '/' ).pop().replace( /\.(ts|js)$/, '' );
												const scriptAsset = assetRegistry.get( scriptName );
												if ( scriptAsset ) {
													assetRegistry.unload( scriptAsset.name );
													await assetRegistry.load( scriptAsset.name );
													
													app.scene.traverse( ( object3D ) => {
														const entity = object3D.__entity;
														if ( entity ) {
															const scripts = entity.scripts;
															scripts.forEach( script => {
																if ( script.constructor.name === scriptName ) {
																	entity.removeScript( script.constructor );
																	const newScript = entity.addScriptFromAsset( scriptAsset );
																	if ( newScript ) {
																		newScript.start();
																	}
																}
															} );
														}
													} );
													
												}
											}
										}
									}
								} catch ( compileError ) {
									console.warn( '[Assets] Failed to compile script:', assetPath, compileError );
								}
							}
						} catch ( error ) {
							console.error( '[Assets] Failed to save file:', file.path, error );
						}
					}

					for ( const child of folder.children ) {
						if ( child.type === 'model-container' ) {
							continue;
						}
						await saveFolderFiles( child );
					}
				}

				await saveFolderFiles( assetsRoot );
			} catch ( error ) {
				console.error( '[Assets] Failed to save assets:', error );
			}

			return;
		}

		if ( ! assetsDatabase ) return;

		function serializeFolder( folder ) {
			return {
				name: folder.name,
				path: folder.path,
				expanded: folder.expanded,
				children: folder.children.map( serializeFolder ),
				files: folder.files.map( file => ( {
					name: file.name,
					path: file.path,
					size: file.size,
					type: file.type,
					isBinary: file.isBinary || false,
					content: file.content || '',
					url: null,
					modelPath: file.modelPath || null,
					modelName: file.modelName || null,
					dateCreated: file.dateCreated || null,
					dateModified: file.dateModified || null
				} ) )
			};
		}

		const serialized = serializeFolder( assetsRoot );
		const transaction = assetsDatabase.transaction( [ 'assets' ], 'readwrite' );
		const objectStore = transaction.objectStore( 'assets' );
		objectStore.put( serialized, 0 );

	}

	async function loadAssets() {

		if ( isTauri && invoke ) {
			const projectPath = editor.storage && editor.storage.getProjectPath ? editor.storage.getProjectPath() : null;
			
			if ( ! projectPath ) {
				refreshFolderTree();
				refreshFiles();
				return;
			}

			try {
				const metadataContent = await invoke( 'read_assets_metadata', { projectPath: projectPath } );
				const metadata = JSON.parse( metadataContent );

				if ( metadata && Object.keys( metadata ).length > 0 ) {
					const hasContent = (
						( metadata.children && metadata.children.length > 0 ) ||
						( metadata.files && metadata.files.length > 0 ) ||
						metadata.name
					);
					
					if ( hasContent ) {
					async function deserializeFolder( folderData ) {
						const folder = {
							name: folderData.name,
							path: folderData.path,
							expanded: folderData.expanded !== undefined ? folderData.expanded : false,
							children: [],
							files: []
						};

						if ( folderData.children ) {
							folder.children = await Promise.all( folderData.children.map( deserializeFolder ) );
						}

						if ( folderData.files ) {
							const allFiles = folderData.files;
							const filesToLoad = allFiles.filter( fileData => {
								if ( fileData.name.endsWith( '.js' ) || fileData.name.endsWith( '.jsx' ) ) {
									const baseName = fileData.name.replace( /\.jsx?$/, '' );
									const hasCorrespondingTs = allFiles.some( f => {
										const fBase = f.name.replace( /\.tsx?$/, '' );
										return fBase === baseName && ( f.name.endsWith( '.ts' ) || f.name.endsWith( '.tsx' ) );
									} );
									return !hasCorrespondingTs;
								}
								if ( fileData.name && /\.(glb|gltf|fbx|obj)$/i.test( fileData.name ) ) {
									if ( folder.path === '/' || folder.path === '' ) {
										const fileBaseName = fileData.name.replace( /\.(glb|gltf|fbx|obj)$/i, '' );
										const hasModelFolder = folder.children.some( child => {
											if ( child.type === 'folder' && /\.(glb|gltf|fbx|obj)$/i.test( child.name ) ) {
												const childBaseName = child.name.replace( /\.(glb|gltf|fbx|obj)$/i, '' );
												return childBaseName === fileBaseName || child.name === fileData.name;
											}
											return false;
										} );
										if ( hasModelFolder ) {
											return false;
										}
									}
								}
								return true;
							} );
							
							const loadedFiles = await Promise.all( filesToLoad.map( async ( fileData ) => {
								const file = {
									name: fileData.name,
									path: fileData.path,
									size: fileData.size,
									type: fileData.type,
									isBinary: fileData.isBinary || false,
									content: '',
									modelPath: fileData.modelPath || null,
									modelName: fileData.modelName || null,
									dateCreated: fileData.dateCreated || null,
									dateModified: fileData.dateModified || null
								};

								try {
									const isVirtualFile = fileData.modelGeometry || fileData.modelTexture || 
									                     fileData.modelMaterial || fileData.modelObject ||
									                     ( fileData.path && (
									                         fileData.path.endsWith( '.geo' ) ||
									                         fileData.path.endsWith( '.texture' ) ||
									                         fileData.path.endsWith( '.mat' ) ||
									                         fileData.path.endsWith( '.nodemat' ) ||
									                         fileData.path.endsWith( '.mesh' )
									                     ) && (
									                         fileData.path.includes( '/Geometries/' ) ||
									                         fileData.path.includes( '/Textures/' ) ||
									                         fileData.path.includes( '/Materials/' ) ||
									                         fileData.path.match( /\/([^\/]+)\.(glb|gltf|fbx|obj)/ )
									                     ) );
									
									if ( isVirtualFile ) {
										
										
										if ( fileData.modelGeometry ) file.modelGeometry = fileData.modelGeometry;
										if ( fileData.modelTexture ) file.modelTexture = fileData.modelTexture;
										if ( fileData.modelMaterial ) file.modelMaterial = fileData.modelMaterial;
										if ( fileData.modelObject ) file.modelObject = fileData.modelObject;
										if ( fileData.modelPath ) file.modelPath = fileData.modelPath;
										if ( fileData.modelName ) file.modelName = fileData.modelName;
										if ( fileData.modelContents ) file.modelContents = fileData.modelContents;
										return file;
									}
									
									const assetPath = fileData.path.startsWith( '/' ) ? fileData.path.slice( 1 ) : fileData.path;
									const fileBytes = await invoke( 'read_asset_file', {
										projectPath: projectPath,
										assetPath: assetPath
									} );

									const ext = fileData.name.split( '.' ).pop()?.toLowerCase();
									const isModel = [ 'glb', 'gltf', 'fbx', 'obj' ].includes( ext );

									if ( file.isBinary ) {
										const blob = new Blob( [ new Uint8Array( fileBytes ) ] );
										file.url = URL.createObjectURL( blob );
										const reader = new FileReader();
										reader.onload = function( e ) {
											file.content = e.target.result;
										};
										reader.readAsDataURL( blob );
										
										if ( isModel ) {
											const baseName = file.name.replace( /\.(glb|gltf|fbx|obj)$/i, '' );
											const isAlreadyInModelFolder = folder.name === file.name || folder.children.some( child => child.path === file.path );
											
											if ( !isAlreadyInModelFolder ) {
												try {
													const modelContents = await ModelParser.parseModel( file.path, file.name, projectPath );
													
													
													const modelFolder = {
														name: file.name,
														path: file.path,
														type: 'folder',
														expanded: false,
														files: [],
														children: []
													};
													
													
													modelContents.geometries.forEach( geo => {
														modelFolder.files.push( {
															name: geo.name + '.geo',
															path: modelFolder.path + '/' + geo.name + '.geo',
															type: 'geometry',
															size: 0,
															isBinary: false,
															modelGeometry: geo,
															modelPath: file.path,
															modelName: file.name
														} );
													} );
													
													modelContents.textures.forEach( tex => {
														modelFolder.files.push( {
															name: tex.name + '.texture',
															path: modelFolder.path + '/' + tex.name + '.texture',
															type: 'texture',
															size: 0,
															isBinary: true,
															modelTexture: tex,
															modelPath: file.path,
															modelName: file.name
														} );
													} );
													
													modelContents.materials.forEach( mat => {
														modelFolder.files.push( {
															name: mat.name + '.mat',
															path: modelFolder.path + '/' + mat.name + '.mat',
															type: 'material',
															size: 0,
															isBinary: false,
															modelMaterial: mat,
															modelPath: file.path,
															modelName: file.name
														} );
													} );
													
													
													modelFolder.files.push( {
														name: baseName + '.mesh',
														path: modelFolder.path + '/' + baseName + '.mesh',
														type: 'model',
														size: file.size || 0,
														isBinary: true,
														modelObject: modelContents.model,
														modelPath: file.path,
														modelName: file.name,
														modelContents: modelContents
													} );
													
													
													file.path = modelFolder.path + '/' + file.name;
													const glbPath = file.path;
													modelFolder.files.push( file );
													
													const existingFolder = folder.children.find( f => f.path === modelFolder.path );
													if ( !existingFolder ) {
														folder.children.push( modelFolder );
													}
													
													const modelFile = modelFolder.files.find( f => f.type === 'model' );
													if ( modelFile ) {
														modelFile.modelPath = glbPath;
													}
													
													return null;
												} catch ( parseError ) {
													console.error( '[Assets] Failed to parse model on load:', parseError );
												}
											}
										}
									} else {
										file.content = new TextDecoder().decode( new Uint8Array( fileBytes ) );
									}
								} catch ( error ) {
									const errorMessage = error?.message || String( error );
									if ( errorMessage && errorMessage.includes( 'File not found' ) ) {
										return null;
									}
									console.warn( '[Assets] Failed to load file:', fileData.path, error );
									return null;
								}

								if ( file ) {
									await registerAssetFromFile( file );
								}
								return file;
							} ) );
							folder.files = loadedFiles.filter( f => f !== null );
						}

						return folder;
					}

						assetsRoot = await deserializeFolder( metadata );
						currentFolder = assetsRoot;
						window.assetsRoot = assetsRoot;
						window.currentFolder = currentFolder;
						
						await syncFilesystemWithMetadata();
						
						refreshFolderTree();
						refreshFiles();
					} else {
						await syncFilesystemWithMetadata();
						refreshFolderTree();
						refreshFiles();
					}
				} else {
					await syncFilesystemWithMetadata();
					refreshFolderTree();
					refreshFiles();
				}
			} catch ( error ) {
				console.error( '[Assets] Failed to load assets:', error );
				refreshFolderTree();
				refreshFiles();
			}

			return;
		}

		if ( ! assetsDatabase ) {
			refreshFolderTree();
			refreshFiles();
			return;
		}

		const transaction = assetsDatabase.transaction( [ 'assets' ], 'readonly' );
		const objectStore = transaction.objectStore( 'assets' );
		const request = objectStore.get( 0 );

		request.onsuccess = function ( event ) {

			const data = event.target.result;

			if ( data ) {

				function deserializeFolder( folderData ) {

					const folder = {
						name: folderData.name,
						path: folderData.path,
						expanded: folderData.expanded !== undefined ? folderData.expanded : false,
						children: [],
						files: []
					};

					if ( folderData.children ) {
						folder.children = folderData.children.map( deserializeFolder );
					}

					if ( folderData.files ) {
						folder.files = folderData.files.map( fileData => {

							const file = {
								name: fileData.name,
								path: fileData.path,
								size: fileData.size,
								type: fileData.type,
								isBinary: fileData.isBinary || false,
								content: fileData.content || ''
							};

							const isTauri = typeof window !== 'undefined' && window.__TAURI__ && window.__TAURI__.core?.invoke;
							const isInBrowser = typeof window !== 'undefined' && window.location && window.location.protocol === 'http:';
							
							if ( file.isBinary && file.content && ( isTauri && !isInBrowser ) ) {
								try {
									const base64Data = file.content.includes( ',' ) ? file.content.split( ',' )[ 1 ] : file.content;
									const base64DataTrimmed = base64Data.trim();
									
									if ( /^[A-Za-z0-9+/]*={0,2}$/.test( base64DataTrimmed ) ) {
										const byteCharacters = atob( base64DataTrimmed );
										const byteNumbers = new Array( byteCharacters.length );
										for ( let i = 0; i < byteCharacters.length; i ++ ) {
											byteNumbers[ i ] = byteCharacters.charCodeAt( i );
										}
										const byteArray = new Uint8Array( byteNumbers );
										const blob = new Blob( [ byteArray ] );
										file.url = URL.createObjectURL( blob );
									} else {
										console.warn( '[Assets] Invalid base64 content for file from IndexedDB:', file.name );
									}
								} catch ( e ) {
									console.error( 'Failed to recreate blob for', file.name, e );
								}
							} else if ( file.isBinary && isInBrowser ) {
								file.url = null;
							}

							return file;

						} );
					}

					return folder;

				}

				assetsRoot = deserializeFolder( data );
				currentFolder = assetsRoot;
				window.currentFolder = currentFolder;
				refreshFolderTree();
				refreshFiles();

			} else {

				refreshFolderTree();
				refreshFiles();

			}

		};

		request.onerror = function ( event ) {

			console.error( 'Failed to load assets', event );
			refreshFolderTree();
			refreshFiles();

		};

	}

	let assetsLoaded = false;
	
	function reloadAssets() {
		if ( ! assetsLoaded ) {
			assetsLoaded = true;
			loadAssets().catch( error => {
				console.error( '[Assets] Error loading assets:', error );
				assetsLoaded = false;
			} );
		}
	}
	
	initAssetsStorage( function () {
		loadAssets().catch( error => {
			console.error( '[Assets] Error loading assets:', error );
		} );
		
		if ( isTauri && invoke ) {
			const checkProjectPath = setInterval( function () {
				const projectPath = editor.storage && editor.storage.getProjectPath ? editor.storage.getProjectPath() : null;
				if ( projectPath && ! assetsLoaded ) {
					assetsLoaded = true;
					loadAssets().catch( error => {
						console.error( '[Assets] Error loading assets:', error );
						assetsLoaded = false;
					} );
					clearInterval( checkProjectPath );
				}
			}, 500 );
			
			setTimeout( function () {
				clearInterval( checkProjectPath );
			}, 10000 );
		}
	} );
	
	const onSceneGraphChanged = function () {
		if ( isTauri && invoke ) {
			const projectPath = editor.storage && editor.storage.getProjectPath ? editor.storage.getProjectPath() : null;
			if ( projectPath ) {
				assetsLoaded = false;
				loadAssets().then( () => {
					assetsLoaded = true;
				} ).catch( error => {
					console.error( '[Assets] Error loading assets:', error );
					assetsLoaded = false;
				} );
			}
		}
	};
	signals.sceneGraphChanged.add( onSceneGraphChanged );

	const assetsDropHandler = function(e) {
		const target = e.target;
		const assetsPanel = target.closest && ( target.closest( '#assets-files' ) || target.closest( '#assets-files-table' ) || target.closest( '#assets-files-tbody' ) || target.closest( '#sidebar-bottom' ) );
		if ( assetsPanel ) {
			e.preventDefault();
			e.stopPropagation();
			e.stopImmediatePropagation();
			if ( e.type === 'drop' ) {
				handleDrop(e);
			} else if ( e.type === 'dragover' ) {
				e.dataTransfer.dropEffect = 'copy';
				dropZone.style.display = 'block';
			}
			return true;
		}
		return false;
	};

	window.addEventListener( 'dragover', function(e) {
		if ( assetsDropHandler(e) ) return;
	}, true );

	window.addEventListener( 'drop', function(e) {
		if ( assetsDropHandler(e) ) return;
	}, true );
	
	initializeDefaultAssets();

	window.loadAssets = loadAssets;

	return container;

}

export { SidebarAssets };
