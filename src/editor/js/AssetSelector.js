import * as THREE from 'three';
import { ModelParser } from './ModelParser.js';

class AssetSelector {

	constructor( editor ) {

		this.editor = editor;
		this.onSelectCallback = null;
		this.currentAsset = null;
		this.isProcessing = false;
		this.assetType = 'texture'; 
		
		this.acceptedExtensions = {
			texture: [ 'jpg', 'jpeg', 'png', 'gif', 'webp', 'hdr', 'exr', 'tga', 'ktx2' ],
			audio: [ 'mp3', 'wav', 'ogg', 'm4a', 'aac' ],
			model: [ 'glb', 'gltf', 'fbx', 'obj' ],
			geometry: [ 'json', 'glb', 'gltf', 'fbx', 'obj' ], 
			material: [ 'json' ] 
		};

		const overlay = document.createElement( 'div' );
		overlay.id = 'asset-selector-overlay';
		overlay.style.cssText = `
			position: fixed;
			top: 0;
			left: 0;
			right: 0;
			bottom: 0;
			background: rgba(0, 0, 0, 0.7);
			z-index: 10000;
			display: none;
			align-items: center;
			justify-content: center;
		`;
		document.body.appendChild( overlay );

		const modal = document.createElement( 'div' );
		modal.id = 'asset-selector-modal';
		modal.style.cssText = `
			background: #2a2a2a;
			border: 1px solid #444;
			border-radius: 4px;
			width: 80%;
			max-width: 900px;
			height: 80%;
			max-height: 700px;
			display: flex;
			flex-direction: column;
			box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
		`;
		overlay.appendChild( modal );

		const header = document.createElement( 'div' );
		header.style.cssText = `
			padding: 12px 16px;
			border-bottom: 1px solid #444;
			display: flex;
			align-items: center;
			justify-content: space-between;
		`;

		const title = document.createElement( 'h3' );
		title.textContent = 'Select Asset';
		title.style.cssText = 'margin: 0; color: #aaa; font-size: 14px; font-weight: 600;';
		header.appendChild( title );

		const closeBtn = document.createElement( 'button' );
		closeBtn.textContent = '×';
		closeBtn.style.cssText = `
			background: none;
			border: none;
			color: #aaa;
			font-size: 24px;
			cursor: pointer;
			padding: 0;
			width: 24px;
			height: 24px;
			line-height: 24px;
			text-align: center;
		`;
		closeBtn.addEventListener( 'click', () => this.hide() );
		header.appendChild( closeBtn );

		modal.appendChild( header );

		const toolbar = document.createElement( 'div' );
		toolbar.style.cssText = `
			padding: 8px 16px;
			border-bottom: 1px solid #444;
			display: flex;
			gap: 8px;
			align-items: center;
		`;

		const searchInput = document.createElement( 'input' );
		searchInput.type = 'text';
		searchInput.placeholder = 'Search assets...';
		searchInput.style.cssText = `
			flex: 1;
			padding: 6px 12px;
			background: #1e1e1e;
			border: 1px solid #444;
			border-radius: 3px;
			color: #aaa;
			font-size: 12px;
		`;
		searchInput.addEventListener( 'input', () => this.filterAssets( searchInput.value ) );
		toolbar.appendChild( searchInput );

		const importBtn = document.createElement( 'button' );
		importBtn.textContent = 'Import from File';
		importBtn.style.cssText = `
			padding: 6px 12px;
			background: #0088ff;
			border: none;
			border-radius: 3px;
			color: white;
			font-size: 12px;
			cursor: pointer;
			font-weight: 500;
		`;
		importBtn.addEventListener( 'mouseenter', () => {
			importBtn.style.background = '#0099ff';
		} );
		importBtn.addEventListener( 'mouseleave', () => {
			importBtn.style.background = '#0088ff';
		} );
		importBtn.addEventListener( 'click', () => this.importAsset() );
		toolbar.appendChild( importBtn );

		const clearBtn = document.createElement( 'button' );
		clearBtn.textContent = 'Clear';
		clearBtn.style.cssText = `
			padding: 6px 12px;
			background: #444;
			border: none;
			border-radius: 3px;
			color: #aaa;
			font-size: 12px;
			cursor: pointer;
		`;
		clearBtn.addEventListener( 'mouseenter', () => {
			clearBtn.style.background = '#555';
		} );
		clearBtn.addEventListener( 'mouseleave', () => {
			clearBtn.style.background = '#444';
		} );
		clearBtn.addEventListener( 'click', () => {
			if ( this.onSelectCallback ) {
				this.onSelectCallback( null );
			}
			this.hide();
		} );
		toolbar.appendChild( clearBtn );

		modal.appendChild( toolbar );

		const gridContainer = document.createElement( 'div' );
		gridContainer.id = 'asset-selector-grid';
		gridContainer.style.cssText = `
			flex: 1;
			overflow-y: auto;
			padding: 16px;
			display: grid;
			grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
			gap: 12px;
			align-content: start;
		`;
		modal.appendChild( gridContainer );

		this.overlay = overlay;
		this.modal = modal;
		this.gridContainer = gridContainer;
		this.searchInput = searchInput;
		this.title = title;
		this.importBtn = importBtn;

		overlay.addEventListener( 'click', ( e ) => {
			if ( e.target === overlay ) {
				this.hide();
			}
		} );

		document.addEventListener( 'keydown', ( e ) => {
			if ( e.key === 'Escape' && overlay.style.display === 'flex' ) {
				this.hide();
			}
		} );

	}

