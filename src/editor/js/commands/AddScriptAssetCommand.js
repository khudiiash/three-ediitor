import { Command } from '../Command.js';

class AddScriptAssetCommand extends Command {

	constructor( editor, object = null, scriptAssetPath = '' ) {

		super( editor );

		this.type = 'AddScriptAssetCommand';
		this.name = 'Add Script Asset';

		this.object = object;
		this.scriptAssetPath = scriptAssetPath;

	}

	execute() {

		if ( !this.object.userData.scripts ) {
			this.object.userData.scripts = [];
		}

		const scriptData = {
			assetPath: this.scriptAssetPath,
			attributes: {}
		};

		this.object.userData.scripts.push( scriptData );

		this.editor.signals.scriptAdded.dispatch( this.object, scriptData );
		this.editor.signals.sceneGraphChanged.dispatch();

	}

	undo() {

		if ( !this.object.userData.scripts ) return;

		const index = this.object.userData.scripts.findIndex( s => s.assetPath === this.scriptAssetPath );

		if ( index !== -1 ) {
			this.object.userData.scripts.splice( index, 1 );
		}

		this.editor.signals.scriptRemoved.dispatch( this.object, { assetPath: this.scriptAssetPath } );
		this.editor.signals.sceneGraphChanged.dispatch();

	}

	toJSON() {

		const output = super.toJSON( this );

		output.objectUuid = this.object.uuid;
		output.scriptAssetPath = this.scriptAssetPath;

		return output;

	}

	fromJSON( json ) {

		super.fromJSON( json );

		this.scriptAssetPath = json.scriptAssetPath;
		this.object = this.editor.objectByUuid( json.objectUuid );

	}

}

export { AddScriptAssetCommand };
