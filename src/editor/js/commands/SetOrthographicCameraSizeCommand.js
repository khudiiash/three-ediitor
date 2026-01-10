import { Command } from '../Command.js';

class SetOrthographicCameraSizeCommand extends Command {

	constructor( editor, object, orthoHeight ) {

		super( editor );

		this.type = 'SetOrthographicCameraSizeCommand';
		this.name = editor.strings.getKey( 'command/SetOrthographicCameraSize' );
		this.updatable = true;

		this.object = object;
		this.oldOrthoHeight = Math.abs( object.top - object.bottom ) / 2;
		this.newOrthoHeight = orthoHeight;

	}

	execute() {

		const container = document.getElementById( 'viewport' );
		const aspect = container ? container.offsetWidth / container.offsetHeight : ( this.object.aspect || 1 );
		const orthoHeight = this.newOrthoHeight;
		const orthoWidth = orthoHeight * aspect;

		this.object.left = - orthoWidth;
		this.object.right = orthoWidth;
		this.object.top = orthoHeight;
		this.object.bottom = - orthoHeight;
		if ( !this.object.aspect ) {
			this.object.aspect = aspect;
		}
		this.object.updateProjectionMatrix();
		this.editor.signals.objectChanged.dispatch( this.object );

	}

	undo() {

		const container = document.getElementById( 'viewport' );
		const aspect = container ? container.offsetWidth / container.offsetHeight : ( this.object.aspect || 1 );
		const orthoHeight = this.oldOrthoHeight;
		const orthoWidth = orthoHeight * aspect;

		this.object.left = - orthoWidth;
		this.object.right = orthoWidth;
		this.object.top = orthoHeight;
		this.object.bottom = - orthoHeight;
		if ( !this.object.aspect ) {
			this.object.aspect = aspect;
		}
		this.object.updateProjectionMatrix();
		this.editor.signals.objectChanged.dispatch( this.object );

	}

	update( cmd ) {

		this.newOrthoHeight = cmd.newOrthoHeight;

	}

	toJSON() {

		const output = super.toJSON( this );

		output.objectUuid = this.object.uuid;
		output.oldOrthoHeight = this.oldOrthoHeight;
		output.newOrthoHeight = this.newOrthoHeight;

		return output;

	}

	fromJSON( json ) {

		super.fromJSON( json );

		this.object = this.editor.objectByUuid( json.objectUuid );
		this.oldOrthoHeight = json.oldOrthoHeight;
		this.newOrthoHeight = json.newOrthoHeight;

	}

}

export { SetOrthographicCameraSizeCommand };
