import { UIPanel, UIBreak, UIButton, UIRow, UIInput, UISelect, UINumber, UIText, UICheckbox } from './libs/ui.js';
import { UIColor } from './libs/ui.js';

import { AddScriptAssetCommand } from './commands/AddScriptAssetCommand.js';
import { RemoveScriptAssetCommand } from './commands/RemoveScriptAssetCommand.js';
import { SetScriptAttributeCommand } from './commands/SetScriptAttributeCommand.js';

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

		const fileName = prompt( 'Enter script name:', 'NewScript.ts' );
		
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

					const { ScriptCompiler } = await import( './ScriptCompiler.js' );
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
					
					if ( window.refreshAssetsFiles ) {
						window.refreshAssetsFiles();
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
	
	// Add select and button on the same line (no label)
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

		const scripts = object.userData.scripts || [];

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
							await invoke( 'open_file_in_editor', {
								projectPath: projectPath,
								assetPath: assetPath
							} );
						} catch ( error ) {
						}
					} );
					scriptRow.add( editButton );

				const removeButton = new UIButton( '×' );
				removeButton.dom.classList.add( 'script-remove-button' );
					removeButton.onClick( function () {
						if ( confirm( 'Remove this script?' ) ) {
							editor.execute( new RemoveScriptAssetCommand( editor, object, index ) );
							update();
						}
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
						const attributesFromFile = {};
						
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
										let defaultValue = null;
										
										const typeMatch = attrOptions.match( /type\s*:\s*['"]([^'"]+)['"]/ );
										if ( typeMatch ) {
											attrType = typeMatch[ 1 ];
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
											}
										}
										
										attributesFromFile[ attrName ] = defaultValue !== null ? defaultValue : ( attrType === 'number' ? 0 : attrType === 'boolean' ? false : '' );
									}
									
									if ( Object.keys( attributesFromFile ).length > 0 && !scriptData.attributes ) {
										scriptData.attributes = attributesFromFile;
										editor.signals.sceneGraphChanged.dispatch();
									}
								}
							} catch ( error ) {
							}
						}
						
						const attributesToShow = { ...attributesFromFile, ...( scriptData.attributes || {} ) };
						
						if ( Object.keys( attributesToShow ).length === 0 ) {
							return;
						}
						
						for ( const attrName in attributesToShow ) {
							const attrValue = attributesToShow[ attrName ];
							const attrRow = new UIRow();
							attrRow.dom.classList.add( 'script-attribute-row' );

							const attrLabel = new UIText( attrName );
							attrLabel.dom.classList.add( 'script-attribute-label' );
							attrRow.add( attrLabel );

							let attrInput;
							
							if ( typeof attrValue === 'number' ) {
								attrInput = new UINumber( attrValue );
								attrInput.dom.classList.add( 'script-attribute-input' );
								attrInput.onChange( function () {
									editor.execute( new SetScriptAttributeCommand( editor, object, index, attrName, this.getValue() ) );
								} );
							} else if ( typeof attrValue === 'boolean' ) {
								attrInput = new UICheckbox( attrValue );
								attrInput.onChange( function () {
									editor.execute( new SetScriptAttributeCommand( editor, object, index, attrName, this.getValue() ) );
								} );
							} else if ( typeof attrValue === 'string' ) {
								attrInput = new UIInput( attrValue );
								attrInput.dom.classList.add( 'script-attribute-input-string' );
								attrInput.onChange( function () {
									editor.execute( new SetScriptAttributeCommand( editor, object, index, attrName, this.getValue() ) );
								} );
							} else {
								attrInput = new UIText( JSON.stringify( attrValue ) );
								attrInput.dom.classList.add( 'script-attribute-input-string' );
							}

							attrRow.add( attrInput );
							scriptAttributesContainer.add( attrRow );
						}
						
						if ( Object.keys( attributesToShow ).length > 0 ) {
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
