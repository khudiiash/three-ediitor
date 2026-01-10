import * as THREE from 'three';

import { UIPanel, UIRow, UIInput, UIButton, UIColor, UICheckbox, UIInteger, UITextArea, UIText, UINumber, UISelect } from './libs/ui.js';
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

function SidebarObject( editor ) {

	const strings = editor.strings;

	const signals = editor.signals;

	const entityPanel = new UICollapsiblePanel( 'Entity' );
	const meshPanel = new UICollapsiblePanel( 'Mesh' );
	const lightPanel = new UICollapsiblePanel( 'Light' );
	const cameraPanel = new UICollapsiblePanel( 'Camera' );

	const geometryPanel = new UICollapsiblePanel( 'Geometry' );
	const materialPanel = new UICollapsiblePanel( 'Material' );

	const geometryContent = new SidebarGeometry( editor );
	const materialContent = new SidebarMaterial( editor );

	geometryPanel.add( geometryContent );
	materialPanel.add( materialContent );

	geometryPanel.collapse();
	materialPanel.collapse();

	meshPanel.add( geometryPanel );
	meshPanel.add( materialPanel );

	entityPanel.collapse();
	meshPanel.collapse();
	lightPanel.collapse();
	cameraPanel.collapse();

	const panelsContainer = new UIPanel();
	panelsContainer.add( entityPanel );
	panelsContainer.add( meshPanel );
	panelsContainer.add( lightPanel );
	panelsContainer.add( cameraPanel );

	const objectTypeRow = new UIRow();
	const objectType = new UIText();
	objectTypeRow.add( new UIText( strings.getKey( 'sidebar/object/type' ) || 'Type' ).setClass( 'Label' ) );
	objectTypeRow.add( objectType );
	entityPanel.add( objectTypeRow );

	const objectNameRow = new UIRow();
	const objectName = new UIInput().setWidth( '150px' ).setFontSize( '12px' ).onChange( function () {
		editor.execute( new SetValueCommand( editor, editor.selected, 'name', objectName.getValue() ) );
	} );
	objectNameRow.add( new UIText( strings.getKey( 'sidebar/object/name' ) || 'Name' ).setClass( 'Label' ) );
	objectNameRow.add( objectName );
	entityPanel.add( objectNameRow );

	const objectPositionRow = new UIRow();
	const objectPositionX = new UINumber().setPrecision( 2 ).setWidth( '50px' ).setCtrlStep( 1 ).setCtrlNudge( 1 ).onChange( update );
	const objectPositionY = new UINumber().setPrecision( 2 ).setWidth( '50px' ).setCtrlStep( 1 ).setCtrlNudge( 1 ).onChange( update );
	const objectPositionZ = new UINumber().setPrecision( 2 ).setWidth( '50px' ).setCtrlStep( 1 ).setCtrlNudge( 1 ).onChange( update );
	objectPositionRow.add( new UIText( strings.getKey( 'sidebar/object/position' ) || 'Position' ).setClass( 'Label' ) );
	objectPositionRow.add( objectPositionX, objectPositionY, objectPositionZ );
	entityPanel.add( objectPositionRow );

	const objectRotationRow = new UIRow();
	const objectRotationX = new UIInteger().setStep( 1 ).setNudge( 1 ).setCtrlStep( 45 ).setCtrlNudge( 45 ).setUnit( '°' ).setWidth( '50px' ).onChange( update );
	const objectRotationY = new UIInteger().setStep( 1 ).setNudge( 1 ).setCtrlStep( 45 ).setCtrlNudge( 45 ).setUnit( '°' ).setWidth( '50px' ).onChange( update );
	const objectRotationZ = new UIInteger().setStep( 1 ).setNudge( 1 ).setCtrlStep( 45 ).setCtrlNudge( 45 ).setUnit( '°' ).setWidth( '50px' ).onChange( update );
	objectRotationRow.add( new UIText( strings.getKey( 'sidebar/object/rotation' ) || 'Rotation' ).setClass( 'Label' ) );
	objectRotationRow.add( objectRotationX, objectRotationY, objectRotationZ );
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
		update();
	} );
	const objectScaleY = new UINumber( 1 ).setPrecision( 2 ).setWidth( '50px' ).setCtrlStep( 1 ).setCtrlNudge( 1 ).onChange( function () {
		if ( scaleLocked ) {
			const value = this.getValue();
			objectScaleX.setValue( value );
			objectScaleZ.setValue( value );
		}
		update();
	} );
	const objectScaleZ = new UINumber( 1 ).setPrecision( 2 ).setWidth( '50px' ).setCtrlStep( 1 ).setCtrlNudge( 1 ).onChange( function () {
		if ( scaleLocked ) {
			const value = this.getValue();
			objectScaleX.setValue( value );
			objectScaleY.setValue( value );
		}
		update();
	} );
	objectScaleRow.add( new UIText( strings.getKey( 'sidebar/object/scale' ) || 'Scale' ).setClass( 'Label' ) );
	objectScaleRow.add( scaleLockCheckbox );
	objectScaleRow.add( objectScaleX, objectScaleY, objectScaleZ );
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

	const objectLeftRow = new UIRow();
	const objectLeft = new UINumber().onChange( update );
	objectLeftRow.add( new UIText( strings.getKey( 'sidebar/object/left' ) ).setClass( 'Label' ) );
	objectLeftRow.add( objectLeft );
	cameraPanel.add( objectLeftRow );
	objectLeftRow.setDisplay( 'none' );

	const objectRightRow = new UIRow();
	const objectRight = new UINumber().onChange( update );
	objectRightRow.add( new UIText( strings.getKey( 'sidebar/object/right' ) ).setClass( 'Label' ) );
	objectRightRow.add( objectRight );
	cameraPanel.add( objectRightRow );
	objectRightRow.setDisplay( 'none' );

	const objectTopRow = new UIRow();
	const objectTop = new UINumber().onChange( update );
	objectTopRow.add( new UIText( strings.getKey( 'sidebar/object/top' ) ).setClass( 'Label' ) );
	objectTopRow.add( objectTop );
	cameraPanel.add( objectTopRow );
	objectTopRow.setDisplay( 'none' );

	const objectBottomRow = new UIRow();
	const objectBottom = new UINumber().onChange( update );
	objectBottomRow.add( new UIText( strings.getKey( 'sidebar/object/bottom' ) ).setClass( 'Label' ) );
	objectBottomRow.add( objectBottom );
	cameraPanel.add( objectBottomRow );
	objectBottomRow.setDisplay( 'none' );

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

	const objectNearRow = new UIRow();
	const objectNear = new UINumber().onChange( update );
	objectNearRow.add( new UIText( strings.getKey( 'sidebar/object/near' ) || 'Near' ).setClass( 'Label' ) );
	objectNearRow.add( objectNear );
	cameraPanel.add( objectNearRow );

	const objectFarRow = new UIRow();
	const objectFar = new UINumber().onChange( update );
	objectFarRow.add( new UIText( strings.getKey( 'sidebar/object/far' ) || 'Far' ).setClass( 'Label' ) );
	objectFarRow.add( objectFar );
	cameraPanel.add( objectFarRow );

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

	const objectShadowCameraNearRow = new UIRow();
	const objectShadowCameraNear = new UINumber( 0.5 ).setPrecision( 3 ).setWidth( '50px' ).setRange( 0.1, 100 ).onChange( update );
	objectShadowCameraNearRow.add( new UIText( 'Camera Near' ).setClass( 'Label' ) );
	objectShadowCameraNearRow.add( objectShadowCameraNear );
	lightPanel.add( objectShadowCameraNearRow );

	const objectShadowCameraFarRow = new UIRow();
	const objectShadowCameraFar = new UINumber( 500 ).setPrecision( 3 ).setWidth( '50px' ).setRange( 1, 10000 ).onChange( update );
	objectShadowCameraFarRow.add( new UIText( 'Camera Far' ).setClass( 'Label' ) );
	objectShadowCameraFarRow.add( objectShadowCameraFar );
	lightPanel.add( objectShadowCameraFarRow );

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

			if ( object.visible !== objectVisible.getValue() ) {

				editor.execute( new SetValueCommand( editor, object, 'visible', objectVisible.getValue() ) );

			}

			if ( object.frustumCulled !== objectFrustumCulled.getValue() ) {

				editor.execute( new SetValueCommand( editor, object, 'frustumCulled', objectFrustumCulled.getValue() ) );

			}

			if ( object.renderOrder !== objectRenderOrder.getValue() ) {

				editor.execute( new SetValueCommand( editor, object, 'renderOrder', objectRenderOrder.getValue() ) );

			}

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

				// Shadow map size
				if ( object.shadow.mapSize !== undefined ) {

					const mapSize = objectShadowMapSize.getValue();
					if ( object.shadow.mapSize.width !== mapSize || object.shadow.mapSize.height !== mapSize ) {

						editor.execute( new SetShadowMapSizeCommand( editor, object, mapSize ) );

					}

				}

				// Shadow camera properties
				if ( object.shadow.camera !== undefined ) {

					if ( object.shadow.camera.near !== undefined && Math.abs( object.shadow.camera.near - objectShadowCameraNear.getValue() ) >= 0.01 ) {

						editor.execute( new SetShadowCameraCommand( editor, object, 'near', objectShadowCameraNear.getValue() ) );

					}

					if ( object.shadow.camera.far !== undefined && Math.abs( object.shadow.camera.far - objectShadowCameraFar.getValue() ) >= 0.01 ) {

						editor.execute( new SetShadowCameraCommand( editor, object, 'far', objectShadowCameraFar.getValue() ) );

					}

					// Directional light camera properties - use single area control
					if ( object.shadow.camera.left !== undefined && object.shadow.camera.right !== undefined ) {

						const area = objectShadowCameraArea.getValue();
						const currentArea = Math.max( Math.abs( object.shadow.camera.right - object.shadow.camera.left ), Math.abs( object.shadow.camera.top - object.shadow.camera.bottom ) ) / 2;

						if ( Math.abs( currentArea - area ) >= 0.01 ) {

							editor.execute( new SetShadowCameraCommand( editor, object, 'area', area ) );

						}

					}

					// Spot light camera properties
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

		meshPanel.setHidden( ! isMesh );
		lightPanel.setHidden( ! isLight );
		cameraPanel.setHidden( ! isCamera );

		if ( isMesh ) {
			geometryPanel.setHidden( ! object.geometry );
			materialPanel.setHidden( ! object.material );
		}

		const properties = {
			'fov': objectFovRow,
			'orthoHeight': objectOrthoHeightRow,
			'near': objectNearRow,
			'far': objectFarRow,
			'intensity': objectIntensityRow,
			'color': objectColorRow,
			'groundColor': objectGroundColorRow,
			'distance': objectDistanceRow,
			'angle': objectAngleRow,
			'penumbra': objectPenumbraRow,
			'decay': objectDecayRow,
			'castShadow': objectShadowRow,
			'receiveShadow': objectReceiveShadow,
			'shadow': [ objectShadowIntensityRow, objectShadowBiasRow, objectShadowNormalBiasRow, objectShadowRadiusRow ]
		};

		objectLeftRow.setDisplay( 'none' );
		objectRightRow.setDisplay( 'none' );
		objectTopRow.setDisplay( 'none' );
		objectBottomRow.setDisplay( 'none' );

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
			if ( object.shadow !== undefined && object.shadow.camera !== undefined ) {
				objectShadowMapSizeRow.setDisplay( '' );
				objectShadowCameraNearRow.setDisplay( '' );
				objectShadowCameraFarRow.setDisplay( '' );
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
				objectShadowCameraNearRow.setDisplay( 'none' );
				objectShadowCameraFarRow.setDisplay( 'none' );
				objectShadowCameraAreaRow.setDisplay( 'none' );
				objectShadowCameraFovRow.setDisplay( 'none' );
			}
		} else {
			objectShadowMapSizeRow.setDisplay( 'none' );
			objectShadowCameraNearRow.setDisplay( 'none' );
			objectShadowCameraFarRow.setDisplay( 'none' );
			objectShadowCameraAreaRow.setDisplay( 'none' );
			objectShadowCameraFovRow.setDisplay( 'none' );
		}

		if ( object.isAmbientLight || object.isHemisphereLight ) {
			objectShadowRow.setDisplay( 'none' );
		}

		if ( isLight ) {
			objectRotationRow.setDisplay( 'none' );
			objectScaleRow.setDisplay( 'none' );
		} else {
			objectRotationRow.setDisplay( '' );
			objectScaleRow.setDisplay( '' );
		}

	}

	// events

	signals.objectSelected.add( function ( object ) {

		if ( object !== null ) {

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

		objectType.setValue( object.type );

		objectName.setValue( object.name );

		objectPositionX.setValue( object.position.x );
		objectPositionY.setValue( object.position.y );
		objectPositionZ.setValue( object.position.z );

		objectRotationX.setValue( object.rotation.x * THREE.MathUtils.RAD2DEG );
		objectRotationY.setValue( object.rotation.y * THREE.MathUtils.RAD2DEG );
		objectRotationZ.setValue( object.rotation.z * THREE.MathUtils.RAD2DEG );

		objectScaleX.setValue( object.scale.x );
		objectScaleY.setValue( object.scale.y );
		objectScaleZ.setValue( object.scale.z );

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

			// Shadow map size
			if ( object.shadow.mapSize !== undefined ) {

				objectShadowMapSize.setValue( object.shadow.mapSize.width );

			}

			// Shadow camera properties
			if ( object.shadow.camera !== undefined ) {

				if ( object.shadow.camera.near !== undefined ) {

					objectShadowCameraNear.setValue( object.shadow.camera.near );

				}

				if ( object.shadow.camera.far !== undefined ) {

					objectShadowCameraFar.setValue( object.shadow.camera.far );

				}

				// Directional light camera properties - calculate area from left/right/top/bottom
				if ( object.shadow.camera.left !== undefined && object.shadow.camera.right !== undefined ) {

					const width = object.shadow.camera.right - object.shadow.camera.left;
					const height = object.shadow.camera.top - object.shadow.camera.bottom;
					const area = Math.max( Math.abs( width ), Math.abs( height ) ) / 2;
					objectShadowCameraArea.setValue( area );

				}

				// Spot light camera properties
				if ( object.shadow.camera.fov !== undefined ) {

					objectShadowCameraFov.setValue( object.shadow.camera.fov );

				}

			}

		}

		objectVisible.setValue( object.visible );
		objectFrustumCulled.setValue( object.frustumCulled );
		objectRenderOrder.setValue( object.renderOrder );

	}

	return panelsContainer;

}

export { SidebarObject };
