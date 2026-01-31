import * as THREE from 'three';

/**
 * Model Parser - Handles all supported model formats (GLB, GLTF, FBX, OBJ)
 * Extracts contents from model files and creates virtual folder structures
 * Uses the same loading pattern as the Three.js editor's Loader.js
 */
class ModelParser {

	/**
	 * Creates a GLTFLoader with proper setup (DRACO, KTX2, Meshopt)
	 */
	static async createGLTFLoader( manager = null ) {

		const { GLTFLoader } = await import( 'three/addons/loaders/GLTFLoader.js' );
		const { DRACOLoader } = await import( 'three/addons/loaders/DRACOLoader.js' );
		const { KTX2Loader } = await import( 'three/addons/loaders/KTX2Loader.js' );
		const { MeshoptDecoder } = await import( 'three/addons/libs/meshopt_decoder.module.js' );

		const dracoLoader = new DRACOLoader();
		dracoLoader.setDecoderPath( '../examples/jsm/libs/draco/gltf/' );

		const ktx2Loader = new KTX2Loader( manager );
		ktx2Loader.setTranscoderPath( '../examples/jsm/libs/basis/' );

		
		if ( typeof window !== 'undefined' && window.editor && window.editor.signals ) {
			window.editor.signals.rendererDetectKTX2Support.dispatch( ktx2Loader );
		}

		const loader = new GLTFLoader( manager );
		loader.setDRACOLoader( dracoLoader );
		loader.setKTX2Loader( ktx2Loader );
		loader.setMeshoptDecoder( MeshoptDecoder );

		return loader;

	}

	/**
	 * Determines the model format from file extension
	 */
	static getModelFormat( filePath ) {

		const ext = filePath.split( '.' ).pop()?.toLowerCase();
		
		if ( ext === 'glb' || ext === 'gltf' ) {
			return 'gltf';
		} else if ( ext === 'fbx' ) {
			return 'fbx';
		} else if ( ext === 'obj' ) {
			return 'obj';
		}
		
		return null;

	}

	/**
	 * Loads a model file and extracts its contents
	 * Supports: GLB, GLTF, FBX, OBJ
	 */
	static async parseModel( modelPath, modelName, projectPath ) {

		const format = this.getModelFormat( modelPath );
		
		if ( ! format ) {
			throw new Error( `Unsupported model format: ${modelPath}` );
		}

		
		const isTauri = typeof window !== 'undefined' && window.__TAURI__ && window.__TAURI__.core.invoke;
		let fileBytes;
		
		if ( isTauri && projectPath ) {
			const assetPath = modelPath.startsWith( '/' ) ? modelPath.substring( 1 ) : modelPath;
			const assetBytes = await window.__TAURI__.core.invoke( 'read_asset_file', {
				projectPath: projectPath,
				assetPath: assetPath
			} );
			fileBytes = new Uint8Array( assetBytes );
		} else {
			throw new Error( 'Tauri is required to load model files' );
		}

		
		if ( format === 'gltf' ) {
			return await this.parseGLTF( fileBytes, modelPath, modelName );
		} else if ( format === 'fbx' ) {
			return await this.parseFBX( fileBytes, modelPath, modelName );
		} else if ( format === 'obj' ) {
			return await this.parseOBJ( fileBytes, modelPath, modelName );
		}

	}

