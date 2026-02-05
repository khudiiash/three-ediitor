import * as THREE from 'three';

import { UIPanel, UIRow, UIInput, UIButton, UIColor, UICheckbox, UIInteger, UITextArea, UIText, UINumber, UISelect, UIDiv } from './libs/ui.js';
import { UIBoolean } from './libs/ui.three.js';
import { UICollapsiblePanel } from './libs/UICollapsiblePanel.js';

import { SetValueCommand } from './commands/SetValueCommand.js';
import { SetPositionCommand } from './commands/SetPositionCommand.js';
import { SetRotationCommand } from './commands/SetRotationCommand.js';
import { SetScaleCommand } from './commands/SetScaleCommand.js';
import { SetColorCommand } from './commands/SetColorCommand.js';
import { SetShadowValueCommand } from './commands/SetShadowValueCommand.js';
import { SetShadowCameraCommand } from './commands/SetShadowCameraCommand.js';
import { SetShadowMapSizeCommand } from './commands/SetShadowMapSizeCommand.js';
import { SetCameraTypeCommand } from './commands/SetCameraTypeCommand.js';
import { SetOrthographicCameraSizeCommand } from './commands/SetOrthographicCameraSizeCommand.js';

import { SidebarObjectAnimation } from './Sidebar.Object.Animation.js';
import { SidebarGeometry } from './Sidebar.Geometry.js';
import { SidebarMaterial } from './Sidebar.Material.js';
import { SidebarSceneSettings } from './Sidebar.Scene.Settings.js';
import { SidebarAsset } from './Sidebar.Asset.js';
import { SidebarParticleSystem } from './Sidebar.ParticleSystem.js';