	show( onSelectCallback, currentAsset = null, assetType = 'texture' ) {

		this.assetType = assetType;
		this.onSelectCallback = onSelectCallback;
		this.currentAsset = currentAsset;
		
		
		const titles = {
			texture: 'Select Texture',
			audio: 'Select Audio',
			model: 'Select Model',
			geometry: 'Select Geometry',
			material: 'Select Material'
		};
		this.title.textContent = titles[ assetType ] || 'Select Asset';

		
		const acceptTypes = {
			texture: 'image/*,.hdr,.exr,.tga,.ktx2',
			audio: 'audio/*',
			model: '.glb,.gltf,.fbx,.obj',
			geometry: '.json,.glb,.gltf,.fbx,.obj',
			material: '.json'
		};
		if ( this.importBtn.dataset ) {
			this.importBtn.dataset.accept = acceptTypes[ assetType ] || '*';
		}

		this.overlay.style.display = 'flex';
		if ( this.searchInput ) {
			this.searchInput.value = '';
			this.searchInput.focus();
		}
		this.loadAssets();

	}

	hide() {

		this.overlay.style.display = 'none';
		this.onSelectCallback = null;
		this.currentAsset = null;
		this.isProcessing = false;

	}

	loadAssets() {

		this.gridContainer.innerHTML = '';

		
		if ( this.assetType === 'geometry' ) {
			const defaultGeometries = [
				'BoxGeometry', 'SphereGeometry', 'CylinderGeometry', 'PlaneGeometry',
				'ConeGeometry', 'TorusGeometry', 'TorusKnotGeometry', 'OctahedronGeometry',
				'TetrahedronGeometry', 'IcosahedronGeometry', 'DodecahedronGeometry',
				'CapsuleGeometry', 'CircleGeometry', 'RingGeometry', 'LatheGeometry'
			];

			defaultGeometries.forEach( geoType => {
				const defaultItem = document.createElement( 'div' );
				defaultItem.className = 'asset-item';
				defaultItem.style.cssText = `
					display: flex;
					flex-direction: column;
					align-items: center;
					padding: 8px;
					background: #1e1e1e;
					border: 2px solid transparent;
					border-radius: 4px;
					cursor: pointer;
					transition: all 0.15s ease;
				`;

				const thumbnail = document.createElement( 'div' );
				thumbnail.textContent = '📦';
				thumbnail.style.cssText = `
					width: 100%;
					aspect-ratio: 1;
					background: #2a2a2a;
					border-radius: 3px;
					overflow: hidden;
					display: flex;
					align-items: center;
					justify-content: center;
					margin-bottom: 6px;
					font-size: 32px;
				`;
				defaultItem.appendChild( thumbnail );

				const name = document.createElement( 'div' );
				name.textContent = geoType;
				name.style.cssText = `
					font-size: 11px;
					color: #aaa;
					text-align: center;
					word-break: break-word;
					width: 100%;
				`;
				defaultItem.appendChild( name );

				defaultItem.addEventListener( 'click', () => {
					this.selectAsset( {
						type: 'default-geometry',
						geometryType: geoType,
						name: geoType
					} );
				} );

				this.gridContainer.appendChild( defaultItem );
			} );
		}

		if ( this.assetType === 'material' ) {
			const defaultMaterials = [
				'LineBasicMaterial', 'LineDashedMaterial', 'MeshBasicMaterial',
				'MeshDepthMaterial', 'MeshNormalMaterial', 'MeshLambertMaterial',
				'MeshMatcapMaterial', 'MeshPhongMaterial', 'MeshToonMaterial',
				'MeshStandardMaterial', 'MeshPhysicalMaterial', 'RawShaderMaterial',
				'ShaderMaterial', 'ShadowMaterial', 'SpriteMaterial', 'PointsMaterial'
			];

			defaultMaterials.forEach( matType => {
				const defaultItem = document.createElement( 'div' );
				defaultItem.className = 'asset-item';
				defaultItem.style.cssText = `
					display: flex;
					flex-direction: column;
					align-items: center;
					padding: 8px;
					background: #1e1e1e;
					border: 2px solid transparent;
					border-radius: 4px;
					cursor: pointer;
					transition: all 0.15s ease;
				`;

				const thumbnail = document.createElement( 'div' );
				thumbnail.textContent = '🎨';
				thumbnail.style.cssText = `
					width: 100%;
					aspect-ratio: 1;
					background: #2a2a2a;
					border-radius: 3px;
					overflow: hidden;
					display: flex;
					align-items: center;
					justify-content: center;
					margin-bottom: 6px;
					font-size: 32px;
				`;
				defaultItem.appendChild( thumbnail );

				const name = document.createElement( 'div' );
				name.textContent = matType;
				name.style.cssText = `
					font-size: 11px;
					color: #aaa;
					text-align: center;
					word-break: break-word;
					width: 100%;
				`;
				defaultItem.appendChild( name );

				defaultItem.addEventListener( 'click', () => {
					this.selectAsset( {
						type: 'default-material',
						materialType: matType,
						name: matType
					} );
				} );

				this.gridContainer.appendChild( defaultItem );
			} );
		}

		const assets = this.getAllAssetsFromProject( this.assetType );

		if ( assets.length === 0 && this.assetType !== 'geometry' && this.assetType !== 'material' ) {
			const emptyMessage = document.createElement( 'div' );
			emptyMessage.textContent = `No ${this.assetType} assets found in project. Import some files to get started.`;
			emptyMessage.style.cssText = `
				grid-column: 1 / -1;
				text-align: center;
				color: #888;
				padding: 40px 20px;
				font-size: 13px;
			`;
			this.gridContainer.appendChild( emptyMessage );
			return;
		}

		assets.forEach( asset => {
			const item = this.createAssetItem( asset );
			this.gridContainer.appendChild( item );
		} );

	}