	/**
	 * Parses GLB/GLTF files
	 */
	static async parseGLTF( fileBytes, modelPath, modelName ) {

		try {
			const loader = await this.createGLTFLoader();

			return new Promise( ( resolve, reject ) => {
				
				
				const ext = modelPath.split( '.' ).pop()?.toLowerCase();
				let parseData;
				
				if ( ext === 'glb' ) {
					
					parseData = fileBytes.buffer;
				} else {
					
					parseData = new TextDecoder().decode( fileBytes );
				}
				
				loader.parse( parseData, '', ( result ) => {
					const scene = result.scene;
					const contents = {
						geometries: [],
						textures: [],
						materials: [],
						model: scene,
						scenes: result.scenes || [],
						animations: result.animations || [],
						gltf: result
					};

					
					const geometryMap = new Map();
					scene.traverse( ( child ) => {
						if ( child.isMesh && child.geometry ) {
							const geoName = child.geometry.name || `Geometry_${geometryMap.size}`;
							if ( ! geometryMap.has( geoName ) ) {
								geometryMap.set( geoName, {
									name: geoName,
									geometry: child.geometry,
									uuid: THREE.MathUtils.generateUUID()
								} );
							}
						}
					} );
					contents.geometries = Array.from( geometryMap.values() );

					
					const textureMap = new Map();
					scene.traverse( ( child ) => {
						if ( child.isMesh && child.material ) {
							const materials = Array.isArray( child.material ) ? child.material : [ child.material ];
							materials.forEach( ( material ) => {
								const textureProps = [ 'map', 'normalMap', 'roughnessMap', 'metalnessMap', 
									'aoMap', 'emissiveMap', 'displacementMap', 'alphaMap', 'envMap', 
									'lightMap', 'clearcoatMap', 'clearcoatNormalMap', 'clearcoatRoughnessMap',
									'sheenColorMap', 'sheenRoughnessMap', 'specularColorMap', 'specularIntensityMap',
									'transmissionMap', 'thicknessMap', 'iridescenceMap', 'iridescenceThicknessMap' ];
								
								textureProps.forEach( ( prop ) => {
									const texture = material[ prop ];
									if ( texture && texture.isTexture ) {
										const texName = texture.name || `Texture_${textureMap.size}`;
										if ( ! textureMap.has( texName ) ) {
											textureMap.set( texName, {
												name: texName,
												texture: texture,
												uuid: THREE.MathUtils.generateUUID()
											} );
										}
									}
								} );
							} );
						}
					} );
					contents.textures = Array.from( textureMap.values() );

					
					const materialMap = new Map();
					scene.traverse( ( child ) => {
						if ( child.isMesh && child.material ) {
							const materials = Array.isArray( child.material ) ? child.material : [ child.material ];
							materials.forEach( ( material ) => {
								const matName = material.name || `Material_${materialMap.size}`;
								if ( ! materialMap.has( matName ) ) {
									materialMap.set( matName, {
										name: matName,
										material: material,
										uuid: THREE.MathUtils.generateUUID()
									} );
								}
							} );
						}
					} );
					contents.materials = Array.from( materialMap.values() );

					
					if ( loader.dracoLoader ) loader.dracoLoader.dispose();
					if ( loader.ktx2Loader ) loader.ktx2Loader.dispose();

					resolve( contents );
				}, ( error ) => {
					reject( error );
				} );
			} );

		} catch ( error ) {
			console.error( '[ModelParser] Failed to parse GLTF:', error );
			throw error;
		}

	}

	/**
	 * Parses FBX files
	 */
	static async parseFBX( fileBytes, modelPath, modelName ) {

		try {
			const { FBXLoader } = await import( 'three/addons/loaders/FBXLoader.js' );
			const loader = new FBXLoader();

			const object = loader.parse( fileBytes.buffer );

			const contents = {
				geometries: [],
				textures: [],
				materials: [],
				model: object,
				scenes: [],
				animations: []
			};

			
			const geometryMap = new Map();
			const textureMap = new Map();
			const materialMap = new Map();

			object.traverse( ( child ) => {
				if ( child.isMesh && child.geometry ) {
					const geoName = child.geometry.name || `Geometry_${geometryMap.size}`;
					if ( ! geometryMap.has( geoName ) ) {
						geometryMap.set( geoName, {
							name: geoName,
							geometry: child.geometry,
							uuid: THREE.MathUtils.generateUUID()
						} );
					}
				}

				if ( child.isMesh && child.material ) {
					const materials = Array.isArray( child.material ) ? child.material : [ child.material ];
					materials.forEach( ( material ) => {
						const matName = material.name || `Material_${materialMap.size}`;
						if ( ! materialMap.has( matName ) ) {
							materialMap.set( matName, {
								name: matName,
								material: material,
								uuid: THREE.MathUtils.generateUUID()
							} );
						}

						
						const textureProps = [ 'map', 'normalMap', 'roughnessMap', 'metalnessMap', 
							'aoMap', 'emissiveMap', 'displacementMap', 'alphaMap', 'envMap', 
							'lightMap', 'clearcoatMap', 'clearcoatNormalMap', 'clearcoatRoughnessMap',
							'sheenColorMap', 'sheenRoughnessMap', 'specularColorMap', 'specularIntensityMap',
							'transmissionMap', 'thicknessMap', 'iridescenceMap', 'iridescenceThicknessMap' ];
						
						textureProps.forEach( ( prop ) => {
							const texture = material[ prop ];
							if ( texture && texture.isTexture ) {
								const texName = texture.name || `Texture_${textureMap.size}`;
								if ( ! textureMap.has( texName ) ) {
									textureMap.set( texName, {
										name: texName,
										texture: texture,
										uuid: THREE.MathUtils.generateUUID()
									} );
								}
							}
						} );
					} );
				}
			} );

			contents.geometries = Array.from( geometryMap.values() );
			contents.textures = Array.from( textureMap.values() );
			contents.materials = Array.from( materialMap.values() );

			return contents;

		} catch ( error ) {
			console.error( '[ModelParser] Failed to parse FBX:', error );
			throw error;
		}

	}

