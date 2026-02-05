import { UIColor, UINumber, UIRow, UIText } from './libs/ui.js';
import { SetMaterialColorCommand } from './commands/SetMaterialColorCommand.js';
import { SetMaterialValueCommand } from './commands/SetMaterialValueCommand.js';

function SidebarMaterialColorProperty( editor, property, name ) {

	const signals = editor.signals;

	const container = new UIRow();
	container.add( new UIText( name ).setClass( 'Label' ) );

	const color = new UIColor().onInput( onChange );
	container.add( color );

	let intensity;

	if ( property === 'emissive' ) {

		intensity = new UINumber( 1 ).setRange( 0, Infinity ).onChange( onChange );
		container.add( intensity );

	}

	let object = null;
	let materialSlot = null;
	let material = null;

	function onChange() {

		const value = material && material[ property ];
		if ( ! value || typeof value.getHex !== 'function' ) return;
		if ( value.getHex() !== color.getHexValue() ) {

			editor.execute( new SetMaterialColorCommand( editor, object, property, color.getHexValue(), materialSlot ) );

		}

		if ( intensity !== undefined ) {

			if ( material[ `${ property }Intensity` ] !== intensity.getValue() ) {

				editor.execute( new SetMaterialValueCommand( editor, object, `${ property }Intensity`, intensity.getValue(), materialSlot ) );

			}

		}

	}

	function update( currentObject, currentMaterialSlot = 0 ) {

		object = currentObject;
		materialSlot = currentMaterialSlot;

		if ( object === null ) return;
		if ( object.material === undefined ) return;

		material = editor.getObjectMaterial( object, materialSlot );

		// Don't update for NodeMaterials / graph data (they don't have THREE.Color properties)
		if ( material && ( material.type === 'NodeMaterial' || material.isNodeMaterial || ( material.nodes && material.connections ) ) ) {

			container.setDisplay( 'none' );
			return;

		}

		const value = material[ property ];
		const hasColor = value && typeof value.getHexString === 'function';
		if ( property in material && hasColor ) {

			color.setHexValue( value.getHexString() );

			if ( intensity !== undefined ) {

				intensity.setValue( material[ `${ property }Intensity` ] );

			}

			container.setDisplay( '' );

		} else {

			container.setDisplay( 'none' );

		}

	}

	//

	signals.objectSelected.add( update );
	signals.materialChanged.add( update );

	return container;

}

export { SidebarMaterialColorProperty };
