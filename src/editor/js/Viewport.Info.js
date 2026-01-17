import { UIPanel, UIBreak, UIText } from './libs/ui.js';

function ViewportInfo( editor ) {

	const signals = editor.signals;
	const strings = editor.strings;

	const container = new UIPanel();
	container.setId( 'info' );
	container.addClass( 'viewport-info' );

	const header = new UIPanel();
	header.addClass( 'viewport-info-header' );
	const headerText = new UIText( 'Stats' );
	header.add( headerText );
	header.dom.addEventListener( 'click', function () {
		container.dom.classList.toggle( 'collapsed' );
	} );
	container.add( header );

	const content = new UIPanel();
	content.addClass( 'viewport-info-content' );

	const objectsText = new UIText( '0' ).addClass( 'stat-value' );
	const verticesText = new UIText( '0' ).addClass( 'stat-value' );
	const trianglesText = new UIText( '0' ).addClass( 'stat-value' );
	const frametimeText = new UIText( '0' ).addClass( 'stat-value' );
	const samplesText = new UIText( '0' ).addClass( 'stat-value' ).setHidden( true );

	const objectsUnitText = new UIText( strings.getKey( 'viewport/info/objects' ) ).addClass( 'stat-label' );
	const verticesUnitText = new UIText( strings.getKey( 'viewport/info/vertices' ) ).addClass( 'stat-label' );
	const trianglesUnitText = new UIText( strings.getKey( 'viewport/info/triangles' ) ).addClass( 'stat-label' );
	const samplesUnitText = new UIText( strings.getKey( 'viewport/info/samples' ) ).addClass( 'stat-label' ).setHidden( true );
	const frametimeLabelText = new UIText( strings.getKey( 'viewport/info/rendertime' ) ).addClass( 'stat-label' );

	content.add( objectsUnitText,  objectsText );
	content.add( verticesUnitText, verticesText );
	content.add( trianglesUnitText, trianglesText );
	content.add( frametimeLabelText, frametimeText );
	content.add( samplesUnitText, samplesText );

	container.add( content );

	signals.objectAdded.add( update );
	signals.objectRemoved.add( update );
	signals.objectChanged.add( update );
	signals.geometryChanged.add( update );
	signals.sceneRendered.add( updateFrametime );

	//

	const pluralRules = new Intl.PluralRules( editor.config.getKey( 'language' ) );

	//

	function update() {

		const scene = editor.scene;

		let objects = 0, vertices = 0, triangles = 0;

		for ( let i = 0, l = scene.children.length; i < l; i ++ ) {

			const object = scene.children[ i ];

			object.traverseVisible( function ( object ) {

				objects ++;

				if ( object.isMesh || object.isPoints ) {

					const geometry = object.geometry;
					const positionAttribute = geometry.attributes.position;

					

					if ( positionAttribute !== undefined && positionAttribute !== null ) {

						vertices += positionAttribute.count;

					}

					if ( object.isMesh ) {

						if ( geometry.index !== null ) {

							triangles += geometry.index.count / 3;

						} else if ( positionAttribute !== undefined && positionAttribute !== null ) {

							triangles += positionAttribute.count / 3;

						}

					}

				}

			} );

		}

		objectsText.setValue( editor.utils.formatNumber( objects ) );
		verticesText.setValue( editor.utils.formatNumber( vertices ) );
		trianglesText.setValue( editor.utils.formatNumber( triangles ) );

		const pluralRules = new Intl.PluralRules( editor.config.getKey( 'language' ) );

		const objectsStringKey = ( pluralRules.select( objects ) === 'one' ) ? 'viewport/info/object' : 'viewport/info/objects';
		objectsUnitText.setValue( strings.getKey( objectsStringKey ) );

		const verticesStringKey = ( pluralRules.select( vertices ) === 'one' ) ? 'viewport/info/vertex' : 'viewport/info/vertices';
		verticesUnitText.setValue( strings.getKey( verticesStringKey ) );

		const trianglesStringKey = ( pluralRules.select( triangles ) === 'one' ) ? 'viewport/info/triangle' : 'viewport/info/triangles';
		trianglesUnitText.setValue( strings.getKey( trianglesStringKey ) );

	}

	function updateFrametime( frametimeInSeconds ) {
		frametimeText.setValue( Number( frametimeInSeconds ).toFixed( 2 ) );
	}

	editor.signals.pathTracerUpdated.add( function ( samples ) {

		samples = Math.floor( samples );

		samplesText.setValue( samples );

		const samplesStringKey = ( pluralRules.select( samples ) === 'one' ) ? 'viewport/info/sample' : 'viewport/info/samples';
		samplesUnitText.setValue( strings.getKey( samplesStringKey ) );

	} );

	editor.signals.viewportShadingChanged.add( function () {

		const isRealisticShading = ( editor.viewportShading === 'realistic' );

		samplesText.setHidden( ! isRealisticShading );
		samplesUnitText.setHidden( ! isRealisticShading );

		container.setBottom( isRealisticShading ? '32px' : '5px' );

	} );

	return container;

}

export { ViewportInfo };
