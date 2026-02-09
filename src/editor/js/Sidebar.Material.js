import * as THREE from 'three';

import { UIButton, UIDiv, UIInput, UIPanel, UIRow, UISelect, UIText, UITextArea } from './libs/ui.js';

import { SetMaterialCommand } from './commands/SetMaterialCommand.js';
import { SetMaterialValueCommand } from './commands/SetMaterialValueCommand.js';
import { AssetSelector } from './AssetSelector.js';
import { getAssetPreviewRenderer } from './AssetPreviewRenderer.js';
import { createLiveMaterialPreview } from './LiveMaterialPreview.js';
import { generateMaterialFromNodes } from './Editor.js';

import { SidebarMaterialBooleanProperty } from './Sidebar.Material.BooleanProperty.js';
import { SidebarMaterialColorProperty } from './Sidebar.Material.ColorProperty.js';
import { SidebarMaterialConstantProperty } from './Sidebar.Material.ConstantProperty.js';
import { SidebarMaterialMapProperty } from './Sidebar.Material.MapProperty.js';
import { SidebarMaterialNumberProperty } from './Sidebar.Material.NumberProperty.js';
import { SidebarMaterialRangeValueProperty } from './Sidebar.Material.RangeValueProperty.js';
import { SidebarMaterialProgram } from './Sidebar.Material.Program.js';

