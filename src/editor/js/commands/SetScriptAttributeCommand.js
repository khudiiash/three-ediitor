import { Command } from '../Command.js';

class SetScriptAttributeCommand extends Command {

	constructor( editor, object = null, scriptIndex = -1, attributeName = '', value = null ) {

		super( editor );

		this.type = 'SetScriptAttributeCommand';
		this.name = 'Set Script Attribute';
		this.updatable = true;

		this.object = object;
		this.scriptIndex = scriptIndex;
		this.attributeName = attributeName;
		this.newValue = value;
		this.oldValue = null;

	}

	execute() {

		if ( !this.object.userData.scripts || this.scriptIndex < 0 ) return;

		const script = this.object.userData.scripts[ this.scriptIndex ];
		
		if ( !script.attributes ) {
			script.attributes = {};
		}

		this.oldValue = script.attributes[ this.attributeName ];
		script.attributes[ this.attributeName ] = this.newValue;

		if ( window.pc && window.pc.app && window.pc.app.scene ) {
			const app = window.pc.app;
			if ( app && app.scene ) {
				const scene = app.scene;
				scene.traverse( ( object3D ) => {
					if ( object3D.uuid === this.object.uuid ) {
						const entity = object3D.__entity;
						if ( entity ) {
							const scripts = entity.scripts;
							if ( scripts && scripts.length > this.scriptIndex ) {
								const runningScript = scripts[ this.scriptIndex ];
								if ( runningScript ) {
									if ( runningScript.setAttribute ) {
										runningScript.setAttribute( this.attributeName, this.newValue );
									}
									runningScript[ this.attributeName ] = this.newValue;
								}
							}
						}
					}
				} );
			}
		}

		this.editor.signals.scriptChanged.dispatch( this.object, script );
		this.editor.signals.sceneGraphChanged.dispatch();

	}

	undo() {

		if ( !this.object.userData.scripts || this.scriptIndex < 0 ) return;

		const script = this.object.userData.scripts[ this.scriptIndex ];
		
		if ( this.oldValue === null ) {
			delete script.attributes[ this.attributeName ];
		} else {
			script.attributes[ this.attributeName ] = this.oldValue;
		}

		if ( window.pc && window.pc.app && window.pc.app.scene ) {
			const app = window.pc.app;
			if ( app && app.scene ) {
				const scene = app.scene;
				scene.traverse( ( object3D ) => {
					if ( object3D.uuid === this.object.uuid ) {
						const entity = object3D.__entity;
						if ( entity ) {
							const scripts = entity.scripts;
							if ( scripts && scripts.length > this.scriptIndex ) {
								const runningScript = scripts[ this.scriptIndex ];
								if ( runningScript && runningScript.setAttribute ) {
									if ( this.oldValue === null ) {
										const attrDef = runningScript.getAttributes().get( this.attributeName );
										if ( attrDef ) {
											runningScript.setAttribute( this.attributeName, attrDef.default !== undefined ? attrDef.default : ( attrDef.type === 'number' ? 0 : attrDef.type === 'boolean' ? false : '' ) );
										}
									} else {
										runningScript.setAttribute( this.attributeName, this.oldValue );
									}
								}
							}
						}
					}
				} );
			}
		}

		this.editor.signals.scriptChanged.dispatch( this.object, script );
		this.editor.signals.sceneGraphChanged.dispatch();

	}

	update( cmd ) {

		this.newValue = cmd.newValue;

	}

	toJSON() {

		const output = super.toJSON( this );

		output.objectUuid = this.object.uuid;
		output.scriptIndex = this.scriptIndex;
		output.attributeName = this.attributeName;
		output.newValue = this.newValue;
		output.oldValue = this.oldValue;

		return output;

	}

	fromJSON( json ) {

		super.fromJSON( json );

		this.scriptIndex = json.scriptIndex;
		this.attributeName = json.attributeName;
		this.newValue = json.newValue;
		this.oldValue = json.oldValue;
		this.object = this.editor.objectByUuid( json.objectUuid );

	}

}

export { SetScriptAttributeCommand };
