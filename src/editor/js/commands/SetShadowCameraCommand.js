import { Command } from '../Command.js';

class SetShadowCameraCommand extends Command {

	constructor( editor, object = null, propertyName = '', newValue = null ) {

		super( editor );

		this.type = 'SetShadowCameraCommand';
		this.name = editor.strings.getKey( 'command/SetShadowCamera' ) + ': ' + propertyName;
		this.updatable = true;

		this.object = object;
		this.propertyName = propertyName;
		
		if ( object !== null && object.shadow !== undefined && object.shadow.camera !== undefined ) {
			
			if ( propertyName === 'area' ) {
				
				const width = object.shadow.camera.right - object.shadow.camera.left;
				const height = object.shadow.camera.top - object.shadow.camera.bottom;
				this.oldValue = Math.max( Math.abs( width ), Math.abs( height ) ) / 2;
				
			} else {
				
				this.oldValue = object.shadow.camera[ propertyName ];
				
			}
			
		} else {
			
			this.oldValue = null;
			
		}
		
		this.newValue = newValue;

	}

	execute() {

		if ( this.object !== null && this.object.shadow !== undefined && this.object.shadow.camera !== undefined ) {

			if ( this.propertyName === 'area' ) {

				const area = this.newValue;
				this.object.shadow.camera.left = - area;
				this.object.shadow.camera.right = area;
				this.object.shadow.camera.top = area;
				this.object.shadow.camera.bottom = - area;

			} else {

				this.object.shadow.camera[ this.propertyName ] = this.newValue;

			}

			this.object.shadow.camera.updateProjectionMatrix();
			this.editor.signals.objectChanged.dispatch( this.object );

		}

	}

	undo() {

		if ( this.object !== null && this.object.shadow !== undefined && this.object.shadow.camera !== undefined ) {

			if ( this.propertyName === 'area' ) {

				const area = this.oldValue;
				this.object.shadow.camera.left = - area;
				this.object.shadow.camera.right = area;
				this.object.shadow.camera.top = area;
				this.object.shadow.camera.bottom = - area;

			} else {

				this.object.shadow.camera[ this.propertyName ] = this.oldValue;

			}

			this.object.shadow.camera.updateProjectionMatrix();
			this.editor.signals.objectChanged.dispatch( this.object );

		}

	}

	update( cmd ) {

		this.newValue = cmd.newValue;

	}

	toJSON() {

		const output = super.toJSON( this );

		output.objectUuid = this.object.uuid;
		output.propertyName = this.propertyName;
		output.oldValue = this.oldValue;
		output.newValue = this.newValue;

		return output;

	}

	fromJSON( json ) {

		super.fromJSON( json );

		this.object = this.editor.objectByUuid( json.objectUuid );
		this.propertyName = json.propertyName;
		this.oldValue = json.oldValue;
		this.newValue = json.newValue;

	}

}

export { SetShadowCameraCommand };
