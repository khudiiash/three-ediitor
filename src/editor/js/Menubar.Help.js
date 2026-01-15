import { UIPanel, UIRow } from './libs/ui.js';

function MenubarHelp( editor ) {

	const strings = editor.strings;

	const container = new UIPanel();
	container.setClass( 'menu' );

	const title = new UIPanel();
	title.setClass( 'title' );
	title.setTextContent( strings.getKey( 'menubar/help' ) );
	container.add( title );

	const options = new UIPanel();
	options.setClass( 'options' );
	container.add( options );

	

	let option = new UIRow();
	option.setClass( 'option' );
	option.setTextContent( strings.getKey( 'menubar/help/source_code' ) );
	option.onClick( function () {

		window.open( 'https://github.com/mrdoob/three.js/tree/master/editor', '_blank' );

	} );
	options.add( option );

	/*
	

	let option = new UIRow();
	option.setClass( 'option' );
	option.setTextContent( strings.getKey( 'menubar/help/icons' ) );
	option.onClick( function () {

		window.open( 'https://www.flaticon.com/packs/interface-44', '_blank' );

	} );
	options.add( option );
	*/

	

	option = new UIRow();
	option.setClass( 'option' );
	option.setTextContent( strings.getKey( 'menubar/help/about' ) );
	option.onClick( function () {

		window.open( 'https://threejs.org', '_blank' );

	} );
	options.add( option );

	

	option = new UIRow();
	option.setClass( 'option' );
	option.setTextContent( strings.getKey( 'menubar/help/manual' ) );
	option.onClick( function () {

		window.open( 'https://github.com/mrdoob/three.js/wiki/Editor-Manual', '_blank' );

	} );
	options.add( option );

	return container;

}

export { MenubarHelp };