	getAllAssetsFromProject( assetType ) {

		const assets = [];
		const assetsRoot = window.assetsRoot;

		if ( ! assetsRoot ) return assets;

		const extensions = this.acceptedExtensions[ assetType ] || [];
		if ( extensions.length === 0 ) return assets;

		const traverse = ( folder ) => {
			
			folder.files.forEach( file => {
				const ext = file.name.split( '.' ).pop()?.toLowerCase();
				
				
				if ( file.isModelContainer && file.modelContents ) {
					
					if ( assetType === 'geometry' && file.modelContents.geometries ) {
						file.modelContents.geometries.forEach( geo => {
							assets.push( {
								name: geo.name,
								path: file.path + '/Geometries/' + geo.name,
								type: 'geometry',
								extension: 'geometry',
								modelFile: file,
								modelGeometry: geo,
								isModelContent: true
							} );
						} );
					}
					if ( assetType === 'texture' && file.modelContents.textures ) {
						file.modelContents.textures.forEach( tex => {
							assets.push( {
								name: tex.name,
								path: file.path + '/Textures/' + tex.name,
								type: 'texture',
								extension: 'texture',
								modelFile: file,
								modelTexture: tex,
								isModelContent: true
							} );
						} );
					}
					if ( assetType === 'material' && file.modelContents.materials ) {
						file.modelContents.materials.forEach( mat => {
							assets.push( {
								name: mat.name,
								path: file.path + '/Materials/' + mat.name,
								type: 'material',
								extension: 'material',
								modelFile: file,
								modelMaterial: mat,
								isModelContent: true
							} );
						} );
					}
					if ( assetType === 'model' && file.modelContents.model ) {
						const ext = file.name.split( '.' ).pop()?.toLowerCase();
						assets.push( {
							name: file.name.replace( /\.(glb|gltf|fbx|obj)$/i, '' ),
							path: file.path + '/' + file.name.replace( /\.(glb|gltf|fbx|obj)$/i, '.model' ),
							type: 'model',
							extension: 'model',
							modelFile: file,
							modelObject: file.modelContents.model,
							isModelContent: true
						} );
					}
				} else if ( extensions.includes( ext ) ) {
					
					assets.push( {
						name: file.name,
						path: file.path,
						url: file.url,
						content: file.content,
						folder: folder.path,
						type: assetType,
						extension: ext
					} );
				}
			} );

			
			if ( folder.type === 'model-container' && folder.expanded ) {
				
				folder.files.forEach( file => {
					if ( file.type === assetType || ( assetType === 'model' && file.type === 'model' ) ) {
						assets.push( {
							name: file.name,
							path: file.path,
							type: file.type,
							extension: file.name.split( '.' ).pop()?.toLowerCase(),
							modelFile: folder.originalFile,
							modelGeometry: file.modelGeometry,
							modelTexture: file.modelTexture,
							modelMaterial: file.modelMaterial,
							modelObject: file.modelObject,
							modelContents: file.modelContents,
							isModelContent: true
						} );
					}
				} );
			}

			folder.children.forEach( child => traverse( child ) );
		};

		traverse( assetsRoot );

		return assets;

	}

