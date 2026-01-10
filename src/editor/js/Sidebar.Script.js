import { UIPanel, UIBreak, UIButton, UIRow, UIInput, UISelect, UINumber, UIText, UICheckbox } from './libs/ui.js';
import { UIColor } from './libs/ui.js';

import { AddScriptAssetCommand } from './commands/AddScriptAssetCommand.js';
import { RemoveScriptAssetCommand } from './commands/RemoveScriptAssetCommand.js';
import { SetScriptAttributeCommand } from './commands/SetScriptAttributeCommand.js';

function SidebarScript( editor ) {

	const strings = editor.strings;
	const signals = editor.signals;

	const container = new UIPanel();
	container.setBorderTop( '0' );
	container.setPaddingTop( '20px' );
	container.setDisplay( 'none' );

	const scriptsContainer = new UIPanel();
	container.add( scriptsContainer );

	const addScriptRow = new UIRow();
	const addScriptSelect = new UISelect().setWidth( '150px' ).setFontSize( '12px' );
	const addScriptButton = new UIButton( '+' ).setWidth( '30px' ).setMarginLeft( '4px' );
	
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
		const invoke = isTauri ? window.__TAURI__.invoke : null;

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
	
	addScriptRow.add( new UIText( 'Script' ).setWidth( '90px' ) );
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
		const options = { '': '-- Select Script --' };
		scripts.forEach( script => {
			options[ script.path ] = script.name;
		} );
		addScriptSelect.setOptions( options );
		addScriptSelect.setValue( '' );
	}

	const expandedScripts = new Map();

	function update() {

		const object = editor.selected;

		if ( object === null ) {
			scriptsContainer.clear();
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

			scriptsContainer.clear();

			for ( let i = 0; i < scripts.length; i ++ ) {

				( function ( object, script, index ) {

					const scriptRow = new UIRow();
					scriptRow.setMarginBottom( '10px' );
					scriptRow.setPaddingBottom( '10px' );
					scriptRow.dom.style.borderBottom = '1px solid #333';

					const scriptName = new UIText( script.assetPath.split( '/' ).pop() || 'Script' );
					scriptName.setWidth( '120px' );
					scriptName.dom.style.fontWeight = 'bold';
					scriptRow.add( scriptName );

					const editButton = new UIButton( 'EDIT' );
					editButton.setWidth( '50px' );
					editButton.setMarginLeft( '4px' );
					editButton.setFontSize( '11px' );
					editButton.onClick( async function () {
						const isTauri = typeof window !== 'undefined' && window.__TAURI__;
						const invoke = isTauri ? window.__TAURI__.invoke : null;
						
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
					removeButton.setWidth( '24px' );
					removeButton.setMarginLeft( '4px' );
					removeButton.onClick( function () {
						if ( confirm( 'Remove this script?' ) ) {
							editor.execute( new RemoveScriptAssetCommand( editor, object, index ) );
							update();
						}
					} );
					scriptRow.add( removeButton );

					scriptsContainer.add( scriptRow );

					const scriptAttributesContainer = new UIPanel();
					scriptAttributesContainer.setDisplay( 'none' );
					scriptAttributesContainer.setMarginLeft( '20px' );
					scriptsContainer.add( scriptAttributesContainer );
					
					const toggleButton = document.createElement( 'span' );
					toggleButton.textContent = '▼';
					toggleButton.style.cssText = 'cursor: pointer; margin-right: 4px; user-select: none; display: inline-block; transform: rotate(-90deg); transition: transform 0.2s;';
					
					scriptName.dom.style.cursor = 'pointer';
					scriptName.dom.style.display = 'flex';
					scriptName.dom.style.alignItems = 'center';
					scriptName.dom.insertBefore( toggleButton, scriptName.dom.firstChild );
					
					const scriptKey = script.assetPath;
					let isExpanded = expandedSet.has( scriptKey );
					
					if ( isExpanded ) {
						toggleButton.style.transform = 'rotate(0deg)';
						scriptAttributesContainer.setDisplay( 'block' );
					}
					
					const toggleExpand = function () {
						isExpanded = !isExpanded;
						toggleButton.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)';
						scriptAttributesContainer.setDisplay( isExpanded ? 'block' : 'none' );
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
						const invoke = isTauri ? window.__TAURI__.invoke : null;
						
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
							attrRow.setMarginLeft( '20px' );
							attrRow.setMarginTop( '4px' );

							const attrLabel = new UIText( attrName ).setWidth( '90px' );
							attrRow.add( attrLabel );

							let attrInput;
							
							if ( typeof attrValue === 'number' ) {
								attrInput = new UINumber( attrValue ).setWidth( '60px' );
								attrInput.onChange( function () {
									editor.execute( new SetScriptAttributeCommand( editor, object, index, attrName, this.getValue() ) );
								} );
							} else if ( typeof attrValue === 'boolean' ) {
								attrInput = new UICheckbox( attrValue );
								attrInput.onChange( function () {
									editor.execute( new SetScriptAttributeCommand( editor, object, index, attrName, this.getValue() ) );
								} );
							} else if ( typeof attrValue === 'string' ) {
								attrInput = new UIInput( attrValue ).setWidth( '120px' );
								attrInput.onChange( function () {
									editor.execute( new SetScriptAttributeCommand( editor, object, index, attrName, this.getValue() ) );
								} );
							} else {
								attrInput = new UIText( JSON.stringify( attrValue ) );
								attrInput.setWidth( '120px' );
							}

							attrRow.add( attrInput );
							scriptAttributesContainer.add( attrRow );
						}
						
						if ( Object.keys( attributesToShow ).length > 0 ) {
							scriptAttributesContainer.setDisplay( isExpanded ? 'block' : 'none' );
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
