import * as THREE from 'three';
import { UIPanel, UIRow, UIButton, UIText, UIInput, UISelect } from './libs/ui.js';
import { ScriptCompiler } from './ScriptCompiler.js';
import { ModelParser } from './ModelParser.js';

function SidebarAssets( editor ) {

	const signals = editor.signals;
	const strings = editor.strings;

	const container = new UIPanel();
	container.setId( 'assets-container' );
	container.setDisplay( 'flex' );
	container.dom.style.flexDirection = 'column';
	container.setHeight( '100%' );

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

	const headerLeft = document.createElement( 'div' );
	headerLeft.style.cssText = 'display: flex; align-items: center; gap: 8px;';

	const collapseBtn = document.createElement( 'button' );
	collapseBtn.textContent = '▼';
	collapseBtn.style.cssText = 'background: none; border: none; color: #aaa; cursor: pointer; padding: 4px;';
	headerLeft.appendChild( collapseBtn );

	const assetsTitle = new UIText( 'ASSETS' );
	assetsTitle.dom.style.cssText = 'color: #aaa; font-weight: bold; margin-right: 8px;';
	headerLeft.appendChild( assetsTitle.dom );

	const addBtn = new UIButton( '+' );
	addBtn.dom.style.cssText = 'width: 24px; height: 24px; padding: 0; font-size: 16px;';
	
	const addMenu = document.createElement( 'div' );
	addMenu.style.cssText = 'position: absolute; background: #2a2a2a; border: 1px solid #444; padding: 4px 0; z-index: 1000; display: none; min-width: 150px;';
	addMenu.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
	
	const menuItems = [
		{ label: 'Script', action: 'script' },
		{ label: 'Folder', action: 'folder' },
		{ label: 'Import File...', action: 'import' }
	];
	
	menuItems.forEach( item => {
		const menuItem = document.createElement( 'div' );
		menuItem.textContent = item.label;
		menuItem.style.cssText = 'padding: 6px 12px; cursor: pointer; color: #aaa; font-size: 12px;';
		menuItem.addEventListener( 'mouseenter', () => {
			menuItem.style.background = '#333';
		} );
		menuItem.addEventListener( 'mouseleave', () => {
			menuItem.style.background = 'transparent';
		} );
		menuItem.addEventListener( 'click', () => {
			addMenu.style.display = 'none';
			if ( item.action === 'script' ) {
				createScriptAsset();
			} else if ( item.action === 'folder' ) {
				createFolder();
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
		addMenu.style.display = addMenu.style.display === 'none' ? 'block' : 'none';
		event.stopPropagation();
	} );
	
	document.addEventListener( 'click', function ( event ) {
		if ( !addMenu.contains( event.target ) && event.target !== addBtn.dom ) {
			addMenu.style.display = 'none';
		}
	} );
	
	document.body.appendChild( addMenu );
	headerLeft.appendChild( addBtn.dom );

	const deleteBtn = document.createElement( 'button' );
	deleteBtn.innerHTML = '🗑️';
	deleteBtn.style.cssText = 'background: none; border: none; color: #aaa; cursor: pointer; padding: 4px; width: 24px; height: 24px;';
	deleteBtn.title = 'Delete';
	deleteBtn.addEventListener( 'click', function () {
		if ( window.selectedAsset ) {
			editor.deleteAsset( window.selectedAsset.path );
		}
	} );
	headerLeft.appendChild( deleteBtn );

	const undoBtn = document.createElement( 'button' );
	undoBtn.innerHTML = '↶';
	undoBtn.style.cssText = 'background: none; border: none; color: #aaa; cursor: pointer; padding: 4px; width: 24px; height: 24px;';
	undoBtn.title = 'Undo';
	headerLeft.appendChild( undoBtn );

	const headerCenter = document.createElement( 'div' );
	headerCenter.style.cssText = 'display: flex; align-items: center; gap: 8px; flex: 1; justify-content: center;';

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

	const filterSelect = new UISelect();
	filterSelect.setOptions( { 'all': 'All' } );
	filterSelect.setValue( 'all' );
	filterSelect.dom.style.cssText = 'margin-left: 8px;';
	headerCenter.appendChild( filterSelect.dom );

	const searchInput = new UIInput( '' );
	searchInput.dom.type = 'text';
	searchInput.dom.placeholder = 'Search';
	searchInput.dom.style.cssText = 'margin-left: 8px; padding: 4px 8px; background: #1e1e1e; border: 1px solid #444; color: #aaa; width: 200px;';
	headerCenter.appendChild( searchInput.dom );

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

	const contentArea = new UIPanel();
	contentArea.dom.style.cssText = 'display: flex; flex: 1; overflow: hidden; margin: 0; padding: 0; border-top: none;';

	const folderPanel = new UIPanel();
	folderPanel.setId( 'assets-folders' );
	folderPanel.setWidth( '200px' );
	folderPanel.setBorderRight( 'none' );
	folderPanel.setOverflow( 'auto' );
	folderPanel.dom.style.cssText += 'background: #252525;';

	const folderTree = document.createElement( 'div' );
	folderTree.id = 'assets-folder-tree';
	folderTree.style.cssText = 'padding: 0; color: #aaa; font-size: 12px;';
	folderPanel.dom.appendChild( folderTree );

	const filesPanel = new UIPanel();
	filesPanel.setId( 'assets-files' );
	filesPanel.dom.style.flex = '1';
	filesPanel.setOverflow( 'auto' );
	filesPanel.setPosition( 'relative' );
	filesPanel.dom.style.cssText += 'background: #1e1e1e;';

	const filesTable = document.createElement( 'table' );
	filesTable.id = 'assets-files-table';
	filesTable.style.cssText = 'width: 100%; border-collapse: collapse; color: #aaa; font-size: 12px;';

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

	const tableBody = document.createElement( 'tbody' );
	tableBody.id = 'assets-files-tbody';
	filesTable.appendChild( tableBody );

	filesPanel.dom.appendChild( filesTable );

	const filesTableBody = tableBody;

	const dropZone = document.createElement( 'div' );
	dropZone.id = 'assets-drop-zone';
	dropZone.style.cssText = 'position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 100, 200, 0.1); border: 2px dashed #08f; display: none; z-index: 1000; pointer-events: none;';
	filesPanel.dom.appendChild( dropZone );
	
	filesPanel.dom.style.position = 'relative';
	filesPanel.dom.setAttribute('data-drop-zone', 'true');

	const contextMenu = new UIPanel();
	contextMenu.setId( 'assets-context-menu' );
	contextMenu.setPosition( 'fixed' );
	contextMenu.setDisplay( 'none' );
	contextMenu.dom.style.cssText = 'position: fixed; background: #2a2a2a; border: 1px solid #444; box-shadow: 0 4px 8px rgba(0,0,0,0.3); z-index: 100000; width: auto; min-width: 150px; max-width: 300px; padding: 4px 0; display: none; left: 0; top: 0;';
	document.body.appendChild( contextMenu.dom );

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

	const newAssetSubmenuTitle = new UIRow();
	newAssetSubmenuTitle.setClass( 'option' );
	newAssetSubmenuTitle.addClass( 'submenu-title' );
	newAssetSubmenuTitle.setTextContent( 'New Asset' );
	newAssetSubmenuTitle.dom.style.cssText = 'padding: 8px 16px; cursor: pointer; color: #aaa; display: flex; justify-content: space-between; align-items: center; position: relative;';
	
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

	const assetTypes = [
		{ name: 'Upload', icon: '📤', action: () => addAsset() },
		{ name: 'CSS', icon: '📄', action: () => createAssetFile( 'css', '' ) },
		{ name: 'CubeMap', icon: '🌐', action: () => createAssetFile( 'cubemap', '' ) },
		{ name: 'HTML', icon: '🌐', action: () => createAssetFile( 'html', '' ) },
		{ name: 'JSON', icon: '📄', action: () => createAssetFile( 'json', '{}' ) },
		{ name: 'Material', icon: '🎨', action: () => createAssetFile( 'material', '' ) },
		{ name: 'Script', icon: '📜', action: () => createAssetFile( 'js', '' ) },
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
		
		newAssetSubmenu.dom.style.left = '-9999px';
		newAssetSubmenu.dom.style.top = '0px';
		newAssetSubmenu.dom.style.display = 'block';
		
		newAssetSubmenu.dom.offsetHeight;
		
		const submenuRect = newAssetSubmenu.dom.getBoundingClientRect();
		
		let left = rect.right + 2;
		let top = rect.top;
		
		if ( left + submenuRect.width > windowWidth ) {
			
			left = rect.left - submenuRect.width - 2;
			if ( left < 0 ) {
				left = 10;
			}
		}
		
		if ( top + submenuRect.height > windowHeight ) {
			top = windowHeight - submenuRect.height - 10;
		}
		
		if ( top < 0 ) {
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

	function showContextMenu( x, y ) {

		contextMenu.dom.style.left = x + 'px';
		contextMenu.dom.style.top = y + 'px';
		contextMenu.dom.style.display = 'block';
		contextMenu.dom.style.width = 'auto';
		contextMenu.dom.style.minWidth = '150px';
		contextMenu.dom.style.maxWidth = '300px';

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

	container.dom.addEventListener( 'contextmenu', function ( event ) {

		event.preventDefault();
		event.stopPropagation();
		showContextMenu( event.clientX, event.clientY );

	} );

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
	
	const isTauri = typeof window !== 'undefined' && window.__TAURI__;
	const assetsDBName = 'threejs-editor-assets';
	const assetsDBVersion = 1;
	let assetsDatabase;
	
	const invoke = isTauri ? window.__TAURI__.core.invoke : null;

	function buildFolderTree( folder, parentElement, level = 0 ) {

		const folderItem = document.createElement( 'div' );
		folderItem.style.cssText = `padding: 4px 8px; padding-left: ${level * 16 + 8}px; cursor: pointer; color: #aaa; display: flex; align-items: center;`;
		folderItem.dataset.path = folder.path;

		
		const expandIcon = document.createElement( 'span' );
		expandIcon.style.cssText = 'width: 12px; margin-right: 4px; text-align: center;';
		const hasChildren = folder.children.length > 0 || folder.files.length > 0;
		expandIcon.textContent = hasChildren ? ( folder.expanded ? '−' : '+' ) : ' ';
		folderItem.appendChild( expandIcon );

		
		const icon = document.createElement( 'span' );
		icon.textContent = '📁';
		icon.style.marginRight = '8px';
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
				Array.from( folderTree.querySelectorAll( 'div' ) ).forEach( item => {
					item.style.background = '';
					item.style.color = '#aaa';
				} );

				folderItem.style.color = '#ff8800';
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
			currentItem.style.color = '#ff8800';
		}

	}

	
	function formatFileSize( bytes ) {

		if ( bytes === 0 ) return '0 B';
		const k = 1024;
		const sizes = [ 'B', 'KB', 'MB', 'GB' ];
		const i = Math.floor( Math.log( bytes ) / Math.log( k ) );
		return Math.round( bytes / Math.pow( k, i ) * 100 ) / 100 + ' ' + sizes[ i ];

	}

	
	function refreshFiles() {

		if ( ! filesTableBody ) return;
		filesTableBody.innerHTML = '';

		
		currentFolder.children.forEach( folder => {

		const row = document.createElement( 'tr' );
		row.style.cssText = 'border-bottom: none; cursor: pointer;';
		row.dataset.path = folder.path;

			const nameCell = document.createElement( 'td' );
			nameCell.style.cssText = 'padding: 2px 8px; display: flex; align-items: center; gap: 8px;';
			
			const icon = document.createElement( 'span' );
			icon.textContent = '📁';
			nameCell.appendChild( icon );
			
			const nameSpan = document.createElement( 'span' );
			nameSpan.textContent = folder.name;
			nameCell.appendChild( nameSpan );

			const typeCell = document.createElement( 'td' );
			typeCell.textContent = 'Folder';
			typeCell.style.cssText = 'padding: 2px 8px; color: #888;';

			const sizeCell = document.createElement( 'td' );
			sizeCell.textContent = '';
			sizeCell.style.cssText = 'padding: 2px 8px;';

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
					document.querySelectorAll( '#files-table-body tr' ).forEach( r => {
						r.style.background = '';
					} );
					row.style.background = '#444';
					selectedAsset = { type: 'folder', path: folder.path, name: folder.name, folder: currentFolder };
					window.selectedAsset = selectedAsset;
				}, 300 );
			} );

			row.addEventListener( 'mouseenter', function () {
				row.style.background = '#333';
			} );

			row.addEventListener( 'mouseleave', function () {
				row.style.background = '';
			} );

			filesTableBody.appendChild( row );

		} );

		
		
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
		
		filesToShow.forEach( file => {

			const row = document.createElement( 'tr' );
			row.style.cssText = 'border-bottom: none; cursor: pointer; user-select: none; -webkit-user-select: none;';
			row.draggable = true;
			row.dataset.file = file.name;
			row.dataset.path = file.path;

			const nameCell = document.createElement( 'td' );
			nameCell.style.cssText = 'padding: 2px 8px; display: flex; align-items: center; gap: 8px;';
			nameCell.innerHTML = '<span>' + getFileIcon( file.name ) + '</span><span>' + file.name + '</span>';

			const typeCell = document.createElement( 'td' );
			typeCell.textContent = file.type || 'File';
			typeCell.style.cssText = 'padding: 2px 8px; color: #888;';

			const sizeCell = document.createElement( 'td' );
			sizeCell.style.cssText = 'padding: 2px 8px; color: #888; display: flex; align-items: center; gap: 8px; justify-content: space-between;';
			
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
				const assetData = {
					path: file.path,
					name: file.name,
					type: file.type || 'file',
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
				document.querySelectorAll( '#files-table-body tr' ).forEach( r => {
					r.style.background = '';
				} );
				row.style.background = '#444';
				selectedAsset = { type: 'file', path: file.path, name: file.name, folder: currentFolder };
				window.selectedAsset = selectedAsset;
			} );

			row.addEventListener( 'mouseenter', function () {
				if ( selectedAsset === null || selectedAsset.path !== file.path ) {
					row.style.background = '#333';
				}
			} );

			row.addEventListener( 'mouseleave', function () {
				if ( selectedAsset === null || selectedAsset.path !== file.path ) {
					row.style.background = '';
				} else {
					row.style.background = '#444';
				}
			} );
			
			row.addEventListener( 'dragstart', function ( e ) {
				e.dataTransfer.effectAllowed = 'copy';
				const assetData = {
					path: file.path,
					name: file.name,
					type: file.type || 'file',
					modelPath: file.modelPath || null,
					modelName: file.modelName || null
				};
				try {
					e.dataTransfer.setData( 'text/plain', JSON.stringify( assetData ) );
				} catch ( error ) {
					console.error( '[Assets] Failed to serialize asset data:', error );
				}
			} );
			
			if ( isScript ) {
				row.addEventListener( 'dblclick', function ( e ) {
					e.stopPropagation();
					openFileInEditor( file.path );
				} );
			}

			filesTableBody.appendChild( row );

		} );

	}

	async function openFileInEditor( filePath ) {
		if ( !isTauri || !invoke ) return;
		
		const projectPath = editor.storage && editor.storage.getProjectPath ? editor.storage.getProjectPath() : null;
		if ( !projectPath ) return;
		
		let assetPath = filePath;
		if ( assetPath.startsWith( '/' ) ) {
			assetPath = assetPath.slice( 1 );
		}
		assetPath = assetPath.replace( /\/+/g, '/' );
		
		try {
			await invoke( 'open_file_in_editor', {
				projectPath: projectPath,
				assetPath: assetPath
			} );
		} catch ( error ) {
		}
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
		console.log('[Assets] Drop event received', event.dataTransfer.files.length, event.target);
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
											name: geo.name + '.geometry',
											path: modelFolder.path + '/' + geo.name + '.geometry',
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
										modelFolder.files.push( {
											name: mat.name + '.material',
											path: modelFolder.path + '/' + mat.name + '.material',
											type: 'material',
											size: 0,
											isBinary: false,
											modelMaterial: mat,
											modelPath: filePath,
											modelName: file.name
										} );
									} );
									
									
									modelFolder.files.push( {
										name: baseName + '.model',
										path: modelFolder.path + '/' + baseName + '.model',
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

	
	function createNewFolder() {

		const folderName = prompt( 'Enter folder name:', 'New Folder' );

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
										
										
										modelContents.geometries.forEach( geo => {
											modelFolder.files.push( {
												name: geo.name + '.geometry',
												path: modelFolder.path + '/' + geo.name + '.geometry',
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
											modelFolder.files.push( {
												name: mat.name + '.material',
												path: modelFolder.path + '/' + mat.name + '.material',
												type: 'material',
												size: 0,
												isBinary: false,
												modelMaterial: mat,
												modelPath: filePath,
												modelName: file.name
											} );
										} );
										
										
										modelFolder.files.push( {
											name: baseName + '.model',
											path: modelFolder.path + '/' + baseName + '.model',
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

			
			let normalizedPath = currentFolder.path;
			if ( normalizedPath === '/' ) {
				normalizedPath = '';
			} else if ( normalizedPath.endsWith( '/' ) ) {
				normalizedPath = normalizedPath.slice( 0, -1 );
			}
			const filePath = normalizedPath + '/' + fileName.trim();
			
			const fileEntry = {
				name: fileName.trim(),
				content: defaultContent,
				path: filePath,
				size: defaultContent.length,
				type: type,
				isBinary: false
			};

			currentFolder.files.push( fileEntry );
			saveAssets().catch( error => {
				console.error( '[Assets] Error saving assets:', error );
			} );
			refreshFiles();

		}

	}

	function createScriptAsset() {
		const fileName = prompt( 'Enter script name:', 'NewScript.ts' );
		
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

	function createFolder() {
		const folderName = prompt( 'Enter folder name:', 'New Folder' );
		
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

	
	viewListBtn.addEventListener( 'click', function () {
		viewMode = 'list';
		refreshFiles();
	} );

	
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
						
						const fileEntry = {
							name: fileInfo.name,
							path: filePath,
							size: fileInfo.size || 0,
							type: fileType,
							isBinary: [ 'image', 'model', 'audio', 'video' ].includes( fileType ),
							content: ''
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
					files: filesToSave.map( file => ( {
						name: file.name,
						path: file.path,
						size: file.size,
						type: file.type,
						isBinary: file.isBinary || false,
						content: '',
						url: null,
						modelPath: file.modelPath || null,
						modelName: file.modelName || null
					} ) )
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
								file.path.endsWith( '.geometry' ) || 
								file.path.endsWith( '.texture' ) || 
								file.path.endsWith( '.material' ) || 
								file.path.endsWith( '.model' )
							) ) {
								
								const pathMatch = file.path.match( /\/([^\/]+)\.(glb|gltf|fbx|obj)/ );
								if ( pathMatch ) {
									continue; 
								}
							}
							
							let fileContent;
							if ( file.isBinary && file.content ) {
								const base64Data = file.content.split( ',' )[ 1 ] || file.content;
								const byteCharacters = atob( base64Data );
								const byteNumbers = new Array( byteCharacters.length );
								for ( let i = 0; i < byteCharacters.length; i ++ ) {
									byteNumbers[ i ] = byteCharacters.charCodeAt( i );
								}
								fileContent = Array.from( new Uint8Array( byteNumbers ) );
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
					modelName: file.modelName || null
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
									modelName: fileData.modelName || null
								};

								try {
									
									
									
									const isVirtualFile = fileData.modelGeometry || fileData.modelTexture || 
									                     fileData.modelMaterial || fileData.modelObject ||
									                     ( fileData.path && (
									                         fileData.path.endsWith( '.geometry' ) ||
									                         fileData.path.endsWith( '.texture' ) ||
									                         fileData.path.endsWith( '.material' ) ||
									                         fileData.path.endsWith( '.model' )
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
															name: geo.name + '.geometry',
															path: modelFolder.path + '/' + geo.name + '.geometry',
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
															name: mat.name + '.material',
															path: modelFolder.path + '/' + mat.name + '.material',
															type: 'material',
															size: 0,
															isBinary: false,
															modelMaterial: mat,
															modelPath: file.path,
															modelName: file.name
														} );
													} );
													
													
													modelFolder.files.push( {
														name: baseName + '.model',
														path: modelFolder.path + '/' + baseName + '.model',
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
									console.warn( '[Assets] Failed to load file:', fileData.path, error );
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

	return container;

}

export { SidebarAssets };
