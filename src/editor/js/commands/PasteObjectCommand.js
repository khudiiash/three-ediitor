import { Command } from '../Command.js';
import { ObjectLoader } from 'three';
import { AddObjectCommand } from './AddObjectCommand.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';

class PasteObjectCommand extends Command {

	constructor( editor, parent = null ) {

		super( editor );

		this.type = 'PasteObjectCommand';
		this.name = editor.strings.getKey( 'command/PasteObject' );

		this.parent = parent;
		this.object = null;
		this.clipboard = editor.clipboard;

	}

	execute() {

		if ( !this.clipboard ) return;

		const loader = new ObjectLoader();
		const clonedObject = loader.parse( this.clipboard );

		if ( clonedObject === null ) return;

		const targetParent = this.parent || this.editor.scene;

		if ( targetParent === this.editor.scene || targetParent.isObject3D ) {

			this.object = clone( clonedObject );
			
			if ( targetParent === this.editor.scene ) {
				this.editor.addObject( this.object );
			} else {
				const index = targetParent.children.length;
				this.editor.addObject( this.object, targetParent, index );
			}
			
			this.editor.select( this.object );

		}

	}

	undo() {

		if ( this.object ) {

			this.editor.removeObject( this.object );
			this.editor.deselect();

		}

	}

	toJSON() {

		const output = super.toJSON( this );
		output.clipboard = this.clipboard;
		output.parentUuid = this.parent ? this.parent.uuid : null;

		return output;

	}

	fromJSON( json ) {

		super.fromJSON( json );
		this.clipboard = json.clipboard;
		this.parent = json.parentUuid ? this.editor.objectByUuid( json.parentUuid ) : null;

	}

}

export { PasteObjectCommand };
