import { UIElement, UIPanel, UIText } from './libs/ui.js';

function Script( editor ) {

	const signals = editor.signals;
	const strings = editor.strings;

	const container = new UIPanel();
	container.setId( 'script' );
	container.setPosition( 'absolute' );
	container.setDisplay( 'none' );

	const header = new UIPanel();
	header.setPadding( '10px' );
	container.add( header );

	const title = new UIText();
	header.add( title );

	const buttonSVG = ( function () {

		const svg = document.createElementNS( 'http://www.w3.org/2000/svg', 'svg' );
		svg.setAttribute( 'width', 32 );
		svg.setAttribute( 'height', 32 );
		const path = document.createElementNS( 'http://www.w3.org/2000/svg', 'path' );
		path.setAttribute( 'd', 'M 12,12 L 22,22 M 22,12 12,22' );
		path.setAttribute( 'stroke', '#fff' );
		svg.appendChild( path );
		return svg;

	} )();

	const close = new UIElement( buttonSVG );
	close.setPosition( 'absolute' );
	close.setTop( '3px' );
	close.setRight( '1px' );
	close.setCursor( 'pointer' );
	close.onClick( function () {

		container.setDisplay( 'none' );

	} );
	header.add( close );

	const placeholder = new UIText( 'Script editing is currently disabled.' );
	placeholder.dom.style.padding = '20px';
	placeholder.dom.style.color = '#888';
	container.add( placeholder );

	signals.editorCleared.add( function () {

		container.setDisplay( 'none' );

	} );

	return container;

}

export { Script };