function SidebarMaterial( editor ) {

	const signals = editor.signals;
	const strings = editor.strings;
	const previewRenderer = getAssetPreviewRenderer();

	let currentObject;
	let materialPreviewRequestId = 0;
	let previewUpdateTimeout = null;
	let liveMaterialPreviewStop = null;
	const PREVIEW_DEBOUNCE_MS = 400;

	let currentMaterialSlot = 0;

	function copyCommonMaterialProperties( src, dest ) {
		const common = [ 'color', 'emissive', 'specular', 'shininess', 'roughness', 'metalness',
			'opacity', 'transparent', 'wireframe', 'side', 'depthWrite', 'depthTest', 'alphaTest', 'blending',
			'map', 'emissiveMap', 'normalMap', 'bumpMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'alphaMap',
			'matcap', 'specularMap', 'gradientMap' ];
		common.forEach( function ( key ) {
			if ( key in src && key in dest ) {
				const v = src[ key ];
				if ( v && v.isColor ) dest[ key ].copy( v );
				else if ( v && v.isTexture ) dest[ key ] = v;
				else if ( typeof v === 'number' ) dest[ key ] = v;
				else if ( typeof v === 'boolean' ) dest[ key ] = v;
			}
		} );
	}

	const container = new UIPanel();
	container.setBorderTop( '0' );
	container.setDisplay( 'none' );
	container.setPaddingTop( '20px' );

	

	const materialSlotRow = new UIRow();

	materialSlotRow.add( new UIText( strings.getKey( 'sidebar/material/slot' ) ).setClass( 'Label' ) );

	const materialSlotSelect = new UISelect().setWidth( '170px' ).setFontSize( '12px' ).onChange( update );
	materialSlotSelect.setOptions( { 0: '' } ).setValue( 0 );
	materialSlotRow.add( materialSlotSelect );

	container.add( materialSlotRow );

	// Default material state: Select Material, Create new material, Create new node material (when mesh has no material or project default material)
	const defaultMaterialContainer = new UIDiv();
	defaultMaterialContainer.setDisplay( 'none' );
	const selectMaterialInDefaultBtn = new UIButton( 'Select Material...' ).setWidth( '100%' );
	selectMaterialInDefaultBtn.onClick( function () {
		if ( ! currentObject ) return;
		if ( ! editor.assetSelector ) editor.assetSelector = new AssetSelector( editor );
		editor.assetSelector.show( async function ( material ) {
			const isNodeMaterial = material && ( material.type === 'NodeMaterial' || material.isNodeMaterial );
			const isStandardMaterial = material && material instanceof THREE.Material;
			if ( ! material || ( ! isStandardMaterial && ! isNodeMaterial ) ) return;
			const object = currentObject;
			if ( ! object || ! object.material ) return;
			const actualOld = Array.isArray( object.material ) ? object.material[ currentMaterialSlot ] : object.material;
			if ( actualOld ) editor.removeMaterial( actualOld );
			editor.execute( new SetMaterialCommand( editor, object, material, currentMaterialSlot ), 'Set Material' );
			if ( isStandardMaterial ) editor.addMaterial( material );
			refreshUI();
		}, null, 'material' );
	} );
	const createStandardMaterialBtn = new UIButton( 'Create new material' ).setWidth( '100%' );
	createStandardMaterialBtn.onClick( function () {
		if ( editor.signals && editor.signals.createMaterialAsset ) {
			editor.signals.createMaterialAsset.dispatch( 'standard' );
		}
	} );
	const createNodeMaterialBtn = new UIButton( 'Create new node material' ).setWidth( '100%' );
	createNodeMaterialBtn.onClick( function () {
		if ( editor.signals && editor.signals.createMaterialAsset ) {
			editor.signals.createMaterialAsset.dispatch( 'node' );
		}
	} );
	defaultMaterialContainer.add( selectMaterialInDefaultBtn );
	defaultMaterialContainer.add( createStandardMaterialBtn );
	defaultMaterialContainer.add( createNodeMaterialBtn );
	container.add( defaultMaterialContainer );

	// Main material editor (hidden when in default material state)
	const mainMaterialContainer = new UIDiv();
	container.add( mainMaterialContainer );

	// Material preview at top – full panel width, no label
	const nodeMaterialPreviewDiv = new UIDiv();
	nodeMaterialPreviewDiv.setWidth( '100%' );
	nodeMaterialPreviewDiv.setHeight( '200px' );
	nodeMaterialPreviewDiv.dom.style.overflow = 'hidden';
	nodeMaterialPreviewDiv.dom.style.display = 'none';
	mainMaterialContainer.add( nodeMaterialPreviewDiv );

	const materialClassRow = new UIRow();
	const materialClassSelect = new UISelect().setWidth( '170px' ).setFontSize( '12px' );
	const materialTypeOptions = {
		'LineBasicMaterial': 'LineBasicMaterial',
		'LineDashedMaterial': 'LineDashedMaterial',
		'MeshBasicMaterial': 'MeshBasicMaterial',
		'MeshDepthMaterial': 'MeshDepthMaterial',
		'MeshNormalMaterial': 'MeshNormalMaterial',
		'MeshLambertMaterial': 'MeshLambertMaterial',
		'MeshMatcapMaterial': 'MeshMatcapMaterial',
		'MeshPhongMaterial': 'MeshPhongMaterial',
		'MeshToonMaterial': 'MeshToonMaterial',
		'MeshStandardMaterial': 'MeshStandardMaterial',
		'MeshPhysicalMaterial': 'MeshPhysicalMaterial',
		'ShadowMaterial': 'ShadowMaterial',
		'SpriteMaterial': 'SpriteMaterial',
		'PointsMaterial': 'PointsMaterial'
	};
	materialClassSelect.setOptions( materialTypeOptions );
	materialClassSelect.onChange( function () {
		const newType = materialClassSelect.getValue();
		const material = editor.getObjectMaterial( currentObject, currentMaterialSlot );
		if ( ! material || material.type === newType ) return;
		const MaterialClass = materialClasses[ newType ];
		if ( ! MaterialClass ) return;
		const newMaterial = new MaterialClass();
		copyCommonMaterialProperties( material, newMaterial );
		newMaterial.name = material.name || newType;
		if ( material.assetPath ) {
			newMaterial.assetPath = material.assetPath;
			newMaterial.sourceFile = material.sourceFile;
			newMaterial.isMaterial = true;
			const path = ( material.assetPath || '' ).replace( /^\/+/, '' );
			const materialAsset = editor.assets.getByUrl( path );
			if ( materialAsset && typeof materialAsset.setMaterial === 'function' ) {
				materialAsset.setMaterial( newMaterial );
				editor.syncMaterialAssetToScene( materialAsset );
			} else {
				editor.removeMaterial( material );
				editor.setObjectMaterial( currentObject, currentMaterialSlot, newMaterial );
				editor.addMaterial( newMaterial );
				editor.signals.materialChanged.dispatch( currentObject, currentMaterialSlot );
			}
		} else {
			editor.removeMaterial( material );
			editor.execute( new SetMaterialCommand( editor, currentObject, newMaterial, currentMaterialSlot ), strings.getKey( 'command/SetMaterial' ) + ': ' + newType );
			editor.addMaterial( newMaterial );
		}
		refreshUI();
	} );

	materialClassRow.add( new UIText( strings.getKey( 'sidebar/material/type' ) ).setClass( 'Label' ) );
	materialClassRow.add( materialClassSelect );

	mainMaterialContainer.add( materialClassRow );

	const materialSelectorRow = new UIRow();
	const materialSelectorButton = new UIButton( 'Select Material...' ).setWidth( '150px' );
	materialSelectorRow.setDisplay( 'none' ); // Select Material is only in default state panel

	materialSelectorButton.dom.addEventListener( 'dragover', function ( event ) {
		event.preventDefault();
		event.stopPropagation();
		materialSelectorButton.dom.style.opacity = '0.7';
	} );

	materialSelectorButton.dom.addEventListener( 'dragleave', function ( event ) {
		event.preventDefault();
		event.stopPropagation();
		materialSelectorButton.dom.style.opacity = '1';
	} );

	materialSelectorButton.dom.addEventListener( 'drop', async function ( event ) {
		event.preventDefault();
		event.stopPropagation();
		materialSelectorButton.dom.style.opacity = '1';

		const assetData = event.dataTransfer.getData( 'text/plain' );
		if ( assetData ) {
			try {
				const asset = JSON.parse( assetData );
				const isMaterialAsset = asset.type === 'material' || 
				                       ( asset.type === 'file' && asset.name && ( asset.name.endsWith( '.mat' ) || asset.name.endsWith( '.nodemat' ) ) );
				const isTextureAsset = asset.type === 'texture' || 
				                     ( asset.type === 'file' && asset.name && 
				                       [ 'jpg', 'jpeg', 'png', 'gif', 'webp', 'hdr', 'exr', 'tga', 'ktx2' ]
				                         .includes( asset.name.split( '.' ).pop()?.toLowerCase() ) );
				
				if ( isMaterialAsset || isTextureAsset ) {
					if ( ! currentObject ) {
						alert( 'Please select an object first' );
						return;
					}

					if ( ! editor.assetSelector ) {
						editor.assetSelector = new AssetSelector( editor );
					}

					if ( isMaterialAsset ) {
						await editor.assetSelector.selectMaterial( asset, async function ( material ) {
							if ( material ) {
								const object = currentObject;
								if ( object ) {
									const actualOld = Array.isArray( object.material ) ? object.material[ currentMaterialSlot ] : object.material;
									if ( actualOld ) editor.removeMaterial( actualOld );
									editor.execute( new SetMaterialCommand( editor, object, material, currentMaterialSlot ), strings.getKey( 'command/SetMaterial' ) + ': ' + ( material.type || 'Material' ) );
									if ( material && material instanceof THREE.Material ) editor.addMaterial( material );
									refreshUI();
								}
							}
						} );
					} else if ( isTextureAsset ) {
						await editor.assetSelector.selectTexture( asset, async function ( texture ) {
							if ( texture ) {
								const object = currentObject;
								if ( object && object.material ) {
									const materialType = object.material.type;
									const MaterialClass = THREE[ materialType ] || THREE.MeshStandardMaterial;
									const newMaterial = new MaterialClass();
									newMaterial.map = texture;
									newMaterial.name = object.material.name || 'Material';
									
									const actualOld = Array.isArray( object.material ) ? object.material[ currentMaterialSlot ] : object.material;
									if ( actualOld ) editor.removeMaterial( actualOld );
									editor.execute( new SetMaterialCommand( editor, object, newMaterial, currentMaterialSlot ), strings.getKey( 'command/SetMaterial' ) + ': ' + newMaterial.type );
									editor.addMaterial( newMaterial );
									refreshUI();
								}
							}
						} );
					}
					return;
				}
			} catch ( e ) {
				console.error( e );
			}
		}
	} );

	materialSelectorButton.onClick( function () {
		if ( ! currentObject ) {
			alert( 'Please select an object first' );
			return;
		}

		if ( ! editor.assetSelector ) {
			editor.assetSelector = new AssetSelector( editor );
		}

		editor.assetSelector.show( async function ( material ) {
			// Accept both THREE.Material instances and NodeMaterial data objects
			const isNodeMaterial = material && ( material.type === 'NodeMaterial' || material.isNodeMaterial );
			const isStandardMaterial = material && material instanceof THREE.Material;
			
			if ( ! material || ( ! isStandardMaterial && ! isNodeMaterial ) ) {
				console.warn( '[Sidebar.Material] Invalid material selected' );
				return;
			}

			const object = currentObject;
			if ( ! object || ! object.material ) return;

			const actualOld = Array.isArray( object.material ) ? object.material[ currentMaterialSlot ] : object.material;
			if ( actualOld ) editor.removeMaterial( actualOld );
			editor.execute( new SetMaterialCommand( editor, object, material, currentMaterialSlot ), strings.getKey( 'command/SetMaterial' ) + ': ' + ( material.type || 'Material' ) );
			
			// Standard materials: add the passed material; node materials: setObjectMaterial already added the generated material
			if ( isStandardMaterial ) {
				editor.addMaterial( material );
			}
			
			refreshUI();
		}, null, 'material' );
	} );

	materialSelectorRow.add( new UIText( 'Material' ).setClass( 'Label' ) );
	materialSelectorRow.add( materialSelectorButton );
	mainMaterialContainer.add( materialSelectorRow );

	

	const materialNameRow = new UIRow();
	const materialName = new UIInput().setWidth( '150px' ).setFontSize( '12px' ).onChange( function () {

		editor.execute( new SetMaterialValueCommand( editor, currentObject, 'name', materialName.getValue(), currentMaterialSlot ) );

	} );

	materialNameRow.add( new UIText( strings.getKey( 'sidebar/material/name' ) ).setClass( 'Label' ) );
	materialNameRow.add( materialName );

	mainMaterialContainer.add( materialNameRow );

	async function updateMaterialPreviewInPanel( material, previewDiv ) {
		const requestId = ++ materialPreviewRequestId;
		if ( ! material ) return;
		if ( liveMaterialPreviewStop ) {
			liveMaterialPreviewStop();
			liveMaterialPreviewStop = null;
		}
		try {
			const nodeData = material.nodeMaterialData || ( ( material.type === 'NodeMaterial' || material.isNodeMaterial || ( material.type && typeof material.type === 'string' && material.type.endsWith( 'NodeMaterial' ) ) || ( material.nodes && material.connections ) ) ? material : null );
			if ( nodeData ) {
				const { element, stop } = await createLiveMaterialPreview( nodeData, 200, 200, generateMaterialFromNodes, { editor } );
				if ( requestId !== materialPreviewRequestId ) {
					stop();
					return;
				}
				liveMaterialPreviewStop = stop;
				previewDiv.dom.innerHTML = '';
				previewDiv.dom.appendChild( element );
				return;
			}
			const dataUrl = await previewRenderer.renderMaterialPreview( material, 200, 200 );
			if ( requestId !== materialPreviewRequestId ) return;
			previewDiv.dom.innerHTML = '';
			if ( dataUrl ) {
				const img = document.createElement( 'img' );
				img.src = dataUrl;
				img.style.width = '100%';
				img.style.height = '100%';
				img.style.objectFit = 'contain';
				img.onerror = function () { previewDiv.dom.innerHTML = ''; };
				previewDiv.dom.appendChild( img );
			}
		} catch ( e ) {
			if ( requestId !== materialPreviewRequestId ) return;
			previewDiv.dom.innerHTML = '';
			console.warn( '[Sidebar.Material] Material preview failed:', e );
		}
	}

	function updatePreviewOnly() {
		if ( ! currentObject ) return;
		const material = editor.getObjectMaterial( currentObject, currentMaterialSlot );
		if ( material ) updateMaterialPreviewInPanel( material, nodeMaterialPreviewDiv );
	}

	function onPointerUpForPreview() {
		updatePreviewOnly();
	}

	function schedulePreviewUpdate() {
		if ( previewUpdateTimeout ) clearTimeout( previewUpdateTimeout );
		previewUpdateTimeout = setTimeout( function () {
			previewUpdateTimeout = null;
			updatePreviewOnly();
		}, PREVIEW_DEBOUNCE_MS );
	}

	document.addEventListener( 'pointerup', onPointerUpForPreview );

	// Container for all standard material properties (hidden for NodeMaterials)
	const standardPropertiesContainer = new UIDiv();
	mainMaterialContainer.add( standardPropertiesContainer );

	const materialProgram = new SidebarMaterialProgram( editor, 'vertexShader' );
	standardPropertiesContainer.add( materialProgram );

	

	const materialColor = new SidebarMaterialColorProperty( editor, 'color', strings.getKey( 'sidebar/material/color' ) );
	standardPropertiesContainer.add( materialColor );

	

	const materialSpecular = new SidebarMaterialColorProperty( editor, 'specular', strings.getKey( 'sidebar/material/specular' ) );
	standardPropertiesContainer.add( materialSpecular );

	

	const materialShininess = new SidebarMaterialNumberProperty( editor, 'shininess', strings.getKey( 'sidebar/material/shininess' ) );
	standardPropertiesContainer.add( materialShininess );

	

	const materialEmissive = new SidebarMaterialColorProperty( editor, 'emissive', strings.getKey( 'sidebar/material/emissive' ) );
	standardPropertiesContainer.add( materialEmissive );

	

	const materialReflectivity = new SidebarMaterialNumberProperty( editor, 'reflectivity', strings.getKey( 'sidebar/material/reflectivity' ) );
	standardPropertiesContainer.add( materialReflectivity );

	

	const materialIOR = new SidebarMaterialNumberProperty( editor, 'ior', strings.getKey( 'sidebar/material/ior' ), [ 1, 2.333 ], 3 );
	standardPropertiesContainer.add( materialIOR );

	

	const materialRoughness = new SidebarMaterialNumberProperty( editor, 'roughness', strings.getKey( 'sidebar/material/roughness' ), [ 0, 1 ] );
	standardPropertiesContainer.add( materialRoughness );

	

	const materialMetalness = new SidebarMaterialNumberProperty( editor, 'metalness', strings.getKey( 'sidebar/material/metalness' ), [ 0, 1 ] );
	standardPropertiesContainer.add( materialMetalness );

	

	const materialClearcoat = new SidebarMaterialNumberProperty( editor, 'clearcoat', strings.getKey( 'sidebar/material/clearcoat' ), [ 0, 1 ] );
	standardPropertiesContainer.add( materialClearcoat );

	

	const materialClearcoatRoughness = new SidebarMaterialNumberProperty( editor, 'clearcoatRoughness', strings.getKey( 'sidebar/material/clearcoatroughness' ), [ 0, 1 ] );
	standardPropertiesContainer.add( materialClearcoatRoughness );

	

	const materialDispersion = new SidebarMaterialNumberProperty( editor, 'dispersion', strings.getKey( 'sidebar/material/dispersion' ), [ 0, 10 ] );
	standardPropertiesContainer.add( materialDispersion );

	

	const materialIridescence = new SidebarMaterialNumberProperty( editor, 'iridescence', strings.getKey( 'sidebar/material/iridescence' ), [ 0, 1 ] );
	standardPropertiesContainer.add( materialIridescence );

	

	const materialIridescenceIOR = new SidebarMaterialNumberProperty( editor, 'iridescenceIOR', strings.getKey( 'sidebar/material/iridescenceIOR' ), [ 1, 5 ] );
	standardPropertiesContainer.add( materialIridescenceIOR );

	

	const materialIridescenceThicknessMax = new SidebarMaterialRangeValueProperty( editor, 'iridescenceThicknessRange', strings.getKey( 'sidebar/material/iridescenceThicknessMax' ), false, [ 0, Infinity ], 0, 10, 1, 'nm' );
	standardPropertiesContainer.add( materialIridescenceThicknessMax );

	

	const materialSheen = new SidebarMaterialNumberProperty( editor, 'sheen', strings.getKey( 'sidebar/material/sheen' ), [ 0, 1 ] );
	standardPropertiesContainer.add( materialSheen );

	

	const materialSheenRoughness = new SidebarMaterialNumberProperty( editor, 'sheenRoughness', strings.getKey( 'sidebar/material/sheenroughness' ), [ 0, 1 ] );
	standardPropertiesContainer.add( materialSheenRoughness );

	

	const materialSheenColor = new SidebarMaterialColorProperty( editor, 'sheenColor', strings.getKey( 'sidebar/material/sheencolor' ) );
	standardPropertiesContainer.add( materialSheenColor );

	

	const materialTransmission = new SidebarMaterialNumberProperty( editor, 'transmission', strings.getKey( 'sidebar/material/transmission' ), [ 0, 1 ] );
	standardPropertiesContainer.add( materialTransmission );

	

	const materialAttenuationDistance = new SidebarMaterialNumberProperty( editor, 'attenuationDistance', strings.getKey( 'sidebar/material/attenuationDistance' ) );
	standardPropertiesContainer.add( materialAttenuationDistance );

	

	const materialAttenuationColor = new SidebarMaterialColorProperty( editor, 'attenuationColor', strings.getKey( 'sidebar/material/attenuationColor' ) );
	standardPropertiesContainer.add( materialAttenuationColor );

	

	const materialThickness = new SidebarMaterialNumberProperty( editor, 'thickness', strings.getKey( 'sidebar/material/thickness' ) );
	standardPropertiesContainer.add( materialThickness );

	

	const materialVertexColors = new SidebarMaterialBooleanProperty( editor, 'vertexColors', strings.getKey( 'sidebar/material/vertexcolors' ) );
	standardPropertiesContainer.add( materialVertexColors );

	

	const materialDepthPackingOptions = {
		[ THREE.BasicDepthPacking ]: 'Basic',
		[ THREE.RGBADepthPacking ]: 'RGBA'
	};

	const materialDepthPacking = new SidebarMaterialConstantProperty( editor, 'depthPacking', strings.getKey( 'sidebar/material/depthPacking' ), materialDepthPackingOptions );
	standardPropertiesContainer.add( materialDepthPacking );

	

	const materialMap = new SidebarMaterialMapProperty( editor, 'map', strings.getKey( 'sidebar/material/map' ) );
	standardPropertiesContainer.add( materialMap );

	

	const materialSpecularMap = new SidebarMaterialMapProperty( editor, 'specularMap', strings.getKey( 'sidebar/material/specularmap' ) );
	standardPropertiesContainer.add( materialSpecularMap );

	

	const materialEmissiveMap = new SidebarMaterialMapProperty( editor, 'emissiveMap', strings.getKey( 'sidebar/material/emissivemap' ) );
	standardPropertiesContainer.add( materialEmissiveMap );

	

	const materialMatcapMap = new SidebarMaterialMapProperty( editor, 'matcap', strings.getKey( 'sidebar/material/matcap' ) );
	standardPropertiesContainer.add( materialMatcapMap );

	

	const materialAlphaMap = new SidebarMaterialMapProperty( editor, 'alphaMap', strings.getKey( 'sidebar/material/alphamap' ) );
	standardPropertiesContainer.add( materialAlphaMap );

	

	const materialBumpMap = new SidebarMaterialMapProperty( editor, 'bumpMap', strings.getKey( 'sidebar/material/bumpmap' ) );
	standardPropertiesContainer.add( materialBumpMap );

	

	const materialNormalMap = new SidebarMaterialMapProperty( editor, 'normalMap', strings.getKey( 'sidebar/material/normalmap' ) );
	standardPropertiesContainer.add( materialNormalMap );

	

	const materialClearcoatMap = new SidebarMaterialMapProperty( editor, 'clearcoatMap', strings.getKey( 'sidebar/material/clearcoatmap' ) );
	standardPropertiesContainer.add( materialClearcoatMap );

	

	const materialClearcoatNormalMap = new SidebarMaterialMapProperty( editor, 'clearcoatNormalMap', strings.getKey( 'sidebar/material/clearcoatnormalmap' ) );
	standardPropertiesContainer.add( materialClearcoatNormalMap );

	

	const materialClearcoatRoughnessMap = new SidebarMaterialMapProperty( editor, 'clearcoatRoughnessMap', strings.getKey( 'sidebar/material/clearcoatroughnessmap' ) );
	standardPropertiesContainer.add( materialClearcoatRoughnessMap );

	

	const materialDisplacementMap = new SidebarMaterialMapProperty( editor, 'displacementMap', strings.getKey( 'sidebar/material/displacementmap' ) );
	standardPropertiesContainer.add( materialDisplacementMap );

	

	const materialRoughnessMap = new SidebarMaterialMapProperty( editor, 'roughnessMap', strings.getKey( 'sidebar/material/roughnessmap' ) );
	standardPropertiesContainer.add( materialRoughnessMap );

	

	const materialMetalnessMap = new SidebarMaterialMapProperty( editor, 'metalnessMap', strings.getKey( 'sidebar/material/metalnessmap' ) );
	standardPropertiesContainer.add( materialMetalnessMap );

	

	const materialIridescenceMap = new SidebarMaterialMapProperty( editor, 'iridescenceMap', strings.getKey( 'sidebar/material/iridescencemap' ) );
	standardPropertiesContainer.add( materialIridescenceMap );

	

	const materialSheenColorMap = new SidebarMaterialMapProperty( editor, 'sheenColorMap', strings.getKey( 'sidebar/material/sheencolormap' ) );
	standardPropertiesContainer.add( materialSheenColorMap );

	

	const materialSheenRoughnessMap = new SidebarMaterialMapProperty( editor, 'sheenRoughnessMap', strings.getKey( 'sidebar/material/sheenroughnessmap' ) );
	standardPropertiesContainer.add( materialSheenRoughnessMap );

	

	const materialIridescenceThicknessMap = new SidebarMaterialMapProperty( editor, 'iridescenceThicknessMap', strings.getKey( 'sidebar/material/iridescencethicknessmap' ) );
	standardPropertiesContainer.add( materialIridescenceThicknessMap );

	

	const materialEnvMap = new SidebarMaterialMapProperty( editor, 'envMap', strings.getKey( 'sidebar/material/envmap' ) );
	standardPropertiesContainer.add( materialEnvMap );

	

	const materialLightMap = new SidebarMaterialMapProperty( editor, 'lightMap', strings.getKey( 'sidebar/material/lightmap' ) );
	standardPropertiesContainer.add( materialLightMap );

	

	const materialAOMap = new SidebarMaterialMapProperty( editor, 'aoMap', strings.getKey( 'sidebar/material/aomap' ) );
	standardPropertiesContainer.add( materialAOMap );

	

	const materialGradientMap = new SidebarMaterialMapProperty( editor, 'gradientMap', strings.getKey( 'sidebar/material/gradientmap' ) );
	standardPropertiesContainer.add( materialGradientMap );

	

	const transmissionMap = new SidebarMaterialMapProperty( editor, 'transmissionMap', strings.getKey( 'sidebar/material/transmissionmap' ) );
	standardPropertiesContainer.add( transmissionMap );

	

	const thicknessMap = new SidebarMaterialMapProperty( editor, 'thicknessMap', strings.getKey( 'sidebar/material/thicknessmap' ) );
	standardPropertiesContainer.add( thicknessMap );

	

	const materialSideOptions = {
		0: 'Front',
		1: 'Back',
		2: 'Double'
	};

	const materialSide = new SidebarMaterialConstantProperty( editor, 'side', strings.getKey( 'sidebar/material/side' ), materialSideOptions );
	standardPropertiesContainer.add( materialSide );

	

	const materialSize = new SidebarMaterialNumberProperty( editor, 'size', strings.getKey( 'sidebar/material/size' ), [ 0, Infinity ] );
	standardPropertiesContainer.add( materialSize );

	

	const materialSizeAttenuation = new SidebarMaterialBooleanProperty( editor, 'sizeAttenuation', strings.getKey( 'sidebar/material/sizeAttenuation' ) );
	standardPropertiesContainer.add( materialSizeAttenuation );

	

	const materialFlatShading = new SidebarMaterialBooleanProperty( editor, 'flatShading', strings.getKey( 'sidebar/material/flatShading' ) );
	standardPropertiesContainer.add( materialFlatShading );

	

	const materialBlendingOptions = {
		0: 'No',
		1: 'Normal',
		2: 'Additive',
		3: 'Subtractive',
		4: 'Multiply',
		5: 'Custom'
	};

	const materialBlending = new SidebarMaterialConstantProperty( editor, 'blending', strings.getKey( 'sidebar/material/blending' ), materialBlendingOptions );
	standardPropertiesContainer.add( materialBlending );

	

	const materialOpacity = new SidebarMaterialNumberProperty( editor, 'opacity', strings.getKey( 'sidebar/material/opacity' ), [ 0, 1 ] );
	standardPropertiesContainer.add( materialOpacity );

	

	const materialTransparent = new SidebarMaterialBooleanProperty( editor, 'transparent', strings.getKey( 'sidebar/material/transparent' ) );
	standardPropertiesContainer.add( materialTransparent );

	

	const materialForceSinglePass = new SidebarMaterialBooleanProperty( editor, 'forceSinglePass', strings.getKey( 'sidebar/material/forcesinglepass' ) );
	standardPropertiesContainer.add( materialForceSinglePass );

	

	const materialAlphaTest = new SidebarMaterialNumberProperty( editor, 'alphaTest', strings.getKey( 'sidebar/material/alphatest' ), [ 0, 1 ] );
	standardPropertiesContainer.add( materialAlphaTest );

	

	const materialDepthTest = new SidebarMaterialBooleanProperty( editor, 'depthTest', strings.getKey( 'sidebar/material/depthtest' ) );
	standardPropertiesContainer.add( materialDepthTest );

	

	const materialDepthWrite = new SidebarMaterialBooleanProperty( editor, 'depthWrite', strings.getKey( 'sidebar/material/depthwrite' ) );
	standardPropertiesContainer.add( materialDepthWrite );

	

	const materialWireframe = new SidebarMaterialBooleanProperty( editor, 'wireframe', strings.getKey( 'sidebar/material/wireframe' ) );
	standardPropertiesContainer.add( materialWireframe );

	

	const materialUserDataRow = new UIRow();
	const materialUserData = new UITextArea().setWidth( '150px' ).setHeight( '40px' ).setFontSize( '12px' ).onChange( update );
	materialUserData.onKeyUp( function () {

		try {

			JSON.parse( materialUserData.getValue() );

			materialUserData.dom.classList.add( 'success' );
			materialUserData.dom.classList.remove( 'fail' );

		} catch ( error ) {

			materialUserData.dom.classList.remove( 'success' );
			materialUserData.dom.classList.add( 'fail' );

		}

	} );

	materialUserDataRow.add( new UIText( strings.getKey( 'sidebar/material/userdata' ) ).setClass( 'Label' ) );
	materialUserDataRow.add( materialUserData );

	mainMaterialContainer.add( materialUserDataRow );

	

	const exportJson = new UIButton( strings.getKey( 'sidebar/material/export' ) );
	exportJson.setMarginLeft( '120px' );
	exportJson.onClick( function () {

		const material = editor.getObjectMaterial( currentObject, currentMaterialSlot );
		if ( ! material ) return;
		let output;
		let filename = materialName.getValue() || 'material';
		if ( material.type === 'NodeMaterial' || material.isNodeMaterial ) {
			output = JSON.stringify( material, null, '\t' );
			filename += '.nodemat';
		} else if ( material.toJSON ) {
			output = material.toJSON();
			try {
				output = JSON.stringify( output, null, '\t' );
				output = output.replace( /[\n\t]+([\d\.e\-\[\]]+)/g, '$1' );
			} catch ( err ) {
				output = JSON.stringify( output );
			}
			filename += '.json';
		} else {
			output = JSON.stringify( material );
			filename += '.json';
		}
		editor.utils.save( new Blob( [ output ] ), filename );

	} );
	mainMaterialContainer.add( exportJson );

	// Edit Nodes button - opens Nodes overlay (only for node materials)
	const editNodesBtn = new UIButton( 'Edit Nodes' );
	editNodesBtn.setMarginLeft( '4px' );
	editNodesBtn.setDisplay( 'none' );
	editNodesBtn.onClick( function () {

		if ( typeof window.showNodesOverlay === 'function' ) {
			window.showNodesOverlay();
		}

	} );
	mainMaterialContainer.add( editNodesBtn );

	const editorExtensionsContainer = new UIRow();
	editorExtensionsContainer.dom.style.display = 'inline-block';
	mainMaterialContainer.add( editorExtensionsContainer );

	function refreshMaterialEditorButtons( material ) {

		editorExtensionsContainer.clear();

		if ( ! material ) return;

		const extensions = editor.modules.getMaterialEditorExtensions();

		for ( const extension of extensions ) {

			if ( typeof extension.canEdit === 'function' && extension.canEdit( material ) ) {

				const editorBtn = new UIButton( extension.buttonLabel || 'Edit' );
				editorBtn.setMarginLeft( '4px' );
				editorBtn.onClick( function () {

					if ( typeof extension.openEditor === 'function' ) {

						extension.openEditor( material );

					}

				} );
				editorExtensionsContainer.add( editorBtn );

			}

		}

	}

	function update() {

		const previousSelectedSlot = currentMaterialSlot;

		currentMaterialSlot = parseInt( materialSlotSelect.getValue() );

		if ( currentMaterialSlot !== previousSelectedSlot ) {

			editor.signals.materialChanged.dispatch( currentObject, currentMaterialSlot );

		}

		let material = editor.getObjectMaterial( currentObject, currentMaterialSlot );

		if ( material ) {

			try {

				const userData = JSON.parse( materialUserData.getValue() );
				if ( JSON.stringify( material.userData ) != JSON.stringify( userData ) ) {

					editor.execute( new SetMaterialValueCommand( editor, currentObject, 'userData', userData, currentMaterialSlot ) );

				}

			} catch ( exception ) {

				console.warn( exception );

			}

			refreshUI();

		}

	}

	function setRowVisibility() {

		const material = editor.getObjectMaterial( currentObject, currentMaterialSlot );

		if ( !material ) return;

		if ( Array.isArray( currentObject.material ) ) {

			materialSlotRow.setDisplay( '' );

		} else {

			materialSlotRow.setDisplay( 'none' );

		}

	}

	function refreshUI() {

		if ( ! currentObject ) return;

		const actualMaterial = Array.isArray( currentObject.material ) ? currentObject.material[ currentMaterialSlot ] : currentObject.material;
		const isAssetContext = currentObject.isMaterial === true;
		// Three buttons (Select / Create material / Create node material) are always visible for meshes so we can change material later.
		// Full material panel (Type, Name, Preview, Color, etc.) only when a material is created or selected. In asset context, no 3 buttons.
		const hasAssetLink = actualMaterial && ( actualMaterial.assetPath || ( actualMaterial.nodeMaterialData && actualMaterial.nodeMaterialData.assetPath ) );
		const hasMaterialToEdit = actualMaterial && hasAssetLink;

		defaultMaterialContainer.setDisplay( isAssetContext ? 'none' : '' );
		if ( ! hasMaterialToEdit ) {
			if ( liveMaterialPreviewStop ) {
				liveMaterialPreviewStop();
				liveMaterialPreviewStop = null;
			}
			mainMaterialContainer.setDisplay( 'none' );
			materialSlotRow.setDisplay( 'none' );
			return;
		}
		mainMaterialContainer.setDisplay( '' );

		let material = currentObject.material;

		if ( Array.isArray( material ) ) {

			const slotOptions = {};

			currentMaterialSlot = Math.max( 0, Math.min( material.length, currentMaterialSlot ) );

			for ( let i = 0; i < material.length; i ++ ) {

				slotOptions[ i ] = String( i + 1 ) + ': ' + material[ i ].name;

			}

			materialSlotSelect.setOptions( slotOptions ).setValue( currentMaterialSlot );

		}

		material = editor.getObjectMaterial( currentObject, currentMaterialSlot );

		if ( !material ) return;

		if ( material.name !== undefined ) {

			materialName.setValue( material.name );

		}

		if ( material.type !== undefined ) {

			const isNodeMaterial = material.type === 'NodeMaterial' || material.isNodeMaterial;

			if ( isNodeMaterial ) {
				materialClassRow.setDisplay( 'none' );
				standardPropertiesContainer.setDisplay( 'none' );
				editNodesBtn.setDisplay( '' );
				nodeMaterialPreviewDiv.dom.innerHTML = '';
				nodeMaterialPreviewDiv.setDisplay( '' );
				updateMaterialPreviewInPanel( material, nodeMaterialPreviewDiv );
			} else {
				materialClassRow.setDisplay( '' );
				standardPropertiesContainer.setDisplay( '' );
				nodeMaterialPreviewDiv.dom.innerHTML = '';
				nodeMaterialPreviewDiv.setDisplay( '' );
				editNodesBtn.setDisplay( 'none' );
				if ( material.type ) materialClassSelect.setValue( material.type );
				updateMaterialPreviewInPanel( material, nodeMaterialPreviewDiv );
			}

			refreshMaterialEditorButtons( material );

		}

		setRowVisibility();

		try {
			materialUserData.setValue( JSON.stringify( material.userData != null ? material.userData : {}, null, '  ' ) );
		} catch ( error ) {
			console.warn( error );
		}

		materialUserData.setBorderColor( 'transparent' );
		materialUserData.setBackgroundColor( '' );

	}

	

	signals.objectSelected.add( function ( object ) {

		const hasMaterial = object && ( object.material && ( ! Array.isArray( object.material ) || object.material.length > 0 ) || ( object.isMaterial && object.material instanceof THREE.Material ) );
		const isMeshWithGeometry = object && object.isMesh && object.geometry;

		if ( hasMaterial || isMeshWithGeometry ) {
			currentObject = object;
			currentMaterialSlot = 0;
			materialSlotSelect.setValue( 0 );
			refreshUI();
			container.setDisplay( '' );
			if ( hasMaterial ) signals.materialChanged.dispatch( object, 0 );
		} else {
			currentObject = null;
			if ( liveMaterialPreviewStop ) {
				liveMaterialPreviewStop();
				liveMaterialPreviewStop = null;
			}
			container.setDisplay( 'none' );
		}

	} );

	signals.createMaterialAsset.add( function () {

		if ( currentObject && editor.selected && currentObject === editor.selected ) {

			refreshUI();
			container.setDisplay( '' );

		}

	} );

	signals.materialChanged.add( function ( object, slot ) {

		if ( object && object.isMaterial && object.material instanceof THREE.Material ) {

			if ( currentObject !== object ) {
				if ( previewUpdateTimeout ) { clearTimeout( previewUpdateTimeout ); previewUpdateTimeout = null; }
				currentObject = object;
				currentMaterialSlot = slot || 0;
				materialSlotSelect.setValue( currentMaterialSlot );
				refreshUI();
				container.setDisplay( '' );
			} else {
				schedulePreviewUpdate();
			}

		} else if ( object && object.material ) {
			
			// Check if it's a NodeMaterial (plain data object)
			const material = Array.isArray( object.material ) ? object.material[ slot || 0 ] : object.material;
			const isNodeMaterial = material && ( material.type === 'NodeMaterial' || material.isNodeMaterial );
			
			if ( isNodeMaterial ) {
				
				// Handle NodeMaterial
				if ( currentObject !== object ) {
					if ( previewUpdateTimeout ) { clearTimeout( previewUpdateTimeout ); previewUpdateTimeout = null; }
					currentObject = object;
					currentMaterialSlot = slot || 0;
					materialSlotSelect.setValue( currentMaterialSlot );
					refreshUI();
					container.setDisplay( '' );
				} else {
					schedulePreviewUpdate();
				}
				
			} else if ( material instanceof THREE.Material ) {
				
				// Handle standard THREE.Material
				if ( currentObject !== object || currentMaterialSlot !== ( slot || 0 ) ) {
					if ( previewUpdateTimeout ) { clearTimeout( previewUpdateTimeout ); previewUpdateTimeout = null; }
					currentObject = object;
					currentMaterialSlot = slot || 0;
					materialSlotSelect.setValue( currentMaterialSlot );
					refreshUI();
					container.setDisplay( '' );
				} else {
					schedulePreviewUpdate();
				}
				if ( material.assetPath ) {
					const assetPath = material.assetPath.startsWith( '/' ) ? material.assetPath.slice( 1 ) : material.assetPath;
					const materialAsset = editor.assets.getByUrl( assetPath );
					if ( materialAsset ) {
						materialAsset.on( 'changed', function onMaterialAssetChanged() {
							// Don't call refreshUI() here – it was causing preview to re-render every frame during color drag.
							// Preview updates on pointerup only.
							if ( currentObject && currentObject === object ) {
								const currentMaterial = editor.getObjectMaterial( currentObject, currentMaterialSlot );
								if ( currentMaterial && currentMaterial.assetPath === material.assetPath ) {
									// Optional: update other UI (name, etc.) without touching preview – leave as no-op for now
								}
							}
						} );
					}
				}
				
			}
		}

	} );

	// Refresh material editor buttons when modules are registered/unregistered
	signals.moduleRegistered.add( function () {

		const material = currentObject ? editor.getObjectMaterial( currentObject, currentMaterialSlot ) : null;
		if ( material ) {

			refreshMaterialEditorButtons( material );

		}

	} );

	signals.moduleUnregistered.add( function () {

		const material = currentObject ? editor.getObjectMaterial( currentObject, currentMaterialSlot ) : null;
		if ( material ) {

			refreshMaterialEditorButtons( material );

		}

	} );

	return container;

}