function SidebarObject( editor ) {

	const strings = editor.strings;

	const signals = editor.signals;

	const entityPanel = new UICollapsiblePanel( 'Entity' );
	const meshPanel = new UICollapsiblePanel( 'Mesh' );
	const lightPanel = new UICollapsiblePanel( 'Light' );
	const cameraPanel = new UICollapsiblePanel( 'Camera' );
	const particlePanel = new UICollapsiblePanel( 'Particles' );
	const scenePanel = new UICollapsiblePanel( 'Scene' );

	const geometryPanel = new UICollapsiblePanel( 'Geometry' );
	const materialPanel = new UICollapsiblePanel( 'Material' );

	const geometryContent = new SidebarGeometry( editor );
	const materialContent = new SidebarMaterial( editor );
	const particleContent = new SidebarParticleSystem( editor );

	geometryPanel.add( geometryContent );
	materialPanel.add( materialContent );
	particlePanel.add( particleContent );

	geometryPanel.collapse();
	materialPanel.collapse();

	meshPanel.add( geometryPanel );
	meshPanel.add( materialPanel );

	entityPanel.collapse();
	meshPanel.collapse();
	lightPanel.collapse();
	cameraPanel.collapse();
	particlePanel.collapse();
	scenePanel.collapse();
	
	meshPanel.setHidden( true );
	lightPanel.setHidden( true );
	cameraPanel.setHidden( true );
	particlePanel.setHidden( true );
	scenePanel.setHidden( true );

	const sceneContent = new SidebarSceneSettings( editor );
	scenePanel.add( sceneContent );

	const assetContent = new SidebarAsset( editor );

	const panelsContainer = new UIPanel();
	panelsContainer.add( assetContent );
	panelsContainer.add( entityPanel );
	panelsContainer.add( meshPanel );
	panelsContainer.add( lightPanel );
	panelsContainer.add( cameraPanel );
	panelsContainer.add( particlePanel );
	panelsContainer.add( scenePanel );

	const objectTypeRow = new UIRow();
	const objectType = new UIText();
	objectTypeRow.add( new UIText( strings.getKey( 'sidebar/object/type' ) || 'Type' ).setClass( 'Label' ) );
	objectTypeRow.add( objectType );
	entityPanel.add( objectTypeRow );

	const objectNameRow = new UIRow();
	const objectName = new UIInput().setWidth( '150px' ).setFontSize( '12px' ).onChange( function () {
		if ( editor.selected && ( editor.selected.type === 'BatchedRenderer' || editor.selected.name === 'BatchedRenderer' ) ) {
			return;
		}
		editor.execute( new SetValueCommand( editor, editor.selected, 'name', objectName.getValue() ) );
	} );
	objectNameRow.add( new UIText( strings.getKey( 'sidebar/object/name' ) || 'Name' ).setClass( 'Label' ) );
	objectNameRow.add( objectName );
	entityPanel.add( objectNameRow );

	const objectPositionRow = new UIRow();
	const objectPositionX = new UINumber().setPrecision( 2 ).setWidth( '50px' ).setCtrlStep( 1 ).setCtrlNudge( 1 ).onChange( updateTransformImmediate );
	const objectPositionY = new UINumber().setPrecision( 2 ).setWidth( '50px' ).setCtrlStep( 1 ).setCtrlNudge( 1 ).onChange( updateTransformImmediate );
	const objectPositionZ = new UINumber().setPrecision( 2 ).setWidth( '50px' ).setCtrlStep( 1 ).setCtrlNudge( 1 ).onChange( updateTransformImmediate );
	objectPositionX.dom.addEventListener( 'blur', update );
	objectPositionY.dom.addEventListener( 'blur', update );
	objectPositionZ.dom.addEventListener( 'blur', update );
	const positionInputsContainer = new UIDiv();
	positionInputsContainer.addClass( 'input-group' );
	positionInputsContainer.add( objectPositionX, objectPositionY, objectPositionZ );
	objectPositionRow.add( new UIText( strings.getKey( 'sidebar/object/position' ) || 'Position' ).setClass( 'Label' ) );
	objectPositionRow.add( positionInputsContainer );
	entityPanel.add( objectPositionRow );

	const objectRotationRow = new UIRow();
	const objectRotationX = new UIInteger().setStep( 1 ).setNudge( 1 ).setCtrlStep( 45 ).setCtrlNudge( 45 ).setUnit( '°' ).setWidth( '50px' ).onChange( updateTransformImmediate );
	const objectRotationY = new UIInteger().setStep( 1 ).setNudge( 1 ).setCtrlStep( 45 ).setCtrlNudge( 45 ).setUnit( '°' ).setWidth( '50px' ).onChange( updateTransformImmediate );
	const objectRotationZ = new UIInteger().setStep( 1 ).setNudge( 1 ).setCtrlStep( 45 ).setCtrlNudge( 45 ).setUnit( '°' ).setWidth( '50px' ).onChange( updateTransformImmediate );
	objectRotationX.dom.addEventListener( 'blur', update );
	objectRotationY.dom.addEventListener( 'blur', update );
	objectRotationZ.dom.addEventListener( 'blur', update );
	const rotationInputsContainer = new UIDiv();
	rotationInputsContainer.addClass( 'input-group' );
	rotationInputsContainer.add( objectRotationX, objectRotationY, objectRotationZ );
	objectRotationRow.add( new UIText( strings.getKey( 'sidebar/object/rotation' ) || 'Rotation' ).setClass( 'Label' ) );
	objectRotationRow.add( rotationInputsContainer );
	entityPanel.add( objectRotationRow );

	let scaleLocked = true;
	const objectScaleRow = new UIRow();
	const scaleLockCheckbox = new UICheckbox( true ).onChange( function () {
		scaleLocked = this.getValue();
	} );
	const objectScaleX = new UINumber( 1 ).setPrecision( 2 ).setWidth( '50px' ).setCtrlStep( 1 ).setCtrlNudge( 1 ).onChange( function () {
		if ( scaleLocked ) {
			const value = this.getValue();
			objectScaleY.setValue( value );
			objectScaleZ.setValue( value );
		}
		updateTransformImmediate();
	} );
	const objectScaleY = new UINumber( 1 ).setPrecision( 2 ).setWidth( '50px' ).setCtrlStep( 1 ).setCtrlNudge( 1 ).onChange( function () {
		if ( scaleLocked ) {
			const value = this.getValue();
			objectScaleX.setValue( value );
			objectScaleZ.setValue( value );
		}
		updateTransformImmediate();
	} );
	const objectScaleZ = new UINumber( 1 ).setPrecision( 2 ).setWidth( '50px' ).setCtrlStep( 1 ).setCtrlNudge( 1 ).onChange( function () {
		if ( scaleLocked ) {
			const value = this.getValue();
			objectScaleX.setValue( value );
			objectScaleY.setValue( value );
		}
		updateTransformImmediate();
	} );
	objectScaleX.dom.addEventListener( 'blur', update );
	objectScaleY.dom.addEventListener( 'blur', update );
	objectScaleZ.dom.addEventListener( 'blur', update );
	const scaleInputsContainer = new UIDiv();
	scaleInputsContainer.addClass( 'input-group' );
	scaleInputsContainer.add( scaleLockCheckbox, objectScaleX, objectScaleY, objectScaleZ );
	objectScaleRow.add( new UIText( strings.getKey( 'sidebar/object/scale' ) || 'Scale' ).setClass( 'Label' ) );
	objectScaleRow.add( scaleInputsContainer );
	entityPanel.add( objectScaleRow );

	const objectCameraTypeRow = new UIRow();
	const objectCameraType = new UISelect().setOptions( {
		'PerspectiveCamera': 'Perspective',
		'OrthographicCamera': 'Orthographic'
	} ).onChange( function () {
		const newType = this.getValue();
		const object = editor.selected;
		if ( object && ( object.isPerspectiveCamera || object.isOrthographicCamera ) ) {
			const currentType = object.isPerspectiveCamera ? 'PerspectiveCamera' : 'OrthographicCamera';
			if ( currentType !== newType ) {
				editor.execute( new SetCameraTypeCommand( editor, object, newType ) );
			}
		}
	} );
	const cameraTypeLabel = strings.getKey( 'sidebar/object/cameraType' );
	objectCameraTypeRow.add( new UIText( ( cameraTypeLabel && cameraTypeLabel !== '???' ) ? cameraTypeLabel : 'Type' ).setClass( 'Label' ) );
	objectCameraTypeRow.add( objectCameraType );
	cameraPanel.add( objectCameraTypeRow );

	const objectFovRow = new UIRow();
	const objectFov = new UINumber().onChange( update );
	objectFovRow.add( new UIText( strings.getKey( 'sidebar/object/fov' ) || 'FOV' ).setClass( 'Label' ) );
	objectFovRow.add( objectFov );
	cameraPanel.add( objectFovRow );

	const objectCameraBoundsRow = new UIRow();
	const objectLeft = new UINumber().onChange( update );
	const objectRight = new UINumber().onChange( update );
	const objectTop = new UINumber().onChange( update );
	const objectBottom = new UINumber().onChange( update );
	const cameraBoundsInputsContainer = new UIDiv();
	cameraBoundsInputsContainer.addClass( 'input-group' );
	cameraBoundsInputsContainer.add( objectLeft, objectRight, objectTop, objectBottom );
	objectCameraBoundsRow.add( new UIText( 'Bounds' ).setClass( 'Label' ) );
	objectCameraBoundsRow.add( cameraBoundsInputsContainer );
	cameraPanel.add( objectCameraBoundsRow );
	objectCameraBoundsRow.setDisplay( 'none' );

	let cameraSizeUpdateTimeout = null;
	function updateCameraSize() {
		if ( cameraSizeUpdateTimeout !== null ) {
			clearTimeout( cameraSizeUpdateTimeout );
		}
		cameraSizeUpdateTimeout = setTimeout( function () {
			const object = editor.selected;
			if ( object && object.isOrthographicCamera ) {
				const orthoHeight = objectOrthoHeight.getValue();
				editor.execute( new SetOrthographicCameraSizeCommand( editor, object, orthoHeight ) );
			}
		}, 150 );
	}

	const objectOrthoHeightRow = new UIRow();
	const objectOrthoHeight = new UINumber().setPrecision( 2 ).setWidth( '50px' ).onChange( updateCameraSize );
	const orthoHeightLabel = strings.getKey( 'sidebar/object/orthoHeight' );
	objectOrthoHeightRow.add( new UIText( ( orthoHeightLabel && orthoHeightLabel !== '???' ) ? orthoHeightLabel : 'Ortho Height' ).setClass( 'Label' ) );
	objectOrthoHeightRow.add( objectOrthoHeight );
	cameraPanel.add( objectOrthoHeightRow );

	const objectNearFarRow = new UIRow();
	const objectNear = new UINumber().onChange( update );
	const objectFar = new UINumber().onChange( update );
	const nearFarInputsContainer = new UIDiv();
	nearFarInputsContainer.addClass( 'input-group' );
	nearFarInputsContainer.add( objectNear, objectFar );
	objectNearFarRow.add( new UIText( 'Near / Far' ).setClass( 'Label' ) );
	objectNearFarRow.add( nearFarInputsContainer );
	cameraPanel.add( objectNearFarRow );

	// Old particle system UI removed - now using Sidebar.ParticleSystem.js
	/*
	const particleDurationRow = new UIRow();
	const particleDuration = new UINumber( 1 ).setRange( 0, Infinity ).onChange( update );
	particleDurationRow.add( new UIText( 'Duration' ).setClass( 'Label' ) );
	particleDurationRow.add( particleDuration );
	particlePanel.add( particleDurationRow );

	const particleLoopingRow = new UIRow();
	const particleLooping = new UICheckbox( true ).onChange( update );
	particleLoopingRow.add( new UIText( 'Looping' ).setClass( 'Label' ) );
	particleLoopingRow.add( particleLooping );
	particlePanel.add( particleLoopingRow );

	const particlePrewarmRow = new UIRow();
	const particlePrewarm = new UICheckbox( false ).onChange( update );
	particlePrewarmRow.add( new UIText( 'Prewarm' ).setClass( 'Label' ) );
	particlePrewarmRow.add( particlePrewarm );
	particlePanel.add( particlePrewarmRow );

	const particleAutoDestroyRow = new UIRow();
	const particleAutoDestroy = new UICheckbox( false ).onChange( update );
	particleAutoDestroyRow.add( new UIText( 'Auto Destroy' ).setClass( 'Label' ) );
	particleAutoDestroyRow.add( particleAutoDestroy );
	particlePanel.add( particleAutoDestroyRow );

	const particleMaxParticleRow = new UIRow();
	const particleMaxParticle = new UINumber( 1000 ).setRange( 1, 100000 ).onChange( update );
	particleMaxParticleRow.add( new UIText( 'Max Particles' ).setClass( 'Label' ) );
	particleMaxParticleRow.add( particleMaxParticle );
	particlePanel.add( particleMaxParticleRow );

	const particleEmissionRateRow = new UIRow();
	const particleEmissionRate = new UINumber( 10 ).setRange( 0, Infinity ).onChange( update );
	particleEmissionRateRow.add( new UIText( 'Emission Over Time' ).setClass( 'Label' ) );
	particleEmissionRateRow.add( particleEmissionRate );
	particlePanel.add( particleEmissionRateRow );

	const particleEmissionOverDistanceRow = new UIRow();
	const particleEmissionOverDistance = new UINumber( 0 ).setRange( 0, Infinity ).setPrecision( 2 ).onChange( update );
	particleEmissionOverDistanceRow.add( new UIText( 'Emission Over Distance' ).setClass( 'Label' ) );
	particleEmissionOverDistanceRow.add( particleEmissionOverDistance );
	particlePanel.add( particleEmissionOverDistanceRow );

	const particleStartLifeRow = new UIRow();
	const particleStartLifeMin = new UINumber( 0.1 ).setRange( 0, Infinity ).setPrecision( 3 ).onChange( update );
	const particleStartLifeMax = new UINumber( 0.2 ).setRange( 0, Infinity ).setPrecision( 3 ).onChange( update );
	const startLifeInputsContainer = new UIDiv();
	startLifeInputsContainer.addClass( 'input-group' );
	startLifeInputsContainer.add( particleStartLifeMin.setWidth( '60px' ) );
	startLifeInputsContainer.add( particleStartLifeMax.setWidth( '60px' ) );
	particleStartLifeRow.add( new UIText( 'Start Life' ).setClass( 'Label' ) );
	particleStartLifeRow.add( startLifeInputsContainer );
	particlePanel.add( particleStartLifeRow );

	const particleStartSpeedRow = new UIRow();
	const particleStartSpeedMin = new UINumber( 1 ).setRange( 0, Infinity ).setPrecision( 2 ).onChange( update );
	const particleStartSpeedMax = new UINumber( 1 ).setRange( 0, Infinity ).setPrecision( 2 ).onChange( update );
	const startSpeedInputsContainer = new UIDiv();
	startSpeedInputsContainer.addClass( 'input-group' );
	startSpeedInputsContainer.add( particleStartSpeedMin.setWidth( '60px' ) );
	startSpeedInputsContainer.add( particleStartSpeedMax.setWidth( '60px' ) );
	particleStartSpeedRow.add( new UIText( 'Start Speed' ).setClass( 'Label' ) );
	particleStartSpeedRow.add( startSpeedInputsContainer );
	particlePanel.add( particleStartSpeedRow );

	const particleStartRotationRow = new UIRow();
	const particleStartRotationMin = new UINumber( 0 ).setRange( -360, 360 ).setPrecision( 1 ).onChange( update );
	const particleStartRotationMax = new UINumber( 0 ).setRange( -360, 360 ).setPrecision( 1 ).onChange( update );
	const startRotationInputsContainer = new UIDiv();
	startRotationInputsContainer.addClass( 'input-group' );
	startRotationInputsContainer.add( particleStartRotationMin.setWidth( '60px' ) );
	startRotationInputsContainer.add( particleStartRotationMax.setWidth( '60px' ) );
	particleStartRotationRow.add( new UIText( 'Start Rotation' ).setClass( 'Label' ) );
	particleStartRotationRow.add( startRotationInputsContainer );
	particlePanel.add( particleStartRotationRow );

	const particleStartSizeRow = new UIRow();
	const particleStartSizeMin = new UINumber( 0.1 ).setRange( 0, Infinity ).setPrecision( 2 ).onChange( update );
	const particleStartSizeMax = new UINumber( 0.3 ).setRange( 0, Infinity ).setPrecision( 2 ).onChange( update );
	const startSizeInputsContainer = new UIDiv();
	startSizeInputsContainer.addClass( 'input-group' );
	startSizeInputsContainer.add( particleStartSizeMin.setWidth( '60px' ) );
	startSizeInputsContainer.add( particleStartSizeMax.setWidth( '60px' ) );
	particleStartSizeRow.add( new UIText( 'Start Size' ).setClass( 'Label' ) );
	particleStartSizeRow.add( startSizeInputsContainer );
	particlePanel.add( particleStartSizeRow );

	const particleStartColorRow = new UIRow();
	const particleStartColor = new UIColor().onInput( update );
	particleStartColorRow.add( new UIText( 'Start Color' ).setClass( 'Label' ) );
	particleStartColorRow.add( particleStartColor );
	particlePanel.add( particleStartColorRow );

	const particleEndColorRow = new UIRow();
	const particleEndColor = new UIColor().onInput( update );
	particleEndColorRow.add( new UIText( 'End Color' ).setClass( 'Label' ) );
	particleEndColorRow.add( particleEndColor );
	particlePanel.add( particleEndColorRow );

	const particleEndSizeRow = new UIRow();
	const particleEndSizeMin = new UINumber( 0.1 ).setRange( 0, Infinity ).setPrecision( 2 ).onChange( update );
	const particleEndSizeMax = new UINumber( 0.3 ).setRange( 0, Infinity ).setPrecision( 2 ).onChange( update );
	const endSizeInputsContainer = new UIDiv();
	endSizeInputsContainer.addClass( 'input-group' );
	endSizeInputsContainer.add( particleEndSizeMin.setWidth( '60px' ) );
	endSizeInputsContainer.add( particleEndSizeMax.setWidth( '60px' ) );
	particleEndSizeRow.add( new UIText( 'End Size' ).setClass( 'Label' ) );
	particleEndSizeRow.add( endSizeInputsContainer );
	particlePanel.add( particleEndSizeRow );

	const particleMaterialColorRow = new UIRow();
	const particleMaterialColor = new UIColor().onInput( update );
	particleMaterialColorRow.add( new UIText( 'Material Color' ).setClass( 'Label' ) );
	particleMaterialColorRow.add( particleMaterialColor );
	particlePanel.add( particleMaterialColorRow );

	const particleWorldSpaceRow = new UIRow();
	const particleWorldSpace = new UICheckbox( false ).onChange( update );
	particleWorldSpaceRow.add( new UIText( 'World Space' ).setClass( 'Label' ) );
	particleWorldSpaceRow.add( particleWorldSpace );
	particlePanel.add( particleWorldSpaceRow );

	const particleRenderModeRow = new UIRow();
	const particleRenderMode = new UISelect().setOptions( {
		'0': 'Billboard',
		'1': 'Stretched Billboard',
		'2': 'Mesh',
		'3': 'Trail',
		'4': 'Horizontal Billboard',
		'5': 'Vertical Billboard'
	} ).onChange( update );
	particleRenderModeRow.add( new UIText( 'Render Mode' ).setClass( 'Label' ) );
	particleRenderModeRow.add( particleRenderMode );
	particlePanel.add( particleRenderModeRow );

	const particleUTileCountRow = new UIRow();
	const particleUTileCount = new UINumber( 1 ).setRange( 1, 100 ).onChange( update );
	particleUTileCountRow.add( new UIText( 'U Tile Count' ).setClass( 'Label' ) );
	particleUTileCountRow.add( particleUTileCount );
	particlePanel.add( particleUTileCountRow );

	const particleVTileCountRow = new UIRow();
	const particleVTileCount = new UINumber( 1 ).setRange( 1, 100 ).onChange( update );
	particleVTileCountRow.add( new UIText( 'V Tile Count' ).setClass( 'Label' ) );
	particleVTileCountRow.add( particleVTileCount );
	particlePanel.add( particleVTileCountRow );

	const particleStartTileIndexRow = new UIRow();
	const particleStartTileIndex = new UINumber( 0 ).setRange( 0, 10000 ).onChange( update );
	particleStartTileIndexRow.add( new UIText( 'Start Tile Index' ).setClass( 'Label' ) );
	particleStartTileIndexRow.add( particleStartTileIndex );
	particlePanel.add( particleStartTileIndexRow );

	const particleEmitterShapeRow = new UIRow();
	const particleEmitterShape = new UISelect().setOptions( {
		'point': 'Point',
		'box': 'Box',
		'sphere': 'Sphere',
		'cone': 'Cone'
	} ).onChange( update );
	particleEmitterShapeRow.add( new UIText( 'Emitter Shape' ).setClass( 'Label' ) );
	particleEmitterShapeRow.add( particleEmitterShape );
	particlePanel.add( particleEmitterShapeRow );

	const particleEmitterSizeRow = new UIRow();
	const particleEmitterSizeX = new UINumber( 1 ).setRange( 0, Infinity ).setPrecision( 2 ).onChange( update );
	const particleEmitterSizeY = new UINumber( 1 ).setRange( 0, Infinity ).setPrecision( 2 ).onChange( update );
	const particleEmitterSizeZ = new UINumber( 1 ).setRange( 0, Infinity ).setPrecision( 2 ).onChange( update );
	particleEmitterSizeRow.add( new UIText( 'Emitter Size' ).setClass( 'Label' ) );
	particleEmitterSizeRow.add( new UIText( 'X' ).setClass( 'Label vector-label' ) );
	particleEmitterSizeRow.add( particleEmitterSizeX.setWidth( '50px' ) );
	particleEmitterSizeRow.add( new UIText( 'Y' ).setClass( 'Label vector-label' ) );
	particleEmitterSizeRow.add( particleEmitterSizeY.setWidth( '50px' ) );
	particleEmitterSizeRow.add( new UIText( 'Z' ).setClass( 'Label vector-label' ) );
	particleEmitterSizeRow.add( particleEmitterSizeZ.setWidth( '50px' ) );
	particlePanel.add( particleEmitterSizeRow );

	const particleDirectionRow = new UIRow();
	const particleDirectionX = new UINumber( 0 ).setRange( -1, 1 ).setPrecision( 2 ).onChange( update );
	const particleDirectionY = new UINumber( 1 ).setRange( -1, 1 ).setPrecision( 2 ).onChange( update );
	const particleDirectionZ = new UINumber( 0 ).setRange( -1, 1 ).setPrecision( 2 ).onChange( update );
	particleDirectionRow.add( new UIText( 'Direction' ).setClass( 'Label' ) );
	particleDirectionRow.add( new UIText( 'X' ).setClass( 'Label vector-label' ) );
	particleDirectionRow.add( particleDirectionX.setWidth( '50px' ) );
	particleDirectionRow.add( new UIText( 'Y' ).setClass( 'Label vector-label' ) );
	particleDirectionRow.add( particleDirectionY.setWidth( '50px' ) );
	particleDirectionRow.add( new UIText( 'Z' ).setClass( 'Label vector-label' ) );
	particleDirectionRow.add( particleDirectionZ.setWidth( '50px' ) );
	particlePanel.add( particleDirectionRow );

	const particleSpreadAngleRow = new UIRow();
	const particleSpreadAngle = new UINumber( 0 ).setRange( 0, 180 ).setPrecision( 1 ).onChange( update );
	particleSpreadAngleRow.add( new UIText( 'Spread Angle' ).setClass( 'Label' ) );
	particleSpreadAngleRow.add( particleSpreadAngle );
	particlePanel.add( particleSpreadAngleRow );

	const behaviorsContainer = new UIPanel();
	behaviorsContainer.setClass( 'Panel' );
	
	const behaviorsHeaderRow = new UIRow();
	behaviorsHeaderRow.add( new UIText( 'Behaviors' ).setClass( 'Label' ) );
	const addBehaviorButton = new UIButton( '+' ).setWidth( '30px' ).setHeight( '24px' );
	addBehaviorButton.onClick( function() {
		const behaviorTypes = {
			'ColorOverLife': 'Color Over Life',
			'ColorBySpeed': 'Color By Speed',
			'SizeOverLife': 'Size Over Life',
			'SizeBySpeed': 'Size By Speed',
			'RotationOverLife': 'Rotation Over Life',
			'Rotation3DOverLife': 'Rotation 3D Over Life',
			'RotationBySpeed': 'Rotation By Speed',
			'FrameOverLife': 'Frame Over Life',
			'WidthOverLength': 'Width Over Length',
			'Gravity': 'Gravity',
			'ApplyForce': 'Apply Force',
			'TurbulenceField': 'Turbulence Field'
		};
		
		const behaviorSelect = new UISelect().setOptions( behaviorTypes );
		const selectRow = new UIRow();
		selectRow.add( behaviorSelect );
		behaviorsContainer.add( selectRow );
		
		behaviorSelect.onChange( function() {
			const behaviorType = this.getValue();
			const object = editor.selected;
			if ( object && object.userData && object.userData.isParticleSystem ) {
				if ( !object.userData.particleSystem.behaviors ) {
					object.userData.particleSystem.behaviors = [];
				}
				const behavior = { type: behaviorType, enabled: true };
				object.userData.particleSystem.behaviors.push( behavior );
				createBehaviorUI( behavior, behaviorsContainer, selectRow );
				selectRow.remove( behaviorSelect );
				update();
			}
		} );
	} );
	behaviorsHeaderRow.add( addBehaviorButton );
	behaviorsContainer.add( behaviorsHeaderRow );
	
	function createBehaviorUI( behavior, container, insertBefore ) {
		const behaviorRow = new UIRow();
		behaviorRow.dom.style.marginBottom = '4px';
		behaviorRow.dom.style.padding = '4px';
		behaviorRow.dom.style.backgroundColor = 'rgba(0,0,0,0.1)';
		behaviorRow.dom.style.borderRadius = '2px';
		
		const behaviorName = new UIText( behavior.type );
		behaviorName.setWidth( '140px' );
		behaviorRow.add( behaviorName );
		
		const removeButton = new UIButton( '×' ).setWidth( '24px' ).setHeight( '24px' );
		removeButton.onClick( function() {
			const object = editor.selected;
			if ( object && object.userData && object.userData.isParticleSystem ) {
				const behaviors = object.userData.particleSystem.behaviors;
				if ( behaviors ) {
					const index = behaviors.indexOf( behavior );
					if ( index !== -1 ) {
						behaviors.splice( index, 1 );
					}
				}
				container.remove( behaviorRow );
				update();
			}
		} );
		behaviorRow.add( removeButton );
		
		if ( behavior.type === 'Gravity' ) {
			if ( !behavior.gravityX ) behavior.gravityX = 0;
			if ( !behavior.gravityY ) behavior.gravityY = -9.81;
			if ( !behavior.gravityZ ) behavior.gravityZ = 0;
			
			const gravityX = new UINumber( behavior.gravityX ).setRange( -10, 10 ).setPrecision( 2 ).setWidth( '50px' );
			const gravityY = new UINumber( behavior.gravityY ).setRange( -10, 10 ).setPrecision( 2 ).setWidth( '50px' );
			const gravityZ = new UINumber( behavior.gravityZ ).setRange( -10, 10 ).setPrecision( 2 ).setWidth( '50px' );
			
			gravityX.onChange( function() {
				behavior.gravityX = this.getValue();
				update();
			} );
			gravityY.onChange( function() {
				behavior.gravityY = this.getValue();
				update();
			} );
			gravityZ.onChange( function() {
				behavior.gravityZ = this.getValue();
				update();
			} );
			
			behaviorRow.add( new UIText( 'X' ).setClass( 'Label vector-label' ) );
			behaviorRow.add( gravityX );
			behaviorRow.add( new UIText( 'Y' ).setClass( 'Label vector-label' ) );
			behaviorRow.add( gravityY );
			behaviorRow.add( new UIText( 'Z' ).setClass( 'Label vector-label' ) );
			behaviorRow.add( gravityZ );
		}
		
		if ( insertBefore ) {
			container.dom.insertBefore( behaviorRow.dom, insertBefore.dom );
		} else {
			container.add( behaviorRow );
		}
	}
	
	particlePanel.add( behaviorsContainer );
	*/
	// End of old particle system UI

	const objectIntensityRow = new UIRow();
	const objectIntensity = new UINumber().onChange( update );
	objectIntensityRow.add( new UIText( strings.getKey( 'sidebar/object/intensity' ) || 'Intensity' ).setClass( 'Label' ) );
	objectIntensityRow.add( objectIntensity );
	lightPanel.add( objectIntensityRow );

	const objectColorRow = new UIRow();
	const objectColor = new UIColor().onInput( update );
	objectColorRow.add( new UIText( strings.getKey( 'sidebar/object/color' ) || 'Color' ).setClass( 'Label' ) );
	objectColorRow.add( objectColor );
	lightPanel.add( objectColorRow );

	const objectGroundColorRow = new UIRow();
	const objectGroundColor = new UIColor().onInput( update );
	objectGroundColorRow.add( new UIText( strings.getKey( 'sidebar/object/groundcolor' ) || 'Ground Color' ).setClass( 'Label' ) );
	objectGroundColorRow.add( objectGroundColor );
	lightPanel.add( objectGroundColorRow );

	const objectDistanceRow = new UIRow();
	const objectDistance = new UINumber().setRange( 0, Infinity ).onChange( update );
	objectDistanceRow.add( new UIText( strings.getKey( 'sidebar/object/distance' ) || 'Distance' ).setClass( 'Label' ) );
	objectDistanceRow.add( objectDistance );
	lightPanel.add( objectDistanceRow );

	const objectAngleRow = new UIRow();
	const objectAngle = new UINumber().setPrecision( 3 ).setRange( 0, Math.PI / 2 ).onChange( update );
	objectAngleRow.add( new UIText( strings.getKey( 'sidebar/object/angle' ) || 'Angle' ).setClass( 'Label' ) );
	objectAngleRow.add( objectAngle );
	lightPanel.add( objectAngleRow );

	const objectPenumbraRow = new UIRow();
	const objectPenumbra = new UINumber().setRange( 0, 1 ).onChange( update );
	objectPenumbraRow.add( new UIText( strings.getKey( 'sidebar/object/penumbra' ) || 'Penumbra' ).setClass( 'Label' ) );
	objectPenumbraRow.add( objectPenumbra );
	lightPanel.add( objectPenumbraRow );

	const objectDecayRow = new UIRow();
	const objectDecay = new UINumber().setRange( 0, Infinity ).onChange( update );
	objectDecayRow.add( new UIText( strings.getKey( 'sidebar/object/decay' ) || 'Decay' ).setClass( 'Label' ) );
	objectDecayRow.add( objectDecay );
	lightPanel.add( objectDecayRow );

	const lightCastShadowRow = new UIRow();
	const lightCastShadow = new UICheckbox( false ).onChange( update );
	lightCastShadowRow.add( new UIText( 'Cast Shadow' ).setClass( 'Label' ) );
	lightCastShadowRow.add( lightCastShadow );
	lightPanel.add( lightCastShadowRow );

	const objectWidthRow = new UIRow();
	const objectWidth = new UINumber().setRange( 0, Infinity ).onChange( update );
	objectWidthRow.add( new UIText( 'Width' ).setClass( 'Label' ) );
	objectWidthRow.add( objectWidth );
	lightPanel.add( objectWidthRow );

	const objectHeightRow = new UIRow();
	const objectHeight = new UINumber().setRange( 0, Infinity ).onChange( update );
	objectHeightRow.add( new UIText( 'Height' ).setClass( 'Label' ) );
	objectHeightRow.add( objectHeight );
	lightPanel.add( objectHeightRow );

	const objectPowerRow = new UIRow();
	const objectPower = new UINumber().setRange( 0, Infinity ).onChange( update );
	objectPowerRow.add( new UIText( 'Power' ).setClass( 'Label' ) );
	objectPowerRow.add( objectPower );
	lightPanel.add( objectPowerRow );

	const objectShadowRow = new UIRow();
	objectShadowRow.add( new UIText( strings.getKey( 'sidebar/object/shadow' ) || 'Shadow' ).setClass( 'Label' ) );
	const objectCastShadow = new UIBoolean( false, strings.getKey( 'sidebar/object/cast' ) || 'Cast' ).onChange( update );
	objectShadowRow.add( objectCastShadow );
	const objectReceiveShadow = new UIBoolean( false, strings.getKey( 'sidebar/object/receive' ) || 'Receive' ).onChange( update );
	objectShadowRow.add( objectReceiveShadow );
	meshPanel.add( objectShadowRow );

	const objectShadowIntensityRow = new UIRow();
	objectShadowIntensityRow.add( new UIText( strings.getKey( 'sidebar/object/shadowIntensity' ) || 'Shadow Intensity' ).setClass( 'Label' ) );
	const objectShadowIntensity = new UINumber( 0 ).setRange( 0, 1 ).onChange( update );
	objectShadowIntensityRow.add( objectShadowIntensity );
	meshPanel.add( objectShadowIntensityRow );

	const objectShadowBiasRow = new UIRow();
	objectShadowBiasRow.add( new UIText( strings.getKey( 'sidebar/object/shadowBias' ) || 'Shadow Bias' ).setClass( 'Label' ) );
	const objectShadowBias = new UINumber( 0 ).setPrecision( 5 ).setStep( 0.0001 ).setNudge( 0.00001 ).onChange( update );
	objectShadowBiasRow.add( objectShadowBias );
	meshPanel.add( objectShadowBiasRow );

	const objectShadowNormalBiasRow = new UIRow();
	objectShadowNormalBiasRow.add( new UIText( strings.getKey( 'sidebar/object/shadowNormalBias' ) || 'Shadow Normal Bias' ).setClass( 'Label' ) );
	const objectShadowNormalBias = new UINumber( 0 ).onChange( update );
	objectShadowNormalBiasRow.add( objectShadowNormalBias );
	meshPanel.add( objectShadowNormalBiasRow );

	const objectShadowRadiusRow = new UIRow();
	objectShadowRadiusRow.add( new UIText( strings.getKey( 'sidebar/object/shadowRadius' ) || 'Shadow Radius' ).setClass( 'Label' ) );
	const objectShadowRadius = new UINumber( 1 ).onChange( update );
	objectShadowRadiusRow.add( objectShadowRadius );
	meshPanel.add( objectShadowRadiusRow );

	const objectShadowMapSizeRow = new UIRow();
	const objectShadowMapSize = new UINumber( 512 ).setWidth( '50px' ).setRange( 256, 4096 ).setStep( 256 ).onChange( update );
	objectShadowMapSizeRow.add( new UIText( 'Map Size' ).setClass( 'Label' ) );
	objectShadowMapSizeRow.add( objectShadowMapSize );
	lightPanel.add( objectShadowMapSizeRow );

	const objectShadowCameraNearFarRow = new UIRow();
	const objectShadowCameraNear = new UINumber( 0.5 ).setPrecision( 3 ).setWidth( '50px' ).setRange( 0.1, 100 ).onChange( update );
	const objectShadowCameraFar = new UINumber( 500 ).setPrecision( 3 ).setWidth( '50px' ).setRange( 1, 10000 ).onChange( update );
	const shadowCameraNearFarInputsContainer = new UIDiv();
	shadowCameraNearFarInputsContainer.addClass( 'input-group' );
	shadowCameraNearFarInputsContainer.add( objectShadowCameraNear, objectShadowCameraFar );
	objectShadowCameraNearFarRow.add( new UIText( 'Camera Near / Far' ).setClass( 'Label' ) );
	objectShadowCameraNearFarRow.add( shadowCameraNearFarInputsContainer );
	lightPanel.add( objectShadowCameraNearFarRow );

	const objectShadowCameraAreaRow = new UIRow();
	const objectShadowCameraArea = new UINumber( 5 ).setPrecision( 3 ).setWidth( '50px' ).setRange( 0.1, 1000 ).onChange( update );
	objectShadowCameraAreaRow.add( new UIText( 'Shadow Area' ).setClass( 'Label' ) );
	objectShadowCameraAreaRow.add( objectShadowCameraArea );
	lightPanel.add( objectShadowCameraAreaRow );

	const objectShadowCameraFovRow = new UIRow();
	const objectShadowCameraFov = new UINumber( 50 ).setPrecision( 3 ).setWidth( '50px' ).setRange( 10, 179 ).onChange( update );
	objectShadowCameraFovRow.add( new UIText( 'Camera FOV' ).setClass( 'Label' ) );
	objectShadowCameraFovRow.add( objectShadowCameraFov );
	lightPanel.add( objectShadowCameraFovRow );

	const objectVisibleRow = new UIRow();
	const objectVisible = new UICheckbox().onChange( update );
	objectVisibleRow.add( new UIText( strings.getKey( 'sidebar/object/visible' ) ).setClass( 'Label' ) );
	objectVisibleRow.add( objectVisible );
	entityPanel.add( objectVisibleRow );

	const objectFrustumCulledRow = new UIRow();
	const objectFrustumCulled = new UICheckbox().onChange( update );
	objectFrustumCulledRow.add( new UIText( strings.getKey( 'sidebar/object/frustumcull' ) || 'Frustum Culled' ).setClass( 'Label' ) );
	objectFrustumCulledRow.add( objectFrustumCulled );
	meshPanel.add( objectFrustumCulledRow );

	const objectRenderOrderRow = new UIRow();
	const objectRenderOrder = new UIInteger().setWidth( '50px' ).onChange( update );
	objectRenderOrderRow.add( new UIText( strings.getKey( 'sidebar/object/renderorder' ) || 'Render Order' ).setClass( 'Label' ) );
	objectRenderOrderRow.add( objectRenderOrder );
	meshPanel.add( objectRenderOrderRow );

	const exportJson = new UIButton( strings.getKey( 'sidebar/object/export' ) );
	exportJson.setMarginLeft( '120px' );
	exportJson.onClick( function () {
		const object = editor.selected;
		let output = object.toJSON();
		try {
			output = JSON.stringify( output, null, '\t' );
			output = output.replace( /[\n\t]+([\d\.e\-\[\]]+)/g, '$1' );
		} catch ( error ) {
			output = JSON.stringify( output );
		}
		editor.utils.save( new Blob( [ output ] ), `${ objectName.getValue() || 'object' }.json` );
	} );
	entityPanel.add( exportJson );

	entityPanel.add( new SidebarObjectAnimation( editor ) );

	//

	let updateTimeout = null;

	function updateTransformImmediate() {

		const object = editor.selected;

		if ( object !== null ) {

			const newPosition = new THREE.Vector3( objectPositionX.getValue(), objectPositionY.getValue(), objectPositionZ.getValue() );
			object.position.copy( newPosition );

			const newRotation = new THREE.Euler( objectRotationX.getValue() * THREE.MathUtils.DEG2RAD, objectRotationY.getValue() * THREE.MathUtils.DEG2RAD, objectRotationZ.getValue() * THREE.MathUtils.DEG2RAD );
			object.rotation.copy( newRotation );

			const newScale = new THREE.Vector3( objectScaleX.getValue(), objectScaleY.getValue(), objectScaleZ.getValue() );
			object.scale.copy( newScale );

			signals.objectChanged.dispatch( object );

		}

	}

	function update() {

		if ( updateTimeout !== null ) {

			clearTimeout( updateTimeout );

		}

		updateTimeout = setTimeout( function () {

			updateImmediate();

		}, 150 );

	}

	function updateImmediate() {

		const object = editor.selected;

		if ( object !== null ) {

			const newPosition = new THREE.Vector3( objectPositionX.getValue(), objectPositionY.getValue(), objectPositionZ.getValue() );
			if ( object.position.distanceTo( newPosition ) >= 0.01 ) {

				editor.execute( new SetPositionCommand( editor, object, newPosition ) );

			}

			const newRotation = new THREE.Euler( objectRotationX.getValue() * THREE.MathUtils.DEG2RAD, objectRotationY.getValue() * THREE.MathUtils.DEG2RAD, objectRotationZ.getValue() * THREE.MathUtils.DEG2RAD );
			if ( new THREE.Vector3().setFromEuler( object.rotation ).distanceTo( new THREE.Vector3().setFromEuler( newRotation ) ) >= 0.01 ) {

				editor.execute( new SetRotationCommand( editor, object, newRotation ) );

			}

			const newScale = new THREE.Vector3( objectScaleX.getValue(), objectScaleY.getValue(), objectScaleZ.getValue() );
			if ( object.scale.distanceTo( newScale ) >= 0.01 ) {

				editor.execute( new SetScaleCommand( editor, object, newScale ) );

			}

			if ( object.fov !== undefined && Math.abs( object.fov - objectFov.getValue() ) >= 0.01 ) {

				editor.execute( new SetValueCommand( editor, object, 'fov', objectFov.getValue() ) );
				object.updateProjectionMatrix();

			}

			if ( object.left !== undefined && Math.abs( object.left - objectLeft.getValue() ) >= 0.01 ) {

				editor.execute( new SetValueCommand( editor, object, 'left', objectLeft.getValue() ) );
				object.updateProjectionMatrix();

			}

			if ( object.right !== undefined && Math.abs( object.right - objectRight.getValue() ) >= 0.01 ) {

				editor.execute( new SetValueCommand( editor, object, 'right', objectRight.getValue() ) );
				object.updateProjectionMatrix();

			}

			if ( object.top !== undefined && Math.abs( object.top - objectTop.getValue() ) >= 0.01 ) {

				editor.execute( new SetValueCommand( editor, object, 'top', objectTop.getValue() ) );
				object.updateProjectionMatrix();

			}

			if ( object.bottom !== undefined && Math.abs( object.bottom - objectBottom.getValue() ) >= 0.01 ) {

				editor.execute( new SetValueCommand( editor, object, 'bottom', objectBottom.getValue() ) );
				object.updateProjectionMatrix();

			}

			if ( object.near !== undefined && Math.abs( object.near - objectNear.getValue() ) >= 0.01 ) {

				editor.execute( new SetValueCommand( editor, object, 'near', objectNear.getValue() ) );
				if ( object.isOrthographicCamera ) {

					object.updateProjectionMatrix();

				}

			}

			if ( object.far !== undefined && Math.abs( object.far - objectFar.getValue() ) >= 0.01 ) {

				editor.execute( new SetValueCommand( editor, object, 'far', objectFar.getValue() ) );
				if ( object.isOrthographicCamera ) {

					object.updateProjectionMatrix();

				}

			}

			if ( object.intensity !== undefined && Math.abs( object.intensity - objectIntensity.getValue() ) >= 0.01 ) {

				editor.execute( new SetValueCommand( editor, object, 'intensity', objectIntensity.getValue() ) );

			}

			if ( object.color !== undefined && object.color.getHex() !== objectColor.getHexValue() ) {

				editor.execute( new SetColorCommand( editor, object, 'color', objectColor.getHexValue() ) );

			}

			if ( object.groundColor !== undefined && object.groundColor.getHex() !== objectGroundColor.getHexValue() ) {

				editor.execute( new SetColorCommand( editor, object, 'groundColor', objectGroundColor.getHexValue() ) );

			}

			if ( object.distance !== undefined && Math.abs( object.distance - objectDistance.getValue() ) >= 0.01 ) {

				editor.execute( new SetValueCommand( editor, object, 'distance', objectDistance.getValue() ) );

			}

			if ( object.angle !== undefined && Math.abs( object.angle - objectAngle.getValue() ) >= 0.01 ) {

				editor.execute( new SetValueCommand( editor, object, 'angle', objectAngle.getValue() ) );

			}

			if ( object.penumbra !== undefined && Math.abs( object.penumbra - objectPenumbra.getValue() ) >= 0.01 ) {

				editor.execute( new SetValueCommand( editor, object, 'penumbra', objectPenumbra.getValue() ) );

			}

			if ( object.decay !== undefined && Math.abs( object.decay - objectDecay.getValue() ) >= 0.01 ) {

				editor.execute( new SetValueCommand( editor, object, 'decay', objectDecay.getValue() ) );

			}

			if ( ( object.isDirectionalLight || object.isSpotLight || object.isPointLight ) && 
				object.castShadow !== undefined && object.castShadow !== lightCastShadow.getValue() ) {

				editor.execute( new SetValueCommand( editor, object, 'castShadow', lightCastShadow.getValue() ) );

			}

			if ( object.width !== undefined && Math.abs( object.width - objectWidth.getValue() ) >= 0.01 ) {

				editor.execute( new SetValueCommand( editor, object, 'width', objectWidth.getValue() ) );

			}

			if ( object.height !== undefined && Math.abs( object.height - objectHeight.getValue() ) >= 0.01 ) {

				editor.execute( new SetValueCommand( editor, object, 'height', objectHeight.getValue() ) );

			}

			if ( object.power !== undefined && Math.abs( object.power - objectPower.getValue() ) >= 0.01 ) {

				editor.execute( new SetValueCommand( editor, object, 'power', objectPower.getValue() ) );

			}

			if ( object.visible !== objectVisible.getValue() ) {

				editor.execute( new SetValueCommand( editor, object, 'visible', objectVisible.getValue() ) );

			}

			if ( object.frustumCulled !== objectFrustumCulled.getValue() ) {

				editor.execute( new SetValueCommand( editor, object, 'frustumCulled', objectFrustumCulled.getValue() ) );

			}

			if ( object.renderOrder !== objectRenderOrder.getValue() ) {

				editor.execute( new SetValueCommand( editor, object, 'renderOrder', objectRenderOrder.getValue() ) );

			}

			/* Old particle system update code removed - now handled by Sidebar.ParticleSystem.js
			if ( object.userData && object.userData.isParticleSystem ) {

				if ( !object.userData.particleSystem ) {
					object.userData.particleSystem = {};
				}

				const particleData = object.userData.particleSystem;
				let changed = false;

				if ( particleData.duration === undefined || Math.abs( particleData.duration - particleDuration.getValue() ) >= 0.01 ) {
					particleData.duration = particleDuration.getValue();
					changed = true;
				}

				if ( particleData.looping === undefined || particleData.looping !== particleLooping.getValue() ) {
					particleData.looping = particleLooping.getValue();
					changed = true;
				}

				if ( particleData.prewarm === undefined || particleData.prewarm !== particlePrewarm.getValue() ) {
					particleData.prewarm = particlePrewarm.getValue();
					changed = true;
				}

				if ( particleData.autoDestroy === undefined || particleData.autoDestroy !== particleAutoDestroy.getValue() ) {
					particleData.autoDestroy = particleAutoDestroy.getValue();
					changed = true;
				}

				if ( particleData.maxParticle === undefined || particleData.maxParticle !== particleMaxParticle.getValue() ) {
					particleData.maxParticle = particleMaxParticle.getValue();
					changed = true;
				}

				if ( particleData.emissionRate === undefined || Math.abs( particleData.emissionRate - particleEmissionRate.getValue() ) >= 0.01 ) {
					particleData.emissionRate = particleEmissionRate.getValue();
					changed = true;
				}

				if ( particleData.emissionOverDistance === undefined || Math.abs( particleData.emissionOverDistance - particleEmissionOverDistance.getValue() ) >= 0.01 ) {
					particleData.emissionOverDistance = particleEmissionOverDistance.getValue();
					changed = true;
				}

				if ( particleData.startLifeMin === undefined || Math.abs( particleData.startLifeMin - particleStartLifeMin.getValue() ) >= 0.01 ) {
					particleData.startLifeMin = particleStartLifeMin.getValue();
					changed = true;
				}

				if ( particleData.startLifeMax === undefined || Math.abs( particleData.startLifeMax - particleStartLifeMax.getValue() ) >= 0.01 ) {
					particleData.startLifeMax = particleStartLifeMax.getValue();
					changed = true;
				}

				if ( particleData.startSpeedMin === undefined || Math.abs( particleData.startSpeedMin - particleStartSpeedMin.getValue() ) >= 0.01 ) {
					particleData.startSpeedMin = particleStartSpeedMin.getValue();
					changed = true;
				}

				if ( particleData.startSpeedMax === undefined || Math.abs( particleData.startSpeedMax - particleStartSpeedMax.getValue() ) >= 0.01 ) {
					particleData.startSpeedMax = particleStartSpeedMax.getValue();
					changed = true;
				}

				if ( particleData.startRotationMin === undefined || Math.abs( particleData.startRotationMin - particleStartRotationMin.getValue() ) >= 0.01 ) {
					particleData.startRotationMin = particleStartRotationMin.getValue();
					changed = true;
				}

				if ( particleData.startRotationMax === undefined || Math.abs( particleData.startRotationMax - particleStartRotationMax.getValue() ) >= 0.01 ) {
					particleData.startRotationMax = particleStartRotationMax.getValue();
					changed = true;
				}

				if ( particleData.startSizeMin === undefined || Math.abs( particleData.startSizeMin - particleStartSizeMin.getValue() ) >= 0.01 ) {
					particleData.startSizeMin = particleStartSizeMin.getValue();
					changed = true;
				}

				if ( particleData.startSizeMax === undefined || Math.abs( particleData.startSizeMax - particleStartSizeMax.getValue() ) >= 0.01 ) {
					particleData.startSizeMax = particleStartSizeMax.getValue();
					changed = true;
				}

				const startColor = new THREE.Color( particleStartColor.getHexValue() );
				if ( particleData.startColorR === undefined || Math.abs( particleData.startColorR - startColor.r ) >= 0.01 ||
					particleData.startColorG === undefined || Math.abs( particleData.startColorG - startColor.g ) >= 0.01 ||
					particleData.startColorB === undefined || Math.abs( particleData.startColorB - startColor.b ) >= 0.01 ) {
					particleData.startColorR = startColor.r;
					particleData.startColorG = startColor.g;
					particleData.startColorB = startColor.b;
					particleData.startColorA = particleData.startColorA !== undefined ? particleData.startColorA : 1;
					changed = true;
				}

				const materialColor = new THREE.Color( particleMaterialColor.getHexValue() );
				if ( particleData.materialColor === undefined || particleData.materialColor !== materialColor.getHex() ) {
					particleData.materialColor = materialColor.getHex();
					changed = true;
				}

				const endColor = new THREE.Color( particleEndColor.getHexValue() );
				if ( particleData.endColorR === undefined || Math.abs( particleData.endColorR - endColor.r ) >= 0.01 ||
					particleData.endColorG === undefined || Math.abs( particleData.endColorG - endColor.g ) >= 0.01 ||
					particleData.endColorB === undefined || Math.abs( particleData.endColorB - endColor.b ) >= 0.01 ) {
					particleData.endColorR = endColor.r;
					particleData.endColorG = endColor.g;
					particleData.endColorB = endColor.b;
					particleData.endColorA = particleData.endColorA !== undefined ? particleData.endColorA : 1;
					changed = true;
				}

				if ( particleData.endSizeMin === undefined || Math.abs( particleData.endSizeMin - particleEndSizeMin.getValue() ) >= 0.01 ) {
					particleData.endSizeMin = particleEndSizeMin.getValue();
					changed = true;
				}

				if ( particleData.endSizeMax === undefined || Math.abs( particleData.endSizeMax - particleEndSizeMax.getValue() ) >= 0.01 ) {
					particleData.endSizeMax = particleEndSizeMax.getValue();
					changed = true;
				}

				if ( particleData.emitterShape === undefined || particleData.emitterShape !== particleEmitterShape.getValue() ) {
					particleData.emitterShape = particleEmitterShape.getValue();
					changed = true;
				}

				if ( particleData.emitterSizeX === undefined || Math.abs( particleData.emitterSizeX - particleEmitterSizeX.getValue() ) >= 0.01 ) {
					particleData.emitterSizeX = particleEmitterSizeX.getValue();
					changed = true;
				}

				if ( particleData.emitterSizeY === undefined || Math.abs( particleData.emitterSizeY - particleEmitterSizeY.getValue() ) >= 0.01 ) {
					particleData.emitterSizeY = particleEmitterSizeY.getValue();
					changed = true;
				}

				if ( particleData.emitterSizeZ === undefined || Math.abs( particleData.emitterSizeZ - particleEmitterSizeZ.getValue() ) >= 0.01 ) {
					particleData.emitterSizeZ = particleEmitterSizeZ.getValue();
					changed = true;
				}

				if ( particleData.directionX === undefined || Math.abs( particleData.directionX - particleDirectionX.getValue() ) >= 0.01 ) {
					particleData.directionX = particleDirectionX.getValue();
					changed = true;
				}

				if ( particleData.directionY === undefined || Math.abs( particleData.directionY - particleDirectionY.getValue() ) >= 0.01 ) {
					particleData.directionY = particleDirectionY.getValue();
					changed = true;
				}

				if ( particleData.directionZ === undefined || Math.abs( particleData.directionZ - particleDirectionZ.getValue() ) >= 0.01 ) {
					particleData.directionZ = particleDirectionZ.getValue();
					changed = true;
				}

				if ( particleData.spreadAngle === undefined || Math.abs( particleData.spreadAngle - particleSpreadAngle.getValue() ) >= 0.01 ) {
					particleData.spreadAngle = particleSpreadAngle.getValue();
					changed = true;
				}

				if ( particleData.worldSpace === undefined || particleData.worldSpace !== particleWorldSpace.getValue() ) {
					particleData.worldSpace = particleWorldSpace.getValue();
					changed = true;
				}

				const renderMode = parseInt( particleRenderMode.getValue() );
				if ( particleData.renderMode === undefined || particleData.renderMode !== renderMode ) {
					particleData.renderMode = renderMode;
					changed = true;
				}

				if ( particleData.uTileCount === undefined || particleData.uTileCount !== particleUTileCount.getValue() ) {
					particleData.uTileCount = particleUTileCount.getValue();
					changed = true;
				}

				if ( particleData.vTileCount === undefined || particleData.vTileCount !== particleVTileCount.getValue() ) {
					particleData.vTileCount = particleVTileCount.getValue();
					changed = true;
				}

				if ( particleData.startTileIndex === undefined || particleData.startTileIndex !== particleStartTileIndex.getValue() ) {
					particleData.startTileIndex = particleStartTileIndex.getValue();
					changed = true;
				}

				if ( changed ) {
					editor.signals.objectChanged.dispatch( object );
				}

			}
			*/
			// End of old particle system update code

			if ( object.castShadow !== undefined && object.castShadow !== objectCastShadow.getValue() ) {

				editor.execute( new SetValueCommand( editor, object, 'castShadow', objectCastShadow.getValue() ) );

			}

			if ( object.receiveShadow !== objectReceiveShadow.getValue() ) {

				if ( object.material !== undefined ) object.material.needsUpdate = true;
				editor.execute( new SetValueCommand( editor, object, 'receiveShadow', objectReceiveShadow.getValue() ) );

			}

			if ( object.shadow !== undefined ) {

				if ( object.shadow.intensity !== objectShadowIntensity.getValue() ) {

					editor.execute( new SetShadowValueCommand( editor, object, 'intensity', objectShadowIntensity.getValue() ) );

				}

				if ( object.shadow.bias !== objectShadowBias.getValue() ) {

					editor.execute( new SetShadowValueCommand( editor, object, 'bias', objectShadowBias.getValue() ) );

				}

				if ( object.shadow.normalBias !== objectShadowNormalBias.getValue() ) {

					editor.execute( new SetShadowValueCommand( editor, object, 'normalBias', objectShadowNormalBias.getValue() ) );

				}

				if ( object.shadow.radius !== objectShadowRadius.getValue() ) {

					editor.execute( new SetShadowValueCommand( editor, object, 'radius', objectShadowRadius.getValue() ) );

				}

				
				if ( object.shadow.mapSize !== undefined ) {

					const mapSize = objectShadowMapSize.getValue();
					if ( object.shadow.mapSize.width !== mapSize || object.shadow.mapSize.height !== mapSize ) {

						editor.execute( new SetShadowMapSizeCommand( editor, object, mapSize ) );

					}

				}

				
				if ( object.shadow.camera !== undefined ) {

					if ( object.shadow.camera.near !== undefined && Math.abs( object.shadow.camera.near - objectShadowCameraNear.getValue() ) >= 0.01 ) {

						editor.execute( new SetShadowCameraCommand( editor, object, 'near', objectShadowCameraNear.getValue() ) );

					}

					if ( object.shadow.camera.far !== undefined && Math.abs( object.shadow.camera.far - objectShadowCameraFar.getValue() ) >= 0.01 ) {

						editor.execute( new SetShadowCameraCommand( editor, object, 'far', objectShadowCameraFar.getValue() ) );

					}

					
					if ( object.shadow.camera.left !== undefined && object.shadow.camera.right !== undefined ) {

						const area = objectShadowCameraArea.getValue();
						const currentArea = Math.max( Math.abs( object.shadow.camera.right - object.shadow.camera.left ), Math.abs( object.shadow.camera.top - object.shadow.camera.bottom ) ) / 2;

						if ( Math.abs( currentArea - area ) >= 0.01 ) {

							editor.execute( new SetShadowCameraCommand( editor, object, 'area', area ) );

						}

					}

					
					if ( object.shadow.camera.fov !== undefined && Math.abs( object.shadow.camera.fov - objectShadowCameraFov.getValue() ) >= 0.01 ) {

						editor.execute( new SetShadowCameraCommand( editor, object, 'fov', objectShadowCameraFov.getValue() ) );

					}

				}

			}

		}

	}

	function updateRows( object ) {

		const isMesh = object.isMesh;
		const isLight = object.isLight;
		const isCamera = object.isCamera || object.isPerspectiveCamera || object.isOrthographicCamera;
		const isParticleSystem = object.userData && object.userData.isParticleSystem;
		const isScene = object.isScene;

		
		meshPanel.setHidden( ! isMesh );
		lightPanel.setHidden( ! isLight );
		cameraPanel.setHidden( ! isCamera );

		const hasSelectedAsset = window.selectedAsset !== null && window.selectedAsset !== undefined;
		assetContent.setDisplay( hasSelectedAsset ? 'block' : 'none' );
		if ( hasSelectedAsset ) {
			entityPanel.setHidden( true );
			meshPanel.setHidden( true );
			lightPanel.setHidden( true );
			cameraPanel.setHidden( true );
			particlePanel.setHidden( true );
			scenePanel.setHidden( true );
		} else {
			entityPanel.setHidden( false );
		}
		particlePanel.setHidden( ! isParticleSystem || hasSelectedAsset );
		scenePanel.setHidden( ! isScene || hasSelectedAsset );

		if ( isMesh ) {
			geometryPanel.setHidden( ! object.geometry );
			materialPanel.setHidden( ! object.material );
		}

		const properties = {
			'fov': objectFovRow,
			'orthoHeight': objectOrthoHeightRow,
			'near': objectNearFarRow,
			'far': objectNearFarRow,
			'intensity': objectIntensityRow,
			'color': objectColorRow,
			'groundColor': objectGroundColorRow,
			'distance': objectDistanceRow,
			'angle': objectAngleRow,
			'penumbra': objectPenumbraRow,
			'decay': objectDecayRow,
			'castShadow': objectShadowRow,
			'receiveShadow': objectReceiveShadow,
			'shadow': [ objectShadowIntensityRow, objectShadowBiasRow, objectShadowNormalBiasRow, objectShadowRadiusRow ],
			'width': objectWidthRow,
			'height': objectHeightRow,
			'power': objectPowerRow
		};

		objectCameraBoundsRow.setDisplay( 'none' );

		for ( const property in properties ) {
			const uiElement = properties[ property ];
			if ( Array.isArray( uiElement ) === true ) {
				for ( let i = 0; i < uiElement.length; i ++ ) {
					uiElement[ i ].setDisplay( object[ property ] !== undefined ? '' : 'none' );
				}
			} else {
				uiElement.setDisplay( object[ property ] !== undefined ? '' : 'none' );
			}
		}

		if ( isCamera ) {
			if ( object.isPerspectiveCamera ) {
				objectFovRow.setDisplay( '' );
				objectOrthoHeightRow.setDisplay( 'none' );
			} else if ( object.isOrthographicCamera ) {
				objectFovRow.setDisplay( 'none' );
				objectOrthoHeightRow.setDisplay( '' );
			}
		}

		if ( isLight ) {
			objectReceiveShadow.setDisplay( 'none' );
			
			if ( object.isDirectionalLight || object.isSpotLight || object.isPointLight ) {
				lightCastShadowRow.setDisplay( '' );
			} else {
				lightCastShadowRow.setDisplay( 'none' );
			}
			
			if ( object.shadow !== undefined && object.shadow.camera !== undefined ) {
				objectShadowMapSizeRow.setDisplay( '' );
				objectShadowCameraNearFarRow.setDisplay( '' );
				if ( object.isDirectionalLight && object.shadow.camera.left !== undefined ) {
					objectShadowCameraAreaRow.setDisplay( '' );
					objectShadowCameraFovRow.setDisplay( 'none' );
				} else if ( object.isSpotLight && object.shadow.camera.fov !== undefined ) {
					objectShadowCameraAreaRow.setDisplay( 'none' );
					objectShadowCameraFovRow.setDisplay( '' );
				} else {
					objectShadowCameraAreaRow.setDisplay( 'none' );
					objectShadowCameraFovRow.setDisplay( 'none' );
				}
			} else {
				objectShadowMapSizeRow.setDisplay( 'none' );
				objectShadowCameraNearFarRow.setDisplay( 'none' );
				objectShadowCameraAreaRow.setDisplay( 'none' );
				objectShadowCameraFovRow.setDisplay( 'none' );
			}
		} else {
			lightCastShadowRow.setDisplay( 'none' );
			objectShadowMapSizeRow.setDisplay( 'none' );
			objectShadowCameraNearFarRow.setDisplay( 'none' );
			objectShadowCameraAreaRow.setDisplay( 'none' );
			objectShadowCameraFovRow.setDisplay( 'none' );
		}

		if ( isLight ) {
			objectRotationRow.setDisplay( 'none' );
			objectScaleRow.setDisplay( 'none' );
		} else {
			objectRotationRow.setDisplay( '' );
			objectScaleRow.setDisplay( '' );
		}

	}

	

	signals.objectSelected.add( function ( object ) {

		if ( object !== null ) {
			if ( window.selectedAsset ) {
				window.selectedAsset = null;
			}
			panelsContainer.setDisplay( 'block' );

			updateRows( object );
			updateUI( object );

		} else {

			panelsContainer.setDisplay( 'none' );

		}

	} );

	signals.objectChanged.add( function ( object ) {

		if ( object !== editor.selected ) return;

		updateUI( object );

	} );

	signals.refreshSidebarObject3D.add( function ( object ) {

		if ( object !== editor.selected ) return;

		updateUI( object );

	} );

	function updateUI( object ) {

		const isMaterialOnly = object && object.isMaterial && object.material instanceof THREE.Material;
		
		if ( isMaterialOnly ) {
			objectPositionRow.setDisplay( 'none' );
			objectRotationRow.setDisplay( 'none' );
			objectScaleRow.setDisplay( 'none' );
			return;
		}

		const isBatchedRenderer = object.type === 'BatchedRenderer' || object.name === 'BatchedRenderer';
		
		if ( isBatchedRenderer ) {
			objectType.setValue( 'BatchedRenderer (System)' );
			objectName.setValue( object.name );
			objectName.dom.disabled = true;
			objectName.dom.style.opacity = '0.6';
			objectName.dom.style.cursor = 'not-allowed';
			
			let infoRow = entityPanel.dom.querySelector( '.system-entity-info' );
			if ( !infoRow ) {
				infoRow = document.createElement( 'div' );
				infoRow.className = 'system-entity-info';
				infoRow.style.marginTop = '10px';
				infoRow.style.padding = '8px';
				infoRow.style.backgroundColor = '#2a2a2a';
				infoRow.style.border = '1px solid #444';
				infoRow.style.borderRadius = '4px';
				
				const infoText = document.createElement( 'div' );
				infoText.style.fontSize = '11px';
				infoText.style.color = '#aaa';
				infoText.style.lineHeight = '1.4';
				infoText.textContent = 'This is a system-level entity required for particle system rendering. It cannot be removed or modified as it is automatically managed by the editor.';
				infoRow.appendChild( infoText );
				entityPanel.dom.appendChild( infoRow );
			}
			infoRow.style.display = 'block';
			
			objectPositionRow.setDisplay( 'none' );
			objectRotationRow.setDisplay( 'none' );
			objectScaleRow.setDisplay( 'none' );
		} else {
			objectName.dom.disabled = false;
			objectName.dom.style.opacity = '1';
			objectName.dom.style.cursor = '';
			
			const existingInfo = entityPanel.dom.querySelector( '.system-entity-info' );
			if ( existingInfo ) {
				existingInfo.remove();
			}
			
			objectPositionRow.setDisplay( '' );
			objectRotationRow.setDisplay( '' );
			objectScaleRow.setDisplay( '' );
			
			let typeValue = object.type;
			if ( object.type === 'ParticleSystem' || ( object.userData && object.userData.isParticleSystem ) ) {
				typeValue = 'Particles';
			}
			objectType.setValue( typeValue );
			objectName.setValue( object.name );
		}

		if ( object.position && object.position.x !== undefined ) {
			objectPositionX.setValue( object.position.x );
			objectPositionY.setValue( object.position.y );
			objectPositionZ.setValue( object.position.z );
		}

		if ( object.rotation && object.rotation.x !== undefined ) {
			objectRotationX.setValue( object.rotation.x * THREE.MathUtils.RAD2DEG );
			objectRotationY.setValue( object.rotation.y * THREE.MathUtils.RAD2DEG );
			objectRotationZ.setValue( object.rotation.z * THREE.MathUtils.RAD2DEG );
		}

		if ( object.scale && object.scale.x !== undefined ) {
			objectScaleX.setValue( object.scale.x );
			objectScaleY.setValue( object.scale.y );
			objectScaleZ.setValue( object.scale.z );
		}

		if ( object.isPerspectiveCamera || object.isOrthographicCamera ) {
			const cameraType = object.isPerspectiveCamera ? 'PerspectiveCamera' : 'OrthographicCamera';
			objectCameraType.setValue( cameraType );
		}

		if ( object.fov !== undefined ) {

			objectFov.setValue( object.fov );

		}

		if ( object.left !== undefined ) {

			objectLeft.setValue( object.left );

		}

		if ( object.right !== undefined ) {

			objectRight.setValue( object.right );

		}

		if ( object.top !== undefined ) {

			objectTop.setValue( object.top );

		}

		if ( object.bottom !== undefined ) {

			objectBottom.setValue( object.bottom );

		}

		if ( object.isOrthographicCamera ) {

			const orthoHeight = Math.abs( object.top - object.bottom ) / 2;
			objectOrthoHeight.setValue( orthoHeight );

		}

		if ( object.near !== undefined ) {

			objectNear.setValue( object.near );

		}

		if ( object.far !== undefined ) {

			objectFar.setValue( object.far );

		}

		if ( object.intensity !== undefined ) {

			objectIntensity.setValue( object.intensity );

		}

		if ( object.color !== undefined ) {

			objectColor.setHexValue( object.color.getHexString() );

		}

		if ( object.groundColor !== undefined ) {

			objectGroundColor.setHexValue( object.groundColor.getHexString() );

		}

		if ( object.distance !== undefined ) {

			objectDistance.setValue( object.distance );

		}

		if ( object.angle !== undefined ) {

			objectAngle.setValue( object.angle );

		}

		if ( object.penumbra !== undefined ) {

			objectPenumbra.setValue( object.penumbra );

		}

		if ( object.decay !== undefined ) {

			objectDecay.setValue( object.decay );

		}

		if ( ( object.isDirectionalLight || object.isSpotLight || object.isPointLight ) && object.castShadow !== undefined ) {

			lightCastShadow.setValue( object.castShadow );

		}

		if ( object.width !== undefined ) {

			objectWidth.setValue( object.width );

		}

		if ( object.height !== undefined ) {

			objectHeight.setValue( object.height );

		}

		if ( object.power !== undefined ) {

			objectPower.setValue( object.power );

		}

		if ( object.castShadow !== undefined ) {

			objectCastShadow.setValue( object.castShadow );

		}

		if ( object.receiveShadow !== undefined ) {

			objectReceiveShadow.setValue( object.receiveShadow );

		}

		if ( object.shadow !== undefined ) {

			objectShadowIntensity.setValue( object.shadow.intensity );
			objectShadowBias.setValue( object.shadow.bias );
			objectShadowNormalBias.setValue( object.shadow.normalBias );
			objectShadowRadius.setValue( object.shadow.radius );

			
			if ( object.shadow.mapSize !== undefined ) {

				objectShadowMapSize.setValue( object.shadow.mapSize.width );

			}

			
			if ( object.shadow.camera !== undefined ) {

				if ( object.shadow.camera.near !== undefined ) {

					objectShadowCameraNear.setValue( object.shadow.camera.near );

				}

				if ( object.shadow.camera.far !== undefined ) {

					objectShadowCameraFar.setValue( object.shadow.camera.far );

				}

				
				if ( object.shadow.camera.left !== undefined && object.shadow.camera.right !== undefined ) {

					const width = object.shadow.camera.right - object.shadow.camera.left;
					const height = object.shadow.camera.top - object.shadow.camera.bottom;
					const area = Math.max( Math.abs( width ), Math.abs( height ) ) / 2;
					objectShadowCameraArea.setValue( area );

				}

				
				if ( object.shadow.camera.fov !== undefined ) {

					objectShadowCameraFov.setValue( object.shadow.camera.fov );

				}

			}

		}

		objectVisible.setValue( object.visible );
		objectFrustumCulled.setValue( object.frustumCulled );
		objectRenderOrder.setValue( object.renderOrder );

		/* Old particle system UI population code removed - now handled by Sidebar.ParticleSystem.js
		if ( object.userData && object.userData.isParticleSystem ) {

			const particleData = object.userData.particleSystem || {};

			if ( particleData.duration !== undefined ) {
				particleDuration.setValue( particleData.duration );
			}

			if ( particleData.looping !== undefined ) {
				particleLooping.setValue( particleData.looping );
			}

			if ( particleData.prewarm !== undefined ) {
				particlePrewarm.setValue( particleData.prewarm );
			}

			if ( particleData.autoDestroy !== undefined ) {
				particleAutoDestroy.setValue( particleData.autoDestroy );
			}

			if ( particleData.maxParticle !== undefined ) {
				particleMaxParticle.setValue( particleData.maxParticle );
			}

			if ( particleData.emissionRate !== undefined ) {
				particleEmissionRate.setValue( particleData.emissionRate );
			}

			if ( particleData.emissionOverDistance !== undefined ) {
				particleEmissionOverDistance.setValue( particleData.emissionOverDistance );
			}

			if ( particleData.startLifeMin !== undefined ) {
				particleStartLifeMin.setValue( particleData.startLifeMin );
			}

			if ( particleData.startLifeMax !== undefined ) {
				particleStartLifeMax.setValue( particleData.startLifeMax );
			}

			if ( particleData.startSpeedMin !== undefined ) {
				particleStartSpeedMin.setValue( particleData.startSpeedMin );
			}

			if ( particleData.startSpeedMax !== undefined ) {
				particleStartSpeedMax.setValue( particleData.startSpeedMax );
			}

			if ( particleData.startRotationMin !== undefined ) {
				particleStartRotationMin.setValue( particleData.startRotationMin );
			}

			if ( particleData.startRotationMax !== undefined ) {
				particleStartRotationMax.setValue( particleData.startRotationMax );
			}

			if ( particleData.startSizeMin !== undefined ) {
				particleStartSizeMin.setValue( particleData.startSizeMin );
			}

			if ( particleData.startSizeMax !== undefined ) {
				particleStartSizeMax.setValue( particleData.startSizeMax );
			}

			if ( particleData.startColorR !== undefined && particleData.startColorG !== undefined && particleData.startColorB !== undefined ) {
				const color = new THREE.Color( particleData.startColorR, particleData.startColorG, particleData.startColorB );
				particleStartColor.setHexValue( color.getHexString() );
			}

			if ( particleData.materialColor !== undefined ) {
				const color = new THREE.Color( particleData.materialColor );
				particleMaterialColor.setHexValue( color.getHexString() );
			}

			if ( particleData.endColorR !== undefined && particleData.endColorG !== undefined && particleData.endColorB !== undefined ) {
				const color = new THREE.Color( particleData.endColorR, particleData.endColorG, particleData.endColorB );
				particleEndColor.setHexValue( color.getHexString() );
			}

			if ( particleData.endSizeMin !== undefined ) {
				particleEndSizeMin.setValue( particleData.endSizeMin );
			}

			if ( particleData.endSizeMax !== undefined ) {
				particleEndSizeMax.setValue( particleData.endSizeMax );
			}

			if ( particleData.emitterShape !== undefined ) {
				particleEmitterShape.setValue( particleData.emitterShape );
			}

			if ( particleData.emitterSizeX !== undefined ) {
				particleEmitterSizeX.setValue( particleData.emitterSizeX );
			}

			if ( particleData.emitterSizeY !== undefined ) {
				particleEmitterSizeY.setValue( particleData.emitterSizeY );
			}

			if ( particleData.emitterSizeZ !== undefined ) {
				particleEmitterSizeZ.setValue( particleData.emitterSizeZ );
			}

			if ( particleData.directionX !== undefined ) {
				particleDirectionX.setValue( particleData.directionX );
			}

			if ( particleData.directionY !== undefined ) {
				particleDirectionY.setValue( particleData.directionY );
			}

			if ( particleData.directionZ !== undefined ) {
				particleDirectionZ.setValue( particleData.directionZ );
			}

			if ( particleData.spreadAngle !== undefined ) {
				particleSpreadAngle.setValue( particleData.spreadAngle );
			}

			if ( particleData.worldSpace !== undefined ) {
				particleWorldSpace.setValue( particleData.worldSpace );
			}

			if ( particleData.renderMode !== undefined ) {
				particleRenderMode.setValue( String( particleData.renderMode ) );
			}

			if ( particleData.uTileCount !== undefined ) {
				particleUTileCount.setValue( particleData.uTileCount );
			}

			if ( particleData.vTileCount !== undefined ) {
				particleVTileCount.setValue( particleData.vTileCount );
			}

			if ( particleData.startTileIndex !== undefined ) {
				particleStartTileIndex.setValue( particleData.startTileIndex );
			}

			behaviorsContainer.clear();
			behaviorsContainer.add( behaviorsHeaderRow );
			if ( particleData.behaviors && Array.isArray( particleData.behaviors ) ) {
				particleData.behaviors.forEach( function( behavior ) {
					createBehaviorUI( behavior, behaviorsContainer, null );
				} );
			}

		}
		*/
		// End of old particle system UI population code

	}

	function checkAssetSelection() {
		const asset = window.selectedAsset;
		const hasSelectedAsset = asset !== null && asset !== undefined;
		assetContent.setDisplay( hasSelectedAsset ? 'block' : 'none' );
		
		if ( hasSelectedAsset ) {
			entityPanel.setHidden( true );
			meshPanel.setHidden( true );
			lightPanel.setHidden( true );
			cameraPanel.setHidden( true );
			particlePanel.setHidden( true );
			scenePanel.setHidden( true );
			panelsContainer.setDisplay( 'block' );
		} else {
			// No asset selected: show entity panel (mesh/light/camera visibility is set in updateRows when object is selected)
			entityPanel.setHidden( false );
		}
	}

	setInterval( checkAssetSelection, 100 );

	return panelsContainer;

}

export { SidebarObject };