	createAssetItem( asset ) {

		const item = document.createElement( 'div' );
		item.className = 'asset-item';
		item.draggable = true;
		item.style.cssText = `
			display: flex;
			flex-direction: column;
			align-items: center;
			padding: 8px;
			background: #1e1e1e;
			border: 2px solid transparent;
			border-radius: 4px;
			cursor: pointer;
			transition: all 0.15s ease;
		`;

		
		item.dataset.assetPath = asset.path;
		item.dataset.assetName = asset.name;
		item.dataset.assetType = asset.type;

		const thumbnail = document.createElement( 'div' );
		thumbnail.style.cssText = `
			width: 100%;
			aspect-ratio: 1;
			background: #2a2a2a;
			border-radius: 3px;
			overflow: hidden;
			display: flex;
			align-items: center;
			justify-content: center;
			margin-bottom: 6px;
		`;

		
		if ( asset.type === 'texture' && ( asset.url || asset.content ) ) {
			const img = document.createElement( 'img' );
			img.src = asset.url || asset.content;
			img.style.cssText = `
				width: 100%;
				height: 100%;
				object-fit: cover;
			`;
			img.onerror = () => {
				thumbnail.textContent = '🖼️';
				thumbnail.style.fontSize = '32px';
			};
			thumbnail.appendChild( img );
		} else if ( asset.type === 'audio' ) {
			thumbnail.textContent = '🔊';
			thumbnail.style.fontSize = '32px';
		} else if ( asset.type === 'model' ) {
			thumbnail.textContent = '📦';
			thumbnail.style.fontSize = '32px';
		} else if ( asset.type === 'geometry' ) {
			thumbnail.textContent = '📐';
			thumbnail.style.fontSize = '32px';
		} else if ( asset.type === 'material' ) {
			thumbnail.textContent = '🎨';
			thumbnail.style.fontSize = '32px';
		} else {
			thumbnail.textContent = '📄';
			thumbnail.style.fontSize = '32px';
		}

		item.appendChild( thumbnail );

		const name = document.createElement( 'div' );
		name.textContent = asset.name;
		name.style.cssText = `
			font-size: 11px;
			color: #aaa;
			text-align: center;
			word-break: break-word;
			width: 100%;
			overflow: hidden;
			text-overflow: ellipsis;
			display: -webkit-box;
			-webkit-line-clamp: 2;
			-webkit-box-orient: vertical;
		`;
		name.title = asset.name;
		item.appendChild( name );

		item.addEventListener( 'mouseenter', () => {
			item.style.background = '#333';
			item.style.borderColor = '#0088ff';
		} );

		item.addEventListener( 'mouseleave', () => {
			item.style.background = '#1e1e1e';
			item.style.borderColor = 'transparent';
		} );

		item.addEventListener( 'click', () => {
			this.selectAsset( asset );
		} );

		
		item.addEventListener( 'dragstart', ( e ) => {
			e.dataTransfer.effectAllowed = 'copy';
			e.dataTransfer.setData( 'text/plain', JSON.stringify( {
				path: asset.path,
				name: asset.name,
				type: asset.type
			} ) );
		} );

		return item;

	}

	async selectAsset( assetData ) {

		if ( ! this.onSelectCallback ) return;

		if ( this.isProcessing ) return;

		try {

			this.isProcessing = true;

			const callback = this.onSelectCallback;

			if ( typeof callback !== 'function' ) {
				console.error( 'No valid callback function provided' );
				this.isProcessing = false;
				return;
			}

			
			if ( assetData.type === 'texture' ) {
				await this.selectTexture( assetData, callback );
			} else if ( assetData.type === 'audio' ) {
				await this.selectAudio( assetData, callback );
			} else if ( assetData.type === 'model' ) {
				await this.selectModel( assetData, callback );
			} else if ( assetData.type === 'geometry' || assetData.type === 'default-geometry' ) {
				await this.selectGeometry( assetData, callback );
			} else if ( assetData.type === 'material' || assetData.type === 'default-material' ) {
				await this.selectMaterial( assetData, callback );
			} else {
				console.warn( 'Unknown asset type:', assetData.type );
				this.isProcessing = false;
			}

		} catch ( error ) {
			this.isProcessing = false;
			console.error( 'Error selecting asset:', error );
			alert( 'Failed to select asset: ' + assetData.name );
		}

	}

