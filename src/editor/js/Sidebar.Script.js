import { UIPanel, UIBreak, UIButton, UIRow, UIInput, UISelect, UINumber, UIText, UICheckbox, UIDiv } from './libs/ui.js';

import { AddScriptAssetCommand } from './commands/AddScriptAssetCommand.js';
import { RemoveScriptAssetCommand } from './commands/RemoveScriptAssetCommand.js';
import { SetScriptAttributeCommand } from './commands/SetScriptAttributeCommand.js';
import { Modal } from './Modal.js';

function SidebarScript( editor ) {

	const strings = editor.strings;
	const signals = editor.signals;

	const container = new UIPanel();
	container.dom.classList.add( 'script-sidebar-container' );
	container.setDisplay( 'none' );

	const scriptsContainer = new UIPanel();
	container.add( scriptsContainer );

	const addScriptRow = new UIRow();
	addScriptRow.dom.classList.add( 'script-add-row' );
	const addScriptSelect = new UISelect();
	addScriptSelect.dom.classList.add( 'script-add-select' );
	const addScriptButton = new UIButton( '+' );
	addScriptButton.dom.classList.add( 'script-add-button' );
	
	addScriptButton.onClick( async function () {
		if ( !editor.selected ) {
			alert( 'Please select an object first' );
			return;
		}

		const selectedPath = addScriptSelect.getValue();
		if ( selectedPath && selectedPath !== '' ) {
			editor.execute( new AddScriptAssetCommand( editor, editor.selected, selectedPath ) );
			update();
			return;
		}

		const fileName = await Modal.showPrompt( 'Enter Script Name', '', 'NewScript.ts', 'NewScript.ts' );
		
		if ( !fileName || fileName.trim() === '' ) {
			return;
		}

		let name = fileName.trim();
		if ( !name.endsWith( '.ts' ) && !name.endsWith( '.js' ) ) {
			name += '.ts';
		}

		const className = name.replace( /\.tsx?$/, '' ).replace( /[^a-zA-Z0-9_$]/g, '' );
		const validClassName = className || 'NewScript';

		const scriptTemplate = `import { registerComponent, attribute } from '@engine/core/decorators';
import { Script } from '@engine/core/Script';
import * as THREE from 'three';

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

		if ( !window.assetsRoot ) {
			alert( 'Assets system not initialized' );
			return;
		}

		const currentFolder = window.currentFolder || window.assetsRoot;

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

		if ( window.saveAssets ) {
			window.saveAssets().catch( error => {
				console.error( '[Script] Error saving assets:', error );
			} );
		}

		const isTauri = typeof window !== 'undefined' && window.__TAURI__;
		const invoke = isTauri ? window.__TAURI__.core.invoke : null;

		if ( isTauri && invoke ) {
			const projectPath = editor.storage && editor.storage.getProjectPath ? editor.storage.getProjectPath() : null;
			
			if ( projectPath ) {
				try {
					let assetPath = filePath;
					if ( assetPath.startsWith( '/' ) ) {
						assetPath = assetPath.slice( 1 );
					}
					assetPath = assetPath.replace( /\/+/g, '/' );
					
					const fileContent = Array.from( new TextEncoder().encode( scriptTemplate ) );
					
					await invoke( 'write_asset_file', {
						projectPath: projectPath,
						assetPath: assetPath,
						content: fileContent
					} );

					const ScriptCompilerModule = window.__scriptCompilerModule || await import( './ScriptCompiler.js' );
					const { ScriptCompiler } = ScriptCompilerModule;
					const compiled = await ScriptCompiler.compileScript( assetPath, scriptTemplate );
					if ( compiled ) {
						const compiledContent = Array.from( new TextEncoder().encode( compiled.content ) );
						await invoke( 'write_asset_file', {
							projectPath: projectPath,
							assetPath: compiled.path,
							content: compiledContent
						} );
					}

					editor.execute( new AddScriptAssetCommand( editor, editor.selected, filePath ) );
					update();
					// Fire-and-forget: refresh assets panel without blocking the UI
					if ( window.refreshAssets ) {
						window.refreshAssets().catch( () => {} );
					}
				} catch ( error ) {
					console.error( '[Script] Failed to create script asset:', error );
					alert( 'Failed to create script: ' + error.message );
				}
			} else {
				alert( 'No project path set' );
			}
		} else {
			alert( 'Tauri not available' );
		}
	} );
	
	
	addScriptRow.add( addScriptSelect );
	addScriptRow.add( addScriptButton );
	container.add( addScriptRow );

	function getScriptAssets() {
		const scripts = [];
		
		function findScripts( folder ) {
			for ( const file of folder.files ) {
				if ( file.type === 'script' || ( file.name.endsWith( '.ts' ) || file.name.endsWith( '.js' ) ) ) {
					scripts.push( {
						name: file.name,
						path: file.path
					} );
				}
			}
			for ( const child of folder.children ) {
				findScripts( child );
			}
		}
		
		if ( window.assetsRoot ) {
			findScripts( window.assetsRoot );
		}
		
		return scripts;
	}

	function updateScriptSelect() {
		const scripts = getScriptAssets();
		const options = { '': 'Select...' };
		scripts.forEach( script => {
			options[ script.path ] = script.name;
		} );
		addScriptSelect.setOptions( options );
		addScriptSelect.setValue( '' );
	}

	const expandedScripts = new Map();

	function update() {

		const object = editor.selected;

		scriptsContainer.clear();

		if ( object === null ) {
			scriptsContainer.setDisplay( 'none' );
			return;
		}

		updateScriptSelect();

		const scripts = ( object.userData && object.userData.scripts ) || [];

		if ( scripts.length > 0 ) {

			scriptsContainer.setDisplay( 'block' );
			
			const objectKey = object.uuid;
			if ( !expandedScripts.has( objectKey ) ) {
				expandedScripts.set( objectKey, new Set() );
			}
			const expandedSet = expandedScripts.get( objectKey );

			for ( let i = 0; i < scripts.length; i ++ ) {

				( function ( object, script, index ) {

				const scriptRow = new UIRow();
				scriptRow.dom.classList.add( 'script-item-row' );

				const scriptName = new UIText( script.assetPath.split( '/' ).pop() || 'Script' );
				scriptName.dom.classList.add( 'script-item-name' );
				scriptRow.add( scriptName );

				const editButton = new UIButton( 'EDIT' );
				editButton.dom.classList.add( 'script-edit-button' );
					editButton.onClick( async function () {
						const isTauri = typeof window !== 'undefined' && window.__TAURI__;
						const invoke = isTauri ? window.__TAURI__.core.invoke : null;
						
						if ( !isTauri || !invoke ) return;
						
						const projectPath = editor.storage && editor.storage.getProjectPath ? editor.storage.getProjectPath() : null;
						if ( !projectPath ) return;
						
						let assetPath = script.assetPath;
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
							console.warn( '[Script] Failed to open file:', error );
						}
					} );
					scriptRow.add( editButton );

				const removeButton = new UIButton( '×' );
				removeButton.dom.classList.add( 'script-remove-button' );
					removeButton.onClick( function () {
						editor.execute( new RemoveScriptAssetCommand( editor, object, index ) );
						update();
					} );
					scriptRow.add( removeButton );

					scriptsContainer.add( scriptRow );

				const scriptAttributesContainer = new UIPanel();
				scriptAttributesContainer.dom.classList.add( 'script-attributes-container' );
				scriptsContainer.add( scriptAttributesContainer );
				
				const toggleButton = document.createElement( 'span' );
				toggleButton.textContent = '▼';
				toggleButton.classList.add( 'script-item-toggle' );
				scriptName.dom.insertBefore( toggleButton, scriptName.dom.firstChild );
					
					const scriptKey = script.assetPath;
					let isExpanded = expandedSet.has( scriptKey );
					
				if ( isExpanded ) {
					toggleButton.classList.add( 'expanded' );
					scriptAttributesContainer.dom.classList.add( 'expanded' );
				}
				
				const toggleExpand = function () {
					isExpanded = !isExpanded;
					if ( isExpanded ) {
						toggleButton.classList.add( 'expanded' );
						scriptAttributesContainer.dom.classList.add( 'expanded' );
					} else {
						toggleButton.classList.remove( 'expanded' );
						scriptAttributesContainer.dom.classList.remove( 'expanded' );
					}
						if ( isExpanded ) {
							expandedSet.add( scriptKey );
						} else {
							expandedSet.delete( scriptKey );
						}
					};
					
					scriptName.dom.addEventListener( 'click', function ( e ) {
						if ( e.target !== removeButton.dom ) {
							toggleExpand();
						}
					} );
					
					( async function ( scriptData ) {
						const attributesMetadata = {};
						const attributesDefaults = {};
						
						const isTauri = typeof window !== 'undefined' && window.__TAURI__;
						const invoke = isTauri ? window.__TAURI__.core.invoke : null;
						
						if ( isTauri && invoke && window.assetsRoot ) {
							try {
								const projectPath = editor.storage && editor.storage.getProjectPath ? editor.storage.getProjectPath() : null;
								if ( projectPath ) {
									let assetPath = scriptData.assetPath;
									if ( assetPath.startsWith( '/' ) ) {
										assetPath = assetPath.slice( 1 );
									}
									assetPath = assetPath.replace( /\/+/g, '/' );
									
									if ( assetPath.endsWith( '.js' ) ) {
										assetPath = assetPath.replace( /\.js$/, '.ts' );
									}
									
									const fileBytes = await invoke( 'read_asset_file', {
										projectPath: projectPath,
										assetPath: assetPath
									} );
									
									const fileContent = new TextDecoder().decode( new Uint8Array( fileBytes ) );
									
									const attributeRegex = /@attribute\s*\(\s*\{([^}]+)\}\s*\)\s*(?:private|public|protected)?\s*(?:readonly)?\s*(\w+)\s*:/g;
									let match;
									
									while ( ( match = attributeRegex.exec( fileContent ) ) !== null ) {
										const attrName = match[ 2 ];
										const attrOptions = match[ 1 ];
										
										let attrType = 'number';
										let title = attrName;
										let defaultValue = null;
										let min = undefined, max = undefined, step = undefined;
										let enumOpts = undefined;
										
										const typeMatch = attrOptions.match( /type\s*:\s*['"]([^'"]+)['"]/ );
										if ( typeMatch ) {
											attrType = typeMatch[ 1 ];
										}
										
										const titleMatch = attrOptions.match( /title\s*:\s*['"]([^'"]+)['"]/ );
										if ( titleMatch ) {
											title = titleMatch[ 1 ];
										}
										
										const defaultMatch = attrOptions.match( /default\s*:\s*([^,}]+)/ );
										if ( defaultMatch ) {
											const defaultStr = defaultMatch[ 1 ].trim();
											if ( attrType === 'number' ) {
												defaultValue = parseFloat( defaultStr );
											} else if ( attrType === 'boolean' ) {
												defaultValue = defaultStr === 'true';
											} else if ( attrType === 'string' ) {
												defaultValue = defaultStr.replace( /^['"]|['"]$/g, '' );
											} else if ( attrType === 'entity' ) {
												defaultValue = ( defaultStr === 'null' || defaultStr === 'undefined' ) ? null : defaultStr.replace( /^['"]|['"]$/g, '' );
											}
										}
										
										const minMatch = attrOptions.match( /min\s*:\s*([^,}]+)/ );
										if ( minMatch ) {
											min = parseFloat( minMatch[ 1 ].trim() );
										}
										const maxMatch = attrOptions.match( /max\s*:\s*([^,}]+)/ );
										if ( maxMatch ) {
											max = parseFloat( maxMatch[ 1 ].trim() );
										}
										const stepMatch = attrOptions.match( /step\s*:\s*([^,}]+)/ );
										if ( stepMatch ) {
											step = parseFloat( stepMatch[ 1 ].trim() );
										}
										
										const enumMatch = attrOptions.match( /enum\s*:\s*\{([^}]*)\}/ );
										if ( enumMatch && attrType === 'enum' ) {
											const pairs = enumMatch[ 1 ].split( ',' ).map( p => p.trim() );
											enumOpts = { '': '—' };
											for ( const p of pairs ) {
												const kv = p.split( ':' ).map( s => s.trim() );
												if ( kv.length >= 2 ) {
													const k = kv[ 0 ].replace( /^['"]|['"]$/g, '' );
													const v = kv[ 1 ].replace( /^['"]|['"]$/g, '' );
													enumOpts[ v ] = k;
												}
											}
										}
										
										if ( defaultValue === null && attrType === 'number' ) defaultValue = 0;
										if ( defaultValue === null && attrType === 'boolean' ) defaultValue = false;
										if ( defaultValue === null && attrType === 'string' ) defaultValue = '';
										if ( defaultValue === null && attrType === 'entity' ) defaultValue = null;
										
										attributesMetadata[ attrName ] = { type: attrType, title: title, min: min, max: max, step: step, enum: enumOpts };
										attributesDefaults[ attrName ] = defaultValue;
									}
									
									if ( Object.keys( attributesMetadata ).length > 0 && !scriptData.attributes ) {
										scriptData.attributes = { ...attributesDefaults };
										editor.signals.sceneGraphChanged.dispatch();
									}
								}
							} catch ( error ) {
							}
						}
						
						const attrNames = Object.keys( attributesMetadata );
						if ( attrNames.length === 0 ) {
							return;
						}
						
						const currentValues = scriptData.attributes || {};
						
						for ( const attrName of attrNames ) {
							const meta = attributesMetadata[ attrName ];
							const attrValue = currentValues[ attrName ] !== undefined ? currentValues[ attrName ] : attributesDefaults[ attrName ];
							const attrRow = new UIRow();
							attrRow.dom.classList.add( 'script-attribute-row' );

							const displayTitle = meta.title || attrName;
							const attrLabel = new UIText( displayTitle );
							attrLabel.dom.classList.add( 'script-attribute-label' );
							attrRow.add( attrLabel );

							let attrInput;
							const attrType = meta.type;
							
							if ( attrType === 'entity' ) {
								const dropZone = document.createElement( 'div' );
								dropZone.classList.add( 'script-attribute-entity-slot' );
								const clearBtn = document.createElement( 'span' );
								clearBtn.textContent = '×';
								clearBtn.title = 'Clear';
								clearBtn.style.cssText = 'margin-left: 6px; cursor: pointer; opacity: 0.6; font-size: 14px;';
								clearBtn.addEventListener( 'click', function ( e ) {
									e.stopPropagation();
									editor.execute( new SetScriptAttributeCommand( editor, object, index, attrName, null ) );
									scriptData.attributes = scriptData.attributes || {};
									scriptData.attributes[ attrName ] = null;
									updateEntityLabel();
								} );
								function updateEntityLabel() {
									const uuid = ( scriptData.attributes || {} )[ attrName ];
									if ( uuid && editor.scene ) {
										const obj = editor.scene.getObjectByProperty( 'uuid', uuid );
										dropZone.textContent = obj ? ( obj.name || obj.uuid ) : ( uuid.slice( 0, 8 ) + '…' );
										dropZone.style.color = '';
										clearBtn.style.display = '';
									} else {
										dropZone.textContent = 'Drop entity...';
										dropZone.style.color = '';
										clearBtn.style.display = 'none';
									}
								}
								updateEntityLabel();
								dropZone.addEventListener( 'dragover', function ( e ) {
									if ( e.dataTransfer.types.indexOf( 'application/x-scene-object' ) !== -1 ) {
										e.preventDefault();
										e.stopPropagation();
										dropZone.classList.add( 'drag-over' );
									}
								} );
								dropZone.addEventListener( 'dragleave', function ( e ) {
									dropZone.classList.remove( 'drag-over' );
								} );
								dropZone.addEventListener( 'drop', function ( e ) {
									e.preventDefault();
									e.stopPropagation();
									dropZone.classList.remove( 'drag-over' );
									const raw = e.dataTransfer.getData( 'application/x-scene-object' );
									if ( raw ) {
										try {
											const payload = JSON.parse( raw );
											if ( payload.type === 'sceneObject' && payload.uuid ) {
												editor.execute( new SetScriptAttributeCommand( editor, object, index, attrName, payload.uuid ) );
												scriptData.attributes = scriptData.attributes || {};
												scriptData.attributes[ attrName ] = payload.uuid;
												updateEntityLabel();
											}
										} catch ( err ) {}
									}
								} );
								const wrapper = new UIDiv();
								wrapper.dom.style.display = 'flex';
								wrapper.dom.style.alignItems = 'center';
								wrapper.dom.style.flex = '1';
								wrapper.dom.style.minWidth = '0';
								wrapper.dom.appendChild( dropZone );
								wrapper.dom.appendChild( clearBtn );
								attrInput = wrapper;
							} else if ( attrType === 'number' ) {
								attrInput = new UINumber( attrValue );
								attrInput.dom.classList.add( 'script-attribute-input' );
								if ( meta.min != null ) attrInput.setRange( meta.min, meta.max != null ? meta.max : Infinity );
								if ( meta.step != null ) attrInput.setStep( meta.step );
								attrInput.onChange( function () {
									editor.execute( new SetScriptAttributeCommand( editor, object, index, attrName, this.getValue() ) );
								} );
							} else if ( attrType === 'boolean' ) {
								attrInput = new UICheckbox( attrValue );
								attrInput.onChange( function () {
									editor.execute( new SetScriptAttributeCommand( editor, object, index, attrName, this.getValue() ) );
								} );
							} else if ( attrType === 'enum' && meta.enum ) {
								attrInput = new UISelect();
								attrInput.dom.classList.add( 'script-attribute-input' );
								attrInput.setOptions( meta.enum );
								attrInput.setValue( attrValue !== undefined && attrValue !== null ? String( attrValue ) : '' );
								attrInput.onChange( function () {
									const v = this.getValue();
									editor.execute( new SetScriptAttributeCommand( editor, object, index, attrName, v === '' ? null : v ) );
								} );
							} else if ( attrType === 'string' ) {
								attrInput = new UIInput( attrValue !== undefined && attrValue !== null ? String( attrValue ) : '' );
								attrInput.dom.classList.add( 'script-attribute-input-string' );
								attrInput.onChange( function () {
									editor.execute( new SetScriptAttributeCommand( editor, object, index, attrName, this.getValue() ) );
								} );
							} else {
								attrInput = new UIInput( attrValue !== undefined && attrValue !== null ? String( attrValue ) : '' );
								attrInput.dom.classList.add( 'script-attribute-input-string' );
								attrInput.onChange( function () {
									editor.execute( new SetScriptAttributeCommand( editor, object, index, attrName, this.getValue() ) );
								} );
							}

							if ( attrInput && attrInput.dom ) {
								attrRow.add( attrInput );
							}
							scriptAttributesContainer.add( attrRow );
						}
						
						if ( attrNames.length > 0 ) {
							if ( isExpanded ) {
								scriptAttributesContainer.dom.classList.add( 'expanded' );
							} else {
								scriptAttributesContainer.dom.classList.remove( 'expanded' );
							}
						}
					} )( script );

					scriptsContainer.add( new UIBreak() );

				} )( object, scripts[ i ], i );

			}

		}

	}

	signals.objectSelected.add( function ( object ) {

		if ( object !== null && editor.camera !== object ) {

			container.setDisplay( 'block' );
			update();

		} else {

			container.setDisplay( 'none' );
			scriptsContainer.clear();
			scriptsContainer.setDisplay( 'none' );

		}

	} );

	signals.scriptAdded.add( update );
	signals.scriptRemoved.add( update );
	signals.scriptChanged.add( update );
	
	signals.sceneGraphChanged.add( function () {
		if ( editor.selected ) {
			update();
		}
	} );

	return container;

}

export { SidebarScript };
