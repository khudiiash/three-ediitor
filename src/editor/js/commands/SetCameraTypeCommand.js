import * as THREE from 'three';
import { Command } from '../Command.js';

class SetCameraTypeCommand extends Command {

	constructor( editor, object, newType ) {

		super( editor );

		this.type = 'SetCameraTypeCommand';
		this.name = editor.strings.getKey( 'command/SetCameraType' ) + ': ' + newType;

		this.object = object;
		this.oldType = object.isPerspectiveCamera ? 'PerspectiveCamera' : 'OrthographicCamera';
		this.newType = newType;

		this.oldCamera = object.clone();
		this.newCamera = null;

	}

	execute() {

		const object = this.object;
		const parent = object.parent;
		const index = parent.children.indexOf( object );

		const position = object.position.clone();
		const rotation = object.rotation.clone();
		const quaternion = object.quaternion.clone();
		const scale = object.scale.clone();
		const name = object.name;
		const userData = JSON.parse( JSON.stringify( object.userData ) );
		const visible = object.visible;
		const near = object.near;
		const far = object.far;
		const aspect = object.aspect || 1;

		if ( this.newType === 'PerspectiveCamera' ) {

			let fov = 50;
			if ( object.isPerspectiveCamera ) {
				fov = object.fov;
			} else if ( object.isOrthographicCamera ) {
				const height = Math.abs( object.top - object.bottom );
				const distance = 10;
				fov = 2 * Math.atan( height / ( 2 * distance ) ) * ( 180 / Math.PI );
			}
			this.newCamera = new THREE.PerspectiveCamera( fov, aspect, near, far );

		} else {

			let orthoHeight = 5;
			if ( object.isOrthographicCamera ) {
				orthoHeight = Math.abs( object.top - object.bottom ) / 2;
			} else if ( object.isPerspectiveCamera ) {
				const fov = object.fov;
				const distance = 10;
				orthoHeight = distance * Math.tan( fov * Math.PI / 360 );
			}
			const orthoWidth = orthoHeight * aspect;
			this.newCamera = new THREE.OrthographicCamera( - orthoWidth, orthoWidth, orthoHeight, - orthoHeight, near, far );

		}

		this.newCamera.position.copy( position );
		this.newCamera.rotation.copy( rotation );
		this.newCamera.quaternion.copy( quaternion );
		this.newCamera.scale.copy( scale );
		this.newCamera.name = name;
		this.newCamera.userData = userData;
		this.newCamera.visible = visible;

		this.editor.removeObject( object );
		this.editor.addObject( this.newCamera, parent, index );

		this.editor.select( this.newCamera );
		this.editor.signals.objectChanged.dispatch( this.newCamera );
		this.editor.signals.sceneGraphChanged.dispatch();

	}

	undo() {

		const object = this.newCamera;
		const parent = object.parent;
		const index = parent.children.indexOf( object );

		this.editor.removeObject( object );
		this.editor.addObject( this.oldCamera, parent, index );

		this.editor.select( this.oldCamera );
		this.editor.signals.objectChanged.dispatch( this.oldCamera );
		this.editor.signals.sceneGraphChanged.dispatch();

	}

	toJSON() {

		const output = super.toJSON( this );

		output.objectUuid = this.object.uuid;
		output.oldType = this.oldType;
		output.newType = this.newType;

		return output;

	}

	fromJSON( json ) {

		super.fromJSON( json );

		this.object = this.editor.objectByUuid( json.objectUuid );
		this.oldType = json.oldType;
		this.newType = json.newType;

	}

}

export { SetCameraTypeCommand };
