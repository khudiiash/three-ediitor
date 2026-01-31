import * as THREE from 'three';

import { UIPanel, UIBreak, UIRow, UIColor, UISelect, UIText, UINumber, UIInput } from './libs/ui.js';
import { UIOutliner, UITexture } from './libs/ui.three.js';
import { SetValueCommand } from './commands/SetValueCommand.js';

function SidebarScene( editor ) {

	const signals = editor.signals;
	const strings = editor.strings;

	const container = new UIPanel();
	container.addClass( 'outliner-container' );

	const searchRow = new UIRow();
	searchRow.addClass( 'outliner-header' );
	const searchInput = new UIInput( '' );
	searchInput.addClass( 'outliner-search' );
	searchInput.dom.placeholder = 'Search...';
	searchRow.add( searchInput );
	container.add( searchRow );

	let searchFilter = '';

	searchInput.onChange( function () {
		const value = this.getValue();
		searchFilter = ( value || '' ).toLowerCase().trim();
		refreshUI();
	} );

	const nodeStates = new WeakMap();

	function isBatchedRenderer( object ) {
		return object.type === 'BatchedRenderer' || object.name === 'BatchedRenderer';
	}

	function buildOption( object, draggable ) {

		const option = document.createElement( 'div' );
		option.className = 'scene-tree-item';
		const isSystemEntity = isBatchedRenderer( object );
		option.draggable = draggable && !isSystemEntity;
		option.innerHTML = buildHTML( object );
		option.value = object.id;
		option.dataset.uuid = object.uuid;
		option.dataset.name = object.name || object.uuid || '';
		
		if ( isSystemEntity ) {
			option.classList.add( 'system-entity' );
		}

		

		if ( nodeStates.has( object ) ) {

			const state = nodeStates.get( object );

			const opener = document.createElement( 'span' );
			opener.classList.add( 'opener' );

			if ( object.children.length > 0 ) {

				opener.classList.add( state ? 'open' : 'closed' );

			}

			opener.addEventListener( 'click', function ( event ) {
				event.stopPropagation();
				nodeStates.set( object, nodeStates.get( object ) === false ); 
				refreshUI();
			} );

			option.insertBefore( opener, option.firstChild );

		}

		
		const visibilityToggle = option.querySelector( '.visibility-toggle' );
		if ( visibilityToggle ) {
			visibilityToggle.addEventListener( 'click', function ( event ) {
				event.stopPropagation();
				const objectId = parseInt( this.getAttribute( 'data-object-id' ) );
				const targetObject = editor.scene.getObjectById( objectId );
				if ( targetObject ) {
					const newVisibility = !targetObject.visible;
					editor.execute( new SetValueCommand( editor, targetObject, 'visible', newVisibility ) );
					
				}
			} );
		}

		return option;

	}

	function getMaterialName( material ) {

		if ( Array.isArray( material ) ) {

			const array = [];

			for ( let i = 0; i < material.length; i ++ ) {

				array.push( material[ i ] && material[ i ].name ? material[ i ].name : '' );

			}

			return array.join( ',' );

		}

		return material && material.name ? material.name : '';

	}

	function escapeHTML( html ) {

		if ( html === undefined || html === null ) return '';

		return String( html )
			.replace( /&/g, '&amp;' )
			.replace( /"/g, '&quot;' )
			.replace( /'/g, '&#39;' )
			.replace( /</g, '&lt;' )
			.replace( />/g, '&gt;' );

	}

	function getObjectType( object ) {

		if ( object.isScene ) return 'Scene';
		if ( object.isCamera ) return 'Camera';
		if ( object.isLight ) return 'Light';
		if ( object.isMesh ) return 'Mesh';
		if ( object.isLine ) return 'Line';
		if ( object.isPoints ) return 'Points';
		if ( object.type === 'BatchedRenderer' || object.name === 'BatchedRenderer' ) return 'BatchedRenderer';
		if ( object.type === 'ParticleSystem' || ( object.userData && object.userData.isParticleSystem ) ) return 'Particles';

		return 'Object3D';

	}

	function buildHTML( object ) {

		const objectName = object.name || '';
		const isSystemEntity = isBatchedRenderer( object );
		const typeClass = getObjectType( object );
		const nameClass = isSystemEntity ? 'system-entity-name' : '';
		const isVisible = object.visible !== false;
		const visibilityClass = isVisible ? 'visibility-visible' : 'visibility-hidden';
		
		let html = `<span class="type ${ typeClass }${ isSystemEntity ? ' system-entity-type' : '' }"></span> <span class="${ nameClass }">${ escapeHTML( objectName ) }</span> <span class="visibility-toggle ${ visibilityClass }" data-object-id="${ object.id }"></span>`;

		return html;

	}

	function getScript( uuid ) {

		if ( editor.scripts[ uuid ] === undefined ) return '';

		if ( editor.scripts[ uuid ].length === 0 ) return '';

		return ' <span class="type Script"></span>';

	}

	let ignoreObjectSelectedSignal = false;

	const outliner = new UIOutliner( editor );
	outliner.setId( 'outliner' );
	outliner.addClass( 'scene-tree' );
	
	outliner.onChange( function () {

		ignoreObjectSelectedSignal = true;

		const objectId = parseInt( outliner.getValue() );
		const object = editor.scene.getObjectById( objectId );
		
		if ( object && ( object.type === 'BatchedRenderer' || object.name === 'BatchedRenderer' ) ) {
			editor.select( object );
		} else {
			editor.selectById( objectId );
		}

		ignoreObjectSelectedSignal = false;

	} );
	outliner.onDblClick( function () {

		editor.focusById( parseInt( outliner.getValue() ) );

	} );
	
	outliner.dom.addEventListener( 'dragover', function ( event ) {
		const assetData = event.dataTransfer.getData( 'text/plain' );
		if ( assetData ) {
			try {
				const asset = JSON.parse( assetData );
				if ( asset.type ) {
					event.preventDefault();
					event.stopPropagation();
					outliner.dom.classList.add('drag-over');
				}
			} catch ( e ) {
			}
		}
	} );

	outliner.dom.addEventListener( 'dragleave', function ( event ) {
		outliner.dom.classList.remove('drag-over');
	} );

	outliner.dom.addEventListener( 'drop', async function ( event ) {
		event.preventDefault();
		event.stopPropagation();
		outliner.dom.classList.remove('drag-over');
		
		const assetData = event.dataTransfer.getData( 'text/plain' );
		if ( assetData ) {
			try {
				const asset = JSON.parse( assetData );
				
				if ( asset.type === 'model' ) {
					try {
						const { AddObjectCommand } = await import( './commands/AddObjectCommand.js' );
						const { ModelParser } = await import( './ModelParser.js' );
						
						const isTauri = typeof window !== 'undefined' && window.__TAURI__ && window.__TAURI__.core.invoke;
						if ( isTauri && editor.storage && editor.storage.getProjectPath ) {
							const projectPath = editor.storage.getProjectPath();
							let modelPath = asset.modelPath;
							
							if ( !modelPath && asset.path && asset.path.endsWith( '.mesh' ) ) {
								const baseName = asset.name.replace( /\.mesh$/, '' );
								const folderPath = asset.path.substring( 0, asset.path.lastIndexOf( '/' ) );
								const folderName = folderPath.substring( folderPath.lastIndexOf( '/' ) + 1 );
								if ( /\.(glb|gltf|fbx|obj)$/i.test( folderName ) ) {
									const ext = folderName.substring( folderName.lastIndexOf( '.' ) );
									modelPath = folderPath + '/' + baseName + ext;
								} else {
									const possibleExtensions = [ '.glb', '.gltf', '.fbx', '.obj' ];
									for ( const ext of possibleExtensions ) {
										const testPath = folderPath + '/' + baseName + ext;
										try {
											const testAssetPath = testPath.startsWith( '/' ) ? testPath.substring( 1 ) : testPath;
											await window.__TAURI__.core.invoke( 'read_asset_file', {
												projectPath: projectPath,
												assetPath: testAssetPath
											} );
											modelPath = testPath;
											break;
										} catch ( e ) {
										}
									}
								}
							}
							
							if ( !modelPath ) {
								modelPath = asset.path;
							}
							
							const fileObj = {
								path: asset.path,
								name: asset.name,
								modelPath: modelPath,
								modelName: asset.modelName,
								type: asset.type
							};
							
							const model = await ModelParser.loadModelFromFile( fileObj, modelPath, projectPath );
							editor.execute( new AddObjectCommand( editor, model ) );
						}
					} catch ( error ) {
						console.error( '[Hierarchy] Failed to load model from asset:', error );
					}
					return;
				}
				
			} catch ( e ) {
				console.error( e );
			}
		}
	} );
	
	container.add( outliner );

	function matchesFilter( object ) {
		if ( !searchFilter ) return true;
		if ( !object.name ) return false;
		return object.name.toLowerCase().includes( searchFilter );
	}

	function hasMatchingChild( object ) {
		if ( matchesFilter( object ) ) return true;
		for ( let i = 0; i < object.children.length; i ++ ) {
			if ( hasMatchingChild( object.children[ i ] ) ) {
				return true;
			}
		}
		return false;
	}

	function refreshUI() {

		const camera = editor.camera;
		const scene = editor.scene;

		const options = [];

		if ( !searchFilter || matchesFilter( camera ) || hasMatchingChild( camera ) ) {
			options.push( buildOption( camera, false ) );
		}

		if ( !searchFilter || matchesFilter( scene ) || hasMatchingChild( scene ) ) {
			options.push( buildOption( scene, false ) );
		}

		( function addObjects( objects, pad ) {

			for ( let i = 0, l = objects.length; i < l; i ++ ) {

				const object = objects[ i ];

				if ( object.userData && object.userData.skipSerialization === true ) {
					continue;
				}

				if ( object.type === 'ParticleEmitter' ) {
					continue;
				}

				if ( object.type === 'BatchedRenderer' || object.name === 'BatchedRenderer' ) {
					if ( object.children.length === 0 ) {
						continue;
					}
				}

				if ( !searchFilter || matchesFilter( object ) || hasMatchingChild( object ) ) {

					if ( nodeStates.has( object ) === false ) {

						nodeStates.set( object, false );

					}

			const option = buildOption( object, true );
			option.style.setProperty('--tree-indent', `${pad * 18}px`);
			options.push( option );

					const shouldExpand = nodeStates.get( object ) === true || ( searchFilter && hasMatchingChild( object ) );
					if ( shouldExpand ) {

						addObjects( object.children, pad + 1 );

					}

				}

			}

		} )( scene.children, 0 );

		outliner.setOptions( options );

		if ( editor.selected !== null ) {

			outliner.setValue( editor.selected.id );

		}


	}


	refreshUI();

	

	signals.editorCleared.add( refreshUI );

	signals.sceneGraphChanged.add( refreshUI );

	signals.refreshSidebarEnvironment.add( refreshUI );

	signals.objectChanged.add( function ( object ) {

		const options = outliner.options;

		for ( let i = 0; i < options.length; i ++ ) {

			const option = options[ i ];

			if ( option.value === object.id ) {

				const openerElement = option.querySelector( ':scope > .opener' );

				const openerHTML = openerElement ? openerElement.outerHTML : '';

				const currentIndent = option.style.getPropertyValue( '--tree-indent' );

				option.innerHTML = openerHTML + buildHTML( object );

				if ( currentIndent ) {
					option.style.setProperty( '--tree-indent', currentIndent );
				}

				
				const visibilityToggle = option.querySelector( '.visibility-toggle' );
				if ( visibilityToggle ) {
					visibilityToggle.addEventListener( 'click', function ( event ) {
						event.stopPropagation();
						const objectId = parseInt( this.getAttribute( 'data-object-id' ) );
						const targetObject = editor.scene.getObjectById( objectId );
						if ( targetObject ) {
							const newVisibility = !targetObject.visible;
							editor.execute( new SetValueCommand( editor, targetObject, 'visible', newVisibility ) );
							
						}
					} );
				}

				return;

			}

		}

	} );

	signals.scriptAdded.add( function () {

		if ( editor.selected !== null ) signals.objectChanged.dispatch( editor.selected );

	} );

	signals.scriptRemoved.add( function () {

		if ( editor.selected !== null ) signals.objectChanged.dispatch( editor.selected );

	} );


	signals.objectSelected.add( function ( object ) {

		if ( ignoreObjectSelectedSignal === true ) return;

		if ( object !== null && object.parent !== null && object.parent !== undefined && typeof object.parent === 'object' ) {

			let needsRefresh = false;
			let parent = object.parent;

			while ( parent !== null && parent !== undefined && parent !== editor.scene && typeof parent === 'object' ) {

				if ( nodeStates.get( parent ) !== true ) {

					nodeStates.set( parent, true );
					needsRefresh = true;

				}

				parent = parent.parent;

			}

			if ( needsRefresh ) refreshUI();

			if ( object.id !== undefined ) {
				outliner.setValue( object.id );
			} else {
				outliner.setValue( null );
			}

		} else {

			outliner.setValue( null );

		}

	} );


	return container;

}

export { SidebarScene };
