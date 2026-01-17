import { UIPanel, UIRow, UIText, UINumber, UICheckbox, UISelect, UIColor, UIButton } from './libs/ui.js';
import * as THREE from 'three';

function SidebarParticleSystem( editor ) {

	const container = new UIPanel();
	const strings = editor.strings;
	const signals = editor.signals;

	let currentObject = null;
	let particleData = {};

	const corePanel = new UIPanel();
	corePanel.setClass( 'Panel' );
	container.add( corePanel );

	const emissionPanel = new UIPanel();
	emissionPanel.setClass( 'Panel' );
	container.add( emissionPanel );

	const initialPropsPanel = new UIPanel();
	initialPropsPanel.setClass( 'Panel' );
	container.add( initialPropsPanel );

	const renderingPanel = new UIPanel();
	renderingPanel.setClass( 'Panel' );
	container.add( renderingPanel );

	const behaviorsPanel = new UIPanel();
	behaviorsPanel.setClass( 'Panel' );
	container.add( behaviorsPanel );

	function createMinMaxRow( label, minControl, maxControl ) {
		const row = new UIRow();
		row.add( new UIText( label ).setWidth( '120px' ).setClass( 'Label' ) );
		row.add( minControl );
		row.add( maxControl );
		return row;
	}

	function createVectorRow( label, xControl, yControl, zControl ) {
		const row = new UIRow();
		row.add( new UIText( label ).setWidth( '120px' ).setClass( 'Label' ) );
		row.add( xControl );
		row.add( yControl );
		row.add( zControl );
		return row;
	}

	const durationRow = new UIRow();
	const duration = new UINumber( 1 ).setRange( 0, Infinity ).setPrecision( 2 ).onChange( update );
	durationRow.add( new UIText( 'Duration' ).setWidth( '120px' ).setClass( 'Label' ) );
	durationRow.add( duration );
	corePanel.add( durationRow );

	const loopingRow = new UIRow();
	const looping = new UICheckbox( true ).onChange( update );
	loopingRow.add( new UIText( 'Looping' ).setWidth( '120px' ).setClass( 'Label' ) );
	loopingRow.add( looping );
	corePanel.add( loopingRow );

	const prewarmRow = new UIRow();
	const prewarm = new UICheckbox( false ).onChange( update );
	prewarmRow.add( new UIText( 'Prewarm' ).setWidth( '120px' ).setClass( 'Label' ) );
	prewarmRow.add( prewarm );
	corePanel.add( prewarmRow );

	const autoDestroyRow = new UIRow();
	const autoDestroy = new UICheckbox( false ).onChange( update );
	autoDestroyRow.add( new UIText( 'Auto Destroy' ).setWidth( '120px' ).setClass( 'Label' ) );
	autoDestroyRow.add( autoDestroy );
	corePanel.add( autoDestroyRow );

	const worldSpaceRow = new UIRow();
	const worldSpace = new UICheckbox( true ).onChange( update );
	worldSpaceRow.add( new UIText( 'World Space' ).setWidth( '120px' ).setClass( 'Label' ) );
	worldSpaceRow.add( worldSpace );
	corePanel.add( worldSpaceRow );

	const maxParticleRow = new UIRow();
	const maxParticle = new UINumber( 1000 ).setRange( 1, 100000 ).onChange( update );
	maxParticleRow.add( new UIText( 'Max Particles' ).setWidth( '120px' ).setClass( 'Label' ) );
	maxParticleRow.add( maxParticle );
	emissionPanel.add( maxParticleRow );

	const emissionOverTimeRow = new UIRow();
	const emissionOverTime = new UINumber( 10 ).setRange( 0, Infinity ).setPrecision( 2 ).onChange( update );
	emissionOverTimeRow.add( new UIText( 'Emission Over Time' ).setWidth( '120px' ).setClass( 'Label' ) );
	emissionOverTimeRow.add( emissionOverTime );
	emissionPanel.add( emissionOverTimeRow );

	const emissionOverDistanceRow = new UIRow();
	const emissionOverDistance = new UINumber( 0 ).setRange( 0, Infinity ).setPrecision( 2 ).onChange( update );
	emissionOverDistanceRow.add( new UIText( 'Emission Over Distance' ).setWidth( '120px' ).setClass( 'Label' ) );
	emissionOverDistanceRow.add( emissionOverDistance );
	emissionPanel.add( emissionOverDistanceRow );

	const emitterShapeRow = new UIRow();
	const emitterShape = new UISelect().setOptions( {
		'point': 'Point',
		'box': 'Box',
		'sphere': 'Sphere',
		'cone': 'Cone'
	} ).onChange( update );
	emitterShapeRow.add( new UIText( 'Emitter Shape' ).setWidth( '120px' ).setClass( 'Label' ) );
	emitterShapeRow.add( emitterShape );
	emissionPanel.add( emitterShapeRow );

	const emitterSizeX = new UINumber( 1 ).setRange( 0, Infinity ).setPrecision( 2 ).onChange( update );
	const emitterSizeY = new UINumber( 1 ).setRange( 0, Infinity ).setPrecision( 2 ).onChange( update );
	const emitterSizeZ = new UINumber( 1 ).setRange( 0, Infinity ).setPrecision( 2 ).onChange( update );
	emissionPanel.add( createVectorRow( 'Emitter Size', emitterSizeX, emitterSizeY, emitterSizeZ ) );

	const directionX = new UINumber( 0 ).setRange( -1, 1 ).setPrecision( 2 ).onChange( update );
	const directionY = new UINumber( 1 ).setRange( -1, 1 ).setPrecision( 2 ).onChange( update );
	const directionZ = new UINumber( 0 ).setRange( -1, 1 ).setPrecision( 2 ).onChange( update );
	emissionPanel.add( createVectorRow( 'Direction', directionX, directionY, directionZ ) );

	const spreadAngleRow = new UIRow();
	const spreadAngle = new UINumber( 0 ).setRange( 0, 180 ).setPrecision( 1 ).onChange( update );
	spreadAngleRow.add( new UIText( 'Spread Angle' ).setWidth( '120px' ).setClass( 'Label' ) );
	spreadAngleRow.add( spreadAngle );
	emissionPanel.add( spreadAngleRow );

	const startLifeMin = new UINumber( 0.1 ).setRange( 0, Infinity ).setPrecision( 3 ).onChange( update );
	const startLifeMax = new UINumber( 0.2 ).setRange( 0, Infinity ).setPrecision( 3 ).onChange( update );
	initialPropsPanel.add( createMinMaxRow( 'Start Life', startLifeMin, startLifeMax ) );

	const startSpeedMin = new UINumber( 1 ).setRange( 0, Infinity ).setPrecision( 2 ).onChange( update );
	const startSpeedMax = new UINumber( 1 ).setRange( 0, Infinity ).setPrecision( 2 ).onChange( update );
	initialPropsPanel.add( createMinMaxRow( 'Start Speed', startSpeedMin, startSpeedMax ) );

	const startRotationMin = new UINumber( 0 ).setRange( -360, 360 ).setPrecision( 1 ).onChange( update );
	const startRotationMax = new UINumber( 0 ).setRange( -360, 360 ).setPrecision( 1 ).onChange( update );
	initialPropsPanel.add( createMinMaxRow( 'Start Rotation', startRotationMin, startRotationMax ) );

	const startSizeMin = new UINumber( 0.1 ).setRange( 0, Infinity ).setPrecision( 2 ).onChange( update );
	const startSizeMax = new UINumber( 0.3 ).setRange( 0, Infinity ).setPrecision( 2 ).onChange( update );
	initialPropsPanel.add( createMinMaxRow( 'Start Size', startSizeMin, startSizeMax ) );

	const startColorRow = new UIRow();
	const startColor = new UIColor().onInput( update );
	startColorRow.add( new UIText( 'Start Color' ).setWidth( '120px' ).setClass( 'Label' ) );
	startColorRow.add( startColor );
	initialPropsPanel.add( startColorRow );

	const startColorARow = new UIRow();
	const startColorA = new UINumber( 1 ).setRange( 0, 1 ).setPrecision( 2 ).onChange( update );
	startColorARow.add( new UIText( 'Start Alpha' ).setWidth( '120px' ).setClass( 'Label' ) );
	startColorARow.add( startColorA );
	initialPropsPanel.add( startColorARow );

	const renderModeRow = new UIRow();
	const renderMode = new UISelect().setOptions( {
		'0': 'Billboard',
		'1': 'Stretched Billboard',
		'2': 'Mesh',
		'3': 'Trail',
		'4': 'Horizontal Billboard',
		'5': 'Vertical Billboard'
	} ).onChange( update );
	renderModeRow.add( new UIText( 'Render Mode' ).setWidth( '120px' ).setClass( 'Label' ) );
	renderModeRow.add( renderMode );
	renderingPanel.add( renderModeRow );

	const materialColorRow = new UIRow();
	const materialColor = new UIColor().onInput( update );
	materialColorRow.add( new UIText( 'Material Color' ).setWidth( '120px' ).setClass( 'Label' ) );
	materialColorRow.add( materialColor );
	renderingPanel.add( materialColorRow );

	const uTileCountRow = new UIRow();
	const uTileCount = new UINumber( 1 ).setRange( 1, 100 ).onChange( update );
	uTileCountRow.add( new UIText( 'U Tile Count' ).setWidth( '120px' ).setClass( 'Label' ) );
	uTileCountRow.add( uTileCount );
	renderingPanel.add( uTileCountRow );

	const vTileCountRow = new UIRow();
	const vTileCount = new UINumber( 1 ).setRange( 1, 100 ).onChange( update );
	vTileCountRow.add( new UIText( 'V Tile Count' ).setWidth( '120px' ).setClass( 'Label' ) );
	vTileCountRow.add( vTileCount );
	renderingPanel.add( vTileCountRow );

	const startTileIndexRow = new UIRow();
	const startTileIndex = new UINumber( 0 ).setRange( 0, 10000 ).onChange( update );
	startTileIndexRow.add( new UIText( 'Start Tile Index' ).setWidth( '120px' ).setClass( 'Label' ) );
	startTileIndexRow.add( startTileIndex );
	renderingPanel.add( startTileIndexRow );

	const behaviorsHeaderRow = new UIRow();
	behaviorsHeaderRow.add( new UIText( 'Behaviors' ).setWidth( '120px' ).setClass( 'Label' ) );
	const addBehaviorButton = new UIButton( '+' ).setWidth( '30px' ).onClick( function() {
		const behaviorSelect = new UISelect().setOptions( {
			'Gravity': 'Gravity (ApplyForce)',
			'ColorOverLife': 'Color Over Life'
		} );
		behaviorSelect.onChange( function() {
			const behaviorType = this.getValue();
			if ( !particleData.behaviors ) {
				particleData.behaviors = [];
			}
			particleData.behaviors.push( { type: behaviorType, enabled: true } );
			update();
			signals.objectChanged.dispatch( currentObject );
		} );
		const row = new UIRow();
		row.add( behaviorSelect );
		behaviorsPanel.add( row );
	} );
	behaviorsHeaderRow.add( addBehaviorButton );
	behaviorsPanel.add( behaviorsHeaderRow );

	function update() {
		if ( !currentObject || !currentObject.userData || !currentObject.userData.isParticleSystem ) {
			return;
		}

		if ( !currentObject.userData.particleSystem ) {
			currentObject.userData.particleSystem = {};
		}

		particleData = currentObject.userData.particleSystem;

		particleData.duration = duration.getValue();
		particleData.looping = looping.getValue();
		particleData.prewarm = prewarm.getValue();
		particleData.autoDestroy = autoDestroy.getValue();
		particleData.worldSpace = worldSpace.getValue();
		particleData.maxParticle = maxParticle.getValue();
		particleData.emissionRate = emissionOverTime.getValue();
		particleData.emissionOverDistance = emissionOverDistance.getValue();
		particleData.emitterShape = emitterShape.getValue();
		particleData.emitterSizeX = emitterSizeX.getValue();
		particleData.emitterSizeY = emitterSizeY.getValue();
		particleData.emitterSizeZ = emitterSizeZ.getValue();
		particleData.directionX = directionX.getValue();
		particleData.directionY = directionY.getValue();
		particleData.directionZ = directionZ.getValue();
		particleData.spreadAngle = spreadAngle.getValue();
		particleData.startLifeMin = startLifeMin.getValue();
		particleData.startLifeMax = startLifeMax.getValue();
		particleData.startSpeedMin = startSpeedMin.getValue();
		particleData.startSpeedMax = startSpeedMax.getValue();
		particleData.startRotationMin = startRotationMin.getValue();
		particleData.startRotationMax = startRotationMax.getValue();
		particleData.startSizeMin = startSizeMin.getValue();
		particleData.startSizeMax = startSizeMax.getValue();
		
		const startColorHex = startColor.getHexValue();
		const startColorObj = new THREE.Color( startColorHex );
		particleData.startColorR = startColorObj.r;
		particleData.startColorG = startColorObj.g;
		particleData.startColorB = startColorObj.b;
		particleData.startColorA = startColorA.getValue();
		
		const materialColorHex = materialColor.getHexValue();
		particleData.materialColor = parseInt( materialColorHex, 16 );
		
		particleData.renderMode = parseInt( renderMode.getValue() );
		particleData.uTileCount = uTileCount.getValue();
		particleData.vTileCount = vTileCount.getValue();
		particleData.startTileIndex = startTileIndex.getValue();

		signals.objectChanged.dispatch( currentObject );
	}

	function updateUI( object ) {
		currentObject = object;

		if ( !object || !object.userData || !object.userData.isParticleSystem ) {
			container.setDisplay( 'none' );
			return;
		}

		container.setDisplay( 'block' );
		particleData = object.userData.particleSystem || {};

	duration.setValue( particleData.duration !== undefined ? particleData.duration : 1 );
	looping.setValue( particleData.looping !== undefined ? particleData.looping : true );
	prewarm.setValue( particleData.prewarm !== undefined ? particleData.prewarm : false );
	autoDestroy.setValue( particleData.autoDestroy !== undefined ? particleData.autoDestroy : false );
	worldSpace.setValue( particleData.worldSpace !== undefined ? particleData.worldSpace : true );
	maxParticle.setValue( particleData.maxParticle !== undefined ? particleData.maxParticle : 1000 );
		emissionOverTime.setValue( particleData.emissionRate !== undefined ? particleData.emissionRate : 10 );
		emissionOverDistance.setValue( particleData.emissionOverDistance !== undefined ? particleData.emissionOverDistance : 0 );
		emitterShape.setValue( particleData.emitterShape || 'point' );
		emitterSizeX.setValue( particleData.emitterSizeX !== undefined ? particleData.emitterSizeX : 1 );
		emitterSizeY.setValue( particleData.emitterSizeY !== undefined ? particleData.emitterSizeY : 1 );
		emitterSizeZ.setValue( particleData.emitterSizeZ !== undefined ? particleData.emitterSizeZ : 1 );
		directionX.setValue( particleData.directionX !== undefined ? particleData.directionX : 0 );
		directionY.setValue( particleData.directionY !== undefined ? particleData.directionY : 1 );
		directionZ.setValue( particleData.directionZ !== undefined ? particleData.directionZ : 0 );
		spreadAngle.setValue( particleData.spreadAngle !== undefined ? particleData.spreadAngle : 0 );
		startLifeMin.setValue( particleData.startLifeMin !== undefined ? particleData.startLifeMin : 0.1 );
		startLifeMax.setValue( particleData.startLifeMax !== undefined ? particleData.startLifeMax : 0.2 );
		startSpeedMin.setValue( particleData.startSpeedMin !== undefined ? particleData.startSpeedMin : 1 );
		startSpeedMax.setValue( particleData.startSpeedMax !== undefined ? particleData.startSpeedMax : 1 );
		startRotationMin.setValue( particleData.startRotationMin !== undefined ? particleData.startRotationMin : 0 );
		startRotationMax.setValue( particleData.startRotationMax !== undefined ? particleData.startRotationMax : 0 );
		startSizeMin.setValue( particleData.startSizeMin !== undefined ? particleData.startSizeMin : 0.1 );
		startSizeMax.setValue( particleData.startSizeMax !== undefined ? particleData.startSizeMax : 0.3 );
		
		if ( particleData.startColorR !== undefined && particleData.startColorG !== undefined && particleData.startColorB !== undefined ) {
			const startColorObj = new THREE.Color( particleData.startColorR, particleData.startColorG, particleData.startColorB );
			startColor.setHexValue( startColorObj.getHexString() );
		}
		startColorA.setValue( particleData.startColorA !== undefined ? particleData.startColorA : 1 );
		
		if ( particleData.materialColor !== undefined ) {
			materialColor.setHexValue( particleData.materialColor.toString( 16 ).padStart( 6, '0' ) );
		}
		
		renderMode.setValue( particleData.renderMode !== undefined ? particleData.renderMode.toString() : '0' );
		uTileCount.setValue( particleData.uTileCount !== undefined ? particleData.uTileCount : 1 );
		vTileCount.setValue( particleData.vTileCount !== undefined ? particleData.vTileCount : 1 );
		startTileIndex.setValue( particleData.startTileIndex !== undefined ? particleData.startTileIndex : 0 );
	}

	signals.objectSelected.add( updateUI );
	signals.objectChanged.add( function( object ) {
		if ( object === currentObject ) {
			updateUI( object );
		}
	} );

	return container;

}

export { SidebarParticleSystem };
