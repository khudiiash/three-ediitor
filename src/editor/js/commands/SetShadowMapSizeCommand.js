import { Command } from '../Command.js';

class SetShadowMapSizeCommand extends Command {

	constructor( editor, object = null, newSize = null ) {

		super( editor );

		this.type = 'SetShadowMapSizeCommand';
		this.name = editor.strings.getKey( 'command/SetShadowMapSize' );
		this.updatable = true;

		this.object = object;
		this.oldSize = ( object !== null && object.shadow !== undefined && object.shadow.mapSize !== undefined ) ? object.shadow.mapSize.width : null;
		this.newSize = newSize;

	}

	execute() {

		if ( this.object !== null && this.object.shadow !== undefined && this.object.shadow.mapSize !== undefined ) {

			this.object.shadow.mapSize.width = this.newSize;
			this.object.shadow.mapSize.height = this.newSize;
			this.editor.signals.objectChanged.dispatch( this.object );

		}

	}

	undo() {

		if ( this.object !== null && this.object.shadow !== undefined && this.object.shadow.mapSize !== undefined ) {

			this.object.shadow.mapSize.width = this.oldSize;
			this.object.shadow.mapSize.height = this.oldSize;
			this.editor.signals.objectChanged.dispatch( this.object );

		}

	}

	update( cmd ) {

		this.newSize = cmd.newSize;

	}

	toJSON() {

		const output = super.toJSON( this );

		output.objectUuid = this.object.uuid;
		output.oldSize = this.oldSize;
		output.newSize = this.newSize;

		return output;

	}

	fromJSON( json ) {

		super.fromJSON( json );

		this.object = this.editor.objectByUuid( json.objectUuid );
		this.oldSize = json.oldSize;
		this.newSize = json.newSize;

	}

}

export { SetShadowMapSizeCommand };
