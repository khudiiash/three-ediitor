import * as THREE from 'three';

import { Config } from './Config.js';
import { Loader } from './Loader.js';
import { History as _History } from './History.js';
import { Strings } from './Strings.js';
import { Storage as _Storage } from './Storage.js';
import { Selector } from './Selector.js';
import { Input } from './Input.js';
import { CopyObjectCommand } from './commands/CopyObjectCommand.js';
import { CutObjectCommand } from './commands/CutObjectCommand.js';
import { PasteObjectCommand } from './commands/PasteObjectCommand.js';
import { RemoveObjectCommand } from './commands/RemoveObjectCommand.js';
import { AssetObjectLoader } from './AssetObjectLoader.js';

var _DEFAULT_CAMERA = new THREE.PerspectiveCamera( 50, 1, 0.01, 1000 );
_DEFAULT_CAMERA.name = 'Camera';
_DEFAULT_CAMERA.position.set( 0, 5, 10 );
_DEFAULT_CAMERA.lookAt( new THREE.Vector3() );

function Editor() {

	const Signal = signals.Signal; 

	this.signals = {

		

		editScript: new Signal(),

		

		startPlayer: new Signal(),
		stopPlayer: new Signal(),

		

		enterXR: new Signal(),
		offerXR: new Signal(),
		leaveXR: new Signal(),

		

		editorCleared: new Signal(),

		savingStarted: new Signal(),
		savingFinished: new Signal(),

		transformModeChanged: new Signal(),
		snapChanged: new Signal(),
		spaceChanged: new Signal(),
		rendererCreated: new Signal(),
		rendererUpdated: new Signal(),
		rendererDetectKTX2Support: new Signal(),

		sceneBackgroundChanged: new Signal(),
		sceneEnvironmentChanged: new Signal(),
		sceneFogChanged: new Signal(),
		sceneFogSettingsChanged: new Signal(),
		sceneGraphChanged: new Signal(),
		sceneRendered: new Signal(),

		cameraChanged: new Signal(),
		cameraResetted: new Signal(),

		geometryChanged: new Signal(),

		objectSelected: new Signal(),
		objectFocused: new Signal(),

		objectAdded: new Signal(),
		objectChanged: new Signal(),
		objectRemoved: new Signal(),

		cameraAdded: new Signal(),
		cameraRemoved: new Signal(),

		helperAdded: new Signal(),
		helperRemoved: new Signal(),

		materialAdded: new Signal(),
		materialChanged: new Signal(),
		materialRemoved: new Signal(),

		scriptAdded: new Signal(),
		scriptChanged: new Signal(),
		scriptRemoved: new Signal(),

		windowResize: new Signal(),

		showHelpersChanged: new Signal(),
		refreshSidebarObject3D: new Signal(),
		refreshSidebarEnvironment: new Signal(),
		historyChanged: new Signal(),

		viewportCameraChanged: new Signal(),
		viewportShadingChanged: new Signal(),

		intersectionsDetected: new Signal(),

		pathTracerUpdated: new Signal(),

	};

	this.storage = new _Storage();
	this.config = new Config( this.storage );
	this.history = new _History( this );
	this.selector = new Selector( this );
	this.strings = new Strings( this.config );
	this.input = new Input( this );

	this.setupKeyboardShortcuts();

	this.loader = new Loader( this );

	this.camera = _DEFAULT_CAMERA.clone();

	this.scene = new THREE.Scene();
	this.scene.name = 'Scene';

	this.sceneHelpers = new THREE.Scene();
	this.sceneHelpers.add( new THREE.HemisphereLight( 0xffffff, 0x888888, 2 ) );

	this.object = {};
	this.geometries = {};
	this.materials = {};
	this.textures = {};
	this.scripts = {};

	this.materialsRefCounter = new Map(); 

	this.mixer = new THREE.AnimationMixer( this.scene );

	this.selected = null;
	this.helpers = {};

	this.cameras = {};

	this.clipboard = null;
	this.assetClipboard = null;

	this.viewportCamera = this.camera;
	this.viewportShading = 'default';

	this.addCamera( this.camera );

}

