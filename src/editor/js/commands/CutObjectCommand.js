import { Command } from '../Command.js';
import { RemoveObjectCommand } from './RemoveObjectCommand.js';
import { CopyObjectCommand } from './CopyObjectCommand.js';

class CutObjectCommand extends Command {

	constructor( editor, object = null ) {

		super( editor );

		this.type = 'CutObjectCommand';
		this.name = editor.strings.getKey( 'command/CutObject' ) + ': ' + ( object ? object.name : '' );

		this.object = object;
		this.copyCommand = null;
		this.removeCommand = null;

	}

	execute() {

		if ( this.object === null || this.object.parent === null ) return;

		this.copyCommand = new CopyObjectCommand( this.editor, this.object );
		this.copyCommand.execute();

		this.removeCommand = new RemoveObjectCommand( this.editor, this.object );
		this.removeCommand.execute();

	}

	undo() {

		if ( this.removeCommand ) {
			this.removeCommand.undo();
		}

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

export { CutObjectCommand };
