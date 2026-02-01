import * as THREE from 'three';

import { UIPanel, UIRow, UIText, UIInput, UIButton, UITextArea } from './libs/ui.js';

/**
 * Reusable Node Material Inspector
 * Used in both entity/material and asset/material inspectors
 */
function NodeMaterialInspector( editor ) {

	const signals = editor.signals;
	const strings = editor.strings;

	const container = new UIPanel();
	let currentObject;
	let currentMaterialSlot = 0;
	let currentNodeMaterial = null;

	// Material Name
	const materialNameRow = new UIRow();
	const materialName = new UIInput().setWidth( '150px' ).setFontSize( '12px' ).onChange( function () {

		if ( currentNodeMaterial ) {

			currentNodeMaterial.name = materialName.getValue();
			// TODO: Save to file if it's an asset
			console.log( 'Node material name changed:', currentNodeMaterial.name );

		}

	} );

	materialNameRow.add( new UIText( strings.getKey( 'sidebar/material/name' ) ).setClass( 'Label' ) );
	materialNameRow.add( materialName );
	container.add( materialNameRow );

	// Edit Nodes Button
	const editNodesRow = new UIRow();
	const editNodesBtn = new UIButton( 'Edit Nodes' );
	editNodesBtn.onClick( function () {

		if ( currentNodeMaterial ) {

			editor.tslEditor.open( currentNodeMaterial );

		}

	} );
	editNodesRow.add( new UIText( '' ).setClass( 'Label' ) );
	editNodesRow.add( editNodesBtn );
	container.add( editNodesRow );

	// Basic Properties
	const colorRow = new UIRow();
	const colorInput = new UIInput().setWidth( '150px' ).setFontSize( '12px' ).onChange( function () {

		if ( currentNodeMaterial ) {

			const hex = parseInt( colorInput.getValue().replace( '#', '' ), 16 );
			currentNodeMaterial.color = hex;
			console.log( 'Node material color changed:', hex );

		}

	} );

	colorRow.add( new UIText( strings.getKey( 'sidebar/material/color' ) ).setClass( 'Label' ) );
	colorRow.add( colorInput );
	container.add( colorRow );

	const roughnessRow = new UIRow();
	const roughnessInput = new UIInput().setWidth( '150px' ).setFontSize( '12px' ).onChange( function () {

		if ( currentNodeMaterial ) {

			currentNodeMaterial.roughness = parseFloat( roughnessInput.getValue() );
			console.log( 'Node material roughness changed:', currentNodeMaterial.roughness );

		}

	} );

	roughnessRow.add( new UIText( strings.getKey( 'sidebar/material/roughness' ) ).setClass( 'Label' ) );
	roughnessRow.add( roughnessInput );
	container.add( roughnessRow );

	const metalnessRow = new UIRow();
	const metalnessInput = new UIInput().setWidth( '150px' ).setFontSize( '12px' ).onChange( function () {

		if ( currentNodeMaterial ) {

			currentNodeMaterial.metalness = parseFloat( metalnessInput.getValue() );
			console.log( 'Node material metalness changed:', currentNodeMaterial.metalness );

		}

	} );

	metalnessRow.add( new UIText( strings.getKey( 'sidebar/material/metalness' ) ).setClass( 'Label' ) );
	metalnessRow.add( metalnessInput );
	container.add( metalnessRow );

	// Node Graph Info
	const nodesInfoRow = new UIRow();
	const nodesInfoText = new UIText( 'Node Graph: No nodes' ).setFontSize( '12px' );
	nodesInfoRow.add( nodesInfoText );
	container.add( nodesInfoRow );

	// JSON Preview (for debugging)
	const jsonPreviewRow = new UIRow();
	const jsonPreviewLabel = new UIText( 'JSON Data' ).setClass( 'Label' );
	jsonPreviewRow.add( jsonPreviewLabel );
	container.add( jsonPreviewRow );

	const jsonPreview = new UITextArea().setWidth( '100%' ).setHeight( '100px' ).setFontSize( '11px' );
	jsonPreview.dom.style.fontFamily = 'monospace';
	jsonPreview.dom.style.whiteSpace = 'pre';
	container.add( jsonPreview );

	//

	function refreshUI() {

		if ( ! currentNodeMaterial ) {

			materialName.setValue( '' );
			colorInput.setValue( '#ffffff' );
			roughnessInput.setValue( '1' );
			metalnessInput.setValue( '0' );
			nodesInfoText.setValue( 'Node Graph: No nodes' );
			jsonPreview.setValue( '' );
			return;

		}

		// Update UI from node material data
		materialName.setValue( currentNodeMaterial.name || 'NodeMaterial' );
		
		const color = currentNodeMaterial.color !== undefined ? currentNodeMaterial.color : 16777215;
		colorInput.setValue( '#' + color.toString( 16 ).padStart( 6, '0' ) );
		
		roughnessInput.setValue( currentNodeMaterial.roughness !== undefined ? currentNodeMaterial.roughness : 1 );
		metalnessInput.setValue( currentNodeMaterial.metalness !== undefined ? currentNodeMaterial.metalness : 0 );

		// Node graph info
		const nodes = currentNodeMaterial.nodes || {};
		const nodeCount = Object.keys( nodes ).length;
		nodesInfoText.setValue( `Node Graph: ${nodeCount} node${nodeCount !== 1 ? 's' : ''}` );

		// JSON preview
		try {

			jsonPreview.setValue( JSON.stringify( currentNodeMaterial, null, 2 ) );

		} catch ( e ) {

			jsonPreview.setValue( 'Error displaying JSON: ' + e.message );

		}

	}

	// Public API
	return {
		container: container,
		setMaterial: function ( nodeMaterialData ) {

			currentNodeMaterial = nodeMaterialData;
			refreshUI();

		},
		setObject: function ( object, materialSlot = 0 ) {

			currentObject = object;
			currentMaterialSlot = materialSlot;
			
			// Try to get node material from object
			const material = editor.getObjectMaterial( object, materialSlot );
			if ( material && ( material.type === 'NodeMaterial' || material.isNodeMaterial ) ) {

				currentNodeMaterial = material;

			} else {

				currentNodeMaterial = null;

			}

			refreshUI();

		},
		refresh: refreshUI
	};

}

export { NodeMaterialInspector };