	/**
	 * Parses OBJ files
	 */
	static async parseOBJ( fileBytes, modelPath, modelName ) {

		try {
			const { OBJLoader } = await import( 'three/addons/loaders/OBJLoader.js' );
			const loader = new OBJLoader();

			const text = new TextDecoder().decode( fileBytes );
			const object = loader.parse( text );

			const contents = {
				geometries: [],
				textures: [],
				materials: [],
				model: object,
				scenes: [],
				animations: []
			};

			
			const geometryMap = new Map();
			const textureMap = new Map();
			const materialMap = new Map();

			object.traverse( ( child ) => {
				if ( child.isMesh && child.geometry ) {
					const geoName = child.geometry.name || `Geometry_${geometryMap.size}`;
					if ( ! geometryMap.has( geoName ) ) {
						geometryMap.set( geoName, {
							name: geoName,
							geometry: child.geometry,
							uuid: THREE.MathUtils.generateUUID()
						} );
					}
				}

				if ( child.isMesh && child.material ) {
					const materials = Array.isArray( child.material ) ? child.material : [ child.material ];
					materials.forEach( ( material ) => {
						const matName = material.name || `Material_${materialMap.size}`;
						if ( ! materialMap.has( matName ) ) {
							materialMap.set( matName, {
								name: matName,
								material: material,
								uuid: THREE.MathUtils.generateUUID()
							} );
						}

						
						const textureProps = [ 'map', 'normalMap', 'roughnessMap', 'metalnessMap', 
							'aoMap', 'emissiveMap', 'displacementMap', 'alphaMap', 'envMap', 
							'lightMap', 'clearcoatMap', 'clearcoatNormalMap', 'clearcoatRoughnessMap',
							'sheenColorMap', 'sheenRoughnessMap', 'specularColorMap', 'specularIntensityMap',
							'transmissionMap', 'thicknessMap', 'iridescenceMap', 'iridescenceThicknessMap' ];
						
						textureProps.forEach( ( prop ) => {
							const texture = material[ prop ];
							if ( texture && texture.isTexture ) {
								const texName = texture.name || `Texture_${textureMap.size}`;
								if ( ! textureMap.has( texName ) ) {
									textureMap.set( texName, {
										name: texName,
										texture: texture,
										uuid: THREE.MathUtils.generateUUID()
									} );
								}
							}
						} );
					} );
				}
			} );

			contents.geometries = Array.from( geometryMap.values() );
			contents.textures = Array.from( textureMap.values() );
			contents.materials = Array.from( materialMap.values() );

			return contents;

		} catch ( error ) {
			console.error( '[ModelParser] Failed to parse OBJ:', error );
			throw error;
		}

	}