	async selectTexture( textureData, callback ) {

		
		if ( textureData.isModelContent && textureData.modelFile && textureData.modelTexture ) {
			try {
				const isTauri = typeof window !== 'undefined' && window.__TAURI__ && window.__TAURI__.core.invoke;
				const projectPath = this.editor.storage && this.editor.storage.getProjectPath ? this.editor.storage.getProjectPath() : null;
				
				if ( ! projectPath ) {
					throw new Error( 'No project path available' );
				}

				const modelPath = textureData.modelFile.path;
				const texture = await ModelParser.loadTextureFromModel( textureData, modelPath, projectPath );
				texture.assetPath = textureData.modelFile.path;
				texture.sourceFile = textureData.name;
				this.isProcessing = false;
				callback( texture );
				this.hide();
				return;
			} catch ( error ) {
				console.error( '[AssetSelector] Failed to load texture from model:', error );
				this.isProcessing = false;
				return;
			}
		}

		const isTauri = typeof window !== 'undefined' && window.__TAURI__ && window.__TAURI__.core.invoke;
		const isExistingAsset = textureData.path && textureData.path !== '';
		
		if ( isExistingAsset && isTauri && this.editor.storage && this.editor.storage.getProjectPath ) {
			const projectPath = this.editor.storage.getProjectPath();
			const assetPath = textureData.path.startsWith( '/' ) ? textureData.path.substring( 1 ) : textureData.path;
			
			try {
				const assetBytes = await window.__TAURI__.core.invoke( 'read_asset_file', {
					projectPath: projectPath,
					assetPath: assetPath
				} );
				
				const uint8Array = new Uint8Array( assetBytes );
				const blob = new Blob( [ uint8Array ] );
				const blobUrl = URL.createObjectURL( blob );
				
				const ext = textureData.extension || textureData.name.split( '.' ).pop()?.toLowerCase();
				
				if ( ext === 'hdr' || ext === 'pic' ) {
					const { HDRLoader } = await import( 'three/addons/loaders/HDRLoader.js' );
					const loader = new HDRLoader();
					loader.load( blobUrl, ( hdrTexture ) => {
						hdrTexture.sourceFile = textureData.name;
						hdrTexture.assetPath = textureData.path;
						this.isProcessing = false;
						callback( hdrTexture );
						this.hide();
					} );
					return;
				} else if ( ext === 'tga' ) {
					const { TGALoader } = await import( 'three/addons/loaders/TGALoader.js' );
					const loader = new TGALoader();
					loader.load( blobUrl, ( texture ) => {
						texture.colorSpace = THREE.SRGBColorSpace;
						texture.sourceFile = textureData.name;
						texture.assetPath = textureData.path;
						this.isProcessing = false;
						callback( texture );
						this.hide();
					} );
					return;
				} else if ( ext === 'ktx2' ) {
					const { KTX2Loader } = await import( 'three/addons/loaders/KTX2Loader.js' );
					const ktx2Loader = new KTX2Loader();
					ktx2Loader.setTranscoderPath( '../../examples/jsm/libs/basis/' );
					this.editor.signals.rendererDetectKTX2Support.dispatch( ktx2Loader );
					ktx2Loader.load( blobUrl, ( texture ) => {
						texture.colorSpace = THREE.SRGBColorSpace;
						texture.sourceFile = textureData.name;
						texture.assetPath = textureData.path;
						texture.needsUpdate = true;
						this.isProcessing = false;
						callback( texture );
						this.hide();
						ktx2Loader.dispose();
					} );
					return;
				} else if ( ext === 'exr' ) {
					const { EXRLoader } = await import( 'three/addons/loaders/EXRLoader.js' );
					const exrLoader = new EXRLoader();
					exrLoader.load( blobUrl, ( texture ) => {
						texture.sourceFile = textureData.name;
						texture.assetPath = textureData.path;
						texture.needsUpdate = true;
						this.isProcessing = false;
						callback( texture );
						this.hide();
					} );
					return;
				} else {
					const img = new Image();
					img.onload = () => {
						const texture = new THREE.Texture( img );
						texture.sourceFile = textureData.name;
						texture.assetPath = textureData.path;
						texture.colorSpace = THREE.SRGBColorSpace;
						if ( ! img.uuid ) {
							img.uuid = THREE.MathUtils.generateUUID();
						}
						texture.needsUpdate = true;
						this.isProcessing = false;
						callback( texture );
						this.hide();
					};
					img.src = blobUrl;
					return;
				}
			} catch ( error ) {
				console.error( '[AssetSelector] Failed to load texture via Tauri:', error );
				this.isProcessing = false;
			}
		}

		
		let textureUrl = textureData.url || textureData.content;
		if ( ! textureUrl ) {
			console.warn( 'No texture URL available for', textureData.name );
			this.isProcessing = false;
			return;
		}

		const image = new Image();
		image.crossOrigin = 'anonymous';
		
		image.onload = () => {
			if ( ! image.complete || image.naturalWidth === 0 ) {
				console.error( 'Image not fully loaded' );
				this.isProcessing = false;
				return;
			}
			
			if ( isExistingAsset ) {
				const texture = new THREE.Texture( image );
				texture.sourceFile = textureData.name;
				texture.assetPath = textureData.path;
				texture.colorSpace = THREE.SRGBColorSpace;
				if ( ! image.uuid ) {
					image.uuid = THREE.MathUtils.generateUUID();
				}
				texture.needsUpdate = true;
				this.isProcessing = false;
				callback( texture );
				this.hide();
			} else {
				
				const MAX_CANVAS_SIZE = 4096;
				let canvasWidth = image.width;
				let canvasHeight = image.height;
				
				if ( canvasWidth > MAX_CANVAS_SIZE || canvasHeight > MAX_CANVAS_SIZE ) {
					const scale = Math.min( MAX_CANVAS_SIZE / canvasWidth, MAX_CANVAS_SIZE / canvasHeight );
					canvasWidth = Math.floor( canvasWidth * scale );
					canvasHeight = Math.floor( canvasHeight * scale );
				}
				
				const canvas = document.createElement( 'canvas' );
				canvas.width = canvasWidth;
				canvas.height = canvasHeight;
				const ctx = canvas.getContext( '2d' );
				ctx.drawImage( image, 0, 0, canvasWidth, canvasHeight );
				
				const dataUrl = canvas.toDataURL( 'image/jpeg', 0.92 );
				const newImage = new Image();
				newImage.onload = () => {
					const texture = new THREE.Texture( newImage );
					texture.sourceFile = textureData.name;
					texture.colorSpace = THREE.SRGBColorSpace;
					texture.needsUpdate = true;
					this.isProcessing = false;
					callback( texture );
					this.hide();
				};
				newImage.src = dataUrl;
			}
		};
		
		image.onerror = ( error ) => {
			this.isProcessing = false;
			console.error( 'Error loading texture:', error );
			alert( 'Failed to load texture: ' + textureData.name );
		};
		
		image.src = textureUrl;

	}

