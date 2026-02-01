import * as THREE from 'three';

import { UIPanel, UIRow, UIText, UIInput, UISelect } from './libs/ui.js';

import { SetMaterialCommand } from './commands/SetMaterialCommand.js';
import { SetMaterialValueCommand } from './commands/SetMaterialValueCommand.js';

import { SidebarMaterialBooleanProperty } from './Sidebar.Material.BooleanProperty.js';
import { SidebarMaterialColorProperty } from './Sidebar.Material.ColorProperty.js';
import { SidebarMaterialConstantProperty } from './Sidebar.Material.ConstantProperty.js';
import { SidebarMaterialMapProperty } from './Sidebar.Material.MapProperty.js';
import { SidebarMaterialNumberProperty } from './Sidebar.Material.NumberProperty.js';
import { SidebarMaterialRangeValueProperty } from './Sidebar.Material.RangeValueProperty.js';
import { SidebarMaterialProgram } from './Sidebar.Material.Program.js';

/**
 * Reusable Standard Material Inspector
 * Used in both entity/material and asset/material inspectors
 */
function StandardMaterialInspector( editor ) {

	const signals = editor.signals;
	const strings = editor.strings;

	const container = new UIPanel();
	let currentObject;
	let currentMaterialSlot = 0;

	// Material class mapping
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

	// Material Type Selector
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

	container.add( materialClassRow );

	// Material Properties
	const materialProgram = new SidebarMaterialProgram( editor, 'vertexShader' );
	container.add( materialProgram );

	const materialColorRow = new SidebarMaterialColorProperty( editor, 'color', strings.getKey( 'sidebar/material/color' ) );
	container.add( materialColorRow );

	const materialEmissiveRow = new SidebarMaterialColorProperty( editor, 'emissive', strings.getKey( 'sidebar/material/emissive' ) );
	container.add( materialEmissiveRow );

	const materialSpecularRow = new SidebarMaterialColorProperty( editor, 'specular', strings.getKey( 'sidebar/material/specular' ) );
	container.add( materialSpecularRow );

	const materialShininessRow = new SidebarMaterialNumberProperty( editor, 'shininess', strings.getKey( 'sidebar/material/shininess' ) );
	container.add( materialShininessRow );

	const materialRoughnessRow = new SidebarMaterialRangeValueProperty( editor, 'roughness', strings.getKey( 'sidebar/material/roughness' ), 0, 1 );
	container.add( materialRoughnessRow );

	const materialMetalnessRow = new SidebarMaterialRangeValueProperty( editor, 'metalness', strings.getKey( 'sidebar/material/metalness' ), 0, 1 );
	container.add( materialMetalnessRow );

	const materialEmissiveIntensityRow = new SidebarMaterialRangeValueProperty( editor, 'emissiveIntensity', strings.getKey( 'sidebar/material/emissiveIntensity' ), 0, 1 );
	container.add( materialEmissiveIntensityRow );

	const materialReflectivityRow = new SidebarMaterialRangeValueProperty( editor, 'reflectivity', strings.getKey( 'sidebar/material/reflectivity' ), 0, 1 );
	container.add( materialReflectivityRow );

	const materialIorRow = new SidebarMaterialRangeValueProperty( editor, 'ior', strings.getKey( 'sidebar/material/ior' ), 1, 2.333 );
	container.add( materialIorRow );

	const materialClearcoatRow = new SidebarMaterialRangeValueProperty( editor, 'clearcoat', strings.getKey( 'sidebar/material/clearcoat' ), 0, 1 );
	container.add( materialClearcoatRow );

	const materialClearcoatRoughnessRow = new SidebarMaterialRangeValueProperty( editor, 'clearcoatRoughness', strings.getKey( 'sidebar/material/clearcoatRoughness' ), 0, 1 );
	container.add( materialClearcoatRoughnessRow );

	const materialTransmissionRow = new SidebarMaterialRangeValueProperty( editor, 'transmission', strings.getKey( 'sidebar/material/transmission' ), 0, 1 );
	container.add( materialTransmissionRow );

	const materialAttenuationDistanceRow = new SidebarMaterialNumberProperty( editor, 'attenuationDistance', strings.getKey( 'sidebar/material/attenuationDistance' ) );
	container.add( materialAttenuationDistanceRow );

	const materialAttenuationColorRow = new SidebarMaterialColorProperty( editor, 'attenuationColor', strings.getKey( 'sidebar/material/attenuationColor' ) );
	container.add( materialAttenuationColorRow );

	const materialThicknessRow = new SidebarMaterialNumberProperty( editor, 'thickness', strings.getKey( 'sidebar/material/thickness' ) );
	container.add( materialThicknessRow );

	const materialSheenRow = new SidebarMaterialRangeValueProperty( editor, 'sheen', strings.getKey( 'sidebar/material/sheen' ), 0, 1 );
	container.add( materialSheenRow );

	const materialSheenRoughnessRow = new SidebarMaterialRangeValueProperty( editor, 'sheenRoughness', strings.getKey( 'sidebar/material/sheenRoughness' ), 0, 1 );
	container.add( materialSheenRoughnessRow );

	const materialSheenColorRow = new SidebarMaterialColorProperty( editor, 'sheenColor', strings.getKey( 'sidebar/material/sheenColor' ) );
	container.add( materialSheenColorRow );

	const materialIridescenceRow = new SidebarMaterialRangeValueProperty( editor, 'iridescence', strings.getKey( 'sidebar/material/iridescence' ), 0, 1 );
	container.add( materialIridescenceRow );

	const materialIridescenceIORRow = new SidebarMaterialRangeValueProperty( editor, 'iridescenceIOR', strings.getKey( 'sidebar/material/iridescenceIOR' ), 1, 2.333 );
	container.add( materialIridescenceIORRow );

	const materialSpecularIntensityRow = new SidebarMaterialRangeValueProperty( editor, 'specularIntensity', strings.getKey( 'sidebar/material/specularIntensity' ), 0, 1 );
	container.add( materialSpecularIntensityRow );

	const materialSpecularColorRow = new SidebarMaterialColorProperty( editor, 'specularColor', strings.getKey( 'sidebar/material/specularColor' ) );
	container.add( materialSpecularColorRow );

	const materialOpacityRow = new SidebarMaterialRangeValueProperty( editor, 'opacity', strings.getKey( 'sidebar/material/opacity' ), 0, 1 );
	container.add( materialOpacityRow );

	const materialTransparentRow = new SidebarMaterialBooleanProperty( editor, 'transparent', strings.getKey( 'sidebar/material/transparent' ) );
	container.add( materialTransparentRow );

	const materialAlphaTestRow = new SidebarMaterialRangeValueProperty( editor, 'alphaTest', strings.getKey( 'sidebar/material/alphaTest' ), 0, 1 );
	container.add( materialAlphaTestRow );

	const materialAlphaHashRow = new SidebarMaterialBooleanProperty( editor, 'alphaHash', strings.getKey( 'sidebar/material/alphaHash' ) );
	container.add( materialAlphaHashRow );

	const materialDepthTestRow = new SidebarMaterialBooleanProperty( editor, 'depthTest', strings.getKey( 'sidebar/material/depthTest' ) );
	container.add( materialDepthTestRow );

	const materialDepthWriteRow = new SidebarMaterialBooleanProperty( editor, 'depthWrite', strings.getKey( 'sidebar/material/depthWrite' ) );
	container.add( materialDepthWriteRow );

	const materialWireframeRow = new SidebarMaterialBooleanProperty( editor, 'wireframe', strings.getKey( 'sidebar/material/wireframe' ) );
	container.add( materialWireframeRow );

	const materialSideRow = new SidebarMaterialConstantProperty( editor, 'side', strings.getKey( 'sidebar/material/side' ), [
		[ 'Front', THREE.FrontSide ],
		[ 'Back', THREE.BackSide ],
		[ 'Double', THREE.DoubleSide ]
	] );
	container.add( materialSideRow );

	const materialBlendingRow = new SidebarMaterialConstantProperty( editor, 'blending', strings.getKey( 'sidebar/material/blending' ), [
		[ 'No', THREE.NoBlending ],
		[ 'Normal', THREE.NormalBlending ],
		[ 'Additive', THREE.AdditiveBlending ],
		[ 'Subtractive', THREE.SubtractiveBlending ],
		[ 'Multiply', THREE.MultiplyBlending ],
		[ 'Custom', THREE.CustomBlending ]
	] );
	container.add( materialBlendingRow );

	const materialMapRow = new SidebarMaterialMapProperty( editor, 'map', strings.getKey( 'sidebar/material/map' ) );
	container.add( materialMapRow );

	const materialMatcapMapRow = new SidebarMaterialMapProperty( editor, 'matcap', strings.getKey( 'sidebar/material/matcap' ) );
	container.add( materialMatcapMapRow );

	const materialAlphaMapRow = new SidebarMaterialMapProperty( editor, 'alphaMap', strings.getKey( 'sidebar/material/alphamap' ) );
	container.add( materialAlphaMapRow );

	const materialBumpMapRow = new SidebarMaterialMapProperty( editor, 'bumpMap', strings.getKey( 'sidebar/material/bumpmap' ) );
	container.add( materialBumpMapRow );

	const materialNormalMapRow = new SidebarMaterialMapProperty( editor, 'normalMap', strings.getKey( 'sidebar/material/normalmap' ) );
	container.add( materialNormalMapRow );

	const materialClearcoatMapRow = new SidebarMaterialMapProperty( editor, 'clearcoatMap', strings.getKey( 'sidebar/material/clearcoatMap' ) );
	container.add( materialClearcoatMapRow );

	const materialClearcoatNormalMapRow = new SidebarMaterialMapProperty( editor, 'clearcoatNormalMap', strings.getKey( 'sidebar/material/clearcoatNormalMap' ) );
	container.add( materialClearcoatNormalMapRow );

	const materialClearcoatRoughnessMapRow = new SidebarMaterialMapProperty( editor, 'clearcoatRoughnessMap', strings.getKey( 'sidebar/material/clearcoatRoughnessMap' ) );
	container.add( materialClearcoatRoughnessMapRow );

	const materialDisplacementMapRow = new SidebarMaterialMapProperty( editor, 'displacementMap', strings.getKey( 'sidebar/material/displacementmap' ) );
	container.add( materialDisplacementMapRow );

	const materialRoughnessMapRow = new SidebarMaterialMapProperty( editor, 'roughnessMap', strings.getKey( 'sidebar/material/roughnessmap' ) );
	container.add( materialRoughnessMapRow );

	const materialMetalnessMapRow = new SidebarMaterialMapProperty( editor, 'metalnessMap', strings.getKey( 'sidebar/material/metalnessmap' ) );
	container.add( materialMetalnessMapRow );

	const materialSpecularMapRow = new SidebarMaterialMapProperty( editor, 'specularMap', strings.getKey( 'sidebar/material/specularmap' ) );
	container.add( materialSpecularMapRow );

	const materialSpecularColorMapRow = new SidebarMaterialMapProperty( editor, 'specularColorMap', strings.getKey( 'sidebar/material/specularColorMap' ) );
	container.add( materialSpecularColorMapRow );

	const materialSpecularIntensityMapRow = new SidebarMaterialMapProperty( editor, 'specularIntensityMap', strings.getKey( 'sidebar/material/specularIntensityMap' ) );
	container.add( materialSpecularIntensityMapRow );

	const materialEnvMapRow = new SidebarMaterialMapProperty( editor, 'envMap', strings.getKey( 'sidebar/material/envmap' ) );
	container.add( materialEnvMapRow );

	const materialLightMapRow = new SidebarMaterialMapProperty( editor, 'lightMap', strings.getKey( 'sidebar/material/lightmap' ) );
	container.add( materialLightMapRow );

	const materialAOMapRow = new SidebarMaterialMapProperty( editor, 'aoMap', strings.getKey( 'sidebar/material/aomap' ) );
	container.add( materialAOMapRow );

	const materialEmissiveMapRow = new SidebarMaterialMapProperty( editor, 'emissiveMap', strings.getKey( 'sidebar/material/emissivemap' ) );
	container.add( materialEmissiveMapRow );

	const materialGradientMapRow = new SidebarMaterialMapProperty( editor, 'gradientMap', strings.getKey( 'sidebar/material/gradientmap' ) );
	container.add( materialGradientMapRow );

	const materialIridescenceMapRow = new SidebarMaterialMapProperty( editor, 'iridescenceMap', strings.getKey( 'sidebar/material/iridescenceMap' ) );
	container.add( materialIridescenceMapRow );

	const materialIridescenceThicknessMapRow = new SidebarMaterialMapProperty( editor, 'iridescenceThicknessMap', strings.getKey( 'sidebar/material/iridescenceThicknessMap' ) );
	container.add( materialIridescenceThicknessMapRow );

	const materialSheenColorMapRow = new SidebarMaterialMapProperty( editor, 'sheenColorMap', strings.getKey( 'sidebar/material/sheenColorMap' ) );
	container.add( materialSheenColorMapRow );

	const materialSheenRoughnessMapRow = new SidebarMaterialMapProperty( editor, 'sheenRoughnessMap', strings.getKey( 'sidebar/material/sheenRoughnessMap' ) );
	container.add( materialSheenRoughnessMapRow );

	const materialThicknessMapRow = new SidebarMaterialMapProperty( editor, 'thicknessMap', strings.getKey( 'sidebar/material/thicknessMap' ) );
	container.add( materialThicknessMapRow );

	const materialTransmissionMapRow = new SidebarMaterialMapProperty( editor, 'transmissionMap', strings.getKey( 'sidebar/material/transmissionMap' ) );
	container.add( materialTransmissionMapRow );

	//

	function setRowVisibility() {

		const material = editor.getObjectMaterial( currentObject, currentMaterialSlot );

		if ( ! material ) return;

		const properties = {
			'vertexShader': materialProgram,
			'color': materialColorRow,
			'emissive': materialEmissiveRow,
			'specular': materialSpecularRow,
			'shininess': materialShininessRow,
			'roughness': materialRoughnessRow,
			'metalness': materialMetalnessRow,
			'emissiveIntensity': materialEmissiveIntensityRow,
			'reflectivity': materialReflectivityRow,
			'ior': materialIorRow,
			'clearcoat': materialClearcoatRow,
			'clearcoatRoughness': materialClearcoatRoughnessRow,
			'transmission': materialTransmissionRow,
			'attenuationDistance': materialAttenuationDistanceRow,
			'attenuationColor': materialAttenuationColorRow,
			'thickness': materialThicknessRow,
			'sheen': materialSheenRow,
			'sheenRoughness': materialSheenRoughnessRow,
			'sheenColor': materialSheenColorRow,
			'iridescence': materialIridescenceRow,
			'iridescenceIOR': materialIridescenceIORRow,
			'specularIntensity': materialSpecularIntensityRow,
			'specularColor': materialSpecularColorRow,
			'opacity': materialOpacityRow,
			'transparent': materialTransparentRow,
			'alphaTest': materialAlphaTestRow,
			'alphaHash': materialAlphaHashRow,
			'depthTest': materialDepthTestRow,
			'depthWrite': materialDepthWriteRow,
			'wireframe': materialWireframeRow,
			'side': materialSideRow,
			'blending': materialBlendingRow,
			'map': materialMapRow,
			'matcap': materialMatcapMapRow,
			'alphaMap': materialAlphaMapRow,
			'bumpMap': materialBumpMapRow,
			'normalMap': materialNormalMapRow,
			'clearcoatMap': materialClearcoatMapRow,
			'clearcoatNormalMap': materialClearcoatNormalMapRow,
			'clearcoatRoughnessMap': materialClearcoatRoughnessMapRow,
			'displacementMap': materialDisplacementMapRow,
			'roughnessMap': materialRoughnessMapRow,
			'metalnessMap': materialMetalnessMapRow,
			'specularMap': materialSpecularMapRow,
			'specularColorMap': materialSpecularColorMapRow,
			'specularIntensityMap': materialSpecularIntensityMapRow,
			'envMap': materialEnvMapRow,
			'lightMap': materialLightMapRow,
			'aoMap': materialAOMapRow,
			'emissiveMap': materialEmissiveMapRow,
			'gradientMap': materialGradientMapRow,
			'iridescenceMap': materialIridescenceMapRow,
			'iridescenceThicknessMap': materialIridescenceThicknessMapRow,
			'sheenColorMap': materialSheenColorMapRow,
			'sheenRoughnessMap': materialSheenRoughnessMapRow,
			'thicknessMap': materialThicknessMapRow,
			'transmissionMap': materialTransmissionMapRow
		};

		for ( const property in properties ) {

			properties[ property ].setDisplay( material[ property ] !== undefined ? '' : 'none' );

		}

	}

	function refreshUI() {

		const material = editor.getObjectMaterial( currentObject, currentMaterialSlot );

		if ( ! material ) return;

		if ( material.type !== undefined ) {

			materialClassSelect.setValue( material.type );

		}

		setRowVisibility();

	}

	// Public API
	return {
		container: container,
		setObject: function ( object, materialSlot = 0 ) {

			currentObject = object;
			currentMaterialSlot = materialSlot;
			refreshUI();

		},
		refresh: refreshUI
	};

}

export { StandardMaterialInspector };
