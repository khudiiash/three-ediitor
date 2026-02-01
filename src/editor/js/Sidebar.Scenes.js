import { UIPanel, UIRow, UIText, UIButton, UIInput } from './libs/ui.js';
import * as THREE from 'three';

function SidebarScenes( editor ) {

	const signals = editor.signals;
	const storage = editor.storage;

	const container = new UIPanel();
	container.setPadding( '10px' );

	const buttonRow = new UIRow();
	buttonRow.setMarginBottom( '10px' );
	buttonRow.dom.style.display = 'flex';
	buttonRow.dom.style.gap = '8px';
	
	const newButton = new UIButton( '+ New' );
	newButton.dom.style.flex = '1';
	newButton.onClick( createNewScene );
	buttonRow.add( newButton );

	const templateButton = new UIButton( 'Template' );
	templateButton.dom.style.flex = '1';
	templateButton.onClick( createFromTemplate );
	buttonRow.add( templateButton );

	container.add( buttonRow );

	const scenesList = new UIPanel();
	container.add( scenesList );

	function showPrompt( title, defaultValue, callback ) {
		const overlay = document.createElement( 'div' );
		overlay.style.position = 'fixed';
		overlay.style.top = '0';
		overlay.style.left = '0';
		overlay.style.width = '100%';
		overlay.style.height = '100%';
		overlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
		overlay.style.zIndex = '10000';
		overlay.style.display = 'flex';
		overlay.style.alignItems = 'center';
		overlay.style.justifyContent = 'center';

		const dialog = document.createElement( 'div' );
		dialog.style.backgroundColor = '#2a2a2a';
		dialog.style.border = '1px solid #444';
		dialog.style.borderRadius = '4px';
		dialog.style.padding = '20px';
		dialog.style.minWidth = '300px';
		dialog.style.boxShadow = '0 8px 32px rgba(0,0,0,0.8)';

		const titleEl = document.createElement( 'div' );
		titleEl.textContent = title;
		titleEl.style.fontSize = '14px';
		titleEl.style.color = '#ddd';
		titleEl.style.marginBottom = '12px';
		titleEl.style.fontWeight = '500';
		dialog.appendChild( titleEl );

		const input = document.createElement( 'input' );
		input.type = 'text';
		input.value = defaultValue || '';
		input.style.width = '100%';
		input.style.padding = '8px';
		input.style.backgroundColor = '#1a1a1a';
		input.style.border = '1px solid #444';
		input.style.borderRadius = '3px';
		input.style.color = '#ddd';
		input.style.fontSize = '13px';
		input.style.marginBottom = '16px';
		input.style.boxSizing = 'border-box';
		dialog.appendChild( input );

		const buttonRow = document.createElement( 'div' );
		buttonRow.style.display = 'flex';
		buttonRow.style.gap = '8px';
		buttonRow.style.justifyContent = 'flex-end';

		const cancelBtn = document.createElement( 'button' );
		cancelBtn.textContent = 'Cancel';
		cancelBtn.style.padding = '6px 16px';
		cancelBtn.style.backgroundColor = '#333';
		cancelBtn.style.border = '1px solid #555';
		cancelBtn.style.borderRadius = '3px';
		cancelBtn.style.color = '#ddd';
		cancelBtn.style.cursor = 'pointer';
		cancelBtn.style.fontSize = '12px';
		cancelBtn.onmouseenter = () => cancelBtn.style.backgroundColor = '#3a3a3a';
		cancelBtn.onmouseleave = () => cancelBtn.style.backgroundColor = '#333';
		cancelBtn.onclick = () => {
			document.body.removeChild( overlay );
		};
		buttonRow.appendChild( cancelBtn );

		const okBtn = document.createElement( 'button' );
		okBtn.textContent = 'OK';
		okBtn.style.padding = '6px 16px';
		okBtn.style.backgroundColor = '#2ea8ff';
		okBtn.style.border = '1px solid #2ea8ff';
		okBtn.style.borderRadius = '3px';
		okBtn.style.color = '#fff';
		okBtn.style.cursor = 'pointer';
		okBtn.style.fontSize = '12px';
		okBtn.onmouseenter = () => okBtn.style.backgroundColor = '#3eb5ff';
		okBtn.onmouseleave = () => okBtn.style.backgroundColor = '#2ea8ff';
		okBtn.onclick = () => {
			const value = input.value.trim();
			if ( value ) {
				callback( value );
				document.body.removeChild( overlay );
			}
		};
		buttonRow.appendChild( okBtn );

		dialog.appendChild( buttonRow );
		overlay.appendChild( dialog );

		input.onkeydown = ( e ) => {
			if ( e.key === 'Enter' ) {
				okBtn.click();
			} else if ( e.key === 'Escape' ) {
				cancelBtn.click();
			}
		};

		document.body.appendChild( overlay );
		setTimeout( () => {
			input.focus();
			input.select();
		}, 10 );
	}

	async function refresh() {
		scenesList.clear();

		const scenes = await storage.listScenes();
		const currentScene = storage.getCurrentScene();
		
		if ( scenes.length === 0 ) {
			const emptyText = new UIText( 'No scenes' );
			emptyText.setColor( '#666' );
			emptyText.setMarginTop( '20px' );
			emptyText.dom.style.textAlign = 'center';
			scenesList.add( emptyText );
			return;
		}

		for ( let i = 0; i < scenes.length; i++ ) {
			scenesList.add( buildSceneRow( scenes[ i ], currentScene ) );
		}
	}

	function buildSceneRow( sceneData, currentScene ) {
		const isActive = sceneData.name === currentScene;
		
		const card = new UIPanel();
		card.setMarginBottom( '8px' );
		card.setPadding( '10px' );
		card.dom.style.backgroundColor = '#1a1a1a';
		card.dom.style.borderRadius = '3px';
		card.dom.style.border = isActive ? '1px solid #2ea8ff' : '1px solid #2a2a2a';
		card.dom.style.transition = 'all 0.15s ease';
		card.dom.onmouseenter = function() {
			if ( !isActive ) this.style.backgroundColor = '#202020';
		};
		card.dom.onmouseleave = function() {
			if ( !isActive ) this.style.backgroundColor = '#1a1a1a';
		};

		const topRow = new UIRow();
		topRow.setMarginBottom( '8px' );
		topRow.dom.style.display = 'flex';
		topRow.dom.style.alignItems = 'center';
		topRow.dom.style.justifyContent = 'space-between';
		
		const leftSide = new UIPanel();
		leftSide.dom.style.display = 'flex';
		leftSide.dom.style.alignItems = 'center';
		leftSide.dom.style.gap = '8px';
		
		const nameText = new UIText( sceneData.name.replace( '.json', '' ) );
		nameText.setFontSize( '13px' );
		nameText.setFontWeight( '500' );
		nameText.setColor( isActive ? 'var(--accent-primary)' : '#ddd' );
		leftSide.add( nameText );

		if ( sceneData.isDefault ) {
			const badge = new UIText( 'DEFAULT' );
			badge.setFontSize( '9px' );
			badge.setColor( '#ffb300' );
			badge.dom.style.backgroundColor = 'rgba(255, 179, 0, 0.15)';
			badge.dom.style.padding = '2px 6px';
			badge.dom.style.borderRadius = '2px';
			badge.dom.style.fontWeight = '600';
			badge.dom.style.border = '1px solid rgba(255, 179, 0, 0.3)';
			leftSide.add( badge );
		}

		const rightSide = new UIPanel();
		rightSide.dom.style.display = 'flex';
		rightSide.dom.style.gap = '4px';

		const buildIndicator = new UIText( sceneData.includeInBuild ? '●' : '○' );
		buildIndicator.setColor( sceneData.includeInBuild ? '#88cc88' : '#555' );
		buildIndicator.dom.title = 'Include in build';
		buildIndicator.dom.style.cursor = 'pointer';
		buildIndicator.dom.onclick = async function( e ) {
			e.stopPropagation();
			await storage.updateSceneConfig( sceneData.name, {
				includeInBuild: !sceneData.includeInBuild
			} );
			refresh();
		};
		rightSide.add( buildIndicator );

		topRow.add( leftSide );
		topRow.add( rightSide );
		card.add( topRow );

		const actionsRow = new UIRow();
		actionsRow.dom.style.display = 'flex';
		actionsRow.dom.style.gap = '4px';

		const loadBtn = new UIButton( 'Load' );
		loadBtn.dom.style.flex = '1';
		loadBtn.dom.style.fontSize = '11px';
		loadBtn.dom.style.padding = '4px';
		loadBtn.onClick( async function () {
			if ( isActive ) return;
			if ( confirm( 'Load this scene? Unsaved changes will be lost.' ) ) {
				await loadScene( sceneData.name );
			}
		} );
		if ( isActive ) {
			loadBtn.dom.style.opacity = '0.5';
			loadBtn.dom.style.cursor = 'not-allowed';
		}
		actionsRow.add( loadBtn );

		const setDefaultBtn = new UIButton( '★' );
		setDefaultBtn.dom.style.flex = '0 0 32px';
		setDefaultBtn.dom.style.fontSize = '14px';
		setDefaultBtn.dom.style.padding = '4px';
		setDefaultBtn.dom.style.color = sceneData.isDefault ? 'var(--accent-primary)' : '#555';
		setDefaultBtn.dom.title = 'Set as default';
		setDefaultBtn.onClick( async function () {
			await storage.setDefaultScene( sceneData.name );
			refresh();
		} );
		actionsRow.add( setDefaultBtn );

		const menuBtn = new UIButton( '⋮' );
		menuBtn.dom.style.flex = '0 0 32px';
		menuBtn.dom.style.fontSize = '16px';
		menuBtn.dom.style.padding = '4px';
		menuBtn.onClick( function () {
			showSceneMenu( sceneData.name );
		} );
		actionsRow.add( menuBtn );

		card.add( actionsRow );

		return card;
	}

	function showSceneMenu( sceneName ) {
		const menu = document.createElement( 'div' );
		menu.style.position = 'fixed';
		menu.style.backgroundColor = '#2a2a2a';
		menu.style.border = '1px solid #444';
		menu.style.borderRadius = '4px';
		menu.style.padding = '4px';
		menu.style.zIndex = '10000';
		menu.style.minWidth = '150px';
		menu.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)';

		const rect = event.target.getBoundingClientRect();
		menu.style.left = (rect.left - 130) + 'px';
		menu.style.top = ( rect.bottom + 4 ) + 'px';

		const options = [
			{ label: 'Rename', icon: '✎', action: () => renameScene( sceneName ) },
			{ label: 'Duplicate', icon: '⎘', action: () => duplicateScene( sceneName ) },
			{ label: 'Delete', icon: '×', action: () => deleteScene( sceneName ), danger: true }
		];

		options.forEach( opt => {
			const item = document.createElement( 'div' );
			item.style.padding = '8px 12px';
			item.style.cursor = 'pointer';
			item.style.borderRadius = '3px';
			item.style.color = opt.danger ? '#ff6b6b' : '#ddd';
			item.style.fontSize = '13px';
			item.style.display = 'flex';
			item.style.alignItems = 'center';
			item.style.gap = '8px';
			
			const icon = document.createElement( 'span' );
			icon.textContent = opt.icon;
			icon.style.fontSize = '14px';
			icon.style.width = '16px';
			
			const label = document.createElement( 'span' );
			label.textContent = opt.label;
			
			item.appendChild( icon );
			item.appendChild( label );
			
			item.onmouseenter = () => {
				item.style.backgroundColor = opt.danger ? 'rgba(255,107,107,0.1)' : '#333';
			};
			item.onmouseleave = () => {
				item.style.backgroundColor = 'transparent';
			};
			item.onclick = () => {
				opt.action();
				document.body.removeChild( menu );
			};
			
			menu.appendChild( item );
		} );

		const closeMenu = ( e ) => {
			if ( !menu.contains( e.target ) ) {
				document.body.removeChild( menu );
				document.removeEventListener( 'click', closeMenu );
			}
		};

		setTimeout( () => {
			document.addEventListener( 'click', closeMenu );
		}, 100 );

		document.body.appendChild( menu );
	}

	async function createNewScene() {
		showPrompt( 'New scene name:', 'untitled', async ( name ) => {
			const filename = name.endsWith( '.json' ) ? name : name + '.json';
			
			const emptyScene = createTemplateScene( 0 );
			storage.setCurrentScene( filename );
			await storage.set( emptyScene );
			
			await storage.updateSceneConfig( filename, {
				includeInBuild: true
			} );

			await loadScene( filename );
			refresh();
		} );
	}

	async function createFromTemplate() {
		const menu = document.createElement( 'div' );
		menu.style.position = 'fixed';
		menu.style.backgroundColor = '#2a2a2a';
		menu.style.border = '1px solid #444';
		menu.style.borderRadius = '4px';
		menu.style.padding = '4px';
		menu.style.zIndex = '10000';
		menu.style.minWidth = '180px';
		menu.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)';
		menu.style.left = '50%';
		menu.style.top = '30%';
		menu.style.transform = 'translateX(-50%)';

		const title = document.createElement( 'div' );
		title.textContent = 'Choose Template';
		title.style.padding = '8px 12px';
		title.style.fontSize = '11px';
		title.style.color = '#888';
		title.style.fontWeight = '600';
		title.style.textTransform = 'uppercase';
		title.style.borderBottom = '1px solid #333';
		menu.appendChild( title );

		const templates = [
			{ name: 'Empty', desc: 'Blank scene', icon: '□' },
			{ name: 'Basic Lighting', desc: 'Ambient + Directional', icon: '☀' },
			{ name: 'Physics Test', desc: 'Lights + Ground', icon: '◉' }
		];

		templates.forEach( ( tmpl, idx ) => {
			const item = document.createElement( 'div' );
			item.style.padding = '10px 12px';
			item.style.cursor = 'pointer';
			item.style.borderRadius = '3px';
			
			const topLine = document.createElement( 'div' );
			topLine.style.display = 'flex';
			topLine.style.alignItems = 'center';
			topLine.style.gap = '8px';
			topLine.style.marginBottom = '2px';
			
			const icon = document.createElement( 'span' );
			icon.textContent = tmpl.icon;
			icon.style.fontSize = '16px';
			
			const name = document.createElement( 'span' );
			name.textContent = tmpl.name;
			name.style.fontSize = '13px';
			name.style.color = '#ddd';
			name.style.fontWeight = '500';
			
			topLine.appendChild( icon );
			topLine.appendChild( name );
			
			const desc = document.createElement( 'div' );
			desc.textContent = tmpl.desc;
			desc.style.fontSize = '11px';
			desc.style.color = '#888';
			desc.style.marginLeft = '24px';
			
			item.appendChild( topLine );
			item.appendChild( desc );
			
			item.onmouseenter = () => {
				item.style.backgroundColor = '#333';
			};
			item.onmouseleave = () => {
				item.style.backgroundColor = 'transparent';
			};
			item.onclick = async () => {
				document.body.removeChild( menu );
				
				showPrompt( 'Scene name:', tmpl.name.toLowerCase().replace( / /g, '_' ), async ( name ) => {
					const filename = name.endsWith( '.json' ) ? name : name + '.json';
					
					const sceneData = createTemplateScene( idx );
					storage.setCurrentScene( filename );
					await storage.set( sceneData );
					
					await storage.updateSceneConfig( filename, {
						includeInBuild: true
					} );

					await loadScene( filename );
					refresh();
				} );
			};
			
			menu.appendChild( item );
		} );

		const closeMenu = ( e ) => {
			if ( !menu.contains( e.target ) ) {
				document.body.removeChild( menu );
				document.removeEventListener( 'click', closeMenu );
			}
		};

		setTimeout( () => {
			document.addEventListener( 'click', closeMenu );
		}, 100 );

		document.body.appendChild( menu );
	}

	function createTemplateScene( type ) {
		const baseScene = {
			metadata: {},
			project: {
				shadows: true,
				shadowType: 1,
				toneMapping: 0,
				toneMappingExposure: 1
			},
			camera: {
				metadata: {
					version: 4.7,
					type: 'Object',
					generator: 'Object3D.toJSON'
				},
				object: {
					uuid: THREE.MathUtils.generateUUID(),
					type: 'PerspectiveCamera',
					name: 'Camera',
					layers: 1,
					matrix: [ 1, 0, 0, 0, 0, 0.8944271909999153, -0.44721359549995787, 0, 0, 0.44721359549995787, 0.8944271909999153, 0, 0, 5, 10, 1 ],
					fov: 50,
					zoom: 1,
					near: 0.01,
					far: 1000,
					focus: 10,
					aspect: 1,
					filmGauge: 35,
					filmOffset: 0
				}
			},
			scene: {
				metadata: { version: 4.5, type: 'Object', generator: 'Object3D.toJSON' },
				object: {
					uuid: THREE.MathUtils.generateUUID(),
					type: 'Scene',
					name: 'Scene',
					layers: 1,
					matrix: [ 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1 ],
					children: []
				}
			},
			scripts: {},
			history: { undos: [], redos: [] },
			environment: null
		};

		if ( type === 1 ) {
			baseScene.scene.object.children = [
				{
					uuid: THREE.MathUtils.generateUUID(),
					type: 'AmbientLight',
					name: 'AmbientLight',
					color: 0xffffff,
					intensity: 0.5
				},
				{
					uuid: THREE.MathUtils.generateUUID(),
					type: 'DirectionalLight',
					name: 'DirectionalLight',
					color: 0xffffff,
					intensity: 1,
					position: [ 5, 10, 7.5 ],
					castShadow: true
				}
			];
		}

		return baseScene;
	}

	async function renameScene( oldName ) {
		showPrompt( 'New name:', oldName.replace( '.json', '' ), async ( newName ) => {
			if ( newName === oldName.replace( '.json', '' ) ) return;

			const filename = newName.endsWith( '.json' ) ? newName : newName + '.json';
			
			const success = await storage.renameScene( oldName, filename );
			if ( success ) {
				refresh();
			} else {
				alert( 'Rename failed' );
			}
		} );
	}

	async function duplicateScene( sceneName ) {
		showPrompt( 'Duplicate as:', sceneName.replace( '.json', '' ) + '_copy', async ( newName ) => {
			const filename = newName.endsWith( '.json' ) ? newName : newName + '.json';
			
			try {
				const invoke = window.__TAURI__.core.invoke;
				const content = await invoke( 'read_scene_file', { 
					projectPath: storage.getProjectPath(),
					sceneName: sceneName
				} );
				
				const oldScene = storage.getCurrentScene();
				storage.setCurrentScene( filename );
				await storage.set( JSON.parse( content ) );
				await storage.updateSceneConfig( filename, { includeInBuild: true } );
				storage.setCurrentScene( oldScene );
				
				refresh();
			} catch ( error ) {
				alert( 'Duplicate failed: ' + error );
			}
		} );
	}

	async function deleteScene( sceneName ) {
		if ( !confirm( 'Delete scene "' + sceneName.replace( '.json', '' ) + '"?\n\nThis cannot be undone.' ) ) return;
		
		await storage.deleteScene( sceneName );
		signals.sceneDeleted.dispatch( sceneName );
		refresh();
	}

	async function loadScene( sceneName ) {
		storage.setCurrentScene( sceneName );
		
		try {
			const invoke = window.__TAURI__.core.invoke;
			const content = await invoke( 'read_scene_file', { 
				projectPath: storage.getProjectPath(),
				sceneName: sceneName
			} );
			
			const data = JSON.parse( content );
			editor.clear();
			editor.fromJSON( data );
			
			if ( editor.scene ) {
				editor.scene.name = sceneName.replace( '.json', '' );
			}
			
			signals.sceneLoaded.dispatch( sceneName );
		} catch ( error ) {
			alert( 'Load failed: ' + error );
		}
	}

	signals.sceneGraphChanged.add( refresh );
	signals.editorCleared.add( refresh );
	signals.sceneLoaded.add( function ( sceneName ) {
		if ( editor.scene && sceneName ) {
			editor.scene.name = sceneName.replace( '.json', '' );
		}
		refresh();
	} );

	refresh();

	return container;

}

export { SidebarScenes };