	async selectAudio( assetData, callback ) {

		const isTauri = typeof window !== 'undefined' && window.__TAURI__ && window.__TAURI__.core.invoke;

		if ( isTauri && this.editor.storage && this.editor.storage.getProjectPath ) {
			const projectPath = this.editor.storage.getProjectPath();
			const assetPath = assetData.path.startsWith( '/' ) ? assetData.path.substring( 1 ) : assetData.path;

			try {
				const assetBytes = await window.__TAURI__.core.invoke( 'read_asset_file', {
					projectPath: projectPath,
					assetPath: assetPath
				} );

				const uint8Array = new Uint8Array( assetBytes );
				const blob = new Blob( [ uint8Array ] );
				const blobUrl = URL.createObjectURL( blob );

				const audio = new Audio( blobUrl );
				audio.assetPath = assetData.path;
				audio.sourceFile = assetData.name;

				this.isProcessing = false;
				callback( audio );
				this.hide();

			} catch ( error ) {
				console.error( '[AssetSelector] Failed to load audio asset:', error );
				this.isProcessing = false;
			}
		} else {
			const audio = new Audio( assetData.url || assetData.content );
			audio.assetPath = assetData.path;
			audio.sourceFile = assetData.name;
			this.isProcessing = false;
			callback( audio );
			this.hide();
		}

	}

	async selectModel( assetData, callback ) {

		
		if ( assetData.isModelContent && assetData.modelFile && assetData.modelObject ) {
			try {
				const isTauri = typeof window !== 'undefined' && window.__TAURI__ && window.__TAURI__.core.invoke;
				const projectPath = this.editor.storage && this.editor.storage.getProjectPath ? this.editor.storage.getProjectPath() : null;
				
				if ( ! projectPath ) {
					throw new Error( 'No project path available' );
				}

				const modelPath = assetData.modelFile.path;
				const model = await ModelParser.loadModelFromFile( assetData, modelPath, projectPath );
				this.isProcessing = false;
				callback( model );
				this.hide();
				return;
			} catch ( error ) {
				console.error( '[AssetSelector] Failed to load model from file:', error );
				this.isProcessing = false;
				return;
			}
		}

		const isTauri = typeof window !== 'undefined' && window.__TAURI__ && window.__TAURI__.core.invoke;

		if ( isTauri && this.editor.storage && this.editor.storage.getProjectPath ) {
			const projectPath = this.editor.storage.getProjectPath();
			const assetPath = assetData.path.startsWith( '/' ) ? assetData.path.substring( 1 ) : assetData.path;

			this.isProcessing = false;
			callback( {
				type: 'model',
				path: assetPath,
				name: assetData.name,
				extension: assetData.extension
			} );
			this.hide();
		} else {
			this.isProcessing = false;
			callback( {
				type: 'model',
				path: assetData.path,
				name: assetData.name,
				url: assetData.url,
				extension: assetData.extension
			} );
			this.hide();
		}

	}

