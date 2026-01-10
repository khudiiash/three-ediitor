import { Command } from '../Command.js';

class CopyObjectCommand extends Command {

	constructor( editor, object = null ) {

		super( editor );

		this.type = 'CopyObjectCommand';
		this.name = editor.strings.getKey( 'command/CopyObject' ) + ': ' + ( object ? object.name : '' );

		this.object = object;

	}

	execute() {

		if ( this.object === null || this.object.parent === null ) return;

		const json = this.object.toJSON();
		this.editor.clipboard = json;

	}

	undo() {

	}

	toJSON() {

		const output = super.toJSON( this );
		output.object = this.object ? this.object.toJSON() : null;

		return output;

	}

	fromJSON( json ) {

		super.fromJSON( json );
		this.object = json.object ? this.editor.objectByUuid( json.object.object.uuid ) : null;

	}

}

export { CopyObjectCommand };