const materialClasses = {
	'LineBasicMaterial': THREE.LineBasicMaterial,
	'LineDashedMaterial': THREE.LineDashedMaterial,
	'MeshBasicMaterial': THREE.MeshBasicMaterial,
	'MeshDepthMaterial': THREE.MeshDepthMaterial,
	'MeshNormalMaterial': THREE.MeshNormalMaterial,
	'MeshLambertMaterial': THREE.MeshLambertMaterial,
	'MeshMatcapMaterial': THREE.MeshMatcapMaterial,
	'MeshPhongMaterial': THREE.MeshPhongMaterial,
	'MeshToonMaterial': THREE.MeshToonMaterial,
	'MeshStandardMaterial': THREE.MeshStandardMaterial,
	'MeshPhysicalMaterial': THREE.MeshPhysicalMaterial,
	'ShadowMaterial': THREE.ShadowMaterial,
	'SpriteMaterial': THREE.SpriteMaterial,
	'PointsMaterial': THREE.PointsMaterial
};

const vertexShaderVariables = [
	'uniform mat4 projectionMatrix;',
	'uniform mat4 modelViewMatrix;\n',
	'attribute vec3 position;\n\n',
].join( '\n' );

const meshMaterialOptions = {
	'MeshBasicMaterial': 'MeshBasicMaterial',
	'MeshDepthMaterial': 'MeshDepthMaterial',
	'MeshNormalMaterial': 'MeshNormalMaterial',
	'MeshLambertMaterial': 'MeshLambertMaterial',
	'MeshMatcapMaterial': 'MeshMatcapMaterial',
	'MeshPhongMaterial': 'MeshPhongMaterial',
	'MeshToonMaterial': 'MeshToonMaterial',
	'MeshStandardMaterial': 'MeshStandardMaterial',
	'MeshPhysicalMaterial': 'MeshPhysicalMaterial',
	'ShadowMaterial': 'ShadowMaterial'
};

const lineMaterialOptions = {
	'LineBasicMaterial': 'LineBasicMaterial',
	'LineDashedMaterial': 'LineDashedMaterial'
};

const spriteMaterialOptions = {
	'SpriteMaterial': 'SpriteMaterial'
};

const pointsMaterialOptions = {
	'PointsMaterial': 'PointsMaterial'
};

export { SidebarMaterial };