	async selectGeometry( assetData, callback ) {

		
		if ( assetData.type === 'default-geometry' && assetData.geometryType ) {
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

			const GeometryClass = defaultGeometries[ assetData.geometryType ];
			if ( GeometryClass ) {
				let newGeometry;
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
				newGeometry.isGeometry = true;
				this.isProcessing = false;
				callback( newGeometry );
				this.hide();
				return;
			}
		}

		

		
		const isTauri = typeof window !== 'undefined' && window.__TAURI__ && window.__TAURI__.core.invoke;

		if ( isTauri && this.editor.storage && this.editor.storage.getProjectPath ) {
			const projectPath = this.editor.storage.getProjectPath();
			const assetPath = assetData.path.startsWith( '/' ) ? assetData.path.substring( 1 ) : assetData.path;

			try {
				const assetBytes = await window.__TAURI__.core.invoke( 'read_asset_file', {
					projectPath: projectPath,
					assetPath: assetPath
				} );

				const ext = assetData.extension || assetData.name.split( '.' ).pop()?.toLowerCase();
				
				if ( ext === 'json' || ext === 'geometry' ) {
					const text = new TextDecoder().decode( new Uint8Array( assetBytes ) );
					const geometryData = JSON.parse( text );
					const loader = new THREE.BufferGeometryLoader();
					const geometry = loader.parse( geometryData );
					geometry.assetPath = assetPath;
					geometry.sourceFile = assetData.name;
					geometry.isGeometry = true;
					this.isProcessing = false;
					callback( geometry );
					this.hide();
				} else {
					
					
					let arrayBuffer;
					if ( assetBytes instanceof ArrayBuffer ) {
						arrayBuffer = assetBytes;
					} else if ( assetBytes instanceof Uint8Array ) {
						
						arrayBuffer = assetBytes.buffer.slice( assetBytes.byteOffset, assetBytes.byteOffset + assetBytes.byteLength );
					} else {
						
						const uint8Array = new Uint8Array( assetBytes );
						arrayBuffer = uint8Array.buffer.slice( uint8Array.byteOffset, uint8Array.byteOffset + uint8Array.byteLength );
					}
					
					let loader;
					if ( ext === 'glb' || ext === 'gltf' ) {
						const { GLTFLoader } = await import( 'three/addons/loaders/GLTFLoader.js' );
						const { DRACOLoader } = await import( 'three/addons/loaders/DRACOLoader.js' );
						const { KTX2Loader } = await import( 'three/addons/loaders/KTX2Loader.js' );
						const { MeshoptDecoder } = await import( 'three/addons/libs/meshopt_decoder.module.js' );

						const dracoLoader = new DRACOLoader();
						dracoLoader.setDecoderPath( '../examples/jsm/libs/draco/gltf/' );

						const ktx2Loader = new KTX2Loader();
						ktx2Loader.setTranscoderPath( '../examples/jsm/libs/basis/' );

						if ( this.editor.signals ) {
							this.editor.signals.rendererDetectKTX2Support.dispatch( ktx2Loader );
						}

						loader = new GLTFLoader();
						loader.setDRACOLoader( dracoLoader );
						loader.setKTX2Loader( ktx2Loader );
						loader.setMeshoptDecoder( MeshoptDecoder );

						
						let parseData;
						if ( ext === 'glb' ) {
							
							parseData = arrayBuffer;
						} else {
							
							const uint8Array = new Uint8Array( arrayBuffer );
							parseData = new TextDecoder().decode( uint8Array );
						}

						loader.parse( parseData, '', ( result ) => {
							let loadedMesh = null;
							if ( result.scene ) {
								result.scene.traverse( ( child ) => {
									if ( child.isMesh && ! loadedMesh ) {
										loadedMesh = child;
									}
								} );
							}

							if ( loader.dracoLoader ) loader.dracoLoader.dispose();
							if ( loader.ktx2Loader ) loader.ktx2Loader.dispose();

							if ( loadedMesh && loadedMesh.geometry ) {
								const geometry = loadedMesh.geometry.clone();
								geometry.assetPath = assetPath;
								geometry.sourceFile = assetData.name;
								geometry.isGeometry = true;
								this.isProcessing = false;
								callback( geometry );
								this.hide();
							} else {
								this.isProcessing = false;
							}
						}, ( error ) => {
							console.error( 'Failed to parse model:', error );
							this.isProcessing = false;
						} );
					} else if ( ext === 'fbx' ) {
						const { FBXLoader } = await import( 'three/addons/loaders/FBXLoader.js' );
						loader = new FBXLoader();
						const result = loader.parse( arrayBuffer );
						
						let loadedMesh = null;
						if ( result ) {
							result.traverse( ( child ) => {
								if ( child.isMesh && ! loadedMesh ) {
									loadedMesh = child;
								}
							} );
						}

						if ( loadedMesh && loadedMesh.geometry ) {
							const geometry = loadedMesh.geometry.clone();
							geometry.assetPath = assetPath;
							geometry.sourceFile = assetData.name;
							geometry.isGeometry = true;
							this.isProcessing = false;
							callback( geometry );
							this.hide();
						} else {
							this.isProcessing = false;
						}
					} else if ( ext === 'obj' ) {
						const { OBJLoader } = await import( 'three/addons/loaders/OBJLoader.js' );
						loader = new OBJLoader();
						const uint8Array = new Uint8Array( arrayBuffer );
						const text = new TextDecoder().decode( uint8Array );
						const result = loader.parse( text );
						
						let loadedMesh = null;
						if ( result ) {
							result.traverse( ( child ) => {
								if ( child.isMesh && ! loadedMesh ) {
									loadedMesh = child;
								}
							} );
						}

						if ( loadedMesh && loadedMesh.geometry ) {
							const geometry = loadedMesh.geometry.clone();
							geometry.assetPath = assetPath;
							geometry.sourceFile = assetData.name;
							geometry.isGeometry = true;
							this.isProcessing = false;
							callback( geometry );
							this.hide();
						} else {
							this.isProcessing = false;
						}
					} else {
						this.isProcessing = false;
					}
				}
			} catch ( error ) {
				console.error( '[AssetSelector] Failed to load geometry asset:', error );
				this.isProcessing = false;
			}
		} else {
			try {
				if ( assetData.extension === 'json' || assetData.extension === 'geometry' ) {
					const response = await fetch( assetData.url || assetData.content );
					const geometryData = await response.json();
					const loader = new THREE.BufferGeometryLoader();
					const geometry = loader.parse( geometryData );
					geometry.assetPath = assetData.path;
					geometry.sourceFile = assetData.name;
					this.isProcessing = false;
					callback( geometry );
					this.hide();
				}
			} catch ( error ) {
				console.error( '[AssetSelector] Failed to load geometry:', error );
				this.isProcessing = false;
			}
		}

	}

