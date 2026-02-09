import * as THREE from 'three';
import { UIPanel, UIRow, UIInput, UIText, UINumber, UISelect, UICheckbox, UIDiv, UIButton } from './libs/ui.js';
import { UICollapsiblePanel } from './libs/UICollapsiblePanel.js';
import { SidebarMaterial } from './Sidebar.Material.js';
import { assetManager, TextureAsset, MaterialAsset } from '@engine/three-engine.js';
import { ModelParser } from './ModelParser.js';

function SidebarAsset( editor ) {

	const strings = editor.strings;
	const signals = editor.signals;

	const container = new UIPanel();
	container.setId( 'asset-inspector' );
	container.setDisplay( 'none' );

	const assetPanel = new UICollapsiblePanel( 'Asset' );
	const texturePanel = new UICollapsiblePanel( 'Texture' );
	const materialPanel = new UICollapsiblePanel( 'Material' );

	texturePanel.setHidden( true );
	materialPanel.setHidden( true );

	container.add( assetPanel );
	container.add( texturePanel );
	container.add( materialPanel );

	let currentAsset = null;
	let currentTextureAsset = null;
	let isSavingMaterial = false;
	let currentMaterialAsset = null;
	let currentTexture = null;
	let currentMaterial = null;
	let materialChangeSaveTimeout = null;
	const MATERIAL_CHANGE_SAVE_DEBOUNCE_MS = 500;
	let liveMaterialPreviewStop = null;

	const isTauri = typeof window !== 'undefined' && window.__TAURI__ && window.__TAURI__.core.invoke;
	const isInBrowser = typeof window !== 'undefined' && window.location && window.location.protocol === 'http:';

	const panelStatesKey = 'asset-inspector-panel-states';
	
	function getPanelState( panelName ) {
		try {
			const states = JSON.parse( localStorage.getItem( panelStatesKey ) || '{}' );
			return states[ panelName ] !== false;
		} catch ( e ) {
			return true;
		}
	}
	
	function setPanelState( panelName, expanded ) {
		try {
			const states = JSON.parse( localStorage.getItem( panelStatesKey ) || '{}' );
			states[ panelName ] = expanded;
			localStorage.setItem( panelStatesKey, JSON.stringify( states ) );
		} catch ( e ) {
		}
	}
	
	function restorePanelStates() {
		if ( getPanelState( 'asset' ) ) {
			assetPanel.expand();
		} else {
			assetPanel.collapse();
		}
		if ( getPanelState( 'texture' ) ) {
			texturePanel.expand();
		} else {
			texturePanel.collapse();
		}
		if ( getPanelState( 'material' ) ) {
			materialPanel.expand();
		} else {
			materialPanel.collapse();
		}
	}
	
	assetPanel.dom.querySelector( '.CollapsiblePanelHeader' ).addEventListener( 'click', function() {
		setTimeout( () => {
			const isExpanded = assetPanel.dom.querySelector( '.CollapsiblePanelContent' ).style.display !== 'none';
			setPanelState( 'asset', isExpanded );
		}, 0 );
	} );
	
	texturePanel.dom.querySelector( '.CollapsiblePanelHeader' ).addEventListener( 'click', function() {
		setTimeout( () => {
			const isExpanded = texturePanel.dom.querySelector( '.CollapsiblePanelContent' ).style.display !== 'none';
			setPanelState( 'texture', isExpanded );
		}, 0 );
	} );
	
	materialPanel.dom.querySelector( '.CollapsiblePanelHeader' ).addEventListener( 'click', function() {
		setTimeout( () => {
			const isExpanded = materialPanel.dom.querySelector( '.CollapsiblePanelContent' ).style.display !== 'none';
			setPanelState( 'material', isExpanded );
		}, 0 );
	} );
	
	restorePanelStates();

	const assetNameRow = new UIRow();
	const assetName = new UIText();
	assetNameRow.add( new UIText( 'Name' ).setClass( 'Label' ) );
	assetNameRow.add( assetName );
	assetPanel.add( assetNameRow );

	const assetSourceRow = new UIRow();
	const assetSource = new UIText();
	assetSource.dom.classList.add( 'asset-source' );
	assetSourceRow.add( new UIText( 'Source' ).setClass( 'Label' ) );
	assetSourceRow.add( assetSource );
	assetPanel.add( assetSourceRow );

	const assetTypeRow = new UIRow();
	const assetType = new UIText();
	assetTypeRow.add( new UIText( 'Type' ).setClass( 'Label' ) );
	assetTypeRow.add( assetType );
	assetPanel.add( assetTypeRow );

	const assetCreatedDateRow = new UIRow();
	const assetCreatedDate = new UIText();
	assetCreatedDateRow.add( new UIText( 'Created' ).setClass( 'Label' ) );
	assetCreatedDateRow.add( assetCreatedDate );
	assetPanel.add( assetCreatedDateRow );

	const assetModifiedDateRow = new UIRow();
	const assetModifiedDate = new UIText();
	assetModifiedDateRow.add( new UIText( 'Modified' ).setClass( 'Label' ) );
	assetModifiedDateRow.add( assetModifiedDate );
	assetPanel.add( assetModifiedDateRow );

	const textureWidthRow = new UIRow();
	const textureWidth = new UIText();
	textureWidthRow.add( new UIText( 'Width' ).setClass( 'Label' ) );
	textureWidthRow.add( textureWidth );
	texturePanel.add( textureWidthRow );

	const textureHeightRow = new UIRow();
	const textureHeight = new UIText();
	textureHeightRow.add( new UIText( 'Height' ).setClass( 'Label' ) );
	textureHeightRow.add( textureHeight );
	texturePanel.add( textureHeightRow );

	const textureFormatRow = new UIRow();
	const textureFormat = new UIText();
	textureFormatRow.add( new UIText( 'Format' ).setClass( 'Label' ) );
	textureFormatRow.add( textureFormat );
	texturePanel.add( textureFormatRow );

	const textureTypeRow = new UIRow();
	const textureType = new UIText();
	textureTypeRow.add( new UIText( 'Type' ).setClass( 'Label' ) );
	textureTypeRow.add( textureType );
	texturePanel.add( textureTypeRow );

	const textureColorSpaceRow = new UIRow();
	const textureColorSpace = new UISelect().setWidth( '150px' ).onChange( function () {
		if ( currentTexture ) {
			currentTexture.colorSpace = textureColorSpace.getValue();
			currentTexture.needsUpdate = true;
			if ( currentTextureAsset ) {
				currentTextureAsset.updateMetadata( { colorSpace: textureColorSpace.getValue() } );
			}
			saveTextureMetadata();
			signals.textureChanged.dispatch( currentTexture );
		}
	} );
	textureColorSpace.setOptions( {
		'srgb': 'sRGB',
		'srgb-linear': 'sRGB Linear',
		'display-p3': 'Display P3',
		'rec2020': 'Rec. 2020'
	} );
	textureColorSpaceRow.add( new UIText( 'Color Space' ).setClass( 'Label' ) );
	textureColorSpaceRow.add( textureColorSpace );
	texturePanel.add( textureColorSpaceRow );

	const textureFlipYRow = new UIRow();
	const textureFlipY = new UICheckbox().onChange( function () {
		if ( currentTexture ) {
			currentTexture.flipY = textureFlipY.getValue();
			currentTexture.needsUpdate = true;
		if ( currentTextureAsset ) {
			currentTextureAsset.updateMetadata( { flipY: textureFlipY.getValue() } ).catch( error => {
				console.error( '[Asset Inspector] Failed to update texture metadata:', error );
			} );
		}
			saveTextureMetadata();
			signals.textureChanged.dispatch( currentTexture );
		}
	} );
	textureFlipYRow.add( new UIText( 'Flip Y' ).setClass( 'Label' ) );
	textureFlipYRow.add( textureFlipY );
	texturePanel.add( textureFlipYRow );

	const textureGenerateMipmapsRow = new UIRow();
	const textureGenerateMipmaps = new UICheckbox().onChange( function () {
		if ( currentTexture ) {
			currentTexture.generateMipmaps = textureGenerateMipmaps.getValue();
			if ( textureGenerateMipmaps.getValue() ) {
				currentTexture.needsUpdate = true;
			}
		if ( currentTextureAsset ) {
			currentTextureAsset.updateMetadata( { generateMipmaps: textureGenerateMipmaps.getValue() } ).catch( error => {
				console.error( '[Asset Inspector] Failed to update texture metadata:', error );
			} );
		}
			saveTextureMetadata();
			signals.textureChanged.dispatch( currentTexture );
		}
	} );
	textureGenerateMipmapsRow.add( new UIText( 'Generate Mipmaps' ).setClass( 'Label' ) );
	textureGenerateMipmapsRow.add( textureGenerateMipmaps );
	texturePanel.add( textureGenerateMipmapsRow );

	const textureMinFilterRow = new UIRow();
	const textureMinFilter = new UISelect().setWidth( '150px' ).onChange( function () {
		if ( currentTexture ) {
			currentTexture.minFilter = parseInt( textureMinFilter.getValue() );
			currentTexture.needsUpdate = true;
		if ( currentTextureAsset ) {
			currentTextureAsset.updateMetadata( { minFilter: parseInt( textureMinFilter.getValue() ) } ).catch( error => {
				console.error( '[Asset Inspector] Failed to update texture metadata:', error );
			} );
		}
			saveTextureMetadata();
			signals.textureChanged.dispatch( currentTexture );
		}
	} );
	textureMinFilter.setOptions( {
		[ THREE.NearestFilter ]: 'Nearest',
		[ THREE.LinearFilter ]: 'Linear',
		[ THREE.NearestMipmapNearestFilter ]: 'Nearest Mipmap Nearest',
		[ THREE.NearestMipmapLinearFilter ]: 'Nearest Mipmap Linear',
		[ THREE.LinearMipmapNearestFilter ]: 'Linear Mipmap Nearest',
		[ THREE.LinearMipmapLinearFilter ]: 'Linear Mipmap Linear'
	} );
	textureMinFilterRow.add( new UIText( 'Min Filter' ).setClass( 'Label' ) );
	textureMinFilterRow.add( textureMinFilter );
	texturePanel.add( textureMinFilterRow );

	const textureMagFilterRow = new UIRow();
	const textureMagFilter = new UISelect().setWidth( '150px' ).onChange( function () {
		if ( currentTexture ) {
			currentTexture.magFilter = parseInt( textureMagFilter.getValue() );
			currentTexture.needsUpdate = true;
		if ( currentTextureAsset ) {
			currentTextureAsset.updateMetadata( { magFilter: parseInt( textureMagFilter.getValue() ) } ).catch( error => {
				console.error( '[Asset Inspector] Failed to update texture metadata:', error );
			} );
		}
			saveTextureMetadata();
			signals.textureChanged.dispatch( currentTexture );
		}
	} );
	textureMagFilter.setOptions( {
		[ THREE.NearestFilter ]: 'Nearest',
		[ THREE.LinearFilter ]: 'Linear'
	} );
	textureMagFilterRow.add( new UIText( 'Mag Filter' ).setClass( 'Label' ) );
	textureMagFilterRow.add( textureMagFilter );
	texturePanel.add( textureMagFilterRow );

	const textureWrapSRow = new UIRow();
	const textureWrapS = new UISelect().setWidth( '150px' ).onChange( function () {
		if ( currentTexture ) {
			currentTexture.wrapS = parseInt( textureWrapS.getValue() );
			currentTexture.needsUpdate = true;
		if ( currentTextureAsset ) {
			currentTextureAsset.updateMetadata( { wrapS: parseInt( textureWrapS.getValue() ) } ).catch( error => {
				console.error( '[Asset Inspector] Failed to update texture metadata:', error );
			} );
		}
			saveTextureMetadata();
			signals.textureChanged.dispatch( currentTexture );
		}
	} );
	textureWrapS.setOptions( {
		[ THREE.RepeatWrapping ]: 'Repeat',
		[ THREE.ClampToEdgeWrapping ]: 'Clamp To Edge',
		[ THREE.MirroredRepeatWrapping ]: 'Mirrored Repeat'
	} );
	textureWrapSRow.add( new UIText( 'Wrap S (U)' ).setClass( 'Label' ) );
	textureWrapSRow.add( textureWrapS );
	texturePanel.add( textureWrapSRow );

	const textureWrapTRow = new UIRow();
	const textureWrapT = new UISelect().setWidth( '150px' ).onChange( function () {
		if ( currentTexture ) {
			currentTexture.wrapT = parseInt( textureWrapT.getValue() );
			currentTexture.needsUpdate = true;
		if ( currentTextureAsset ) {
			currentTextureAsset.updateMetadata( { wrapT: parseInt( textureWrapT.getValue() ) } ).catch( error => {
				console.error( '[Asset Inspector] Failed to update texture metadata:', error );
			} );
		}
			saveTextureMetadata();
			signals.textureChanged.dispatch( currentTexture );
		}
	} );
	textureWrapT.setOptions( {
		[ THREE.RepeatWrapping ]: 'Repeat',
		[ THREE.ClampToEdgeWrapping ]: 'Clamp To Edge',
		[ THREE.MirroredRepeatWrapping ]: 'Mirrored Repeat'
	} );
	textureWrapTRow.add( new UIText( 'Wrap T (V)' ).setClass( 'Label' ) );
	textureWrapTRow.add( textureWrapT );
	texturePanel.add( textureWrapTRow );

	const textureAnisotropyRow = new UIRow();
	const textureAnisotropy = new UINumber().setWidth( '150px' ).setRange( 1, 16 ).onChange( function () {
		if ( currentTexture ) {
			currentTexture.anisotropy = textureAnisotropy.getValue();
			currentTexture.needsUpdate = true;
		if ( currentTextureAsset ) {
			currentTextureAsset.updateMetadata( { anisotropy: textureAnisotropy.getValue() } ).catch( error => {
				console.error( '[Asset Inspector] Failed to update texture metadata:', error );
			} );
		}
			saveTextureMetadata();
			signals.textureChanged.dispatch( currentTexture );
		}
	} );
	textureAnisotropyRow.add( new UIText( 'Anisotropy' ).setClass( 'Label' ) );
	textureAnisotropyRow.add( textureAnisotropy );
	texturePanel.add( textureAnisotropyRow );

	const materialContent = new SidebarMaterial( editor );
	materialPanel.add( materialContent );

	function getAssetUrl( file, assetPath ) {
		if ( file.url ) {
			return file.url;
		}
		
		if ( isTauri && !isInBrowser ) {
			return `assets/${assetPath}`;
		}
		
		if ( isInBrowser ) {
			const projectPath = editor.storage && editor.storage.getProjectPath ? editor.storage.getProjectPath() : null;
			if ( projectPath ) {
				const projectName = encodeURIComponent( projectPath.split( /[/\\]/ ).pop() || '' );
				const encodedAssetPath = encodeURIComponent( assetPath );
				return `/api/projects/${projectName}/assets/${encodedAssetPath}`;
			}
		}
		
		return null;
	}

	async function updatePreview( asset ) {
		if ( liveMaterialPreviewStop ) {
			liveMaterialPreviewStop();
			liveMaterialPreviewStop = null;
		}
	}

	async function updateMaterialPreview( material ) {
		if ( liveMaterialPreviewStop ) {
			liveMaterialPreviewStop();
			liveMaterialPreviewStop = null;
		}
	}

	async function update( asset ) {

		currentAsset = asset;

		if ( asset === null ) {
			container.setDisplay( 'none' );
			return;
		}

		container.setDisplay( 'block' );

		assetName.setValue( asset.name || '' );
		assetSource.setValue( asset.path || '' );
		
		const ext = asset.name ? asset.name.split( '.' ).pop()?.toLowerCase() : '';
		let typeText = asset.type || 'file';
		if ( typeText === 'file' ) {
			if ( [ 'jpg', 'jpeg', 'png', 'gif', 'webp', 'hdr', 'exr', 'tga', 'ktx2' ].includes( ext ) ) {
				typeText = 'Texture';
			} else if ( ext === 'mat' || asset.type === 'material' ) {
				typeText = 'Material';
			} else if ( ext === 'geo' ) {
				typeText = 'Geometry';
			} else if ( ext === 'mesh' ) {
				typeText = 'Model';
			} else if ( asset.folder && asset.folder.files ) {
				const file = asset.folder.files.find( f => f.path === asset.path );
				if ( file && file.type === 'material' ) {
					typeText = 'Material';
				} else if ( file && ext === 'json' && file.content ) {
					try {
						const jsonData = JSON.parse( file.content );
						if ( jsonData.type && jsonData.type.includes( 'Material' ) ) {
							typeText = 'Material';
						}
					} catch ( e ) {
					}
				}
			}
		}
		assetType.setValue( typeText );

		if ( asset.folder && asset.folder.files ) {
			const file = asset.folder.files.find( f => f.path === asset.path );
			if ( file ) {
				if ( file.dateCreated ) {
					assetCreatedDate.setValue( new Date( file.dateCreated ).toLocaleString() );
				} else {
					assetCreatedDate.setValue( 'Unknown' );
				}
				
				const ext = asset.name ? asset.name.split( '.' ).pop()?.toLowerCase() : '';
				const hasModifiedDate = [ 'ts', 'tsx', 'js', 'jsx', 'mat' ].includes( ext ) || typeText === 'Material' || typeText === 'Script';
				
				if ( hasModifiedDate ) {
					assetModifiedDateRow.setDisplay( 'flex' );
					if ( file.dateModified ) {
						assetModifiedDate.setValue( new Date( file.dateModified ).toLocaleString() );
					} else if ( file.dateCreated ) {
						assetModifiedDate.setValue( new Date( file.dateCreated ).toLocaleString() );
					} else {
						assetModifiedDate.setValue( 'Unknown' );
					}
				} else {
					assetModifiedDateRow.setDisplay( 'none' );
				}
			} else {
				assetCreatedDate.setValue( 'Unknown' );
				assetModifiedDateRow.setDisplay( 'none' );
			}
		} else {
			assetCreatedDate.setValue( 'Unknown' );
			assetModifiedDateRow.setDisplay( 'none' );
		}

		if ( typeText === 'Texture' || asset.type === 'texture' ) {
			texturePanel.setHidden( false );
			materialPanel.setHidden( true );

			await loadTexture( asset );
			await updatePreview( asset );
		} else if ( typeText === 'Material' || asset.type === 'material' ) {
			texturePanel.setHidden( true );
			materialPanel.setHidden( false );

			assetPanel.expand();
			materialPanel.expand();

			await loadMaterial( asset );
			await updateMaterialPreview( currentMaterial );
		} else {
			texturePanel.setHidden( true );
			materialPanel.setHidden( true );
			await updatePreview( asset );
		}

	}

	async function loadTexture( asset ) {
		try {
			let texture = null;

			if ( asset.folder && asset.folder.files ) {
				const file = asset.folder.files.find( f => f.path === asset.path );
				if ( file ) {
					if ( file.modelTexture && file.modelTexture.texture ) {
						texture = file.modelTexture.texture;
						currentTextureAsset = null;
					} else {
						const assetPath = file.path.startsWith( '/' ) ? file.path.slice( 1 ) : file.path;
						const url = getAssetUrl( file, assetPath );
						
						if ( url && url !== 'null' && url !== 'undefined' ) {
							try {
								const metadata = file.metadata && file.metadata.texture ? file.metadata.texture : {};
								let textureAsset = new TextureAsset( file.name, url, {
									name: file.name,
									path: file.path,
									dateCreated: file.dateCreated,
									colorSpace: metadata.colorSpace,
									flipY: metadata.flipY,
									generateMipmaps: metadata.generateMipmaps,
									minFilter: metadata.minFilter,
									magFilter: metadata.magFilter,
									wrapS: metadata.wrapS,
									wrapT: metadata.wrapT,
									anisotropy: metadata.anisotropy
								} );
								
								await textureAsset.load();
								texture = textureAsset.getTexture();
								currentTextureAsset = textureAsset;
								
								const assetPath = file.path.startsWith( '/' ) ? file.path.slice( 1 ) : file.path;
								const existingTextureAsset = editor.assets.getByUrl( assetPath );
								if ( !existingTextureAsset ) {
									editor.assets.register( textureAsset );
								} else if ( existingTextureAsset !== textureAsset ) {
									textureAsset = existingTextureAsset;
									texture = textureAsset.getTexture();
									currentTextureAsset = textureAsset;
								}
								
								textureAsset.on( 'changed', async function onTextureAssetChanged() {
									if ( currentTextureAsset === textureAsset ) {
										const updatedTexture = textureAsset.getTexture();
										if ( updatedTexture && updatedTexture !== currentTexture ) {
											currentTexture = updatedTexture;
										}
										await updatePreview( currentAsset ).catch( error => {
											console.error( '[Asset Inspector] Failed to update texture preview after asset change:', error );
										} );
										
										if ( currentTexture ) {
											const width = currentTexture.image ? Math.round( currentTexture.image.width ) : 0;
											const height = currentTexture.image ? Math.round( currentTexture.image.height ) : 0;
											textureWidth.setValue( width.toString() );
											textureHeight.setValue( height.toString() );
											textureColorSpace.setValue( currentTexture.colorSpace || 'srgb' );
											textureFlipY.setValue( currentTexture.flipY );
											textureGenerateMipmaps.setValue( currentTexture.generateMipmaps );
											textureMinFilter.setValue( currentTexture.minFilter );
											textureMagFilter.setValue( currentTexture.magFilter );
											textureWrapS.setValue( currentTexture.wrapS );
											textureWrapT.setValue( currentTexture.wrapT );
											textureAnisotropy.setValue( currentTexture.anisotropy || 1 );
										}
									}
								} );
								
								if ( texture && metadata ) {
									if ( metadata.colorSpace !== undefined ) {
										texture.colorSpace = metadata.colorSpace;
									}
									if ( metadata.flipY !== undefined ) {
										texture.flipY = metadata.flipY;
									}
									if ( metadata.generateMipmaps !== undefined ) {
										texture.generateMipmaps = metadata.generateMipmaps;
									}
									if ( metadata.minFilter !== undefined ) {
										texture.minFilter = metadata.minFilter;
									}
									if ( metadata.magFilter !== undefined ) {
										texture.magFilter = metadata.magFilter;
									}
									if ( metadata.wrapS !== undefined ) {
										texture.wrapS = metadata.wrapS;
									}
									if ( metadata.wrapT !== undefined ) {
										texture.wrapT = metadata.wrapT;
									}
									if ( metadata.anisotropy !== undefined ) {
										texture.anisotropy = metadata.anisotropy;
									}
									texture.needsUpdate = true;
								}
							} catch ( loadError ) {
								console.warn( '[Asset Inspector] Failed to load texture asset:', loadError );
								throw loadError;
							}
						} else {
							console.warn( '[Asset Inspector] Invalid texture URL:', url );
						}
					}
				}
			}

			if ( texture ) {
				currentTexture = texture;

				const width = texture.image ? Math.round( texture.image.width ) : 0;
				const height = texture.image ? Math.round( texture.image.height ) : 0;
				textureWidth.setValue( width.toString() );
				textureHeight.setValue( height.toString() );
				
				const formatNames = {
					[ THREE.AlphaFormat ]: 'Alpha',
					[ THREE.RGBFormat ]: 'RGB',
					[ THREE.RGBAFormat ]: 'RGBA',
					[ THREE.LuminanceFormat ]: 'Luminance',
					[ THREE.LuminanceAlphaFormat ]: 'Luminance Alpha',
					[ THREE.RGBEFormat ]: 'RGBE',
					[ THREE.DepthFormat ]: 'Depth',
					[ THREE.DepthStencilFormat ]: 'Depth Stencil',
					[ THREE.RedFormat ]: 'Red',
					[ THREE.RedIntegerFormat ]: 'Red Integer',
					[ THREE.RGFormat ]: 'RG',
					[ THREE.RGIntegerFormat ]: 'RG Integer',
					[ THREE.RGBIntegerFormat ]: 'RGB Integer',
					[ THREE.RGBAIntegerFormat ]: 'RGBA Integer'
				};
				textureFormat.setValue( formatNames[ texture.format ] || texture.format );

				const typeNames = {
					[ THREE.UnsignedByteType ]: 'Unsigned Byte',
					[ THREE.ByteType ]: 'Byte',
					[ THREE.ShortType ]: 'Short',
					[ THREE.UnsignedShortType ]: 'Unsigned Short',
					[ THREE.IntType ]: 'Int',
					[ THREE.UnsignedIntType ]: 'Unsigned Int',
					[ THREE.FloatType ]: 'Float',
					[ THREE.HalfFloatType ]: 'Half Float',
					[ THREE.UnsignedShort4444Type ]: 'Unsigned Short 4444',
					[ THREE.UnsignedShort5551Type ]: 'Unsigned Short 5551',
					[ THREE.UnsignedInt248Type ]: 'Unsigned Int 248'
				};
				textureType.setValue( typeNames[ texture.type ] || texture.type );

				textureColorSpace.setValue( texture.colorSpace || 'srgb' );
				textureFlipY.setValue( texture.flipY );
				textureGenerateMipmaps.setValue( texture.generateMipmaps );
				textureMinFilter.setValue( texture.minFilter );
				textureMagFilter.setValue( texture.magFilter );
				textureWrapS.setValue( texture.wrapS );
				textureWrapT.setValue( texture.wrapT );
				textureAnisotropy.setValue( texture.anisotropy || 1 );
			}
		} catch ( error ) {
			console.error( '[Asset Inspector] Failed to load texture:', error );
		}
	}

	async function loadMaterial( asset ) {
		try {
			const assetPath = asset.path.startsWith( '/' ) ? asset.path.slice( 1 ) : asset.path;
			let materialAsset = editor.assets.getByUrl( assetPath );
			
			if ( materialAsset && materialAsset instanceof MaterialAsset ) {
				const material = materialAsset.getMaterial();
				if ( material ) {
					currentMaterialAsset = materialAsset;
					currentMaterial = material;
					const materialObject = { material: material, isMaterial: true };
					signals.materialChanged.dispatch( materialObject, 0 );
					
					let assetChangedDebounceTimeout = null;
					materialAsset.on( 'changed', function onMaterialAssetChanged() {
						if ( currentMaterialAsset !== materialAsset || isSavingMaterial ) return;
						if ( assetChangedDebounceTimeout ) clearTimeout( assetChangedDebounceTimeout );
						assetChangedDebounceTimeout = setTimeout( async function () {
							assetChangedDebounceTimeout = null;
							const updatedMaterial = materialAsset.getMaterial();
							const isNodeMaterial = updatedMaterial && ( updatedMaterial.type === 'NodeMaterial' || updatedMaterial.isNodeMaterial );
							if ( updatedMaterial && ( isNodeMaterial || updatedMaterial !== currentMaterial ) ) {
								currentMaterial = updatedMaterial;
								editor.syncMaterialAssetToScene( materialAsset );
								// Single source of truth: refresh global preview cache and all img refs (assets panel, mesh inspector, etc.)
								if ( typeof window.refreshMaterialPreviewForAsset === 'function' ) {
									await window.refreshMaterialPreviewForAsset( materialAsset ).catch( () => {} );
								}
								await updateMaterialPreview( currentMaterial ).catch( error => {
									console.error( '[Asset Inspector] Failed to update material preview after asset change:', error );
								} );
								const materialObject = { material: currentMaterial, isMaterial: true };
								signals.materialChanged.dispatch( materialObject, 0 );
							}
						}, MATERIAL_CHANGE_SAVE_DEBOUNCE_MS );
					} );
					
					try {
						await updateMaterialPreview( material );
					} catch ( previewError ) {
						console.error( '[Asset Inspector] Failed to update material preview:', previewError );
					}
					return;
				}
			}
			
			let material = null;

			function findFileInFolder( folder, pathNorm, fileName ) {
				const norm = ( p ) => ( p || '' ).replace( /^\/+/, '' ).replace( /\/+/g, '/' );
				if ( folder.files ) {
					const f = folder.files.find( file => norm( file.path ) === pathNorm || file.path === asset.path || file.name === fileName );
					if ( f ) return f;
				}
				if ( folder.children ) {
					for ( const child of folder.children ) {
						const found = findFileInFolder( child, pathNorm, fileName );
						if ( found ) return found;
					}
				}
				return null;
			}

			const norm = ( p ) => ( p || '' ).replace( /^\/+/, '' ).replace( /\/+/g, '/' );
			const assetPathNorm = norm( asset.path );
			const fileName = asset.name;
			let file = asset.folder && asset.folder.files
				? asset.folder.files.find( f => norm( f.path ) === assetPathNorm || f.path === asset.path || f.name === fileName )
				: null;
			if ( ! file && window.assetsRoot ) {
				file = findFileInFolder( window.assetsRoot, assetPathNorm, fileName );
			}
			console.log( '[Asset Inspector] Found file:', file ? { name: file.name, type: file.type, hasContent: !!file.content, path: file.path } : 'NOT FOUND' );
			if ( file ) {
					if ( file.modelMaterial && file.modelMaterial.material ) {
						material = file.modelMaterial.material;
					} else if ( file.modelPath ) {
						const cachedModel = assetManager.getParsedModel( file.modelPath );
						if ( cachedModel && cachedModel.materials ) {
							const matName = file.name.replace( /\.(mat|nodemat)$/, '' );
							const matEntry = cachedModel.materials.find( m => m.name === matName );
							if ( matEntry && matEntry.material ) {
								material = matEntry.material;
							}
						}

						if ( !material && isTauri ) {
							const projectPath = editor.storage && editor.storage.getProjectPath ? editor.storage.getProjectPath() : null;
							if ( projectPath ) {
								try {
									const modelContents = await ModelParser.parseModel( file.modelPath, file.name, projectPath );
									if ( modelContents && modelContents.materials ) {
										const matName = file.name.replace( /\.(mat|nodemat)$/, '' );
										const matEntry = modelContents.materials.find( m => m.name === matName );
										if ( matEntry && matEntry.material ) {
											material = matEntry.material;
											assetManager.registerParsedModel( file.modelPath, modelContents );
										}
									}
								} catch ( error ) {
									console.warn( '[Asset Inspector] Failed to load material from model:', error );
								}
							}
						}
					} else {
						const fileExt = file.name ? file.name.split( '.' ).pop()?.toLowerCase() : '';
						console.log( '[Asset Inspector] Checking material file. fileExt:', fileExt, 'file.type:', file.type, 'hasContent:', !!file.content, 'name ends with .mat/.nodemat:', file.name.endsWith( '.mat' ) || file.name.endsWith( '.nodemat' ) );
						if ( file.type === 'material' || file.name.endsWith( '.mat' ) || file.name.endsWith( '.nodemat' ) || ( file.content && fileExt === 'json' ) ) {
							try {
								let materialData = null;
								if ( file.content ) {
									console.log( '[Asset Inspector] Parsing material from file.content, length:', file.content.length );
									materialData = JSON.parse( file.content );
									console.log( '[Asset Inspector] Parsed materialData:', materialData ? { type: materialData.type, hasType: !!materialData.type } : 'null' );
								} else if ( isTauri && file.path ) {
									console.log( '[Asset Inspector] Loading material from file system, path:', file.path );
									const projectPath = editor.storage && editor.storage.getProjectPath ? editor.storage.getProjectPath() : null;
									if ( projectPath ) {
										const assetPath = file.path.startsWith( '/' ) ? file.path.slice( 1 ) : file.path;
										const assetBytes = await window.__TAURI__.core.invoke( 'read_asset_file', {
											projectPath: projectPath,
											assetPath: assetPath
										} );
										const text = new TextDecoder().decode( new Uint8Array( assetBytes ) );
										materialData = JSON.parse( text );
									}
								}
								
								if ( materialData && materialData.type && materialData.type.includes( 'Material' ) ) {
									console.log( '[Asset Inspector] Material data valid, parsing. Type:', materialData.type, 'Full data:', materialData );
									
									// Handle NodeMaterial / *NodeMaterial (e.g. MeshStandardNodeMaterial) - preserve full graph
									const isNodeMaterial = materialData.type === 'NodeMaterial' ||
										( materialData.type && materialData.type.endsWith( 'NodeMaterial' ) ) ||
										( materialData.nodes && materialData.connections );
									if ( isNodeMaterial ) {

										console.log( '[Asset Inspector] NodeMaterial detected, storing as data object' );
										material = {
											...materialData,
											type: materialData.type || 'NodeMaterial',
											isNodeMaterial: true,
											assetPath: file.path,
											sourceFile: file.name
										};
										
									} else {

										// Standard Three.js material - use MaterialLoader
										try {
											const materialType = materialData.type;
											const MaterialClass = THREE[ materialType ];
											
											if ( !MaterialClass ) {
												console.warn( '[Asset Inspector] Material class not found:', materialType );
												return;
											}
											
											const loader = new THREE.MaterialLoader();
											loader.setTextures( {} );
											
											try {
												material = loader.parse( materialData );
												console.log( '[Asset Inspector] MaterialLoader parsed material:', material ? { type: material.type, name: material.name } : 'null' );
											} catch ( loaderError ) {
												console.warn( '[Asset Inspector] MaterialLoader failed, trying ObjectLoader:', loaderError );
												const objectLoader = new THREE.ObjectLoader();
												const parsed = objectLoader.parseMaterials( [ materialData ] );
												material = parsed && parsed.length > 0 ? parsed[ 0 ] : null;
												console.log( '[Asset Inspector] ObjectLoader parsed material:', material ? { type: material.type, name: material.name } : 'null' );
											}
											
											if ( !material ) {
												console.warn( '[Asset Inspector] Both loaders failed, creating material directly from data' );
												material = new MaterialClass();
											
											if ( materialData.color !== undefined ) {
												if ( typeof materialData.color === 'number' ) {
													material.color.setHex( materialData.color );
												} else if ( materialData.color.r !== undefined ) {
													material.color.setRGB( materialData.color.r, materialData.color.g, materialData.color.b );
												}
											}
											
											if ( materialData.roughness !== undefined ) material.roughness = materialData.roughness;
											if ( materialData.metalness !== undefined ) material.metalness = materialData.metalness;
											if ( materialData.emissive !== undefined ) {
												if ( typeof materialData.emissive === 'number' ) {
													material.emissive.setHex( materialData.emissive );
												} else if ( materialData.emissive.r !== undefined ) {
													material.emissive.setRGB( materialData.emissive.r, materialData.emissive.g, materialData.emissive.b );
												}
											}
											if ( materialData.opacity !== undefined ) material.opacity = materialData.opacity;
											if ( materialData.transparent !== undefined ) material.transparent = materialData.transparent;
											if ( materialData.name !== undefined ) material.name = materialData.name;
											if ( materialData.userData ) material.userData = materialData.userData;
											
											console.log( '[Asset Inspector] Created material directly:', material.type );
										}
										
										if ( material ) {
											const assetPath = file.path.startsWith( '/' ) ? file.path.slice( 1 ) : file.path;
											const existingMaterial = editor.getMaterialByAssetPath( assetPath );
											if ( existingMaterial ) {
												material = existingMaterial;
											} else {
												material.assetPath = assetPath;
												material.sourceFile = file.name;
												material.isMaterial = true;
											}
										}
									} catch ( createError ) {
										console.error( '[Asset Inspector] Failed to create material:', createError );
									}

									} // End of standard material handling

								} else {
									console.warn( '[Asset Inspector] Material data invalid or not a material. materialData:', materialData, 'type:', materialData?.type );
								}
							} catch ( parseError ) {
								console.warn( '[Asset Inspector] Failed to parse material file:', parseError );
							}
						}
					}
				}
			if ( material && ( material instanceof THREE.Material || material.isNodeMaterial || ( material.nodes && material.connections ) ) ) {
				console.log( '[Asset Inspector] Material loaded successfully:', material.type, material.name );
				currentMaterial = material;
				editor.selected = null;
				signals.objectSelected.dispatch( null );
				
				// Only dispatch materialChanged for standard THREE.Material instances
				// Node materials are plain data objects and don't work with SidebarMaterial UI
				// Single material inspector: dispatch for both standard and node materials
				const materialObject = { material: material, isMaterial: true };
				signals.materialChanged.dispatch( materialObject, 0 );

				try {
					await updateMaterialPreview( material );
				} catch ( previewError ) {
					console.error( '[Asset Inspector] Failed to update material preview:', previewError );
				}
			} else {
				console.warn( '[Asset Inspector] Material not loaded or invalid. Material:', material, 'Is instance:', material instanceof THREE.Material );
			}
		} catch ( error ) {
			console.error( '[Asset Inspector] Failed to load material:', error );
		}
	}

	function saveTextureMetadata() {
		if ( !currentAsset || !currentTextureAsset ) return;
		
		if ( currentAsset.folder && currentAsset.folder.files ) {
			const norm = ( p ) => ( p || '' ).replace( /^\/+/, '' ).replace( /\/+/g, '/' );
			const file = currentAsset.folder.files.find( f => norm( f.path ) === norm( currentAsset.path ) || f.name === currentAsset.name );
			if ( file ) {
				if ( !file.metadata ) {
					file.metadata = {};
				}
				
				const metadata = currentTextureAsset.getMetadata();
				if ( metadata ) {
					file.metadata.texture = {
						colorSpace: metadata.colorSpace,
						flipY: metadata.flipY,
						generateMipmaps: metadata.generateMipmaps,
						minFilter: metadata.minFilter,
						magFilter: metadata.magFilter,
						wrapS: metadata.wrapS,
						wrapT: metadata.wrapT,
						anisotropy: metadata.anisotropy
					};
					
					if ( window.saveAssets ) {
						window.saveAssets().catch( error => {
							console.error( '[Asset Inspector] Failed to save texture metadata:', error );
						} );
					}
				}
			}
		}
	}

	async function saveMaterialContent() {
		if ( !currentAsset || !currentMaterial || !currentMaterialAsset ) return;
		if ( isSavingMaterial ) return;
		
		isSavingMaterial = true;
		try {
			if ( currentAsset.folder && currentAsset.folder.files ) {
				const norm = ( p ) => ( p || '' ).replace( /^\/+/, '' ).replace( /\/+/g, '/' );
				const file = currentAsset.folder.files.find( f => norm( f.path ) === norm( currentAsset.path ) || f.name === currentAsset.name );
				if ( file ) {
					try {
						const isNodeMat = currentMaterial.type === 'NodeMaterial' || currentMaterial.isNodeMaterial || ( currentMaterial.nodes && currentMaterial.connections );
						const materialJson = isNodeMat ? currentMaterial : currentMaterial.toJSON();
						const materialContent = JSON.stringify( materialJson, null, '\t' );
						file.content = materialContent;
						file.size = materialContent.length;
						file.dateModified = Date.now();
						
						if ( window.saveAssets ) {
							await window.saveAssets().catch( error => {
								console.error( '[Asset Inspector] Failed to save material content:', error );
							} );
						}
						
						if ( isNodeMat ) {
							currentMaterialAsset.data = currentMaterial;
							editor.syncMaterialAssetToScene( currentMaterialAsset );
						} else {
							const assetMaterial = currentMaterialAsset.getMaterial();
							if ( assetMaterial !== currentMaterial ) {
								await currentMaterialAsset.setMaterial( currentMaterial );
								editor.syncMaterialAssetToScene( currentMaterialAsset );
							}
						}
						if ( currentMaterialAsset.metadata.materialType !== currentMaterial.type ) {
							await currentMaterialAsset.updateMetadata( {
								materialType: currentMaterial.type
							} );
						}
						currentMaterialAsset.modifiedAt = Date.now();
					} catch ( error ) {
						console.error( '[Asset Inspector] Failed to serialize material:', error );
					}
				}
			}
		} finally {
			isSavingMaterial = false;
		}
	}

	function checkAssetSelection() {
		const asset = window.selectedAsset;
		if ( asset !== currentAsset ) {
			update( asset );
		}
	}

	setInterval( checkAssetSelection, 100 );

	signals.materialChanged.add( function ( object, slot ) {
		if ( !currentMaterial || !currentAsset || isSavingMaterial ) return;
		
		let materialToCheck = null;
		if ( object && object.material ) {
			materialToCheck = Array.isArray( object.material ) ? object.material[ slot || 0 ] : object.material;
		} else if ( object && object.isMaterial && object.material ) {
			materialToCheck = object.material;
		}
		
		if ( !materialToCheck ) return;
		
		const assetPath = currentAsset.path.startsWith( '/' ) ? currentAsset.path.slice( 1 ) : currentAsset.path;
		const materialAssetPath = materialToCheck.assetPath ? ( materialToCheck.assetPath.startsWith( '/' ) ? materialToCheck.assetPath.slice( 1 ) : materialToCheck.assetPath ) : null;
		const currentMaterialAssetPath = currentMaterial.assetPath ? ( currentMaterial.assetPath.startsWith( '/' ) ? currentMaterial.assetPath.slice( 1 ) : currentMaterial.assetPath ) : null;
		
		const isSameInstance = materialToCheck === currentMaterial;
		const isSameAsset = materialAssetPath && materialAssetPath === assetPath && currentMaterialAssetPath === assetPath;
		
		if ( isSameInstance || isSameAsset ) {
			if ( !isSameInstance && isSameAsset ) {
				currentMaterial = materialToCheck;
			}
			if ( materialChangeSaveTimeout ) clearTimeout( materialChangeSaveTimeout );
			materialChangeSaveTimeout = setTimeout( async function () {
				materialChangeSaveTimeout = null;
				await updateMaterialPreview( currentMaterial ).catch( error => {
					console.error( '[Asset Inspector] Failed to update material preview after change:', error );
				} );
				await saveMaterialContent();
			}, MATERIAL_CHANGE_SAVE_DEBOUNCE_MS );
		} else if ( materialAssetPath && materialAssetPath === assetPath ) {
			currentMaterial = materialToCheck;
			if ( materialChangeSaveTimeout ) clearTimeout( materialChangeSaveTimeout );
			materialChangeSaveTimeout = setTimeout( async function () {
				materialChangeSaveTimeout = null;
				await updateMaterialPreview( currentMaterial ).catch( error => {
					console.error( '[Asset Inspector] Failed to update material preview after change:', error );
				} );
				await saveMaterialContent();
			}, MATERIAL_CHANGE_SAVE_DEBOUNCE_MS );
		}
	} );

	return container;

}

export { SidebarAsset };