	/**
	 * Creates a virtual folder structure for model contents
	 * Everything is in one folder - no subfolders
	 */
	static createModelFolderStructure( modelFile, contents, projectPath ) {

		const ext = modelFile.name.split( '.' ).pop()?.toLowerCase();
		const baseName = modelFile.name.replace( /\.(glb|gltf|fbx|obj)$/i, '' );
		const modelFolder = {
			name: baseName,
			path: modelFile.path,
			type: 'model-container',
			expanded: false,
			files: [],
			children: [],
			originalFile: modelFile,
			modelContents: contents,
			modelPath: modelFile.path,
			projectPath: projectPath
		};

		
		contents.geometries.forEach( geo => {
			modelFolder.files.push( {
				name: geo.name + '.geo',
				path: modelFile.path + '/' + geo.name + '.geo',
				type: 'geometry',
				size: 0,
				isBinary: false,
				modelGeometry: geo,
				modelPath: modelFile.path,
				modelName: modelFile.name
			} );
		} );

		
		contents.textures.forEach( tex => {
			modelFolder.files.push( {
				name: tex.name + '.texture',
				path: modelFile.path + '/' + tex.name + '.texture',
				type: 'texture',
				size: 0,
				isBinary: true,
				modelTexture: tex,
				modelPath: modelFile.path,
				modelName: modelFile.name
			} );
		} );

		
		contents.materials.forEach( mat => {
			modelFolder.files.push( {
				name: mat.name + '.mat',
				path: modelFile.path + '/' + mat.name + '.mat',
				type: 'material',
				size: 0,
				isBinary: false,
				modelMaterial: mat,
				modelPath: modelFile.path,
				modelName: modelFile.name
			} );
		} );

		
		modelFolder.files.push( {
			name: baseName + '.mesh',
			path: modelFile.path + '/' + baseName + '.mesh',
			type: 'model',
			size: modelFile.size || 0,
			isBinary: true,
			modelObject: contents.model,
			modelPath: modelFile.path,
			modelName: modelFile.name,
			modelContents: contents
		} );

		return modelFolder;

	}

	/**
	 * Loads a geometry from a model file
	 */
	static async loadGeometryFromModel( geometryEntry, modelPath, projectPath ) {

		const format = this.getModelFormat( modelPath );
		if ( ! format ) {
			throw new Error( 'Unsupported model format' );
		}

		
		const isTauri = typeof window !== 'undefined' && window.__TAURI__ && window.__TAURI__.core.invoke;
		let fileBytes;
		
		if ( isTauri && projectPath ) {
			const assetPath = modelPath.startsWith( '/' ) ? modelPath.substring( 1 ) : modelPath;
			const assetBytes = await window.__TAURI__.core.invoke( 'read_asset_file', {
				projectPath: projectPath,
				assetPath: assetPath
			} );
			fileBytes = new Uint8Array( assetBytes );
		} else {
			throw new Error( 'Tauri is required to load model files' );
		}

		
		let scene;
		if ( format === 'gltf' ) {
			const loader = await this.createGLTFLoader();
			return new Promise( ( resolve, reject ) => {
				const ext = modelPath.split( '.' ).pop()?.toLowerCase();
				let parseData;
				
				if ( ext === 'glb' ) {
					parseData = fileBytes.buffer;
				} else {
					parseData = new TextDecoder().decode( fileBytes );
				}
				
				loader.parse( parseData, '', ( result ) => {
					scene = result.scene;
					
					
					let foundGeometry = null;
					scene.traverse( ( child ) => {
						if ( child.isMesh && child.geometry ) {
							const geoName = child.geometry.name || '';
							if ( geoName === geometryEntry.modelGeometry.name ) {
								foundGeometry = child.geometry.clone();
								foundGeometry.name = geometryEntry.modelGeometry.name;
								foundGeometry.assetPath = modelPath;
							}
						}
					} );

					if ( ! foundGeometry && geometryEntry.modelGeometry.geometry ) {
						foundGeometry = geometryEntry.modelGeometry.geometry.clone();
						foundGeometry.name = geometryEntry.modelGeometry.name;
						foundGeometry.assetPath = modelPath;
					}

					if ( loader.dracoLoader ) loader.dracoLoader.dispose();
					if ( loader.ktx2Loader ) loader.ktx2Loader.dispose();

					if ( foundGeometry ) {
						resolve( foundGeometry );
					} else {
						reject( new Error( 'Geometry not found in model' ) );
					}
				} );
			} );
		} else if ( format === 'fbx' ) {
			const { FBXLoader } = await import( 'three/addons/loaders/FBXLoader.js' );
			const loader = new FBXLoader();
			scene = loader.parse( fileBytes.buffer );
		} else if ( format === 'obj' ) {
			const { OBJLoader } = await import( 'three/addons/loaders/OBJLoader.js' );
			const loader = new OBJLoader();
			const text = new TextDecoder().decode( fileBytes );
			scene = loader.parse( text );
		}

		
		let foundGeometry = null;
		scene.traverse( ( child ) => {
			if ( child.isMesh && child.geometry ) {
				const geoName = child.geometry.name || '';
				if ( geoName === geometryEntry.modelGeometry.name && ! foundGeometry ) {
					foundGeometry = child.geometry.clone();
					foundGeometry.name = geometryEntry.modelGeometry.name;
					foundGeometry.assetPath = modelPath;
				}
			}
		} );

		if ( ! foundGeometry && geometryEntry.modelGeometry.geometry ) {
			foundGeometry = geometryEntry.modelGeometry.geometry.clone();
			foundGeometry.name = geometryEntry.modelGeometry.name;
			foundGeometry.assetPath = modelPath;
		}

		if ( foundGeometry ) {
			return foundGeometry;
		} else {
			throw new Error( 'Geometry not found in model' );
		}

	}