	async selectMaterial( assetData, callback ) {

		
		if ( assetData.type === 'default-material' && assetData.materialType ) {
			const materialClassesList = {
				'LineBasicMaterial': THREE.LineBasicMaterial,
				'LineDashedMaterial': THREE.LineDashedMaterial,
				'MeshBasicMaterial': THREE.MeshBasicMaterial,
				'MeshDepthMaterial': THREE.MeshDepthMaterial,
				'MeshNormalMaterial': THREE.MeshNormalMaterial,
				'MeshLambertMaterial': THREE.MeshLambertMaterial,
				'MeshMatcapMaterial': THREE.MeshMatcapMaterial,
				'MeshPhongMaterial': THREE.MeshPhongMaterial,
				'MeshToonMaterial': THREE.MeshToonMaterial,
				'MeshStandardMaterial': THREE.MeshStandardMaterial,
				'MeshPhysicalMaterial': THREE.MeshPhysicalMaterial,
				'RawShaderMaterial': THREE.RawShaderMaterial,
				'ShaderMaterial': THREE.ShaderMaterial,
				'ShadowMaterial': THREE.ShadowMaterial,
				'SpriteMaterial': THREE.SpriteMaterial,
				'PointsMaterial': THREE.PointsMaterial
			};

			const MaterialClass = materialClassesList[ assetData.materialType ];
			if ( MaterialClass ) {
				const newMaterial = new MaterialClass();
				newMaterial.name = assetData.materialType;
				newMaterial.isMaterial = true;
				this.isProcessing = false;
				callback( newMaterial );
				this.hide();
				return;
			}
		}

		

		const isTauri = typeof window !== 'undefined' && window.__TAURI__ && window.__TAURI__.core.invoke;

		if ( isTauri && this.editor.storage && this.editor.storage.getProjectPath ) {
			const projectPath = this.editor.storage.getProjectPath();
			const assetPath = assetData.path.startsWith( '/' ) ? assetData.path.substring( 1 ) : assetData.path;

			try {
				const assetBytes = await window.__TAURI__.core.invoke( 'read_asset_file', {
					projectPath: projectPath,
					assetPath: assetPath
				} );

				const text = new TextDecoder().decode( new Uint8Array( assetBytes ) );
				const materialData = JSON.parse( text );

				const loader = new THREE.ObjectLoader();
				const material = loader.parseMaterials( [ materialData ] )[ 0 ];
				material.assetPath = assetPath;
				material.sourceFile = assetData.name;
				material.isMaterial = true;

				this.isProcessing = false;
				callback( material );
				this.hide();

			} catch ( error ) {
				console.error( '[AssetSelector] Failed to load material asset:', error );
				this.isProcessing = false;
			}
			} else {
			try {
				const response = await fetch( assetData.url || assetData.content );
				const materialData = await response.json();
				const loader = new THREE.ObjectLoader();
				const material = loader.parseMaterials( [ materialData ] )[ 0 ];
				material.assetPath = assetData.path;
				material.sourceFile = assetData.name;
				material.isMaterial = true;
				this.isProcessing = false;
				callback( material );
				this.hide();
			} catch ( error ) {
				console.error( '[AssetSelector] Failed to load material:', error );
				this.isProcessing = false;
			}
		}

	}

	filterAssets( searchTerm ) {

		const items = this.gridContainer.querySelectorAll( '.asset-item' );
		const term = searchTerm.toLowerCase();

		items.forEach( item => {
			const name = item.querySelector( 'div:last-child' ).textContent.toLowerCase();
			if ( name.includes( term ) ) {
				item.style.display = 'flex';
			} else {
				item.style.display = 'none';
			}
		} );

	}

	async importAsset() {

		const fileInput = document.createElement( 'input' );
		fileInput.type = 'file';
		
		
		const acceptTypes = {
			texture: 'image/*,.hdr,.exr,.tga,.ktx2',
			audio: 'audio/*',
			model: '.glb,.gltf,.fbx,.obj',
			geometry: '.json,.glb,.gltf,.fbx,.obj',
			material: '.json'
		};
		fileInput.accept = acceptTypes[ this.assetType ] || '*';
		fileInput.multiple = false;

		fileInput.addEventListener( 'change', async ( event ) => {
			const file = event.target.files[ 0 ];
			if ( ! file ) return;

			try {
				const currentFolder = window.currentFolder || window.assetsRoot;
				
				if ( ! currentFolder ) {
					alert( 'No assets folder available. Please ensure the project is properly initialized.' );
					return;
				}

				const reader = new FileReader();
				
				reader.onload = async ( e ) => {
					let normalizedPath = currentFolder.path;
					if ( normalizedPath === '/' ) {
						normalizedPath = '';
					} else if ( normalizedPath.endsWith( '/' ) ) {
						normalizedPath = normalizedPath.slice( 0, -1 );
					}
					const filePath = normalizedPath + '/' + file.name;
					
					const fileEntry = {
						name: file.name,
						content: e.target.result,
						path: filePath,
						size: file.size,
						type: this.assetType,
						isBinary: true,
						url: URL.createObjectURL( file ),
						extension: file.name.split( '.' ).pop()?.toLowerCase()
					};

					currentFolder.files.push( fileEntry );
					
					if ( window.saveAssets ) {
						await window.saveAssets();
					}

					this.loadAssets();

					
					this.selectAsset( fileEntry );
				};

				if ( this.assetType === 'texture' ) {
					reader.readAsDataURL( file );
				} else if ( this.assetType === 'audio' ) {
					reader.readAsDataURL( file );
				} else {
					reader.readAsArrayBuffer( file );
				}

			} catch ( error ) {
				console.error( 'Error importing asset:', error );
				alert( 'Failed to import asset: ' + error.message );
			}

			document.body.removeChild( fileInput );
		} );

		document.body.appendChild( fileInput );
		fileInput.click();

	}

}

export { AssetSelector };
