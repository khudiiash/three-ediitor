import * as THREE from 'three';

import { UIButton, UIInput, UIPanel, UIRow, UISelect, UIText, UITextArea } from './libs/ui.js';

import { SetMaterialCommand } from './commands/SetMaterialCommand.js';
import { SetMaterialValueCommand } from './commands/SetMaterialValueCommand.js';
import { AssetSelector } from './AssetSelector.js';

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

	let currentObject;

	let currentMaterialSlot = 0;

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

	

	const materialClassRow = new UIRow();
	const materialClass = new UIInput().setWidth( '150px' ).setFontSize( '12px' ).setDisabled( true );

	materialClassRow.add( new UIText( strings.getKey( 'sidebar/material/type' ) ).setClass( 'Label' ) );
	materialClassRow.add( materialClass );

	container.add( materialClassRow );

	const materialSelectorRow = new UIRow();
	const materialSelectorButton = new UIButton( 'Select Material...' ).setWidth( '150px' );

	materialSelectorButton.onClick( function () {
		if ( ! currentObject ) {
			alert( 'Please select an object first' );
			return;
		}

		if ( ! editor.assetSelector ) {
			editor.assetSelector = new AssetSelector( editor );
		}

		editor.assetSelector.show( async function ( assetData ) {
			if ( ! assetData ) return;

			const object = currentObject;
			if ( ! object || ! object.material ) return;

			let newMaterial = null;

			if ( assetData && ( assetData.isMaterial || assetData instanceof THREE.Material ) ) {
				newMaterial = assetData;
			} else if ( assetData.type === 'default-material' && assetData.materialType ) {
				const materialClassesList = {
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
					'RawShaderMaterial': THREE.RawShaderMaterial,
					'ShaderMaterial': THREE.ShaderMaterial,
					'ShadowMaterial': THREE.ShadowMaterial,
					'SpriteMaterial': THREE.SpriteMaterial,
					'PointsMaterial': THREE.PointsMaterial
				};
				const MaterialClass = materialClassesList[ assetData.materialType ];
				if ( MaterialClass ) {
					newMaterial = new MaterialClass();
					newMaterial.name = assetData.materialType;
				}
			}

			if ( newMaterial ) {
				const oldMaterial = editor.getObjectMaterial( object, currentMaterialSlot );
				if ( oldMaterial ) {
					editor.removeMaterial( oldMaterial );
				}
				editor.execute( new SetMaterialCommand( editor, object, newMaterial, currentMaterialSlot ), strings.getKey( 'command/SetMaterial' ) + ': ' + newMaterial.type );
				editor.addMaterial( newMaterial );
				refreshUI();
			}
		}, null, 'material' );
	} );

	materialSelectorRow.add( new UIText( 'Material' ).setClass( 'Label' ) );
	materialSelectorRow.add( materialSelectorButton );
	container.add( materialSelectorRow );

	

	const materialNameRow = new UIRow();
	const materialName = new UIInput().setWidth( '150px' ).setFontSize( '12px' ).onChange( function () {

		editor.execute( new SetMaterialValueCommand( editor, editor.selected, 'name', materialName.getValue(), currentMaterialSlot ) );

	} );

	materialNameRow.add( new UIText( strings.getKey( 'sidebar/material/name' ) ).setClass( 'Label' ) );
	materialNameRow.add( materialName );

	container.add( materialNameRow );

	

	const materialProgram = new SidebarMaterialProgram( editor, 'vertexShader' );
	container.add( materialProgram );

	

	const materialColor = new SidebarMaterialColorProperty( editor, 'color', strings.getKey( 'sidebar/material/color' ) );
	container.add( materialColor );

	

	const materialSpecular = new SidebarMaterialColorProperty( editor, 'specular', strings.getKey( 'sidebar/material/specular' ) );
	container.add( materialSpecular );

	

	const materialShininess = new SidebarMaterialNumberProperty( editor, 'shininess', strings.getKey( 'sidebar/material/shininess' ) );
	container.add( materialShininess );

	

	const materialEmissive = new SidebarMaterialColorProperty( editor, 'emissive', strings.getKey( 'sidebar/material/emissive' ) );
	container.add( materialEmissive );

	

	const materialReflectivity = new SidebarMaterialNumberProperty( editor, 'reflectivity', strings.getKey( 'sidebar/material/reflectivity' ) );
	container.add( materialReflectivity );

	

	const materialIOR = new SidebarMaterialNumberProperty( editor, 'ior', strings.getKey( 'sidebar/material/ior' ), [ 1, 2.333 ], 3 );
	container.add( materialIOR );

	

	const materialRoughness = new SidebarMaterialNumberProperty( editor, 'roughness', strings.getKey( 'sidebar/material/roughness' ), [ 0, 1 ] );
	container.add( materialRoughness );

	

	const materialMetalness = new SidebarMaterialNumberProperty( editor, 'metalness', strings.getKey( 'sidebar/material/metalness' ), [ 0, 1 ] );
	container.add( materialMetalness );

	

	const materialClearcoat = new SidebarMaterialNumberProperty( editor, 'clearcoat', strings.getKey( 'sidebar/material/clearcoat' ), [ 0, 1 ] );
	container.add( materialClearcoat );

	

	const materialClearcoatRoughness = new SidebarMaterialNumberProperty( editor, 'clearcoatRoughness', strings.getKey( 'sidebar/material/clearcoatroughness' ), [ 0, 1 ] );
	container.add( materialClearcoatRoughness );

	

	const materialDispersion = new SidebarMaterialNumberProperty( editor, 'dispersion', strings.getKey( 'sidebar/material/dispersion' ), [ 0, 10 ] );
	container.add( materialDispersion );

	

	const materialIridescence = new SidebarMaterialNumberProperty( editor, 'iridescence', strings.getKey( 'sidebar/material/iridescence' ), [ 0, 1 ] );
	container.add( materialIridescence );

	

	const materialIridescenceIOR = new SidebarMaterialNumberProperty( editor, 'iridescenceIOR', strings.getKey( 'sidebar/material/iridescenceIOR' ), [ 1, 5 ] );
	container.add( materialIridescenceIOR );

	

	const materialIridescenceThicknessMax = new SidebarMaterialRangeValueProperty( editor, 'iridescenceThicknessRange', strings.getKey( 'sidebar/material/iridescenceThicknessMax' ), false, [ 0, Infinity ], 0, 10, 1, 'nm' );
	container.add( materialIridescenceThicknessMax );

	

	const materialSheen = new SidebarMaterialNumberProperty( editor, 'sheen', strings.getKey( 'sidebar/material/sheen' ), [ 0, 1 ] );
	container.add( materialSheen );

	

	const materialSheenRoughness = new SidebarMaterialNumberProperty( editor, 'sheenRoughness', strings.getKey( 'sidebar/material/sheenroughness' ), [ 0, 1 ] );
	container.add( materialSheenRoughness );

	

	const materialSheenColor = new SidebarMaterialColorProperty( editor, 'sheenColor', strings.getKey( 'sidebar/material/sheencolor' ) );
	container.add( materialSheenColor );

	

	const materialTransmission = new SidebarMaterialNumberProperty( editor, 'transmission', strings.getKey( 'sidebar/material/transmission' ), [ 0, 1 ] );
	container.add( materialTransmission );

	

	const materialAttenuationDistance = new SidebarMaterialNumberProperty( editor, 'attenuationDistance', strings.getKey( 'sidebar/material/attenuationDistance' ) );
	container.add( materialAttenuationDistance );

	

	const materialAttenuationColor = new SidebarMaterialColorProperty( editor, 'attenuationColor', strings.getKey( 'sidebar/material/attenuationColor' ) );
	container.add( materialAttenuationColor );

	

	const materialThickness = new SidebarMaterialNumberProperty( editor, 'thickness', strings.getKey( 'sidebar/material/thickness' ) );
	container.add( materialThickness );

	

	const materialVertexColors = new SidebarMaterialBooleanProperty( editor, 'vertexColors', strings.getKey( 'sidebar/material/vertexcolors' ) );
	container.add( materialVertexColors );

	

	const materialDepthPackingOptions = {
		[ THREE.BasicDepthPacking ]: 'Basic',
		[ THREE.RGBADepthPacking ]: 'RGBA'
	};

	const materialDepthPacking = new SidebarMaterialConstantProperty( editor, 'depthPacking', strings.getKey( 'sidebar/material/depthPacking' ), materialDepthPackingOptions );
	container.add( materialDepthPacking );

	

	const materialMap = new SidebarMaterialMapProperty( editor, 'map', strings.getKey( 'sidebar/material/map' ) );
	container.add( materialMap );

	

	const materialSpecularMap = new SidebarMaterialMapProperty( editor, 'specularMap', strings.getKey( 'sidebar/material/specularmap' ) );
	container.add( materialSpecularMap );

	

	const materialEmissiveMap = new SidebarMaterialMapProperty( editor, 'emissiveMap', strings.getKey( 'sidebar/material/emissivemap' ) );
	container.add( materialEmissiveMap );

	

	const materialMatcapMap = new SidebarMaterialMapProperty( editor, 'matcap', strings.getKey( 'sidebar/material/matcap' ) );
	container.add( materialMatcapMap );

	

	const materialAlphaMap = new SidebarMaterialMapProperty( editor, 'alphaMap', strings.getKey( 'sidebar/material/alphamap' ) );
	container.add( materialAlphaMap );

	

	const materialBumpMap = new SidebarMaterialMapProperty( editor, 'bumpMap', strings.getKey( 'sidebar/material/bumpmap' ) );
	container.add( materialBumpMap );

	

	const materialNormalMap = new SidebarMaterialMapProperty( editor, 'normalMap', strings.getKey( 'sidebar/material/normalmap' ) );
	container.add( materialNormalMap );

	

	const materialClearcoatMap = new SidebarMaterialMapProperty( editor, 'clearcoatMap', strings.getKey( 'sidebar/material/clearcoatmap' ) );
	container.add( materialClearcoatMap );

	

	const materialClearcoatNormalMap = new SidebarMaterialMapProperty( editor, 'clearcoatNormalMap', strings.getKey( 'sidebar/material/clearcoatnormalmap' ) );
	container.add( materialClearcoatNormalMap );

	

	const materialClearcoatRoughnessMap = new SidebarMaterialMapProperty( editor, 'clearcoatRoughnessMap', strings.getKey( 'sidebar/material/clearcoatroughnessmap' ) );
	container.add( materialClearcoatRoughnessMap );

	

	const materialDisplacementMap = new SidebarMaterialMapProperty( editor, 'displacementMap', strings.getKey( 'sidebar/material/displacementmap' ) );
	container.add( materialDisplacementMap );

	

	const materialRoughnessMap = new SidebarMaterialMapProperty( editor, 'roughnessMap', strings.getKey( 'sidebar/material/roughnessmap' ) );
	container.add( materialRoughnessMap );

	

	const materialMetalnessMap = new SidebarMaterialMapProperty( editor, 'metalnessMap', strings.getKey( 'sidebar/material/metalnessmap' ) );
	container.add( materialMetalnessMap );

	

	const materialIridescenceMap = new SidebarMaterialMapProperty( editor, 'iridescenceMap', strings.getKey( 'sidebar/material/iridescencemap' ) );
	container.add( materialIridescenceMap );

	

	const materialSheenColorMap = new SidebarMaterialMapProperty( editor, 'sheenColorMap', strings.getKey( 'sidebar/material/sheencolormap' ) );
	container.add( materialSheenColorMap );

	

	const materialSheenRoughnessMap = new SidebarMaterialMapProperty( editor, 'sheenRoughnessMap', strings.getKey( 'sidebar/material/sheenroughnessmap' ) );
	container.add( materialSheenRoughnessMap );

	

	const materialIridescenceThicknessMap = new SidebarMaterialMapProperty( editor, 'iridescenceThicknessMap', strings.getKey( 'sidebar/material/iridescencethicknessmap' ) );
	container.add( materialIridescenceThicknessMap );

	

	const materialEnvMap = new SidebarMaterialMapProperty( editor, 'envMap', strings.getKey( 'sidebar/material/envmap' ) );
	container.add( materialEnvMap );

	

	const materialLightMap = new SidebarMaterialMapProperty( editor, 'lightMap', strings.getKey( 'sidebar/material/lightmap' ) );
	container.add( materialLightMap );

	

	const materialAOMap = new SidebarMaterialMapProperty( editor, 'aoMap', strings.getKey( 'sidebar/material/aomap' ) );
	container.add( materialAOMap );

	

	const materialGradientMap = new SidebarMaterialMapProperty( editor, 'gradientMap', strings.getKey( 'sidebar/material/gradientmap' ) );
	container.add( materialGradientMap );

	

	const transmissionMap = new SidebarMaterialMapProperty( editor, 'transmissionMap', strings.getKey( 'sidebar/material/transmissionmap' ) );
	container.add( transmissionMap );

	

	const thicknessMap = new SidebarMaterialMapProperty( editor, 'thicknessMap', strings.getKey( 'sidebar/material/thicknessmap' ) );
	container.add( thicknessMap );

	

	const materialSideOptions = {
		0: 'Front',
		1: 'Back',
		2: 'Double'
	};

	const materialSide = new SidebarMaterialConstantProperty( editor, 'side', strings.getKey( 'sidebar/material/side' ), materialSideOptions );
	container.add( materialSide );

	

	const materialSize = new SidebarMaterialNumberProperty( editor, 'size', strings.getKey( 'sidebar/material/size' ), [ 0, Infinity ] );
	container.add( materialSize );

	

	const materialSizeAttenuation = new SidebarMaterialBooleanProperty( editor, 'sizeAttenuation', strings.getKey( 'sidebar/material/sizeAttenuation' ) );
	container.add( materialSizeAttenuation );

	

	const materialFlatShading = new SidebarMaterialBooleanProperty( editor, 'flatShading', strings.getKey( 'sidebar/material/flatShading' ) );
	container.add( materialFlatShading );

	

	const materialBlendingOptions = {
		0: 'No',
		1: 'Normal',
		2: 'Additive',
		3: 'Subtractive',
		4: 'Multiply',
		5: 'Custom'
	};

	const materialBlending = new SidebarMaterialConstantProperty( editor, 'blending', strings.getKey( 'sidebar/material/blending' ), materialBlendingOptions );
	container.add( materialBlending );

	

	const materialOpacity = new SidebarMaterialNumberProperty( editor, 'opacity', strings.getKey( 'sidebar/material/opacity' ), [ 0, 1 ] );
	container.add( materialOpacity );

	

	const materialTransparent = new SidebarMaterialBooleanProperty( editor, 'transparent', strings.getKey( 'sidebar/material/transparent' ) );
	container.add( materialTransparent );

	

	const materialForceSinglePass = new SidebarMaterialBooleanProperty( editor, 'forceSinglePass', strings.getKey( 'sidebar/material/forcesinglepass' ) );
	container.add( materialForceSinglePass );

	

	const materialAlphaTest = new SidebarMaterialNumberProperty( editor, 'alphaTest', strings.getKey( 'sidebar/material/alphatest' ), [ 0, 1 ] );
	container.add( materialAlphaTest );

	

	const materialDepthTest = new SidebarMaterialBooleanProperty( editor, 'depthTest', strings.getKey( 'sidebar/material/depthtest' ) );
	container.add( materialDepthTest );

	

	const materialDepthWrite = new SidebarMaterialBooleanProperty( editor, 'depthWrite', strings.getKey( 'sidebar/material/depthwrite' ) );
	container.add( materialDepthWrite );

	

	const materialWireframe = new SidebarMaterialBooleanProperty( editor, 'wireframe', strings.getKey( 'sidebar/material/wireframe' ) );
	container.add( materialWireframe );

	

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

	container.add( materialUserDataRow );

	

	const exportJson = new UIButton( strings.getKey( 'sidebar/material/export' ) );
	exportJson.setMarginLeft( '120px' );
	exportJson.onClick( function () {

		const object = editor.selected;
		const material = Array.isArray( object.material ) ? object.material[ currentMaterialSlot ] : object.material;

		let output = material.toJSON();

		try {

			output = JSON.stringify( output, null, '\t' );
			output = output.replace( /[\n\t]+([\d\.e\-\[\]]+)/g, '$1' );

		} catch ( error ) {

			output = JSON.stringify( output );

		}

		editor.utils.save( new Blob( [ output ] ), `${ materialName.getValue() || 'material' }.json` );

	} );
	container.add( exportJson );

	//

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

	//

	function setRowVisibility() {

		const material = currentObject.material;

		if ( Array.isArray( material ) ) {

			materialSlotRow.setDisplay( '' );

		} else {

			materialSlotRow.setDisplay( 'none' );

		}

	}

	function refreshUI() {

		if ( ! currentObject ) return;

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

		if ( material.name !== undefined ) {

			materialName.setValue( material.name );

		}

		if ( material.type !== undefined ) {

			materialClass.setValue( material.type );

		}

		setRowVisibility();

		try {

			materialUserData.setValue( JSON.stringify( material.userData, null, '  ' ) );

		} catch ( error ) {

			console.log( error );

		}

		materialUserData.setBorderColor( 'transparent' );
		materialUserData.setBackgroundColor( '' );

	}

	

	signals.objectSelected.add( function ( object ) {

		let hasMaterial = false;

		if ( object && object.material ) {

			hasMaterial = true;

			if ( Array.isArray( object.material ) && object.material.length === 0 ) {

				hasMaterial = false;

			}

		}

		if ( hasMaterial ) {

			currentObject = object;
			refreshUI();
			container.setDisplay( '' );

		} else {

			currentObject = null;
			container.setDisplay( 'none' );

		}

	} );

	signals.materialChanged.add( refreshUI );

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
	'RawShaderMaterial': THREE.RawShaderMaterial,
	'ShaderMaterial': THREE.ShaderMaterial,
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
	'RawShaderMaterial': 'RawShaderMaterial',
	'ShaderMaterial': 'ShaderMaterial',
	'ShadowMaterial': 'ShadowMaterial'
};

const lineMaterialOptions = {
	'LineBasicMaterial': 'LineBasicMaterial',
	'LineDashedMaterial': 'LineDashedMaterial',
	'RawShaderMaterial': 'RawShaderMaterial',
	'ShaderMaterial': 'ShaderMaterial'
};

const spriteMaterialOptions = {
	'SpriteMaterial': 'SpriteMaterial',
	'RawShaderMaterial': 'RawShaderMaterial',
	'ShaderMaterial': 'ShaderMaterial'
};

const pointsMaterialOptions = {
	'PointsMaterial': 'PointsMaterial',
	'RawShaderMaterial': 'RawShaderMaterial',
	'ShaderMaterial': 'ShaderMaterial'
};

export { SidebarMaterial };
