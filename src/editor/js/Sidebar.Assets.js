import { UIPanel, UIRow, UIButton, UIText, UIInput, UISelect } from './libs/ui.js';

function SidebarAssets( editor ) {

	const signals = editor.signals;
	const strings = editor.strings;

	const container = new UIPanel();
	container.setId( 'assets-container' );
	container.setDisplay( 'flex' );
	container.dom.style.flexDirection = 'column';
	container.setHeight( '100%' );

	// Header bar
	const headerBar = new UIRow();
	headerBar.setId( 'assets-header' );
	headerBar.setPadding( '4px 8px' );
	headerBar.setBackground( '#2a2a2a' );
	headerBar.setBorderBottom( 'none' );
	headerBar.setBorderTop( 'none' );
	headerBar.dom.style.display = 'flex';
	headerBar.dom.style.margin = '0';
	headerBar.dom.style.borderTop = 'none';
	headerBar.dom.style.borderBottom = 'none';
	headerBar.dom.style.alignItems = 'center';
	headerBar.dom.style.justifyContent = 'space-between';

	// Left side of header
	const headerLeft = document.createElement( 'div' );
	headerLeft.style.cssText = 'display: flex; align-items: center; gap: 8px;';

	// Collapse/expand button
	const collapseBtn = document.createElement( 'button' );
	collapseBtn.textContent = '▼';
	collapseBtn.style.cssText = 'background: none; border: none; color: #aaa; cursor: pointer; padding: 4px;';
	headerLeft.appendChild( collapseBtn );

	// ASSETS title
	const assetsTitle = new UIText( 'ASSETS' );
	assetsTitle.dom.style.cssText = 'color: #aaa; font-weight: bold; margin-right: 8px;';
	headerLeft.appendChild( assetsTitle.dom );

	// Add button
	const addBtn = new UIButton( '+' );
	addBtn.dom.style.cssText = 'width: 24px; height: 24px; padding: 0; font-size: 16px;';
	addBtn.onClick( function () {
		// TODO: Add new folder/file
	} );
	headerLeft.appendChild( addBtn.dom );

	// Delete button
	const deleteBtn = document.createElement( 'button' );
	deleteBtn.innerHTML = '🗑️';
	deleteBtn.style.cssText = 'background: none; border: none; color: #aaa; cursor: pointer; padding: 4px; width: 24px; height: 24px;';
	deleteBtn.title = 'Delete';
	headerLeft.appendChild( deleteBtn );

	// Undo/Redo button
	const undoBtn = document.createElement( 'button' );
	undoBtn.innerHTML = '↶';
	undoBtn.style.cssText = 'background: none; border: none; color: #aaa; cursor: pointer; padding: 4px; width: 24px; height: 24px;';
	undoBtn.title = 'Undo';
	headerLeft.appendChild( undoBtn );

	// Center of header
	const headerCenter = document.createElement( 'div' );
	headerCenter.style.cssText = 'display: flex; align-items: center; gap: 8px; flex: 1; justify-content: center;';

	// View mode buttons (grid, list, detailed)
	const viewGridBtn = document.createElement( 'button' );
	viewGridBtn.innerHTML = '⊞';
	viewGridBtn.style.cssText = 'background: none; border: none; color: #aaa; cursor: pointer; padding: 4px; width: 24px; height: 24px;';
	viewGridBtn.title = 'Grid View';
	headerCenter.appendChild( viewGridBtn );

	const viewListBtn = document.createElement( 'button' );
	viewListBtn.innerHTML = '☰';
	viewListBtn.style.cssText = 'background: none; border: none; color: #aaa; cursor: pointer; padding: 4px; width: 24px; height: 24px;';
	viewListBtn.title = 'List View';
	headerCenter.appendChild( viewListBtn );

	const viewDetailedBtn = document.createElement( 'button' );
	viewDetailedBtn.innerHTML = '☷';
	viewDetailedBtn.style.cssText = 'background: none; border: none; color: #aaa; cursor: pointer; padding: 4px; width: 24px; height: 24px;';
	viewDetailedBtn.title = 'Detailed View';
	headerCenter.appendChild( viewDetailedBtn );

	// Filter dropdown
	const filterSelect = new UISelect();
	filterSelect.setOptions( { 'all': 'All' } );
	filterSelect.setValue( 'all' );
	filterSelect.dom.style.cssText = 'margin-left: 8px;';
	headerCenter.appendChild( filterSelect.dom );

	// Search input
	const searchInput = new UIInput( '' );
	searchInput.dom.type = 'text';
	searchInput.dom.placeholder = 'Search';
	searchInput.dom.style.cssText = 'margin-left: 8px; padding: 4px 8px; background: #1e1e1e; border: 1px solid #444; color: #aaa; width: 200px;';
	headerCenter.appendChild( searchInput.dom );

	// Right side of header
	const headerRight = document.createElement( 'div' );
	headerRight.style.cssText = 'display: flex; align-items: center; gap: 8px;';

	const starBtn = document.createElement( 'button' );
	starBtn.innerHTML = '★';
	starBtn.style.cssText = 'background: none; border: none; color: #aaa; cursor: pointer; padding: 4px; width: 24px; height: 24px;';
	starBtn.title = 'Favorites';
	headerRight.appendChild( starBtn );

	const settingsText = new UIText( 'ASSET SETTINGS' );
	settingsText.dom.style.cssText = 'color: #aaa; font-size: 11px;';
	headerRight.appendChild( settingsText.dom );

	headerBar.dom.appendChild( headerLeft );
	headerBar.dom.appendChild( headerCenter );
	headerBar.dom.appendChild( headerRight );

	container.add( headerBar );

	// Main content area (two panels side by side)
	const contentArea = new UIPanel();
	contentArea.dom.style.cssText = 'display: flex; flex: 1; overflow: hidden; margin: 0; padding: 0; border-top: none;';

	// Left panel: Folder hierarchy
	const folderPanel = new UIPanel();
	folderPanel.setId( 'assets-folders' );
	folderPanel.setWidth( '200px' );
	folderPanel.setBorderRight( 'none' );
	folderPanel.setOverflow( 'auto' );
	folderPanel.dom.style.cssText += 'background: #252525;';

	// Folder tree
	const folderTree = document.createElement( 'div' );
	folderTree.id = 'assets-folder-tree';
	folderTree.style.cssText = 'padding: 0; color: #aaa; font-size: 12px;';
	folderPanel.dom.appendChild( folderTree );

	// Right panel: Files list
	const filesPanel = new UIPanel();
	filesPanel.setId( 'assets-files' );
	filesPanel.dom.style.flex = '1';
	filesPanel.setOverflow( 'auto' );
	filesPanel.setPosition( 'relative' );
	filesPanel.dom.style.cssText += 'background: #1e1e1e;';

	// Files list table
	const filesTable = document.createElement( 'table' );
	filesTable.id = 'assets-files-table';
	filesTable.style.cssText = 'width: 100%; border-collapse: collapse; color: #aaa; font-size: 12px;';

	// Table header
	const tableHeader = document.createElement( 'thead' );
	tableHeader.style.cssText = 'background: #2a2a2a; border-bottom: none;';
	const headerRow = document.createElement( 'tr' );

	const nameHeader = document.createElement( 'th' );
	nameHeader.textContent = 'Name';
	nameHeader.style.cssText = 'text-align: left; padding: 4px 8px; font-weight: bold; color: #aaa;';

	const typeHeader = document.createElement( 'th' );
	typeHeader.textContent = 'Type';
	typeHeader.style.cssText = 'text-align: left; padding: 4px 8px; font-weight: bold; color: #aaa; width: 120px;';

	const sizeHeader = document.createElement( 'th' );
	sizeHeader.textContent = 'Size';
	sizeHeader.style.cssText = 'text-align: left; padding: 4px 8px; font-weight: bold; color: #aaa; width: 100px;';

	headerRow.appendChild( nameHeader );
	headerRow.appendChild( typeHeader );
	headerRow.appendChild( sizeHeader );
	tableHeader.appendChild( headerRow );
	filesTable.appendChild( tableHeader );

	// Table body
	const tableBody = document.createElement( 'tbody' );
	tableBody.id = 'assets-files-tbody';
	filesTable.appendChild( tableBody );

	filesPanel.dom.appendChild( filesTable );

	// Store reference to table body for refreshFiles
	const filesTableBody = tableBody;

	// Drop zone overlay
	const dropZone = document.createElement( 'div' );
	dropZone.id = 'assets-drop-zone';
	dropZone.style.cssText = 'position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 100, 200, 0.1); border: 2px dashed #08f; display: none; z-index: 1000; pointer-events: none;';
	filesPanel.dom.appendChild( dropZone );

	// Context menu
	const contextMenu = new UIPanel();
	contextMenu.setId( 'assets-context-menu' );
	contextMenu.setPosition( 'fixed' );
	contextMenu.setDisplay( 'none' );
	contextMenu.dom.style.cssText = 'position: fixed; background: #2a2a2a; border: 1px solid #444; box-shadow: 0 4px 8px rgba(0,0,0,0.3); z-index: 100000; width: auto; min-width: 150px; max-width: 300px; padding: 4px 0; display: none; left: 0; top: 0;';
	document.body.appendChild( contextMenu.dom );

	// Context menu items
	function createMenuItem( text, onClick ) {

		const item = new UIRow();
		item.setClass( 'option' );
		item.setTextContent( text );
		item.dom.style.cssText = 'padding: 8px 16px; cursor: pointer; color: #aaa;';
		item.dom.addEventListener( 'mouseenter', function () {
			item.dom.style.background = '#444';
		} );
		item.dom.addEventListener( 'mouseleave', function () {
			item.dom.style.background = '';
		} );
		item.onClick( function () {
			onClick();
			hideContextMenu();
		} );
		return item;

	}

	const newFolderItem = createMenuItem( 'New Folder', function () {
		createNewFolder();
	} );

	// New Asset with submenu
	const newAssetSubmenuTitle = new UIRow();
	newAssetSubmenuTitle.setClass( 'option' );
	newAssetSubmenuTitle.addClass( 'submenu-title' );
	newAssetSubmenuTitle.setTextContent( 'New Asset' );
	newAssetSubmenuTitle.dom.style.cssText = 'padding: 8px 16px; cursor: pointer; color: #aaa; display: flex; justify-content: space-between; align-items: center; position: relative;';
	
	// Add arrow indicator
	const arrow = document.createElement( 'span' );
	arrow.textContent = '▶';
	arrow.style.cssText = 'font-size: 10px; margin-left: 8px;';
	newAssetSubmenuTitle.dom.appendChild( arrow );

	const newAssetSubmenu = new UIPanel();
	newAssetSubmenu.setId( 'assets-submenu' );
	newAssetSubmenu.setPosition( 'fixed' );
	newAssetSubmenu.setClass( 'options' );
	newAssetSubmenu.setDisplay( 'none' );
	newAssetSubmenu.dom.style.cssText = 'position: fixed; background: #2a2a2a; border: 1px solid #444; box-shadow: 0 4px 8px rgba(0,0,0,0.3); z-index: 100001; min-width: 180px; padding: 4px 0; border-radius: 4px; display: none; width: auto;';

	// Asset type options (excluding Folder - that's in main menu)
	const assetTypes = [
		{ name: 'Upload', icon: '📤', action: () => addAsset() },
		{ name: 'CSS', icon: '📄', action: () => createAssetFile( 'css', '' ) },
		{ name: 'CubeMap', icon: '🌐', action: () => createAssetFile( 'cubemap', '' ) },
		{ name: 'HTML', icon: '🌐', action: () => createAssetFile( 'html', '' ) },
		{ name: 'JSON', icon: '📄', action: () => createAssetFile( 'json', '{}' ) },
		{ name: 'Material', icon: '🎨', action: () => createAssetFile( 'material', '' ) },
		{ name: 'Script', icon: '📜', action: () => createAssetFile( 'js', '// Script' ) },
		{ name: 'Shader', icon: '📄', action: () => createAssetFile( 'shader', '' ) },
		{ name: 'Text', icon: '📝', action: () => createAssetFile( 'txt', '' ) }
	];

	assetTypes.forEach( assetType => {
		const item = new UIRow();
		item.setClass( 'option' );
		item.dom.style.cssText = 'padding: 8px 16px; cursor: pointer; color: #aaa; display: flex; align-items: center; gap: 8px;';
		item.dom.innerHTML = `<span>${assetType.icon}</span><span>${assetType.name}</span>`;
		item.dom.addEventListener( 'mouseenter', function () {
			item.dom.style.background = '#444';
		} );
		item.dom.addEventListener( 'mouseleave', function () {
			item.dom.style.background = '';
		} );
		item.onClick( function () {
			assetType.action();
			hideContextMenu();
		} );
		newAssetSubmenu.add( item );
	} );

	let submenuTimeout;

	function showSubmenu() {
		clearTimeout( submenuTimeout );
		
		const rect = newAssetSubmenuTitle.dom.getBoundingClientRect();
		const windowWidth = window.innerWidth;
		const windowHeight = window.innerHeight;
		
		// First, show the submenu off-screen to measure it
		newAssetSubmenu.dom.style.left = '-9999px';
		newAssetSubmenu.dom.style.top = '0px';
		newAssetSubmenu.dom.style.display = 'block';
		
		// Force a reflow to get accurate measurements
		newAssetSubmenu.dom.offsetHeight;
		
		// Now measure it
		const submenuRect = newAssetSubmenu.dom.getBoundingClientRect();
		
		// Position to the right of the menu item
		let left = rect.right + 2;
		let top = rect.top;
		
		// Adjust if submenu would go off screen horizontally
		if ( left + submenuRect.width > windowWidth ) {
			// Position to the left instead
			left = rect.left - submenuRect.width - 2;
			// Ensure it doesn't go off the left edge
			if ( left < 0 ) {
				left = 10;
			}
		}
		
		// Adjust if submenu would go off screen vertically
		if ( top + submenuRect.height > windowHeight ) {
			top = windowHeight - submenuRect.height - 10;
		}
		
		// Ensure it doesn't go above screen
		if ( top < 0 ) {
			top = 10;
		}
		
		// Apply final position
		newAssetSubmenu.dom.style.left = left + 'px';
		newAssetSubmenu.dom.style.top = top + 'px';
	}

	newAssetSubmenuTitle.dom.addEventListener( 'mouseenter', showSubmenu );
	newAssetSubmenuTitle.dom.addEventListener( 'mouseover', showSubmenu );

	newAssetSubmenuTitle.dom.addEventListener( 'mouseleave', function () {
		submenuTimeout = setTimeout( function () {
			if ( ! newAssetSubmenu.dom.matches( ':hover' ) ) {
				newAssetSubmenu.dom.style.display = 'none';
			}
		}, 150 );
	} );

	newAssetSubmenu.dom.addEventListener( 'mouseenter', function () {
		clearTimeout( submenuTimeout );
		newAssetSubmenu.dom.style.display = 'block';
	} );

	newAssetSubmenu.dom.addEventListener( 'mouseleave', function () {
		newAssetSubmenu.dom.style.display = 'none';
	} );

	newAssetSubmenuTitle.add( newAssetSubmenu );
	
	// Add submenu to document body so it can appear outside context menu bounds
	document.body.appendChild( newAssetSubmenu.dom );
	
	contextMenu.add( newFolderItem );
	contextMenu.add( newAssetSubmenuTitle );

	const copyItem = createMenuItem( 'Copy', function () {
		// TODO: Copy selected asset
		console.log( 'Copy clicked' );
	} );

	const pasteItem = createMenuItem( 'Paste', function () {
		// TODO: Paste copied asset
		console.log( 'Paste clicked' );
	} );

	contextMenu.add( copyItem );
	contextMenu.add( pasteItem );

	function showContextMenu( x, y ) {

		// Ensure menu is positioned correctly
		contextMenu.dom.style.left = x + 'px';
		contextMenu.dom.style.top = y + 'px';
		contextMenu.dom.style.display = 'block';
		contextMenu.dom.style.width = 'auto';
		contextMenu.dom.style.minWidth = '150px';
		contextMenu.dom.style.maxWidth = '300px';

		// Adjust if menu would go off screen
		const rect = contextMenu.dom.getBoundingClientRect();
		const windowWidth = window.innerWidth;
		const windowHeight = window.innerHeight;

		if ( x + rect.width > windowWidth ) {
			contextMenu.dom.style.left = ( windowWidth - rect.width - 10 ) + 'px';
		}

		if ( y + rect.height > windowHeight ) {
			contextMenu.dom.style.top = ( windowHeight - rect.height - 10 ) + 'px';
		}

	}


	function hideContextMenu() {

		contextMenu.dom.style.display = 'none';

	}

	// Prevent default context menu and show custom menu
	// Attach to container to catch all right-clicks in assets area
	container.dom.addEventListener( 'contextmenu', function ( event ) {

		event.preventDefault();
		event.stopPropagation();
		showContextMenu( event.clientX, event.clientY );

	} );

	// Also attach to folder tree and files table specifically
	folderTree.addEventListener( 'contextmenu', function ( event ) {

		event.preventDefault();
		event.stopPropagation();
		showContextMenu( event.clientX, event.clientY );

	} );

	filesTable.addEventListener( 'contextmenu', function ( event ) {

		event.preventDefault();
		event.stopPropagation();
		showContextMenu( event.clientX, event.clientY );

	} );

	// Hide context menu when clicking outside
	document.addEventListener( 'click', function ( event ) {

		if ( ! contextMenu.dom.contains( event.target ) ) {
			hideContextMenu();
		}

	} );

	// Also hide on escape key
	document.addEventListener( 'keydown', function ( event ) {

		if ( event.key === 'Escape' ) {
			hideContextMenu();
		}

	} );

	contentArea.add( folderPanel );
	contentArea.add( filesPanel );
	container.add( contentArea );

	// Assets folder structure (in-memory for now)
	let assetsRoot = {
		name: '/',
		path: '/',
		children: [],
		files: [],
		expanded: true
	};

	let currentFolder = assetsRoot;
	let viewMode = 'list'; // 'grid', 'list', 'detailed'
	
	// Assets storage
	const assetsDBName = 'threejs-editor-assets';
	const assetsDBVersion = 1;
	let assetsDatabase;

	// Build folder tree
	function buildFolderTree( folder, parentElement, level = 0 ) {

		const folderItem = document.createElement( 'div' );
		folderItem.style.cssText = `padding: 4px 8px; padding-left: ${level * 16 + 8}px; cursor: pointer; color: #aaa; display: flex; align-items: center;`;
		folderItem.dataset.path = folder.path;

		// Expand/collapse indicator
		const expandIcon = document.createElement( 'span' );
		expandIcon.style.cssText = 'width: 12px; margin-right: 4px; text-align: center;';
		expandIcon.textContent = folder.children.length > 0 ? ( folder.expanded ? '−' : '+' ) : ' ';
		folderItem.appendChild( expandIcon );

		// Folder icon
		const icon = document.createElement( 'span' );
		icon.textContent = '📁';
		icon.style.marginRight = '8px';
		folderItem.appendChild( icon );

		// Folder name
		const name = document.createElement( 'span' );
		name.textContent = folder.name;
		folderItem.appendChild( name );

		// Click handler
		folderItem.addEventListener( 'click', function ( e ) {

			// Toggle expand/collapse if clicking on expand icon
			if ( e.target === expandIcon && folder.children.length > 0 ) {
				folder.expanded = ! folder.expanded;
				refreshFolderTree();
				return;
			}

			// Select folder
			Array.from( folderTree.querySelectorAll( 'div' ) ).forEach( item => {
				item.style.background = '';
				item.style.color = '#aaa';
			} );

			folderItem.style.color = '#ff8800';
			currentFolder = folder;
			refreshFiles();

		} );

		parentElement.appendChild( folderItem );

		// Recursively add children if expanded
		if ( folder.expanded ) {
			folder.children.forEach( child => {
				buildFolderTree( child, parentElement, level + 1 );
			} );
		}

	}

	// Refresh folder tree
	function refreshFolderTree() {

		folderTree.innerHTML = '';
		buildFolderTree( assetsRoot, folderTree );

		// Re-select current folder
		const currentItem = folderTree.querySelector( `[data-path="${currentFolder.path}"]` );
		if ( currentItem ) {
			currentItem.style.color = '#ff8800';
		}

	}

	// Format file size
	function formatFileSize( bytes ) {

		if ( bytes === 0 ) return '0 B';
		const k = 1024;
		const sizes = [ 'B', 'KB', 'MB', 'GB' ];
		const i = Math.floor( Math.log( bytes ) / Math.log( k ) );
		return Math.round( bytes / Math.pow( k, i ) * 100 ) / 100 + ' ' + sizes[ i ];

	}

	// Refresh files display
	function refreshFiles() {

		if ( ! filesTableBody ) return;
		filesTableBody.innerHTML = '';

		// Show folders first
		currentFolder.children.forEach( folder => {

		const row = document.createElement( 'tr' );
		row.style.cssText = 'border-bottom: none; cursor: pointer;';
		row.dataset.path = folder.path;

			const nameCell = document.createElement( 'td' );
			nameCell.style.cssText = 'padding: 2px 8px; display: flex; align-items: center; gap: 8px;';
			nameCell.innerHTML = '<span>📁</span><span>' + folder.name + '</span>';

			const typeCell = document.createElement( 'td' );
			typeCell.textContent = 'Folder';
			typeCell.style.cssText = 'padding: 2px 8px; color: #888;';

			const sizeCell = document.createElement( 'td' );
			sizeCell.textContent = '';
			sizeCell.style.cssText = 'padding: 2px 8px;';

			row.appendChild( nameCell );
			row.appendChild( typeCell );
			row.appendChild( sizeCell );

			row.addEventListener( 'click', function () {
				currentFolder = folder;
				refreshFolderTree();
				refreshFiles();
			} );

			row.addEventListener( 'mouseenter', function () {
				row.style.background = '#333';
			} );

			row.addEventListener( 'mouseleave', function () {
				row.style.background = '';
			} );

			filesTableBody.appendChild( row );

		} );

		// Then show files
		currentFolder.files.forEach( file => {

			const row = document.createElement( 'tr' );
			row.style.cssText = 'border-bottom: none; cursor: pointer;';
			row.dataset.file = file.name;

			const nameCell = document.createElement( 'td' );
			nameCell.style.cssText = 'padding: 2px 8px; display: flex; align-items: center; gap: 8px;';
			nameCell.innerHTML = '<span>' + getFileIcon( file.name ) + '</span><span>' + file.name + '</span>';

			const typeCell = document.createElement( 'td' );
			typeCell.textContent = file.type || 'File';
			typeCell.style.cssText = 'padding: 2px 8px; color: #888;';

			const sizeCell = document.createElement( 'td' );
			sizeCell.textContent = formatFileSize( file.size || 0 );
			sizeCell.style.cssText = 'padding: 2px 8px; color: #888;';

			row.appendChild( nameCell );
			row.appendChild( typeCell );
			row.appendChild( sizeCell );

			row.addEventListener( 'mouseenter', function () {
				row.style.background = '#333';
			} );

			row.addEventListener( 'mouseleave', function () {
				row.style.background = '';
			} );

			filesTableBody.appendChild( row );

		} );

	}

	// Get file icon based on extension
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

	// Handle drag and drop
	filesPanel.dom.addEventListener( 'dragover', function ( event ) {

		event.preventDefault();
		event.stopPropagation();
		dropZone.style.display = 'block';

	} );

	filesPanel.dom.addEventListener( 'dragleave', function ( event ) {

		event.preventDefault();
		event.stopPropagation();

		if ( ! filesPanel.dom.contains( event.relatedTarget ) ) {
			dropZone.style.display = 'none';
		}

	} );

	filesPanel.dom.addEventListener( 'drop', function ( event ) {

		event.preventDefault();
		event.stopPropagation();
		dropZone.style.display = 'none';

		const files = event.dataTransfer.files;

		if ( files.length > 0 ) {

			Array.from( files ).forEach( file => {

				const objectURL = URL.createObjectURL( file );
				const reader = new FileReader();

				reader.onload = function ( e ) {

					const fileEntry = {
						name: file.name,
						content: e.target.result,
						url: objectURL,
						path: currentFolder.path + '/' + file.name,
						size: file.size,
						type: file.type || 'File',
						isBinary: file.type.startsWith( 'image/' ) || file.type.startsWith( 'audio/' ) || file.type.startsWith( 'video/' )
					};

					currentFolder.files.push( fileEntry );
					saveAssets();
					refreshFiles();

				};

				if ( file.type.startsWith( 'text/' ) || file.type === '' ) {
					reader.readAsText( file );
				} else {
					reader.readAsDataURL( file );
				}

			} );

		}

	} );

	// Create new folder
	function createNewFolder() {

		const folderName = prompt( 'Enter folder name:', 'New Folder' );

		if ( folderName && folderName.trim() !== '' ) {

			// Check if folder name already exists
			const existingFolder = currentFolder.children.find( f => f.name === folderName.trim() );
			if ( existingFolder ) {
				alert( 'A folder with this name already exists!' );
				return;
			}

			const newFolder = {
				name: folderName.trim(),
				path: currentFolder.path + '/' + folderName.trim(),
				children: [],
				files: [],
				expanded: false
			};

			currentFolder.children.push( newFolder );
			saveAssets();
			refreshFolderTree();
			refreshFiles();

		}

	}

	// Add asset (file upload)
	function addAsset() {

		const fileInput = document.createElement( 'input' );
		fileInput.type = 'file';
		fileInput.multiple = true;
		fileInput.style.display = 'none';

		fileInput.addEventListener( 'change', function ( event ) {

			const files = event.target.files;

			if ( files.length > 0 ) {

				Array.from( files ).forEach( file => {

					const reader = new FileReader();
					reader.onload = function ( e ) {

						const fileEntry = {
							name: file.name,
							content: e.target.result,
							path: currentFolder.path + '/' + file.name,
							size: file.size,
							type: file.type || 'File',
							isBinary: file.type.startsWith( 'image/' ) || file.type.startsWith( 'audio/' ) || file.type.startsWith( 'video/' )
						};

						// For binary files, store as base64
						if ( fileEntry.isBinary ) {
							const objectURL = URL.createObjectURL( file );
							fileEntry.url = objectURL;
							fileEntry.content = e.target.result; // base64
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

				} );

			}

			// Clean up
			document.body.removeChild( fileInput );

		} );

		document.body.appendChild( fileInput );
		fileInput.click();

	}

	// Create asset file (text-based)
	function createAssetFile( type, defaultContent ) {

		const extMap = {
			'css': 'css',
			'html': 'html',
			'json': 'json',
			'js': 'js',
			'shader': 'glsl',
			'txt': 'txt',
			'material': 'material',
			'cubemap': 'cubemap'
		};

		const ext = extMap[ type ] || 'txt';
		const fileName = prompt( `Enter ${type.toUpperCase()} file name:`, `new.${ext}` );

		if ( fileName && fileName.trim() !== '' ) {

			const fileEntry = {
				name: fileName.trim(),
				content: defaultContent,
				path: currentFolder.path + '/' + fileName.trim(),
				size: defaultContent.length,
				type: type,
				isBinary: false
			};

			currentFolder.files.push( fileEntry );
			saveAssets();
			refreshFiles();

		}

	}

	// Update Add button in header to also trigger addAsset
	addBtn.onClick( function () {
		addAsset();
	} );

	// View mode handlers
	viewListBtn.addEventListener( 'click', function () {
		viewMode = 'list';
		refreshFiles();
	} );

	// Initialize assets storage
	function initAssetsStorage( callback ) {

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

	// Save assets to storage
	function saveAssets() {

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
					url: null
				} ) )
			};

		}

		const serialized = serializeFolder( assetsRoot );
		const transaction = assetsDatabase.transaction( [ 'assets' ], 'readwrite' );
		const objectStore = transaction.objectStore( 'assets' );
		objectStore.put( serialized, 0 );

	}

	// Load assets from storage
	function loadAssets() {

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

							if ( file.isBinary && file.content ) {
								try {
									const byteCharacters = atob( file.content.split( ',' )[ 1 ] );
									const byteNumbers = new Array( byteCharacters.length );
									for ( let i = 0; i < byteCharacters.length; i ++ ) {
										byteNumbers[ i ] = byteCharacters.charCodeAt( i );
									}
									const byteArray = new Uint8Array( byteNumbers );
									const blob = new Blob( [ byteArray ] );
									file.url = URL.createObjectURL( blob );
								} catch ( e ) {
									console.error( 'Failed to recreate blob for', file.name, e );
								}
							}

							return file;

						} );
					}

					return folder;

				}

				assetsRoot = deserializeFolder( data );
				currentFolder = assetsRoot;
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

	// Initialize storage and load assets
	initAssetsStorage( function () {
		loadAssets();
	} );

	return container;

}

export { SidebarAssets };
