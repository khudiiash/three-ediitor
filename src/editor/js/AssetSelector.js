import * as THREE from 'three';
import { ModelParser } from './ModelParser.js';
import { getAssetPreviewRenderer } from './AssetPreviewRenderer.js';
import { assetManager } from '@engine/three-engine.js';

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
			geometry: [ 'json', 'geo' ],
			material: [ 'json', 'mat' ] 
		};

		const overlay = document.createElement( 'div' );
		overlay.className = 'asset-selector-overlay';
		document.body.appendChild( overlay );

		const modal = document.createElement( 'div' );
		modal.className = 'asset-selector-modal';
		overlay.appendChild( modal );

		const header = document.createElement( 'div' );
		header.className = 'asset-selector-header';

		const title = document.createElement( 'h3' );
		title.className = 'asset-selector-title';
		title.textContent = 'Select Asset';
		header.appendChild( title );

		const closeBtn = document.createElement( 'button' );
		closeBtn.className = 'asset-selector-close';
		closeBtn.textContent = '×';
		closeBtn.addEventListener( 'click', () => this.hide() );
		header.appendChild( closeBtn );

		modal.appendChild( header );

		const toolbar = document.createElement( 'div' );
		toolbar.className = 'asset-selector-toolbar';

		const leftToolbar = document.createElement( 'div' );
		leftToolbar.className = 'asset-selector-toolbar-left';

		const searchInput = document.createElement( 'input' );
		searchInput.type = 'text';
		searchInput.placeholder = 'Search assets...';
		searchInput.className = 'asset-selector-search';
		searchInput.addEventListener( 'input', () => this.filterAssets( searchInput.value ) );
		leftToolbar.appendChild( searchInput );

		const importBtn = document.createElement( 'button' );
		importBtn.textContent = 'Import from File';
		importBtn.className = 'asset-selector-btn primary';
		importBtn.addEventListener( 'click', () => this.importAsset() );
		leftToolbar.appendChild( importBtn );

		const clearBtn = document.createElement( 'button' );
		clearBtn.textContent = 'Clear';
		clearBtn.className = 'asset-selector-btn';
		clearBtn.addEventListener( 'click', () => {
			if ( this.onSelectCallback ) {
				this.onSelectCallback( null );
			}
			this.hide();
		} );
		leftToolbar.appendChild( clearBtn );

		toolbar.appendChild( leftToolbar );

		const viewModeButtons = document.createElement( 'div' );
		viewModeButtons.className = 'asset-selector-toolbar-right';

		const viewListBtn = document.createElement( 'button' );
		viewListBtn.innerHTML = '☰';
		viewListBtn.title = 'List View';
		viewListBtn.className = 'asset-selector-view-btn';

		const viewGridBtn = document.createElement( 'button' );
		viewGridBtn.innerHTML = '⊞';
		viewGridBtn.title = 'Grid View';
		viewGridBtn.className = 'asset-selector-view-btn active';

		const viewLargeBtn = document.createElement( 'button' );
		viewLargeBtn.innerHTML = '⊟';
		viewLargeBtn.title = 'Large Grid View';
		viewLargeBtn.className = 'asset-selector-view-btn';

		this.viewMode = 'grid';

		viewListBtn.addEventListener( 'click', () => {
			this.viewMode = 'list';
			viewListBtn.classList.add( 'active' );
			viewGridBtn.classList.remove( 'active' );
			viewLargeBtn.classList.remove( 'active' );
			this.loadAssets();
		} );

		viewGridBtn.addEventListener( 'click', () => {
			this.viewMode = 'grid';
			viewListBtn.classList.remove( 'active' );
			viewGridBtn.classList.add( 'active' );
			viewLargeBtn.classList.remove( 'active' );
			this.loadAssets();
		} );

		viewLargeBtn.addEventListener( 'click', () => {
			this.viewMode = 'large';
			viewListBtn.classList.remove( 'active' );
			viewGridBtn.classList.remove( 'active' );
			viewLargeBtn.classList.add( 'active' );
			this.loadAssets();
		} );

		viewModeButtons.appendChild( viewListBtn );
		viewModeButtons.appendChild( viewGridBtn );
		viewModeButtons.appendChild( viewLargeBtn );
		toolbar.appendChild( viewModeButtons );

		modal.appendChild( toolbar );

		const gridContainer = document.createElement( 'div' );
		gridContainer.className = 'asset-selector-grid';
		modal.appendChild( gridContainer );

		this.overlay = overlay;
		this.modal = modal;
		this.gridContainer = gridContainer;
		this.searchInput = searchInput;
		this.title = title;
		this.importBtn = importBtn;
		this.viewListBtn = viewListBtn;
		this.viewGridBtn = viewGridBtn;
		this.viewLargeBtn = viewLargeBtn;

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

	async loadAssets() {

		this.gridContainer.innerHTML = '';

		const assets = this.getAllAssetsFromProject( this.assetType );
		
		if ( this.assetType !== 'geometry' ) {
			await this.ensureModelsInCache( assets );
		}

		if ( assets.length === 0 ) {
			const emptyMessage = document.createElement( 'div' );
			emptyMessage.className = 'asset-selector-empty-message';
			if ( this.assetType === 'material' ) {
				emptyMessage.textContent = 'No material assets in project. Create .mat or .nodemat files in the Assets panel.';
			} else {
				emptyMessage.textContent = `No ${this.assetType} assets found in project. Import some files to get started.`;
			}
			this.gridContainer.appendChild( emptyMessage );
			return;
		}

		if (this.viewMode === 'list') {
			this.gridContainer.className = 'asset-selector-grid view-list';
			
			const table = document.createElement('table');
			table.className = 'asset-selector-table';
			
			const tbody = document.createElement('tbody');
			tbody.id = 'asset-selector-tbody';
			
			assets.forEach( asset => {
				const row = this.createListRow( asset );
				tbody.appendChild( row );
			} );
			
			table.appendChild( tbody );
			this.gridContainer.appendChild( table );
		} else {
			this.gridContainer.className = this.viewMode === 'large' 
				? 'asset-selector-grid view-large' 
				: 'asset-selector-grid view-grid';
			
			const itemSize = this.viewMode === 'large' ? 200 : 120;
			assets.forEach( asset => {
				const item = this.createAssetItem( asset, itemSize );
				this.gridContainer.appendChild( item );
			} );
		}

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
				
				
				if ( assetType === 'geometry' && file.type === 'geometry' && file.name.endsWith( '.geo' ) ) {
					assets.push( {
						name: file.name,
						path: file.path,
						type: 'geometry',
						extension: 'geo',
						modelGeometry: file.modelGeometry,
						modelPath: file.modelPath,
						isModelContent: true
					} );
					return;
				}
				
				if ( assetType === 'material' && file.type === 'material' && ( file.name.endsWith( '.mat' ) || file.name.endsWith( '.nodemat' ) ) ) {
					const extension = file.name.endsWith( '.nodemat' ) ? 'nodemat' : 'mat';
					assets.push( {
						name: file.name,
						path: file.path,
						type: 'material',
						extension: extension,
						modelMaterial: file.modelMaterial,
						modelPath: file.modelPath,
						isModelContent: true
					} );
					return;
				}
				
				if ( assetType === 'model' && file.type === 'model' && file.name.endsWith( '.mesh' ) ) {
					assets.push( {
						name: file.name,
						path: file.path,
						type: 'model',
						extension: 'model',
						modelObject: file.modelObject,
						modelContents: file.modelContents,
						modelPath: file.modelPath,
						isModelContent: true
					} );
					return;
				}
				
				if ( assetType === 'texture' && file.type === 'texture' && file.modelTexture ) {
					assets.push( {
						name: file.name,
						path: file.path,
						type: 'texture',
						extension: 'texture',
						modelTexture: file.modelTexture,
						modelPath: file.modelPath,
						isModelContent: true
					} );
					return;
				}
				
				
				if ( extensions.includes( ext ) ) {
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
		
		item.dataset.assetPath = asset.path;
		item.dataset.assetName = asset.name;
		item.dataset.assetType = asset.type;

		const thumbnail = document.createElement( 'div' );
		thumbnail.className = 'asset-item-thumbnail';

		(async () => {
			const previewRenderer = getAssetPreviewRenderer();

			if ( asset.type === 'texture' && asset.modelTexture && asset.modelTexture.texture ) {
				const texture = asset.modelTexture.texture;
				if ( texture.image ) {
					const img = document.createElement( 'img' );
					if ( texture.image instanceof Image || texture.image instanceof HTMLImageElement ) {
						img.src = texture.image.src;
					} else if ( texture.image instanceof HTMLCanvasElement ) {
						img.src = texture.image.toDataURL();
					} else {
						try {
							const tempCanvas = document.createElement( 'canvas' );
							tempCanvas.width = texture.image.width || 128;
							tempCanvas.height = texture.image.height || 128;
							const tempCtx = tempCanvas.getContext( '2d' );
							tempCtx.drawImage( texture.image, 0, 0 );
							img.src = tempCanvas.toDataURL();
						} catch ( e ) {
							const badge = this.createFileBadge( asset.name, 128 );
							thumbnail.appendChild( badge );
							return;
						}
					}
					img.onerror = () => {
						thumbnail.innerHTML = '';
						const badge = this.createFileBadge( asset.name, 128 );
						thumbnail.appendChild( badge );
					};
					thumbnail.appendChild( img );
					return;
				}
			}
			
			const ext = asset.name ? asset.name.split( '.' ).pop()?.toLowerCase() : '';
			const isImageFile = asset.type === 'texture' || 
			                   asset.type === 'image' || 
			                   [ 'jpg', 'jpeg', 'png', 'gif', 'webp', 'hdr', 'exr', 'tga', 'ktx2' ].includes( ext );
			
			if ( isImageFile && ( asset.url || asset.content ) ) {
				const img = document.createElement( 'img' );
				img.src = asset.url || asset.content;
				img.onerror = () => {
					thumbnail.innerHTML = '';
					const badge = this.createFileBadge( asset.name, 128 );
					thumbnail.appendChild( badge );
				};
				thumbnail.appendChild( img );
				return;
			}

			if ( asset.type === 'material' ) {
				try {
					let material = asset.modelMaterial && asset.modelMaterial.material ? asset.modelMaterial.material : null;
					
					if ( !material && asset.modelPath ) {
						const materialName = asset.name.replace( /\.(mat|nodemat)$/, '' );
						const matId = `${asset.modelPath}/${materialName}`;
						material = assetManager.getMaterial(matId);
						
						if (!material) {
							if (asset.modelMaterial && asset.modelMaterial.name) {
								const altMatId = `${asset.modelPath}/${asset.modelMaterial.name}`;
								material = assetManager.getMaterial(altMatId);
							}
						}
					}
					
					// Check if we have a cached preview first (for NodeMaterials especially)
					if ( window.assetPreviewCache && window.assetPreviewCache.has( asset.path ) ) {

						const cachedDataUrl = window.assetPreviewCache.get( asset.path );
						const img = document.createElement( 'img' );
						img.src = cachedDataUrl;
						thumbnail.appendChild( img );
						return;

					}
					
					if ( material ) {

						// Check if it's a NodeMaterial (plain data object)
						if ( material.type === 'NodeMaterial' || material.isNodeMaterial ) {

							// Use the generateMaterialFromNodes function if available
							if ( window.generateAndCacheMaterialPreview ) {

								// Find the file object to pass to the cache function
								const file = { path: asset.path, name: asset.name };
								const dataUrl = await window.generateAndCacheMaterialPreview( file, material, 200 );
								if ( dataUrl ) {

									const img = document.createElement( 'img' );
									img.src = dataUrl;
									thumbnail.appendChild( img );
									return;

								}

							}

						} else {

							// Standard THREE.Material
							const dataUrl = await previewRenderer.renderMaterialPreview( material, 128, 128 );
							const img = document.createElement( 'img' );
							img.src = dataUrl;
							thumbnail.appendChild( img );
							return;

						}

					}
					
					const projectPath = this.editor.storage && this.editor.storage.getProjectPath ? this.editor.storage.getProjectPath() : null;
					if ( projectPath && window.__TAURI__ && window.__TAURI__.core && window.__TAURI__.core.invoke ) {
						let assetPath = asset.path;
						if ( assetPath.startsWith( '/' ) ) assetPath = assetPath.slice( 1 );
						
						const fileBytes = await window.__TAURI__.core.invoke( 'read_asset_file', {
							projectPath: projectPath,
							assetPath: assetPath
						} );
						const materialContent = new TextDecoder().decode( new Uint8Array( fileBytes ) );
						
						// Try to parse as JSON to check if it's a NodeMaterial
						try {

							const materialData = JSON.parse( materialContent );
							
							if ( materialData.type === 'NodeMaterial' || materialData.isNodeMaterial ) {

								// Use the cached preview generation for NodeMaterials
								if ( window.generateAndCacheMaterialPreview ) {

									const file = { path: asset.path, name: asset.name };
									const dataUrl = await window.generateAndCacheMaterialPreview( file, materialData, 200 );
									if ( dataUrl ) {

										const img = document.createElement( 'img' );
										img.src = dataUrl;
										thumbnail.appendChild( img );
										return;

									}

								}

							}

						} catch ( e ) {

							// Not JSON or failed to parse, continue with standard rendering

						}
						
						const dataUrl = await previewRenderer.renderMaterialPreview( materialContent, 128, 128 );
						const img = document.createElement( 'img' );
						img.src = dataUrl;
						thumbnail.appendChild( img );
						return;
					}
				} catch ( error ) {
					console.warn( '[AssetSelector] Failed to render material preview:', error );
				}
			}

			if ( asset.type === 'geometry' ) {
				try {
					let geometry = asset.modelGeometry && asset.modelGeometry.geometry ? asset.modelGeometry.geometry : null;
					
					if ( !geometry && asset.path ) {
						geometry = assetManager.getGeometry( asset.path );
					}
					if ( !geometry && asset.modelPath ) {
						const geometryName = asset.name.replace( /\.geo$/, '' );
						geometry = assetManager.getGeometry( `${asset.modelPath}/${geometryName}` );
						if ( !geometry && asset.modelGeometry && asset.modelGeometry.name ) {
							geometry = assetManager.getGeometry( asset.modelPath + '/' + asset.modelGeometry.name );
						}
					}
					
					if ( geometry ) {
						const dataUrl = await previewRenderer.renderGeometryPreview( geometry, 128, 128 );
						const img = document.createElement( 'img' );
						img.src = dataUrl;
						thumbnail.appendChild( img );
						return;
					}
					
					const projectPath = this.editor.storage && this.editor.storage.getProjectPath ? this.editor.storage.getProjectPath() : null;
					if ( projectPath && window.__TAURI__ && window.__TAURI__.core && window.__TAURI__.core.invoke ) {
						let assetPath = asset.path;
						if ( assetPath.startsWith( '/' ) ) assetPath = assetPath.slice( 1 );
						
						const fileBytes = await window.__TAURI__.core.invoke( 'read_asset_file', {
							projectPath: projectPath,
							assetPath: assetPath
						} );
						const geometryContent = new TextDecoder().decode( new Uint8Array( fileBytes ) );
						
						const dataUrl = await previewRenderer.renderGeometryPreview( geometryContent, 128, 128 );
						const img = document.createElement( 'img' );
						img.src = dataUrl;
						thumbnail.appendChild( img );
						return;
					}
				} catch ( error ) {
					console.warn( '[AssetSelector] Failed to render geometry preview:', error );
				}
			}

			if ( asset.type === 'model' ) {
				try {
					let model = null;
					
					if ( asset.modelObject ) {
						model = asset.modelObject;
					} else if ( asset.modelContents && asset.modelContents.model ) {
						model = asset.modelContents.model;
					} else if ( asset.modelPath ) {
						model = assetManager.getModel(asset.modelPath);
					}
					
					if ( model ) {
						const dataUrl = await previewRenderer.renderModelPreview( model, 128, 128 );
						const img = document.createElement( 'img' );
						img.src = dataUrl;
						thumbnail.appendChild( img );
						return;
					}
				} catch ( error ) {
					console.warn( '[AssetSelector] Failed to render model preview:', error );
				}
				
				const badge = this.createFileBadge( asset.name, 128 );
				thumbnail.appendChild( badge );
				return;
			}

			if ( asset.type === 'audio' ) {
				thumbnail.textContent = '🔊';
				thumbnail.classList.add( 'asset-icon-large' );
				return;
			}

			thumbnail.textContent = '📄';
			thumbnail.classList.add( 'asset-icon-large' );
		})();

		item.appendChild( thumbnail );

		const name = document.createElement( 'div' );
		name.className = 'asset-item-name';
		name.textContent = asset.name;
		name.title = asset.name;
		item.appendChild( name );

		item.addEventListener( 'click', () => {
			this.gridContainer.querySelectorAll( '.asset-item' ).forEach( i => i.classList.remove( 'selected' ) );
			item.classList.add( 'selected' );
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
			} else if ( assetData.type === 'geometry' ) {
				await this.selectGeometry( assetData, callback );
			} else if ( assetData.type === 'material' ) {
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
						
						if ( ! texture.matrix ) {
							texture.matrix = new THREE.Matrix3();
						}
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

		
		const isInBrowser = typeof window !== 'undefined' && window.location && window.location.protocol === 'http:';
		let textureUrl = textureData.url || textureData.content;
		
		if ( ! textureUrl && isExistingAsset && isInBrowser && textureData.path ) {
			const projectPath = this.editor.storage && this.editor.storage.getProjectPath ? this.editor.storage.getProjectPath() : null;
			if ( projectPath ) {
				const projectName = projectPath.split( /[/\\]/ ).pop();
				let assetPath = textureData.path.startsWith( '/' ) ? textureData.path.slice( 1 ) : textureData.path;
				textureUrl = `/api/projects/${projectName}/assets/${assetPath}`;
			}
		}
		
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
				
				if ( ! texture.matrix ) {
					texture.matrix = new THREE.Matrix3();
				}
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
					
					if ( ! texture.matrix ) {
						texture.matrix = new THREE.Matrix3();
					}
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

		// Geometry from assets (virtual .geo from models or assetManager) — no file parsing
		let geometry = assetData.modelGeometry && assetData.modelGeometry.geometry ? assetData.modelGeometry.geometry : null;
		if ( ! geometry && assetData.modelPath && assetData.name ) {
			const geometryName = assetData.name.replace( /\.geo$/, '' );
			geometry = assetManager.getGeometry( assetData.modelPath + '/' + geometryName );
			if ( ! geometry && assetData.modelGeometry && assetData.modelGeometry.name ) {
				geometry = assetManager.getGeometry( assetData.modelPath + '/' + assetData.modelGeometry.name );
			}
		}
		if ( ! geometry && assetData.path ) {
			geometry = assetManager.getGeometry( assetData.path );
		}
		if ( geometry ) {
			geometry = geometry.clone();
			geometry.assetPath = assetData.path || ( assetData.modelPath ? assetData.modelPath + '/' + ( assetData.modelGeometry && assetData.modelGeometry.name ? assetData.modelGeometry.name : assetData.name.replace( /\.geo$/, '' ) ) : null );
			geometry.sourceFile = assetData.name;
			geometry.isGeometry = true;
			this.isProcessing = false;
			callback( geometry );
			this.hide();
			return;
		}

		// Standalone .json / .geo geometry files (BufferGeometry JSON)
		const ext = ( assetData.extension || assetData.name.split( '.' ).pop() || '' ).toLowerCase();
		if ( ext !== 'json' && ext !== 'geo' ) {
			this.isProcessing = false;
			return;
		}

		const isTauri = typeof window !== 'undefined' && window.__TAURI__ && window.__TAURI__.core.invoke;

		if ( isTauri && this.editor.storage && this.editor.storage.getProjectPath ) {
			const projectPath = this.editor.storage.getProjectPath();
			const assetPath = ( assetData.path || '' ).replace( /^\/+/, '' );
			try {
				const assetBytes = await window.__TAURI__.core.invoke( 'read_asset_file', {
					projectPath: projectPath,
					assetPath: assetPath
				} );
				const text = new TextDecoder().decode( new Uint8Array( assetBytes ) );
				const geometryData = JSON.parse( text );
				const loader = new THREE.BufferGeometryLoader();
				geometry = loader.parse( geometryData );
				if ( geometry ) {
					geometry.assetPath = assetPath;
					geometry.sourceFile = assetData.name;
					geometry.isGeometry = true;
					this.isProcessing = false;
					callback( geometry );
					this.hide();
				} else {
					this.isProcessing = false;
				}
			} catch ( error ) {
				console.error( '[AssetSelector] Failed to load geometry asset:', error );
				this.isProcessing = false;
			}
		} else {
			try {
				const response = await fetch( assetData.url || assetData.content );
				const geometryData = await response.json();
				const loader = new THREE.BufferGeometryLoader();
				geometry = loader.parse( geometryData );
				if ( geometry ) {
					geometry.assetPath = assetData.path;
					geometry.sourceFile = assetData.name;
					geometry.isGeometry = true;
					this.isProcessing = false;
					callback( geometry );
					this.hide();
				} else {
					this.isProcessing = false;
				}
			} catch ( error ) {
				console.error( '[AssetSelector] Failed to load geometry:', error );
				this.isProcessing = false;
			}
		}

	}

	async selectMaterial( assetData, callback ) {

		const assetPath = assetData.path.startsWith( '/' ) ? assetData.path.substring( 1 ) : assetData.path;
		const assetName = assetData.name.replace( /\.(mat|nodemat)$/, '' );
		
		let materialAsset = this.editor.assets.getByUrl( assetPath );
		
		if ( !materialAsset ) {
			const isTauri = typeof window !== 'undefined' && window.__TAURI__ && window.__TAURI__.core.invoke;
			let materialData = null;
			
			if ( isTauri && this.editor.storage && this.editor.storage.getProjectPath ) {
				const projectPath = this.editor.storage.getProjectPath();
				try {
					const assetBytes = await window.__TAURI__.core.invoke( 'read_asset_file', {
						projectPath: projectPath,
						assetPath: assetPath
					} );
					const text = new TextDecoder().decode( new Uint8Array( assetBytes ) );
					materialData = JSON.parse( text );
				} catch ( error ) {
					console.error( '[AssetSelector] Failed to load material file:', error );
					this.isProcessing = false;
					return;
				}
			} else {
				try {
					const response = await fetch( assetData.url || assetData.content );
					materialData = await response.json();
				} catch ( error ) {
					console.error( '[AssetSelector] Failed to load material:', error );
					this.isProcessing = false;
					return;
				}
			}
			
			if ( !materialData || !materialData.type || !materialData.type.includes( 'Material' ) ) {
				console.error( '[AssetSelector] Invalid material data' );
				this.isProcessing = false;
				return;
			}
			
			let material = null;
			
			// Check if it's a NodeMaterial
			if ( materialData.type === 'NodeMaterial' || materialData.isNodeMaterial ) {

				console.log( '[AssetSelector] NodeMaterial detected, storing as data object' );
				
				// NodeMaterials are stored as plain data objects, not THREE.Material instances
				material = materialData;
				material.assetPath = assetPath;
				material.sourceFile = assetData.name;
				material.isNodeMaterial = true;
				
				const { MaterialAsset } = await import( '@engine/three-engine.js' );
				materialAsset = new MaterialAsset( assetName, assetPath, {
					name: assetName,
					path: assetPath,
					source: assetData.name,
					materialType: 'NodeMaterial'
				} );
				
				// For NodeMaterials, store the data object directly
				materialAsset.data = material;
				this.editor.assets.register( materialAsset );

			} else {
				
				// Standard THREE.Material handling
				try {
					const loader = new THREE.MaterialLoader();
					loader.setTextures( {} );
					material = loader.parse( materialData );
					
					if ( !material ) {
						const objectLoader = new THREE.ObjectLoader();
						const parsed = objectLoader.parseMaterials( [ materialData ] );
						material = parsed && parsed.length > 0 ? parsed[ 0 ] : null;
					}
					
					if ( !material && materialData.type ) {
						const MaterialClass = THREE[ materialData.type ];
						if ( MaterialClass ) {
							material = new MaterialClass();
							if ( materialData.color !== undefined ) material.color.setHex( materialData.color );
							if ( materialData.roughness !== undefined ) material.roughness = materialData.roughness;
							if ( materialData.metalness !== undefined ) material.metalness = materialData.metalness;
							if ( materialData.emissive !== undefined ) material.emissive.setHex( materialData.emissive );
							material.name = materialData.name || assetName;
						}
					}
				} catch ( parseError ) {
					console.warn( '[AssetSelector] Failed to parse material:', parseError );
					this.isProcessing = false;
					return;
				}
				
				if ( !material ) {
					console.error( '[AssetSelector] Failed to create material' );
					this.isProcessing = false;
					return;
				}
				
				material.assetPath = assetPath;
				material.sourceFile = assetData.name;
				material.isMaterial = true;
				
				const { MaterialAsset } = await import( '@engine/three-engine.js' );
				materialAsset = new MaterialAsset( assetName, assetPath, {
					name: assetName,
					path: assetPath,
					source: assetData.name,
					materialType: material.type
				} );
				materialAsset.setMaterial( material );
				this.editor.assets.register( materialAsset );

			}
		}
		
		// For NodeMaterials, return the data object; for standard materials, return THREE.Material
		const material = materialAsset.getMaterial() || materialAsset.data;
		if ( material ) {
			this.isProcessing = false;
			callback( material );
			this.hide();
		} else {
			console.error( '[AssetSelector] Material asset has no material' );
			this.isProcessing = false;
		}
	}

	filterAssets( searchTerm ) {

		const items = this.gridContainer.querySelectorAll( '.asset-item' );
		const term = searchTerm.toLowerCase();

		items.forEach( item => {
			const name = item.querySelector( 'div:last-child' ).textContent.toLowerCase();
			if ( name.includes( term ) ) {
				item.classList.remove( 'hidden' );
			} else {
				item.classList.add( 'hidden' );
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

	createListRow( asset ) {
		const row = document.createElement( 'tr' );
		row.className = 'asset-selector-table-row';

		const nameCell = document.createElement( 'td' );
		
		const nameWrapper = document.createElement('div');
		nameWrapper.className = 'asset-list-name-cell';
		
		const thumbnailContainer = document.createElement( 'span' );
		thumbnailContainer.className = 'asset-list-thumbnail';
		
		
		const badge = this.createFileBadge(asset.name, 24);
		thumbnailContainer.appendChild(badge);
		
		(async () => {
			try {
				const previewRenderer = getAssetPreviewRenderer();
				let previewImg = null;

				const ext = asset.name ? asset.name.split('.').pop()?.toLowerCase() : '';
				const isImageFile = asset.type === 'texture' || asset.type === 'image' || 
				                   ['jpg', 'jpeg', 'png', 'gif', 'webp', 'hdr', 'exr', 'tga', 'ktx2'].includes(ext);
				
				if (isImageFile && (asset.url || asset.content)) {
					previewImg = document.createElement('img');
					previewImg.src = asset.url || asset.content;
					previewImg.className = 'asset-preview-image';
				} else if (asset.type === 'material') {
					let material = asset.modelMaterial?.material;
					if (!material && asset.modelPath) {
						const materialName = asset.name.replace( /\.(mat|nodemat)$/, '' );
						material = assetManager.getMaterial(`${asset.modelPath}/${materialName}`);
					}
					if (material) {
						const dataUrl = await previewRenderer.renderMaterialPreview(material, 24, 24);
						previewImg = document.createElement('img');
						previewImg.src = dataUrl;
						previewImg.className = 'asset-preview-image-contain';
					}
				} else if (asset.type === 'geometry') {
					let geometry = asset.modelGeometry?.geometry;
					if (!geometry && asset.path) {
						geometry = assetManager.getGeometry(asset.path);
					}
					if (!geometry && asset.modelPath) {
						const geometryName = asset.name.replace( /\.geo$/, '' );
						geometry = assetManager.getGeometry(`${asset.modelPath}/${geometryName}`);
					}
					if (geometry) {
						const dataUrl = await previewRenderer.renderGeometryPreview(geometry, 24, 24);
						previewImg = document.createElement('img');
						previewImg.src = dataUrl;
						previewImg.className = 'asset-preview-image-contain';
					}
				} else if (asset.type === 'model') {
					let model = asset.modelObject || asset.modelContents?.model || assetManager.getModel(asset.modelPath);
					if (model) {
						const dataUrl = await previewRenderer.renderModelPreview(model, 24, 24);
						previewImg = document.createElement('img');
						previewImg.src = dataUrl;
						previewImg.className = 'asset-preview-image-contain';
					}
				}

				if (previewImg) {
					thumbnailContainer.innerHTML = '';
					thumbnailContainer.appendChild(previewImg);
				}
			} catch (error) {
				console.error('[AssetSelector] Failed to create list preview for', asset.name, error);
			}
		})();
		
		const nameSpan = document.createElement('span');
		nameSpan.className = 'asset-list-name';
		nameSpan.textContent = asset.name;
		
		nameWrapper.appendChild(thumbnailContainer);
		nameWrapper.appendChild(nameSpan);
		nameCell.appendChild(nameWrapper);

		const typeCell = document.createElement('td');
		typeCell.className = 'asset-list-type-cell';
		typeCell.textContent = asset.type || 'File';

		const sizeCell = document.createElement('td');
		sizeCell.className = 'asset-list-size-cell';
		sizeCell.textContent = '';

		row.appendChild(nameCell);
		row.appendChild(typeCell);
		row.appendChild(sizeCell);

		row.addEventListener( 'click', () => {
			this.selectAsset( asset );
		} );

		return row;
	}

	async ensureModelsInCache( assets ) {
		if (!window.modelCache || !window.ModelParser) return;
		
		const modelPaths = new Set();
		assets.forEach(asset => {
			if (asset.modelPath && !window.modelCache.has(asset.modelPath)) {
				modelPaths.add(asset.modelPath);
			}
		});
		
		if (modelPaths.size === 0) return;
	}

	async ensureModelsInCache( assets ) {
		if (!window.assetManager || !ModelParser) return;
		
		const modelPaths = new Set();
		assets.forEach(asset => {
			if (asset.modelPath && !assetManager.hasParsedModel(asset.modelPath)) {
				modelPaths.add(asset.modelPath);
			}
		});
		
		if (modelPaths.size === 0) return;
		
		const projectPath = this.editor.storage && this.editor.storage.getProjectPath ? this.editor.storage.getProjectPath() : null;
		
		for (const modelPath of modelPaths) {
			try {
				const modelContents = await ModelParser.parseModel(modelPath, null, projectPath);
				if (modelContents) {
					assetManager.registerParsedModel(modelPath, modelContents);
				}
			} catch (error) {
				console.warn('[AssetSelector] Failed to load model:', modelPath, error);
			}
		}
	}

	createFileBadge( filename, size = 60 ) {
		const ext = (filename.split('.').pop() || 'FILE').toUpperCase();
		
		const colorMap = {
			'GLB': '#667eea', 'GLTF': '#667eea', 'FBX': '#764ba2', 'OBJ': '#f093fb',
			'JPG': '#4facfe', 'JPEG': '#4facfe', 'PNG': '#43e97b', 'GIF': '#fa709a',
			'WEBP': '#30cfd0', 'MP3': '#a8edea', 'WAV': '#fed6e3', 'OGG': '#c471ed',
			'MP4': '#f77062', 'WEBM': '#fe5196', 'JSON': '#ffa726', 'JS': '#ffd93d',
			'TS': '#3b82f6', 'CSS': '#ec4899', 'HTML': '#f97316', 'TXT': '#94a3b8'
		};
		
		const color1 = colorMap[ext] || '#667eea';
		const color2 = color1;
		
		const width = size * 0.7;
		const height = size;
		
		const container = document.createElement('div');
		container.className = 'file-badge-container';
		container.style.width = `${width}px`;
		container.style.height = `${height}px`;
		container.style.background = `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`;
		container.style.borderRadius = `${width * 0.12}px`;
		
		const extBadge = document.createElement('div');
		extBadge.className = 'file-badge-ext-label';
		extBadge.style.bottom = `${height * 0.08}px`;
		extBadge.style.padding = `${height * 0.03}px ${width * 0.15}px`;
		extBadge.style.borderRadius = `${width * 0.15}px`;
		extBadge.style.fontSize = `${height * 0.12}px`;
		extBadge.textContent = ext.length > 3 ? ext.substring(0, 3) : ext;
		
		container.appendChild(extBadge);
		return container;
	}

}

export { AssetSelector };
