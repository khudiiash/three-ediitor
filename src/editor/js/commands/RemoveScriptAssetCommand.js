import { Command } from '../Command.js';

class RemoveScriptAssetCommand extends Command {

	constructor( editor, object = null, scriptIndex = -1 ) {

		super( editor );

		this.type = 'RemoveScriptAssetCommand';
		this.name = 'Remove Script Asset';

		this.object = object;
		this.scriptIndex = scriptIndex;
		this.scriptData = null;

	}

	execute() {

		if ( !this.object.userData.scripts || this.scriptIndex < 0 ) return;

		this.scriptData = this.object.userData.scripts[ this.scriptIndex ];
		this.object.userData.scripts.splice( this.scriptIndex, 1 );

		this.editor.signals.scriptRemoved.dispatch( this.object, this.scriptData );
		this.editor.signals.sceneGraphChanged.dispatch();

	}

	undo() {

		if ( !this.scriptData ) return;

		if ( !this.object.userData.scripts ) {
			this.object.userData.scripts = [];
		}

		this.object.userData.scripts.splice( this.scriptIndex, 0, this.scriptData );

		this.editor.signals.scriptAdded.dispatch( this.object, this.scriptData );
		this.editor.signals.sceneGraphChanged.dispatch();

	}

	toJSON() {

		const output = super.toJSON( this );

		output.objectUuid = this.object.uuid;
		output.scriptIndex = this.scriptIndex;
		output.scriptData = this.scriptData;

		return output;

	}

	fromJSON( json ) {

		super.fromJSON( json );

		this.scriptIndex = json.scriptIndex;
		this.scriptData = json.scriptData;
		this.object = this.editor.objectByUuid( json.objectUuid );

	}

}

export { RemoveScriptAssetCommand };