	/**
	 * Loads a texture from a model file
	 */
	static async loadTextureFromModel( textureEntry, modelPath, projectPath ) {

		const format = this.getModelFormat( modelPath );
		if ( ! format ) {
			throw new Error( 'Unsupported model format' );
		}

		
		const isTauri = typeof window !== 'undefined' && window.__TAURI__ && window.__TAURI__.core.invoke;
		let fileBytes;
		
		if ( isTauri && projectPath ) {
			const assetPath = modelPath.startsWith( '/' ) ? modelPath.substring( 1 ) : modelPath;
			const assetBytes = await window.__TAURI__.core.invoke( 'read_asset_file', {
				projectPath: projectPath,
				assetPath: assetPath
			} );
			fileBytes = new Uint8Array( assetBytes );
		} else {
			throw new Error( 'Tauri is required to load model files' );
		}

		
		let scene;
		if ( format === 'gltf' ) {
			const loader = await this.createGLTFLoader();
			return new Promise( ( resolve, reject ) => {
				const ext = modelPath.split( '.' ).pop()?.toLowerCase();
				let parseData;
				
				if ( ext === 'glb' ) {
					parseData = fileBytes.buffer;
				} else {
					parseData = new TextDecoder().decode( fileBytes );
				}
				
				loader.parse( parseData, '', ( result ) => {
					scene = result.scene;
					
					
					let foundTexture = null;
					scene.traverse( ( child ) => {
						if ( child.isMesh && child.material ) {
							const materials = Array.isArray( child.material ) ? child.material : [ child.material ];
							materials.forEach( ( material ) => {
								const textureProps = [ 'map', 'normalMap', 'roughnessMap', 'metalnessMap', 
									'aoMap', 'emissiveMap', 'displacementMap', 'alphaMap', 'envMap', 
									'lightMap', 'clearcoatMap', 'clearcoatNormalMap', 'clearcoatRoughnessMap',
									'sheenColorMap', 'sheenRoughnessMap', 'specularColorMap', 'specularIntensityMap',
									'transmissionMap', 'thicknessMap', 'iridescenceMap', 'iridescenceThicknessMap' ];
								
								textureProps.forEach( ( prop ) => {
									const texture = material[ prop ];
									if ( texture && texture.isTexture ) {
										const texName = texture.name || '';
										if ( texName === textureEntry.modelTexture.name && ! foundTexture ) {
											foundTexture = texture.clone();
											foundTexture.assetPath = modelPath;
											foundTexture.sourceFile = textureEntry.name;
										}
									}
								} );
							} );
						}
					} );

					if ( ! foundTexture && textureEntry.modelTexture.texture ) {
						foundTexture = textureEntry.modelTexture.texture.clone();
						foundTexture.assetPath = modelPath;
						foundTexture.sourceFile = textureEntry.name;
					}

					if ( loader.dracoLoader ) loader.dracoLoader.dispose();
					if ( loader.ktx2Loader ) loader.ktx2Loader.dispose();

					if ( foundTexture ) {
						resolve( foundTexture );
					} else {
						reject( new Error( 'Texture not found in model' ) );
					}
				} );
			} );
		} else if ( format === 'fbx' ) {
			const { FBXLoader } = await import( 'three/addons/loaders/FBXLoader.js' );
			const loader = new FBXLoader();
			scene = loader.parse( fileBytes.buffer );
		} else if ( format === 'obj' ) {
			const { OBJLoader } = await import( 'three/addons/loaders/OBJLoader.js' );
			const loader = new OBJLoader();
			const text = new TextDecoder().decode( fileBytes );
			scene = loader.parse( text );
		}

		
		let foundTexture = null;
		scene.traverse( ( child ) => {
			if ( child.isMesh && child.material ) {
				const materials = Array.isArray( child.material ) ? child.material : [ child.material ];
				materials.forEach( ( material ) => {
					const textureProps = [ 'map', 'normalMap', 'roughnessMap', 'metalnessMap', 
						'aoMap', 'emissiveMap', 'displacementMap', 'alphaMap', 'envMap', 
						'lightMap', 'clearcoatMap', 'clearcoatNormalMap', 'clearcoatRoughnessMap',
						'sheenColorMap', 'sheenRoughnessMap', 'specularColorMap', 'specularIntensityMap',
						'transmissionMap', 'thicknessMap', 'iridescenceMap', 'iridescenceThicknessMap' ];
					
					textureProps.forEach( ( prop ) => {
						const texture = material[ prop ];
						if ( texture && texture.isTexture ) {
							const texName = texture.name || '';
							if ( texName === textureEntry.modelTexture.name && ! foundTexture ) {
								foundTexture = texture.clone();
								foundTexture.assetPath = modelPath;
								foundTexture.sourceFile = textureEntry.name;
							}
						}
					} );
				} );
			}
		} );

		if ( ! foundTexture && textureEntry.modelTexture.texture ) {
			foundTexture = textureEntry.modelTexture.texture.clone();
			foundTexture.assetPath = modelPath;
			foundTexture.sourceFile = textureEntry.name;
		}

		if ( foundTexture ) {
			return foundTexture;
		} else {
			throw new Error( 'Texture not found in model' );
		}

	}

