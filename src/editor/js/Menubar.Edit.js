import { Box3, Vector3 } from 'three';

import { UIPanel, UIRow, UIHorizontalRule, UIText } from './libs/ui.js';

import { AddObjectCommand } from './commands/AddObjectCommand.js';
import { RemoveObjectCommand } from './commands/RemoveObjectCommand.js';
import { SetPositionCommand } from './commands/SetPositionCommand.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';

function MenubarEdit( editor ) {

	const strings = editor.strings;

	const container = new UIPanel();
	container.setClass( 'menu' );

	const title = new UIPanel();
	title.setClass( 'title' );
	title.setTextContent( strings.getKey( 'menubar/edit' ) );
	container.add( title );

	const options = new UIPanel();
	options.setClass( 'options' );
	container.add( options );

	

	const undo = new UIRow();
	undo.setClass( 'option' );
	undo.setTextContent( strings.getKey( 'menubar/edit/undo' ) );
	undo.add( new UIText( 'CTRL+Z' ).setClass( 'key' ) );
	undo.onClick( function () {

		editor.undo();

	} );
	options.add( undo );

	

	const redo = new UIRow();
	redo.setClass( 'option' );
	redo.setTextContent( strings.getKey( 'menubar/edit/redo' ) );
	redo.add( new UIText( 'CTRL+SHIFT+Z' ).setClass( 'key' ) );
	redo.onClick( function () {

		editor.redo();

	} );
	options.add( redo );

	function onHistoryChanged() {

		const history = editor.history;

		undo.setClass( 'option' );
		redo.setClass( 'option' );

		if ( history.undos.length == 0 ) {

			undo.setClass( 'inactive' );

		}

		if ( history.redos.length == 0 ) {

			redo.setClass( 'inactive' );

		}

	}

	editor.signals.historyChanged.add( onHistoryChanged );
	onHistoryChanged();

	

	options.add( new UIHorizontalRule() );

	

	let option = new UIRow();
	option.setClass( 'option' );
	option.setTextContent( strings.getKey( 'menubar/edit/center' ) );
	option.onClick( function () {

		const object = editor.selected;

		if ( object === null || object.parent === null ) return; 

		const aabb = new Box3().setFromObject( object );
		const center = aabb.getCenter( new Vector3() );
		const newPosition = new Vector3();

		newPosition.x = object.position.x - center.x;
		newPosition.y = object.position.y - center.y;
		newPosition.z = object.position.z - center.z;

		editor.execute( new SetPositionCommand( editor, object, newPosition ) );

	} );
	options.add( option );

	

	option = new UIRow();
	option.setClass( 'option' );
	option.setTextContent( strings.getKey( 'menubar/edit/clone' ) );
	option.onClick( function () {

		let object = editor.selected;

		if ( object === null || object.parent === null ) return; 

		object = clone( object );

		editor.execute( new AddObjectCommand( editor, object ) );

	} );
	options.add( option );

	

	option = new UIRow();
	option.setClass( 'option' );
	option.setTextContent( strings.getKey( 'menubar/edit/delete' ) );
	option.add( new UIText( 'DEL' ).setClass( 'key' ) );
	option.onClick( function () {

		const object = editor.selected;

		if ( object !== null && object.parent !== null ) {

			editor.execute( new RemoveObjectCommand( editor, object ) );

		}

	} );
	options.add( option );

	return container;

}

export { MenubarEdit };
