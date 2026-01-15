import * as THREE from 'three';

import { UIPanel, UIRow, UIText, UIInput, UIButton, UISpan, UITextArea, UISelect } from './libs/ui.js';

import { SetGeometryValueCommand } from './commands/SetGeometryValueCommand.js';
import { SetGeometryCommand } from './commands/SetGeometryCommand.js';
import { SetMaterialCommand } from './commands/SetMaterialCommand.js';
import { AssetSelector } from './AssetSelector.js';

import { SidebarGeometryBufferGeometry } from './Sidebar.Geometry.BufferGeometry.js';
import { SidebarGeometryModifiers } from './Sidebar.Geometry.Modifiers.js';

import { VertexNormalsHelper } from 'three/addons/helpers/VertexNormalsHelper.js';

function SidebarGeometry( editor ) {

	const strings = editor.strings;

	const signals = editor.signals;

	const container = new UIPanel();
	container.setBorderTop( '0' );
	container.setDisplay( 'none' );
	container.setPaddingTop( '20px' );

	let currentGeometryType = null;

	

	/*
	let objectActions = new UISelect().setPosition( 'absolute' ).setRight( '8px' ).setFontSize( '11px' );
	objectActions.setOptions( {

		'Actions': 'Actions',
		'Center': 'Center',
		'Convert': 'Convert',
		'Flatten': 'Flatten'

	} );
	objectActions.onClick( function ( event ) {

		event.stopPropagation(); 

	} );
	objectActions.onChange( function ( event ) {

		let action = this.getValue();

		let object = editor.selected;
		let geometry = object.geometry;

		if ( confirm( action + ' ' + object.name + '?' ) === false ) return;

		switch ( action ) {

			case 'Center':

				let offset = geometry.center();

				let newPosition = object.position.clone();
				newPosition.sub( offset );
				editor.execute( new SetPositionCommand( editor, object, newPosition ) );

				editor.signals.geometryChanged.dispatch( object );

				break;

			case 'Flatten':

				let newGeometry = geometry.clone();
				newGeometry.uuid = geometry.uuid;
				newGeometry.applyMatrix( object.matrix );

				let cmds = [ new SetGeometryCommand( editor, object, newGeometry ),
					new SetPositionCommand( editor, object, new THREE.Vector3( 0, 0, 0 ) ),
					new SetRotationCommand( editor, object, new THREE.Euler( 0, 0, 0 ) ),
					new SetScaleCommand( editor, object, new THREE.Vector3( 1, 1, 1 ) ) ];

				editor.execute( new MultiCmdsCommand( editor, cmds ), 'Flatten Geometry' );

				break;

		}

		this.setValue( 'Actions' );

	} );
	container.addStatic( objectActions );
	*/

	

	const geometryTypeRow = new UIRow();
	const geometryType = new UIText();

	geometryTypeRow.add( new UIText( strings.getKey( 'sidebar/geometry/type' ) ).setClass( 'Label' ) );
	geometryTypeRow.add( geometryType );

	container.add( geometryTypeRow );

	

	const geometryUUIDRow = new UIRow();
	const geometryUUID = new UIInput().setWidth( '102px' ).setFontSize( '12px' ).setDisabled( true );
	const geometryUUIDRenew = new UIButton( strings.getKey( 'sidebar/geometry/new' ) ).setMarginLeft( '7px' ).onClick( function () {

		geometryUUID.setValue( THREE.MathUtils.generateUUID() );

		editor.execute( new SetGeometryValueCommand( editor, editor.selected, 'uuid', geometryUUID.getValue() ) );

	} );

	geometryUUIDRow.add( new UIText( strings.getKey( 'sidebar/geometry/uuid' ) ).setClass( 'Label' ) );
	geometryUUIDRow.add( geometryUUID );
	geometryUUIDRow.add( geometryUUIDRenew );

	container.add( geometryUUIDRow );

	

	const geometryNameRow = new UIRow();
	const geometryName = new UIInput().setWidth( '150px' ).setFontSize( '12px' ).onChange( function () {

		editor.execute( new SetGeometryValueCommand( editor, editor.selected, 'name', geometryName.getValue() ) );

	} );

	geometryNameRow.add( new UIText( strings.getKey( 'sidebar/geometry/name' ) ).setClass( 'Label' ) );
	geometryNameRow.add( geometryName );

	container.add( geometryNameRow );

	
	const geometrySelectorRow = new UIRow();
	const geometrySelectorButton = new UIButton( 'Select Geometry...' ).setWidth( '150px' );
	
	
	const defaultGeometries = {
		'BoxGeometry': THREE.BoxGeometry,
		'SphereGeometry': THREE.SphereGeometry,
		'CylinderGeometry': THREE.CylinderGeometry,
		'PlaneGeometry': THREE.PlaneGeometry,
		'ConeGeometry': THREE.ConeGeometry,
		'TorusGeometry': THREE.TorusGeometry,
		'TorusKnotGeometry': THREE.TorusKnotGeometry,
		'OctahedronGeometry': THREE.OctahedronGeometry,
		'TetrahedronGeometry': THREE.TetrahedronGeometry,
		'IcosahedronGeometry': THREE.IcosahedronGeometry,
		'DodecahedronGeometry': THREE.DodecahedronGeometry,
		'CapsuleGeometry': THREE.CapsuleGeometry,
		'CircleGeometry': THREE.CircleGeometry,
		'RingGeometry': THREE.RingGeometry,
		'LatheGeometry': THREE.LatheGeometry
	};

	geometrySelectorButton.onClick( function () {
		if ( ! editor.selected ) {
			alert( 'Please select an object first' );
			return;
		}

		if ( ! editor.assetSelector ) {
			editor.assetSelector = new AssetSelector( editor );
		}

		editor.assetSelector.show( async function ( assetData ) {
			if ( ! assetData ) return;

			const object = editor.selected;
			if ( ! object ) return;

			let newGeometry = null;

			
			if ( assetData.type === 'default-geometry' && assetData.geometryType ) {
				const GeometryClass = defaultGeometries[ assetData.geometryType ];
				if ( GeometryClass ) {
					
					if ( assetData.geometryType === 'BoxGeometry' ) {
						newGeometry = new GeometryClass( 1, 1, 1 );
					} else if ( assetData.geometryType === 'SphereGeometry' ) {
						newGeometry = new GeometryClass( 1, 32, 16 );
					} else if ( assetData.geometryType === 'CylinderGeometry' ) {
						newGeometry = new GeometryClass( 1, 1, 1, 32 );
					} else if ( assetData.geometryType === 'PlaneGeometry' ) {
						newGeometry = new GeometryClass( 1, 1 );
					} else if ( assetData.geometryType === 'ConeGeometry' ) {
						newGeometry = new GeometryClass( 1, 1, 32 );
					} else if ( assetData.geometryType === 'TorusGeometry' ) {
						newGeometry = new GeometryClass( 1, 0.4, 16, 100 );
					} else if ( assetData.geometryType === 'TorusKnotGeometry' ) {
						newGeometry = new GeometryClass( 1, 0.3, 100, 16 );
					} else if ( assetData.geometryType === 'CapsuleGeometry' ) {
						newGeometry = new GeometryClass( 1, 1, 4, 8 );
					} else if ( assetData.geometryType === 'CircleGeometry' ) {
						newGeometry = new GeometryClass( 1, 32 );
					} else if ( assetData.geometryType === 'RingGeometry' ) {
						newGeometry = new GeometryClass( 0.5, 1, 32 );
					} else {
						newGeometry = new GeometryClass();
					}
					newGeometry.name = assetData.geometryType;
				}
			} else if ( assetData && assetData.isGeometry ) {
				
				newGeometry = assetData;
			}

			if ( newGeometry ) {
				newGeometry.uuid = object.geometry.uuid;
				editor.execute( new SetGeometryCommand( editor, object, newGeometry ) );
				build();
			}
		}, null, 'geometry' );
	} );

	geometrySelectorRow.add( new UIText( 'Geometry' ).setClass( 'Label' ) );
	geometrySelectorRow.add( geometrySelectorButton );
	container.add( geometrySelectorRow );

	
	const replaceMeshRow = new UIRow();
	const replaceMeshButton = new UIButton( 'Replace Mesh from Assets' ).setWidth( '150px' ).onClick( function () {

		if ( ! editor.assetSelector ) {
			editor.assetSelector = new AssetSelector( editor );
		}

		editor.assetSelector.show( async function ( modelData ) {

			
			if ( modelData && modelData.isObject3D ) {
				
				const object = editor.selected;
				if ( object && object.isMesh ) {
					
					let loadedMesh = null;
					modelData.traverse( ( child ) => {
						if ( child.isMesh && ! loadedMesh ) {
							loadedMesh = child;
						}
					} );

					if ( loadedMesh && loadedMesh.isMesh ) {
						
						const newGeometry = loadedMesh.geometry.clone();
						const newMaterial = loadedMesh.material ? ( Array.isArray( loadedMesh.material ) ? loadedMesh.material[ 0 ].clone() : loadedMesh.material.clone() ) : null;

						
						editor.execute( new SetGeometryCommand( editor, object, newGeometry ) );
						
						if ( newMaterial ) {
							editor.addMaterial( newMaterial );
							editor.execute( new SetMaterialCommand( editor, object, newMaterial, 0 ) );
						}

						editor.signals.objectChanged.dispatch( object );
						build();
					}
				}
			} else if ( modelData && modelData.type === 'model' ) {
				const object = editor.selected;
				if ( object && object.isMesh ) {
					try {
						const isTauri = typeof window !== 'undefined' && window.__TAURI__ && window.__TAURI__.core.invoke;
						const projectPath = editor.storage && editor.storage.getProjectPath ? editor.storage.getProjectPath() : null;

						if ( ! projectPath ) {
							console.error( 'No project path available' );
							return;
						}

						let loader;
						const ext = modelData.extension;

						if ( ext === 'glb' || ext === 'gltf' ) {
							const { GLTFLoader } = await import( 'three/addons/loaders/GLTFLoader.js' );
							loader = new GLTFLoader();
						} else if ( ext === 'fbx' ) {
							const { FBXLoader } = await import( 'three/addons/loaders/FBXLoader.js' );
							loader = new FBXLoader();
						} else if ( ext === 'obj' ) {
							const { OBJLoader } = await import( 'three/addons/loaders/OBJLoader.js' );
							loader = new OBJLoader();
						} else {
							console.error( 'Unsupported model format:', ext );
							return;
						}

						if ( isTauri ) {
							const assetPath = modelData.path.startsWith( '/' ) ? modelData.path.substring( 1 ) : modelData.path;
							const assetBytes = await window.__TAURI__.core.invoke( 'read_asset_file', {
								projectPath: projectPath,
								assetPath: assetPath
							} );

							const uint8Array = new Uint8Array( assetBytes );
							const blob = new Blob( [ uint8Array ] );
							const blobUrl = URL.createObjectURL( blob );

							loader.load( blobUrl, function ( result ) {

								let loadedMesh;
								if ( result.scene ) {
									
									loadedMesh = result.scene.children[ 0 ];
									if ( ! loadedMesh || ! loadedMesh.isMesh ) {
										
										result.scene.traverse( function ( child ) {
											if ( child.isMesh && ! loadedMesh ) {
												loadedMesh = child;
											}
										} );
									}
								} else if ( result.isGroup ) {
									
									loadedMesh = result.children[ 0 ];
								} else if ( result.isMesh ) {
									loadedMesh = result;
								}

								if ( loadedMesh && loadedMesh.isMesh ) {
									
									const newGeometry = loadedMesh.geometry.clone();
									const newMaterial = loadedMesh.material ? ( Array.isArray( loadedMesh.material ) ? loadedMesh.material[ 0 ].clone() : loadedMesh.material.clone() ) : null;

									
									editor.execute( new SetGeometryCommand( editor, object, newGeometry ) );
									
									if ( newMaterial ) {
										editor.addMaterial( newMaterial );
										editor.execute( new SetMaterialCommand( editor, object, newMaterial, 0 ) );
									}

									editor.signals.objectChanged.dispatch( object );
									build();
								}

								URL.revokeObjectURL( blobUrl );

							}, undefined, function ( error ) {
								console.error( 'Error loading model:', error );
								URL.revokeObjectURL( blobUrl );
							} );

						}

					} catch ( error ) {
						console.error( 'Error replacing mesh:', error );
					}
				}
			}

		}, null, 'model' );

	} );

	replaceMeshRow.add( new UIText( 'Replace Mesh' ).setClass( 'Label' ) );
	replaceMeshRow.add( replaceMeshButton );
	container.add( replaceMeshRow );

	

	const parameters = new UISpan();
	container.add( parameters );

	

	container.add( new SidebarGeometryBufferGeometry( editor ) );

	

	const geometryBoundingBox = new UIText().setFontSize( '12px' );

	const geometryBoundingBoxRow = new UIRow();
	geometryBoundingBoxRow.add( new UIText( strings.getKey( 'sidebar/geometry/bounds' ) ).setClass( 'Label' ) );
	geometryBoundingBoxRow.add( geometryBoundingBox );
	container.add( geometryBoundingBoxRow );

	

	const geometryUserDataRow = new UIRow();
	const geometryUserData = new UITextArea().setValue( '{}' ).setWidth( '150px' ).setHeight( '40px' ).setFontSize( '12px' ).onChange( function () {

		try {

			const userData = JSON.parse( geometryUserData.getValue() );

			if ( JSON.stringify( editor.selected.geometry.userData ) != JSON.stringify( userData ) ) {

				editor.execute( new SetGeometryValueCommand( editor, editor.selected, 'userData', userData ) );

				build();

			}

		} catch ( exception ) {

			console.warn( exception );

		}

	} );
	geometryUserData.onKeyUp( function () {

		try {

			JSON.parse( geometryUserData.getValue() );

			geometryUserData.dom.classList.add( 'success' );
			geometryUserData.dom.classList.remove( 'fail' );

		} catch ( error ) {

			geometryUserData.dom.classList.remove( 'success' );
			geometryUserData.dom.classList.add( 'fail' );

		}

	} );

	geometryUserDataRow.add( new UIText( strings.getKey( 'sidebar/geometry/userdata' ) ).setClass( 'Label' ) );
	geometryUserDataRow.add( geometryUserData );

	container.add( geometryUserDataRow );

	

	const helpersRow = new UIRow().setMarginLeft( '120px' );
	container.add( helpersRow );

	const vertexNormalsButton = new UIButton( strings.getKey( 'sidebar/geometry/show_vertex_normals' ) );
	vertexNormalsButton.onClick( function () {

		const object = editor.selected;

		if ( editor.helpers[ object.id ] === undefined ) {

			editor.addHelper( object, new VertexNormalsHelper( object ) );

		} else {

			editor.removeHelper( object );

		}

		signals.sceneGraphChanged.dispatch();

	} );
	helpersRow.add( vertexNormalsButton );

	

	const exportJson = new UIButton( strings.getKey( 'sidebar/geometry/export' ) );
	exportJson.setMarginLeft( '120px' );
	exportJson.onClick( function () {

		const object = editor.selected;
		const geometry = object.geometry;

		let output = geometry.toJSON();

		try {

			output = JSON.stringify( output, null, '\t' );
			output = output.replace( /[\n\t]+([\d\.e\-\[\]]+)/g, '$1' );

		} catch ( e ) {

			output = JSON.stringify( output );

		}

		editor.utils.save( new Blob( [ output ] ), `${ geometryName.getValue() || 'geometry' }.json` );

	} );
	container.add( exportJson );

	//

	async function build() {

		const object = editor.selected;

		if ( object && object.geometry ) {

			const geometry = object.geometry;

			container.setDisplay( 'block' );

			geometryType.setValue( geometry.type );

			geometryUUID.setValue( geometry.uuid );
			geometryName.setValue( geometry.name );

			//

			if ( currentGeometryType !== geometry.type ) {

				parameters.clear();

				if ( geometry.type === 'BufferGeometry' ) {

					parameters.add( new SidebarGeometryModifiers( editor, object ) );

				} else {

					try {

						const { GeometryParametersPanel } = await import( `./Sidebar.Geometry.${ geometry.type }.js` );

						parameters.add( new GeometryParametersPanel( editor, object ) );

					} catch ( error ) {

						console.warn( `Sidebar panel for geometry type "${ geometry.type }" not found. Using BufferGeometry panel instead.` );

						parameters.add( new SidebarGeometryModifiers( editor, object ) );

					}

				}

				currentGeometryType = geometry.type;

			}

			if ( geometry.boundingBox === null ) geometry.computeBoundingBox();

			const boundingBox = geometry.boundingBox;
			const x = Math.floor( ( boundingBox.max.x - boundingBox.min.x ) * 1000 ) / 1000;
			const y = Math.floor( ( boundingBox.max.y - boundingBox.min.y ) * 1000 ) / 1000;
			const z = Math.floor( ( boundingBox.max.z - boundingBox.min.z ) * 1000 ) / 1000;

			geometryBoundingBox.setInnerHTML( `${x}<br/>${y}<br/>${z}` );

			helpersRow.setDisplay( geometry.hasAttribute( 'normal' ) ? '' : 'none' );

			geometryUserData.setValue( JSON.stringify( geometry.userData, null, '  ' ) );

			//

			const helper = editor.helpers[ object.id ];

			if ( helper !== undefined && helper.isVertexNormalsHelper === true ) {

				editor.removeHelper( object );
				editor.addHelper( object, new VertexNormalsHelper( object ) );

			}

		} else {

			container.setDisplay( 'none' );

		}

	}

	signals.objectSelected.add( function () {

		currentGeometryType = null;

		build();

	} );

	signals.geometryChanged.add( build );

	return container;

}

export { SidebarGeometry };