	/**
	 * Loads a material from a model file
	 */
	static async loadMaterialFromModel( materialEntry, modelPath, projectPath ) {

		const format = this.getModelFormat( modelPath );
		if ( ! format ) {
			throw new Error( 'Unsupported model format' );
		}

		
		const isTauri = typeof window !== 'undefined' && window.__TAURI__ && window.__TAURI__.core.invoke;
		let fileBytes;
		
		if ( isTauri && projectPath ) {
			const assetPath = modelPath.startsWith( '/' ) ? modelPath.substring( 1 ) : modelPath;
			const assetBytes = await window.__TAURI__.core.invoke( 'read_asset_file', {
				projectPath: projectPath,
				assetPath: assetPath
			} );
			fileBytes = new Uint8Array( assetBytes );
		} else {
			throw new Error( 'Tauri is required to load model files' );
		}

		
		let scene;
		if ( format === 'gltf' ) {
			const loader = await this.createGLTFLoader();
			return new Promise( ( resolve, reject ) => {
				const ext = modelPath.split( '.' ).pop()?.toLowerCase();
				let parseData;
				
				if ( ext === 'glb' ) {
					parseData = fileBytes.buffer;
				} else {
					parseData = new TextDecoder().decode( fileBytes );
				}
				
				loader.parse( parseData, '', ( result ) => {
					scene = result.scene;
					
					
					let foundMaterial = null;
					scene.traverse( ( child ) => {
						if ( child.isMesh && child.material ) {
							const materials = Array.isArray( child.material ) ? child.material : [ child.material ];
							materials.forEach( ( material ) => {
								const matName = material.name || '';
								if ( matName === materialEntry.modelMaterial.name && ! foundMaterial ) {
									foundMaterial = material.clone();
									foundMaterial.assetPath = modelPath;
									foundMaterial.sourceFile = materialEntry.name;
								}
							} );
						}
					} );

					if ( ! foundMaterial && materialEntry.modelMaterial.material ) {
						foundMaterial = materialEntry.modelMaterial.material.clone();
						foundMaterial.assetPath = modelPath;
						foundMaterial.sourceFile = materialEntry.name;
					}

					if ( loader.dracoLoader ) loader.dracoLoader.dispose();
					if ( loader.ktx2Loader ) loader.ktx2Loader.dispose();

					if ( foundMaterial ) {
						resolve( foundMaterial );
					} else {
						reject( new Error( 'Material not found in model' ) );
					}
				} );
			} );
		} else if ( format === 'fbx' ) {
			const { FBXLoader } = await import( 'three/addons/loaders/FBXLoader.js' );
			const loader = new FBXLoader();
			scene = loader.parse( fileBytes.buffer );
		} else if ( format === 'obj' ) {
			const { OBJLoader } = await import( 'three/addons/loaders/OBJLoader.js' );
			const loader = new OBJLoader();
			const text = new TextDecoder().decode( fileBytes );
			scene = loader.parse( text );
		}

		
		let foundMaterial = null;
		scene.traverse( ( child ) => {
			if ( child.isMesh && child.material ) {
				const materials = Array.isArray( child.material ) ? child.material : [ child.material ];
				materials.forEach( ( material ) => {
					const matName = material.name || '';
					if ( matName === materialEntry.modelMaterial.name && ! foundMaterial ) {
						foundMaterial = material.clone();
						foundMaterial.assetPath = modelPath;
						foundMaterial.sourceFile = materialEntry.name;
					}
				} );
			}
		} );

		if ( ! foundMaterial && materialEntry.modelMaterial.material ) {
			foundMaterial = materialEntry.modelMaterial.material.clone();
			foundMaterial.assetPath = modelPath;
			foundMaterial.sourceFile = materialEntry.name;
		}

		if ( foundMaterial ) {
			return foundMaterial;
		} else {
			throw new Error( 'Material not found in model' );
		}

	}