Editor.prototype = {

	setScene: function ( scene ) {

		this.scene.uuid = scene.uuid;
		this.scene.name = scene.name;

		this.scene.background = scene.background;
		this.scene.environment = scene.environment;
		this.scene.fog = scene.fog;
		this.scene.backgroundBlurriness = scene.backgroundBlurriness;
		this.scene.backgroundIntensity = scene.backgroundIntensity;

		this.scene.userData = JSON.parse( JSON.stringify( scene.userData ) );

		

		this.signals.sceneGraphChanged.active = false;

		while ( scene.children.length > 0 ) {

			this.addObject( scene.children[ 0 ] );

		}

		this.signals.sceneGraphChanged.active = true;
		this.signals.sceneGraphChanged.dispatch();

	},

	//

	addObject: function ( object, parent, index ) {

		var scope = this;

		const defaultCastShadows = this.config.getKey( 'project/defaults/castShadows' ) === true;
		const defaultReceiveShadows = this.config.getKey( 'project/defaults/receiveShadows' ) === true;
		const defaultMaterialUuid = this.config.getKey( 'project/defaults/material' );
		const defaultMaterial = defaultMaterialUuid ? this.materials[ defaultMaterialUuid ] : null;

		object.traverse( function ( child ) {

			if ( child.geometry !== undefined ) scope.addGeometry( child.geometry );
			if ( child.material !== undefined ) scope.addMaterial( child.material );

			scope.addCamera( child );
			scope.addHelper( child );

			if ( child.isMesh ) {
				if ( defaultCastShadows && child.castShadow === false ) {
					child.castShadow = true;
				}
				if ( defaultReceiveShadows && child.receiveShadow === false ) {
					child.receiveShadow = true;
				}
				if ( defaultMaterial ) {
					const clonedMaterial = defaultMaterial.clone();
					if ( Array.isArray( child.material ) ) {
						for ( let i = 0; i < child.material.length; i ++ ) {
							child.material[ i ] = clonedMaterial.clone();
							scope.addMaterial( child.material[ i ] );
						}
					} else {
						child.material = clonedMaterial;
						scope.addMaterial( clonedMaterial );
					}
				}
			}

			if ( child.isLight ) {
				if ( defaultCastShadows && child.castShadow === false ) {
					child.castShadow = true;
				}
			}

		} );

		if ( parent === undefined ) {

			this.scene.add( object );

		} else {

			parent.children.splice( index, 0, object );
			object.parent = parent;

		}

		this.signals.objectAdded.dispatch( object );
		this.signals.sceneGraphChanged.dispatch();

	},

	nameObject: function ( object, name ) {

		if ( object && ( object.type === 'BatchedRenderer' || object.name === 'BatchedRenderer' ) ) {
			return;
		}

		object.name = name;
		this.signals.sceneGraphChanged.dispatch();

	},

	removeObject: function ( object ) {

		if ( object.parent === null ) return;
		
		if ( object.type === 'BatchedRenderer' || object.name === 'BatchedRenderer' ) {
			return;
		}

		var scope = this;

		object.traverse( function ( child ) {

			scope.removeCamera( child );
			scope.removeHelper( child );

			if ( child.material !== undefined ) scope.removeMaterial( child.material );

		} );

		object.parent.remove( object );

		this.signals.objectRemoved.dispatch( object );
		this.signals.sceneGraphChanged.dispatch();

	},

	addGeometry: function ( geometry ) {

		this.geometries[ geometry.uuid ] = geometry;

	},

	setGeometryName: function ( geometry, name ) {

		geometry.name = name;
		this.signals.sceneGraphChanged.dispatch();

	},

	addMaterial: function ( material ) {

		if ( Array.isArray( material ) ) {

			for ( var i = 0, l = material.length; i < l; i ++ ) {

				this.addMaterialToRefCounter( material[ i ] );

			}

		} else {

			this.addMaterialToRefCounter( material );

		}

		this.signals.materialAdded.dispatch();

	},

	addMaterialToRefCounter: function ( material ) {

		var materialsRefCounter = this.materialsRefCounter;

		var count = materialsRefCounter.get( material );

		if ( count === undefined ) {

			materialsRefCounter.set( material, 1 );
			this.materials[ material.uuid ] = material;

		} else {

			count ++;
			materialsRefCounter.set( material, count );

		}

	},

	removeMaterial: function ( material ) {

		if ( Array.isArray( material ) ) {

			for ( var i = 0, l = material.length; i < l; i ++ ) {

				this.removeMaterialFromRefCounter( material[ i ] );

			}

		} else {

			this.removeMaterialFromRefCounter( material );

		}

		this.signals.materialRemoved.dispatch();

	},

	removeMaterialFromRefCounter: function ( material ) {

		var materialsRefCounter = this.materialsRefCounter;

		var count = materialsRefCounter.get( material );
		count --;

		if ( count === 0 ) {

			materialsRefCounter.delete( material );
			delete this.materials[ material.uuid ];

		} else {

			materialsRefCounter.set( material, count );

		}

	},

	getMaterialById: function ( id ) {

		var material;
		var materials = Object.values( this.materials );

		for ( var i = 0; i < materials.length; i ++ ) {

			if ( materials[ i ].id === id ) {

				material = materials[ i ];
				break;

			}

		}

		return material;

	},

	setMaterialName: function ( material, name ) {

		material.name = name;
		this.signals.sceneGraphChanged.dispatch();

	},

	addTexture: function ( texture ) {

		this.textures[ texture.uuid ] = texture;

	},

	//

	addCamera: function ( camera ) {

		if ( camera.isCamera ) {

			this.cameras[ camera.uuid ] = camera;

			this.signals.cameraAdded.dispatch( camera );

		}

	},

	removeCamera: function ( camera ) {

		if ( this.cameras[ camera.uuid ] !== undefined ) {

			delete this.cameras[ camera.uuid ];

			this.signals.cameraRemoved.dispatch( camera );

		}

	},

	//

	addHelper: function () {

		var geometry = new THREE.SphereGeometry( 2, 4, 2 );
		var material = new THREE.MeshBasicMaterial( { color: 0xff0000, visible: false } );

		return function ( object, helper ) {

			if ( helper === undefined ) {

				if ( object.isCamera ) {

					helper = new THREE.CameraHelper( object );

				} else if ( object.isPointLight ) {

					helper = new THREE.PointLightHelper( object, 1 );

					helper.matrix = new THREE.Matrix4();
					helper.matrixAutoUpdate = true;

					const light = object;
					const editor = this;

					helper.updateMatrixWorld = function () {

						light.getWorldPosition( this.position );

						const distance = editor.viewportCamera.position.distanceTo( this.position );
						this.scale.setScalar( distance / 30 );

						this.updateMatrix();
						this.matrixWorld.copy( this.matrix );

						const children = this.children;

						for ( let i = 0, l = children.length; i < l; i ++ ) {

							children[ i ].updateMatrixWorld();

						}

					};

				} else if ( object.isDirectionalLight ) {

					helper = new THREE.DirectionalLightHelper( object, 1 );

				} else if ( object.isSpotLight ) {

					helper = new THREE.SpotLightHelper( object );

				} else if ( object.isHemisphereLight ) {

					helper = new THREE.HemisphereLightHelper( object, 1 );

				} else if ( object.isSkinnedMesh ) {

					helper = new THREE.SkeletonHelper( object.skeleton.bones[ 0 ] );

				} else if ( object.isBone === true && object.parent && object.parent.isBone !== true ) {

					helper = new THREE.SkeletonHelper( object );

				} else {

					
					return;

				}

				const picker = new THREE.Mesh( geometry, material );
				picker.name = 'picker';
				picker.userData.object = object;
				helper.add( picker );

			}

			this.sceneHelpers.add( helper );
			this.helpers[ object.id ] = helper;

			this.signals.helperAdded.dispatch( helper );

		};

	}(),

	removeHelper: function ( object ) {

		if ( this.helpers[ object.id ] !== undefined ) {

			var helper = this.helpers[ object.id ];
			helper.parent.remove( helper );
			helper.dispose();

			delete this.helpers[ object.id ];

			this.signals.helperRemoved.dispatch( helper );

		}

	},

	//

	addScript: function ( object, script ) {

		if ( this.scripts[ object.uuid ] === undefined ) {

			this.scripts[ object.uuid ] = [];

		}

		this.scripts[ object.uuid ].push( script );

		this.signals.scriptAdded.dispatch( script );

	},

	removeScript: function ( object, script ) {

		if ( this.scripts[ object.uuid ] === undefined ) return;

		var index = this.scripts[ object.uuid ].indexOf( script );

		if ( index !== - 1 ) {

			this.scripts[ object.uuid ].splice( index, 1 );

		}

		this.signals.scriptRemoved.dispatch( script );

	},

	getObjectMaterial: function ( object, slot ) {

		var material = object.material;

		if ( Array.isArray( material ) && slot !== undefined ) {

			material = material[ slot ];

		}

		return material;

	},

	setObjectMaterial: function ( object, slot, newMaterial ) {

		if ( Array.isArray( object.material ) && slot !== undefined ) {

			object.material[ slot ] = newMaterial;

		} else {

			object.material = newMaterial;

		}

	},

	setViewportCamera: function ( uuid ) {

		this.viewportCamera = this.cameras[ uuid ];
		this.signals.viewportCameraChanged.dispatch();

	},

	setViewportShading: function ( value ) {

		this.viewportShading = value;
		this.signals.viewportShadingChanged.dispatch();

	},

	//

	select: function ( object ) {

		this.selector.select( object );

	},

	selectById: function ( id ) {

		if ( id === this.camera.id ) {

			this.select( this.camera );
			return;

		}

		const object = this.scene.getObjectById( id );
		if ( object ) {
			this.select( object );
		}

	},

	selectByUuid: function ( uuid ) {

		var scope = this;

		this.scene.traverse( function ( child ) {

			if ( child.uuid === uuid ) {

				scope.select( child );

			}

		} );

	},

	deselect: function () {

		this.selector.deselect();

	},

	focus: function ( object ) {

		if ( object !== undefined ) {

			this.signals.objectFocused.dispatch( object );

		}

	},

	focusById: function ( id ) {

		this.focus( this.scene.getObjectById( id ) );

	},

	clear: function () {

		this.history.clear();
		this.storage.clear();

		this.camera.copy( _DEFAULT_CAMERA );
		this.signals.cameraResetted.dispatch();

		this.scene.name = 'Scene';
		this.scene.userData = {};
		this.scene.background = null;
		this.scene.environment = null;
		this.scene.fog = null;

		var objects = this.scene.children;

		this.signals.sceneGraphChanged.active = false;

		while ( objects.length > 0 ) {

			this.removeObject( objects[ 0 ] );

		}

		this.signals.sceneGraphChanged.active = true;

		this.geometries = {};
		this.materials = {};
		this.textures = {};
		this.scripts = {};

		this.materialsRefCounter.clear();

		this.animations = {};
		this.mixer.stopAllAction();

		this.deselect();

		this.signals.editorCleared.dispatch();

	},

	//

	fromJSON: async function ( json ) {

		try {
			const manager = new THREE.LoadingManager();
			
			manager.onError = function ( url ) {
				console.warn( '[Editor] Failed to load resource:', url );
			};
			
			
			const projectPath = this.storage && this.storage.getProjectPath ? this.storage.getProjectPath() : null;
			var loader = new AssetObjectLoader( manager, projectPath );
			var camera = await loader.parseAsync( json.camera );

			const existingUuid = this.camera.uuid;
			const incomingUuid = camera.uuid;

			
			this.camera.copy( camera );
			this.camera.uuid = incomingUuid;

			delete this.cameras[ existingUuid ]; 
			this.cameras[ incomingUuid ] = this.camera; 

			if ( json.controls !== undefined ) {

				this.controls.fromJSON( json.controls );

			}

			this.signals.cameraResetted.dispatch();

			this.history.fromJSON( json.history );
			this.scripts = json.scripts || {};

			function removeParticleObjectsFromJSON( obj ) {
				if ( Array.isArray( obj ) ) {
					return obj.filter( function ( item ) {
						if ( item && typeof item === 'object' ) {
							if ( item.userData && item.userData.isParticleSystem ) {
								removeParticleObjectsFromJSON( item );
								return true;
							}
							if ( item.type === 'BatchedRenderer' ||
								 item.type === 'ParticleEmitter' ||
								 ( item.type === 'ParticleSystem' && !( item.userData && item.userData.isParticleSystem ) ) ||
								 item.type === 'VFXBatch' ) {
								return false;
							}
							removeParticleObjectsFromJSON( item );
						}
						return true;
					} );
				} else if ( obj && typeof obj === 'object' ) {
					if ( obj.children && Array.isArray( obj.children ) ) {
						obj.children = obj.children.filter( function ( child ) {
							if ( child && typeof child === 'object' ) {
								if ( child.userData && child.userData.isParticleSystem ) {
									removeParticleObjectsFromJSON( child );
									return true;
								}
								if ( child.type === 'BatchedRenderer' ||
									 child.type === 'ParticleEmitter' ||
									 ( child.type === 'ParticleSystem' && !( child.userData && child.userData.isParticleSystem ) ) ||
									 child.type === 'VFXBatch' ) {
									return false;
								}
								removeParticleObjectsFromJSON( child );
							}
							return true;
						} );
					}
					for ( const key in obj ) {
						if ( obj[ key ] && typeof obj[ key ] === 'object' ) {
							removeParticleObjectsFromJSON( obj[ key ] );
						}
					}
				}
				return obj;
			}

			const cleanedSceneJSON = JSON.parse( JSON.stringify( json.scene ) );
			removeParticleObjectsFromJSON( cleanedSceneJSON );

			const scene = await loader.parseAsync( cleanedSceneJSON );
			
			let particleSystemCount = 0;
			scene.traverse( function ( object ) {
				if ( object.userData && object.userData.isParticleSystem ) {
					particleSystemCount++;
					if ( !object.userData.particleSystem ) {
						console.warn( '[Editor] Particle system object found but particleSystem data is missing:', object.name, object.uuid );
					} else {
						console.log( '[Editor] Particle system object loaded:', object.name, object.uuid, 'with data:', object.userData.particleSystem );
					}
				}
			} );
			
			if ( particleSystemCount > 0 ) {
				console.log( '[Editor] Found', particleSystemCount, 'particle system(s) in loaded scene' );
			}
			
			this.setScene( scene );

			if ( json.environment === 'Room' ||
				 json.environment === 'ModelViewer' /* DEPRECATED */ ) {

				this.signals.sceneEnvironmentChanged.dispatch( json.environment );
				this.signals.refreshSidebarEnvironment.dispatch();

			}
		} catch ( error ) {
			if ( error && typeof error === 'object' && error.type === 'error' && error.target && error.target.tagName === 'IMG' ) {
				console.warn( '[Editor] Image loading error (non-critical):', error.target.src || error.target );
			} else if ( error && error instanceof Error ) {
				console.error( '[Editor] Error loading scene from JSON:', error );
				console.error( '[Editor] Error stack:', error.stack );
				throw error;
			} else if ( error && typeof error === 'object' && error.type === 'error' ) {
				console.warn( '[Editor] Resource loading error (non-critical):', error.target || error );
			} else {
				console.error( '[Editor] Error loading scene from JSON:', error );
				throw error;
			}
		}

	},

	toJSON: function () {

		

		if ( !this.scene ) {
			return {
				metadata: {},
				project: {
					shadows: this.config.getKey( 'project/renderer/shadows' ),
					shadowType: this.config.getKey( 'project/renderer/shadowType' ),
					toneMapping: this.config.getKey( 'project/renderer/toneMapping' ),
					toneMappingExposure: this.config.getKey( 'project/renderer/toneMappingExposure' )
				},
				camera: this.viewportCamera.toJSON(),
				controls: this.controls.toJSON(),
				scene: new THREE.Scene().toJSON(),
				scripts: {},
				history: this.history.toJSON(),
				environment: null
			};
		}

		if ( !this.scene || typeof this.scene !== 'object' || typeof this.scene.traverse !== 'function' ) {
			return {
				metadata: {},
				project: {
					shadows: this.config.getKey( 'project/renderer/shadows' ),
					shadowType: this.config.getKey( 'project/renderer/shadowType' ),
					toneMapping: this.config.getKey( 'project/renderer/toneMapping' ),
					toneMappingExposure: this.config.getKey( 'project/renderer/toneMappingExposure' )
				},
				camera: this.viewportCamera.toJSON(),
				controls: this.controls.toJSON(),
				scene: new THREE.Scene().toJSON(),
				scripts: {},
				history: this.history.toJSON(),
				environment: null
			};
		}

		var scene = this.scene;
		var scripts = this.scripts;

		if ( !scene || typeof scene !== 'object' || typeof scene.traverse !== 'function' ) {
			return {
				metadata: {},
				project: {
					shadows: this.config.getKey( 'project/renderer/shadows' ),
					shadowType: this.config.getKey( 'project/renderer/shadowType' ),
					toneMapping: this.config.getKey( 'project/renderer/toneMapping' ),
					toneMappingExposure: this.config.getKey( 'project/renderer/toneMappingExposure' )
				},
				camera: this.viewportCamera.toJSON(),
				controls: this.controls.toJSON(),
				scene: new THREE.Scene().toJSON(),
				scripts: {},
				history: this.history.toJSON(),
				environment: null
			};
		}

		for ( var key in scripts ) {

			var script = scripts[ key ];

			if ( script.length === 0 || scene.getObjectByProperty( 'uuid', key ) === undefined ) {

				delete scripts[ key ];

			}

		}

		let environment = null;

		if ( this.scene && this.scene.environment !== null && this.scene.environment.isRenderTargetTexture === true ) {

			environment = 'Room';

		}

		const objectsToRestore = [];
		try {
			const sceneToTraverse = this.scene;
			if ( !sceneToTraverse || typeof sceneToTraverse !== 'object' || typeof sceneToTraverse.traverse !== 'function' ) {
				console.warn( 'Scene is invalid for traversal, skipping' );
			} else {
				const objectsToRemove = [];
				sceneToTraverse.traverse( function ( object ) {
					if ( !object ) return;
					if ( object.userData && object.userData.skipSerialization === true ) {
						const parent = object.parent;
						if ( parent ) {
							objectsToRemove.push( { object: object, parent: parent } );
						}
					}
					if ( object.type === 'BatchedRenderer' || object.name === 'BatchedRenderer' ) {
						const parent = object.parent;
						if ( parent ) {
							objectsToRemove.push( { object: object, parent: parent } );
						}
					}
				} );
				for ( let i = 0; i < objectsToRemove.length; i++ ) {
					const item = objectsToRemove[ i ];
					if ( item.object && item.parent && item.parent.children ) {
						item.parent.remove( item.object );
						objectsToRestore.push( item );
					}
				}
			}
		} catch ( error ) {
			console.error( 'Error during scene traversal:', error );
			console.error( 'Scene value:', this.scene );
			console.error( 'Scene type:', typeof this.scene );
			if ( this.scene ) {
				console.error( 'Scene traverse type:', typeof this.scene.traverse );
			}
		}

		//

		const result = {

			metadata: {},
			project: {
				shadows: this.config.getKey( 'project/renderer/shadows' ),
				shadowType: this.config.getKey( 'project/renderer/shadowType' ),
				toneMapping: this.config.getKey( 'project/renderer/toneMapping' ),
				toneMappingExposure: this.config.getKey( 'project/renderer/toneMappingExposure' )
			},
			camera: this.viewportCamera.toJSON(),
			controls: this.controls.toJSON(),
			scene: ( this.scene && typeof this.scene.toJSON === 'function' ) ? this.scene.toJSON() : new THREE.Scene().toJSON(),
			scripts: this.scripts,
			history: this.history.toJSON(),
			environment: environment

		};

		
		for ( let i = 0; i < objectsToRestore.length; i++ ) {
			const item = objectsToRestore[ i ];
			item.parent.add( item.object );
		}

		
		
		if ( result.scene && result.scene.images && Array.isArray( result.scene.images ) ) {
			result.scene.images = result.scene.images.map( function( image ) {
				if ( image && image.url && ( image.url.startsWith( 'data:' ) || image.url.startsWith( 'blob:' ) ) ) {
					
					const imageUuid = image.uuid;
					
					let assetPath = null;
					if ( result.scene.textures && Array.isArray( result.scene.textures ) ) {
						for ( const texture of result.scene.textures ) {
							if ( texture.userData && texture.userData.assetPath ) {
								let textureImageUuid = null;
								if ( typeof texture.image === 'string' ) {
									textureImageUuid = texture.image;
								} else if ( typeof texture.image === 'object' && texture.image.uuid ) {
									textureImageUuid = texture.image.uuid;
								}
								if ( textureImageUuid === imageUuid ) {
									assetPath = texture.userData.assetPath;
									break;
								}
							}
						}
					}
					
					if ( assetPath && assetPath.startsWith( '/' ) ) {
						assetPath = assetPath.slice( 1 );
					}
					
					return {
						uuid: imageUuid,
						url: assetPath || 'assets/textures/' + imageUuid + '.png'
					};
				}
				return image;
			} );
		}

		
		if ( result.scene && result.scene.textures && Array.isArray( result.scene.textures ) ) {
			
			const textureMap = {};
			this.scene.traverse( function( object ) {
				if ( object.material ) {
					const materials = Array.isArray( object.material ) ? object.material : [ object.material ];
					materials.forEach( function( material ) {
						if ( material ) {
							
							const textureProps = [ 'map', 'normalMap', 'bumpMap', 'roughnessMap', 'metalnessMap', 
								'aoMap', 'emissiveMap', 'displacementMap', 'alphaMap', 'envMap', 
								'lightMap', 'clearcoatMap', 'clearcoatNormalMap', 'clearcoatRoughnessMap',
								'sheenColorMap', 'sheenRoughnessMap', 'specularColorMap', 'specularIntensityMap',
								'transmissionMap', 'thicknessMap', 'iridescenceMap', 'iridescenceThicknessMap' ];
							
							textureProps.forEach( function( prop ) {
								const texture = material[ prop ];
								if ( texture && texture.isTexture && texture.uuid ) {
									textureMap[ texture.uuid ] = texture;
								}
							} );
						}
					} );
				}
			} );

			
			result.scene.textures = result.scene.textures.map( function( textureJson ) {
				const texture = textureMap[ textureJson.uuid ];
				if ( texture && texture.assetPath ) {
					if ( ! textureJson.userData ) {
						textureJson.userData = {};
					}
					let normalizedAssetPath = texture.assetPath;
					if ( normalizedAssetPath.startsWith( '/' ) ) {
						normalizedAssetPath = normalizedAssetPath.slice( 1 );
					}
					textureJson.userData.assetPath = normalizedAssetPath;
					
					
					let imageUuid = null;
					if ( textureJson.image && typeof textureJson.image === 'string' ) {
						imageUuid = textureJson.image;
					} else if ( textureJson.image && typeof textureJson.image === 'object' ) {
						imageUuid = textureJson.image.uuid;
					}
					
					if ( imageUuid && result.scene.images ) {
						const imageIndex = result.scene.images.findIndex( img => img.uuid === imageUuid );
						if ( imageIndex >= 0 ) {
							const currentUrl = result.scene.images[ imageIndex ].url;
							if ( !currentUrl || currentUrl.startsWith( 'data:' ) || currentUrl.startsWith( 'blob:' ) || currentUrl.includes( imageUuid + '.png' ) ) {
								result.scene.images[ imageIndex ].url = normalizedAssetPath;
							}
						}
					}
				}
				return textureJson;
			} );
		}

		return result;

	},

	objectByUuid: function ( uuid ) {

		return this.scene.getObjectByProperty( 'uuid', uuid, true );

	},

	execute: function ( cmd, optionalName ) {

		this.history.execute( cmd, optionalName );

	},

	undo: function () {

		this.history.undo();

	},

	redo: function () {

		this.history.redo();

	},

	setupKeyboardShortcuts: function () {

		const input = this.input;
		const signals = this.signals;

		input.register( 'KeyZ', () => {
			this.undo();
		}, { ctrl: true } );

		input.register( 'KeyZ', () => {
			this.redo();
		}, { ctrl: true, shift: true } );

		input.register( 'KeyG', () => {
			signals.transformModeChanged.dispatch( 'translate' );
		} );

		input.register( 'KeyR', () => {
			signals.transformModeChanged.dispatch( 'rotate' );
		} );

		input.register( 'KeyS', () => {
			signals.transformModeChanged.dispatch( 'scale' );
		} );

		input.register( 'KeyF', () => {
			if ( this.selected !== null ) {
				this.focus( this.selected );
			}
		} );

		input.register( 'KeyC', () => {
			if ( window.selectedAsset ) {
				this.assetClipboard = { type: window.selectedAsset.type, path: window.selectedAsset.path, name: window.selectedAsset.name };
			} else if ( this.selected !== null && this.selected.parent !== null ) {
				const cmd = new CopyObjectCommand( this, this.selected );
				cmd.execute();
			}
		}, { ctrl: true } );

		input.register( 'KeyX', () => {
			if ( window.selectedAsset ) {
				this.assetClipboard = { type: window.selectedAsset.type, path: window.selectedAsset.path, name: window.selectedAsset.name };
				this.deleteAsset( window.selectedAsset.path );
			} else if ( this.selected !== null && this.selected.parent !== null ) {
				this.execute( new CutObjectCommand( this, this.selected ) );
			}
		}, { ctrl: true } );

		input.register( 'KeyV', () => {
			if ( this.assetClipboard && window.currentFolder ) {
				this.pasteAsset( this.assetClipboard, window.currentFolder.path );
			} else if ( this.clipboard !== null ) {
				const parent = this.selected !== null && this.selected !== this.scene ? this.selected : null;
				this.execute( new PasteObjectCommand( this, parent ) );
			}
		}, { ctrl: true } );

		input.register( 'Delete', () => {
			if ( window.selectedAsset ) {
				this.deleteAsset( window.selectedAsset.path );
			} else if ( this.selected !== null && this.selected.parent !== null ) {
				this.execute( new RemoveObjectCommand( this, this.selected ) );
			}
		} );

		input.register( 'Backspace', () => {
			if ( window.selectedAsset ) {
				this.deleteAsset( window.selectedAsset.path );
			} else if ( this.selected !== null && this.selected.parent !== null ) {
				this.execute( new RemoveObjectCommand( this, this.selected ) );
			}
		} );

		input.register( 'Escape', () => {
			if ( this.cancelTransform ) {
				this.cancelTransform();
			}
		}, { ignoreInputs: false } );

	},

	deleteAsset: function ( assetPath ) {

		if ( !assetPath ) return;

		const scope = this;
		const isTauri = typeof window !== 'undefined' && window.__TAURI__;
		const invoke = isTauri ? window.__TAURI__.core.invoke : null;

		if ( !isTauri || !invoke ) return;

		const projectPath = scope.storage && scope.storage.getProjectPath ? scope.storage.getProjectPath() : null;
		if ( !projectPath ) return;

		let path = assetPath;
		if ( path.startsWith( '/' ) ) {
			path = path.slice( 1 );
		}
		path = path.replace( /\/+/g, '/' );

		( async function () {

			try {
				await invoke( 'delete_asset_file', {
					projectPath: projectPath,
					assetPath: path
				} );

				window.selectedAsset = null;
				scope.signals.sceneGraphChanged.dispatch();

			} catch ( error ) {
				console.error( '[Editor] Failed to delete asset:', error );
			}

		} )();

	},

	pasteAsset: function ( clipboard, targetFolderPath ) {

		if ( !clipboard || !targetFolderPath ) return;

		const scope = this;
		const isTauri = typeof window !== 'undefined' && window.__TAURI__;
		const invoke = isTauri ? window.__TAURI__.core.invoke : null;

		if ( !isTauri || !invoke ) return;

		const projectPath = scope.storage && scope.storage.getProjectPath ? scope.storage.getProjectPath() : null;
		if ( !projectPath ) return;

		( async function () {

			try {
				const sourcePath = clipboard.path.startsWith( '/' ) ? clipboard.path.slice( 1 ) : clipboard.path;
				const targetPath = targetFolderPath === '/' ? clipboard.name : targetFolderPath + '/' + clipboard.name;

				const sourceData = await invoke( 'read_asset_file', {
					projectPath: projectPath,
					assetPath: sourcePath
				} );

				await invoke( 'write_asset_file', {
					projectPath: projectPath,
					assetPath: targetPath,
					content: Array.from( new Uint8Array( sourceData ) )
				} );

				scope.signals.sceneGraphChanged.dispatch();

			} catch ( error ) {
				console.error( '[Editor] Failed to paste asset:', error );
			}

		} )();

	},

	utils: {

		save: save,
		saveArrayBuffer: saveArrayBuffer,
		saveString: saveString,
		formatNumber: formatNumber

	}

};

const link = document.createElement( 'a' );

function save( blob, filename ) {

	if ( link.href ) {

		URL.revokeObjectURL( link.href );

	}

	link.href = URL.createObjectURL( blob );
	link.download = filename || 'data.json';
	link.dispatchEvent( new MouseEvent( 'click' ) );

}

function saveArrayBuffer( buffer, filename ) {

	save( new Blob( [ buffer ], { type: 'application/octet-stream' } ), filename );

}

function saveString( text, filename ) {

	save( new Blob( [ text ], { type: 'text/plain' } ), filename );

}

function formatNumber( number ) {

	return new Intl.NumberFormat( 'en-us', { useGrouping: true } ).format( number );

}

export { Editor };