	/**
	 * Loads the full model from a model file
	 */
	static async loadModelFromFile( modelEntry, modelPath, projectPath ) {

		const format = this.getModelFormat( modelPath );
		if ( ! format ) {
			throw new Error( 'Unsupported model format' );
		}

		
		const isTauri = typeof window !== 'undefined' && window.__TAURI__ && window.__TAURI__.core.invoke;
		let fileBytes;
		
		if ( isTauri && projectPath ) {
			const assetPath = modelPath.startsWith( '/' ) ? modelPath.substring( 1 ) : modelPath;
			const assetBytes = await window.__TAURI__.core.invoke( 'read_asset_file', {
				projectPath: projectPath,
				assetPath: assetPath
			} );
			fileBytes = new Uint8Array( assetBytes );
		} else {
			throw new Error( 'Tauri is required to load model files' );
		}

		
		if ( format === 'gltf' ) {
			const loader = await this.createGLTFLoader();
			return new Promise( ( resolve, reject ) => {
				const ext = modelPath.split( '.' ).pop()?.toLowerCase();
				let parseData;
				
				if ( ext === 'glb' ) {
					parseData = fileBytes.buffer;
				} else {
					parseData = new TextDecoder().decode( fileBytes );
				}
				
				loader.parse( parseData, '', ( result ) => {
					const model = result.scene.clone();
					model.assetPath = modelPath;
					model.name = modelEntry.name.replace( /\.mesh$/, '' );
					
					
					if ( result.animations && result.animations.length > 0 ) {
						model.animations = result.animations;
					}

					if ( loader.dracoLoader ) loader.dracoLoader.dispose();
					if ( loader.ktx2Loader ) loader.ktx2Loader.dispose();

					resolve( model );
				} );
			} );
		} else if ( format === 'fbx' ) {
			const { FBXLoader } = await import( 'three/addons/loaders/FBXLoader.js' );
			const loader = new FBXLoader();
			const model = loader.parse( fileBytes.buffer );
			model.assetPath = modelPath;
			model.name = modelEntry.name.replace( /\.mesh$/, '' );
			return model;
		} else if ( format === 'obj' ) {
			const { OBJLoader } = await import( 'three/addons/loaders/OBJLoader.js' );
			const loader = new OBJLoader();
			const text = new TextDecoder().decode( fileBytes );
			const model = loader.parse( text );
			model.assetPath = modelPath;
			model.name = modelEntry.name.replace( /\.mesh$/, '' );
			return model;
		}

	}

}

export { ModelParser };
