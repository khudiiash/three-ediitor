import * as THREE from 'three';

import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

import { UISpan, UIDiv, UIRow, UIButton, UICheckbox, UIText, UINumber } from './ui.js';
import { MoveObjectCommand } from '../commands/MoveObjectCommand.js';
import { AssetSelector } from '../AssetSelector.js';

const cache = new Map();

class UITexture extends UISpan {

	constructor( editor ) {

		super();

		const scope = this;
		this.editor = editor;

		// Initialize asset selector (lazy load)
		if ( ! editor.assetSelector ) {
			editor.assetSelector = new AssetSelector( editor );
		}

		const form = document.createElement( 'form' );

		const input = document.createElement( 'input' );
		input.type = 'file';
		input.style.display = 'none';
		input.addEventListener( 'change', function ( event ) {

			loadFile( event.target.files[ 0 ] );

		} );
		form.appendChild( input );

		const canvas = document.createElement( 'canvas' );
		canvas.width = 32;
		canvas.height = 16;
		canvas.style.cursor = 'pointer';
		canvas.style.marginRight = '5px';
		canvas.style.border = '1px solid #888';
		canvas.style.position = 'relative';
		
		// Click to open asset selector
		canvas.addEventListener( 'click', function ( event ) {

			// Right click or Ctrl+click for file input fallback
			if ( event.ctrlKey || event.metaKey || event.button === 2 ) {
				input.click();
				return;
			}

			// Show asset selector
			editor.assetSelector.show( function ( texture ) {

				if ( texture !== null ) {
					scope.setValue( texture );
					if ( scope.onChangeCallback ) scope.onChangeCallback( texture );
				}

			}, scope.texture, 'texture' );

		} );

		// Drag and drop support
		canvas.addEventListener( 'dragover', function ( event ) {

			event.preventDefault();
			event.stopPropagation();
			canvas.style.borderColor = '#0088ff';
			canvas.style.background = 'rgba(0, 136, 255, 0.1)';

		} );

		canvas.addEventListener( 'dragleave', function ( event ) {

			event.preventDefault();
			event.stopPropagation();
			canvas.style.borderColor = '#888';
			canvas.style.background = 'transparent';

		} );

		canvas.addEventListener( 'drop', function ( event ) {

			event.preventDefault();
			event.stopPropagation();
			canvas.style.borderColor = '#888';
			canvas.style.background = 'transparent';

			// Check if it's an asset drop (from asset panel)
			const assetData = event.dataTransfer.getData( 'text/plain' );
			if ( assetData ) {
				try {
					const asset = JSON.parse( assetData );
					// Check if it's a texture asset or a file that looks like a texture
					const isTextureAsset = asset.type === 'texture' || 
					                      ( asset.type === 'file' && asset.name && 
					                        [ 'jpg', 'jpeg', 'png', 'gif', 'webp', 'hdr', 'exr', 'tga', 'ktx2' ]
					                          .includes( asset.name.split( '.' ).pop()?.toLowerCase() ) );
					if ( isTextureAsset ) {
						// Load texture from asset path
						loadTextureFromAsset( asset );
						return;
					}
				} catch ( e ) {
					// Not JSON, continue with file drop
				}
			}

			// Fallback to file drop
			if ( event.dataTransfer.files && event.dataTransfer.files.length > 0 ) {
				loadFile( event.dataTransfer.files[ 0 ] );
			}

		} );

		this.dom.appendChild( canvas );

		async function loadFile( file ) {

			const extension = file.name.split( '.' ).pop().toLowerCase();
			const reader = new FileReader();

			const hash = `${file.lastModified}_${file.size}_${file.name}`;

			if ( cache.has( hash ) ) {

				const texture = cache.get( hash );

				scope.setValue( texture );

				if ( scope.onChangeCallback ) scope.onChangeCallback( texture );

			} else if ( extension === 'hdr' || extension === 'pic' ) {

				reader.addEventListener( 'load', async function ( event ) {

					// assuming RGBE/Radiance HDR image format

					const { HDRLoader } = await import( 'three/addons/loaders/HDRLoader.js' );

					const loader = new HDRLoader();
					loader.load( event.target.result, function ( hdrTexture ) {

						hdrTexture.sourceFile = file.name;

						cache.set( hash, hdrTexture );

						scope.setValue( hdrTexture );

						if ( scope.onChangeCallback ) scope.onChangeCallback( hdrTexture );

					} );

				} );

				reader.readAsDataURL( file );

			} else if ( extension === 'tga' ) {

				reader.addEventListener( 'load', async function ( event ) {

					const { TGALoader } = await import( 'three/addons/loaders/TGALoader.js' );

					const loader = new TGALoader();
					loader.load( event.target.result, function ( texture ) {

						texture.colorSpace = THREE.SRGBColorSpace;
						texture.sourceFile = file.name;

						cache.set( hash, texture );

						scope.setValue( texture );

						if ( scope.onChangeCallback ) scope.onChangeCallback( texture );


					} );

				}, false );

				reader.readAsDataURL( file );

			} else if ( extension === 'ktx2' ) {

				reader.addEventListener( 'load', async function ( event ) {

					const { KTX2Loader } = await import( 'three/addons/loaders/KTX2Loader.js' );

					const arrayBuffer = event.target.result;
					const blobURL = URL.createObjectURL( new Blob( [ arrayBuffer ] ) );
					const ktx2Loader = new KTX2Loader();
					ktx2Loader.setTranscoderPath( '../../examples/jsm/libs/basis/' );
					editor.signals.rendererDetectKTX2Support.dispatch( ktx2Loader );

					ktx2Loader.load( blobURL, function ( texture ) {

						texture.colorSpace = THREE.SRGBColorSpace;
						texture.sourceFile = file.name;
						texture.needsUpdate = true;

						cache.set( hash, texture );

						scope.setValue( texture );

						if ( scope.onChangeCallback ) scope.onChangeCallback( texture );
						ktx2Loader.dispose();

					} );

				} );

				reader.readAsArrayBuffer( file );

			} else if ( extension === 'exr' ) {

				reader.addEventListener( 'load', async function ( event ) {

					const { EXRLoader } = await import( 'three/addons/loaders/EXRLoader.js' );

					const arrayBuffer = event.target.result;
					const blobURL = URL.createObjectURL( new Blob( [ arrayBuffer ] ) );
					const exrLoader = new EXRLoader();

					exrLoader.load( blobURL, function ( texture ) {

						texture.sourceFile = file.name;
						texture.needsUpdate = true;

						cache.set( hash, texture );

						scope.setValue( texture );

						if ( scope.onChangeCallback ) scope.onChangeCallback( texture );

					} );

				} );

				reader.readAsArrayBuffer( file );

			} else if ( file.type.match( 'image.*' ) ) {

				reader.addEventListener( 'load', function ( event ) {

					const image = document.createElement( 'img' );
					image.addEventListener( 'load', function () {

						const texture = new THREE.Texture( this );
						texture.sourceFile = file.name;
						texture.needsUpdate = true;

						cache.set( hash, texture );

						scope.setValue( texture );

						if ( scope.onChangeCallback ) scope.onChangeCallback( texture );

					}, false );

					image.src = event.target.result;

				}, false );

				reader.readAsDataURL( file );

			}

			form.reset();

		}

		this.texture = null;
		this.onChangeCallback = null;

		// Helper function to load texture from asset
		async function loadTextureFromAsset( asset ) {

			const isTauri = typeof window !== 'undefined' && window.__TAURI__ && window.__TAURI__.core.invoke;

			if ( isTauri && editor.storage && editor.storage.getProjectPath ) {
				const projectPath = editor.storage.getProjectPath();
				const assetPath = asset.path.startsWith( '/' ) ? asset.path.substring( 1 ) : asset.path;

				try {
					const assetBytes = await window.__TAURI__.core.invoke( 'read_asset_file', {
						projectPath: projectPath,
						assetPath: assetPath
					} );

					const uint8Array = new Uint8Array( assetBytes );
					const blob = new Blob( [ uint8Array ] );
					const blobUrl = URL.createObjectURL( blob );

					const ext = asset.name.split( '.' ).pop()?.toLowerCase();

					if ( ext === 'hdr' || ext === 'pic' ) {

						const { HDRLoader } = await import( 'three/addons/loaders/HDRLoader.js' );
						const loader = new HDRLoader();
						loader.load( blobUrl, function ( hdrTexture ) {
							hdrTexture.sourceFile = asset.name;
							hdrTexture.assetPath = asset.path;
							scope.setValue( hdrTexture );
							if ( scope.onChangeCallback ) scope.onChangeCallback( hdrTexture );
						} );

					} else if ( ext === 'tga' ) {

						const { TGALoader } = await import( 'three/addons/loaders/TGALoader.js' );
						const loader = new TGALoader();
						loader.load( blobUrl, function ( texture ) {
							texture.colorSpace = THREE.SRGBColorSpace;
							texture.sourceFile = asset.name;
							texture.assetPath = asset.path;
							scope.setValue( texture );
							if ( scope.onChangeCallback ) scope.onChangeCallback( texture );
						} );

					} else if ( ext === 'ktx2' ) {

						const { KTX2Loader } = await import( 'three/addons/loaders/KTX2Loader.js' );
						const ktx2Loader = new KTX2Loader();
						ktx2Loader.setTranscoderPath( '../../examples/jsm/libs/basis/' );
						editor.signals.rendererDetectKTX2Support.dispatch( ktx2Loader );

						ktx2Loader.load( blobUrl, function ( texture ) {
							texture.colorSpace = THREE.SRGBColorSpace;
							texture.sourceFile = asset.name;
							texture.assetPath = asset.path;
							texture.needsUpdate = true;
							scope.setValue( texture );
							if ( scope.onChangeCallback ) scope.onChangeCallback( texture );
							ktx2Loader.dispose();
						} );

					} else if ( ext === 'exr' ) {

						const { EXRLoader } = await import( 'three/addons/loaders/EXRLoader.js' );
						const exrLoader = new EXRLoader();

						exrLoader.load( blobUrl, function ( texture ) {
							texture.sourceFile = asset.name;
							texture.assetPath = asset.path;
							texture.needsUpdate = true;
							scope.setValue( texture );
							if ( scope.onChangeCallback ) scope.onChangeCallback( texture );
						} );

					} else {

						const img = new Image();
						img.onload = function () {
							const texture = new THREE.Texture( img );
							texture.sourceFile = asset.name;
							texture.assetPath = asset.path;
							texture.colorSpace = THREE.SRGBColorSpace;
							texture.needsUpdate = true;
							scope.setValue( texture );
							if ( scope.onChangeCallback ) scope.onChangeCallback( texture );
						};
						img.src = blobUrl;

					}

				} catch ( error ) {
					console.error( '[UITexture] Failed to load texture from asset:', error );
				}
			}

		}

	}

	getValue() {

		return this.texture;

	}

	setValue( texture ) {

		const canvas = this.dom.children[ 0 ];
		const context = canvas.getContext( '2d' );

		// Seems like context can be null if the canvas is not visible
		if ( context ) {

			// Always clear the context before set new texture, because new texture may has transparency
			context.clearRect( 0, 0, canvas.width, canvas.height );

		}

		if ( texture !== null ) {

			const image = texture.image;

			if ( image !== undefined && image !== null && image.width > 0 ) {

				canvas.title = texture.sourceFile;
				const scale = canvas.width / image.width;

				if ( texture.isDataTexture || texture.isCompressedTexture ) {

					const canvas2 = renderToCanvas( texture );
					context.drawImage( canvas2, 0, 0, image.width * scale, image.height * scale );

				} else {

					context.drawImage( image, 0, 0, image.width * scale, image.height * scale );

				}

			} else {

				canvas.title = texture.sourceFile + ' (error)';

			}

		} else {

			canvas.title = 'empty';

		}

		this.texture = texture;

	}

	setColorSpace( colorSpace ) {

		const texture = this.getValue();

		if ( texture !== null ) {

			texture.colorSpace = colorSpace;

		}

		return this;

	}

	onChange( callback ) {

		this.onChangeCallback = callback;

		return this;

	}

}

class UIOutliner extends UIDiv {

	constructor( editor ) {

		super();

		this.dom.className = 'Outliner';
		this.dom.tabIndex = 0;	// keyup event is ignored without setting tabIndex

		const scope = this;

		// hack
		this.scene = editor.scene;

		// Prevent native scroll behavior
		this.dom.addEventListener( 'keydown', function ( event ) {

			switch ( event.code ) {

				case 'ArrowUp':
				case 'ArrowDown':
					event.preventDefault();
					event.stopPropagation();
					break;

			}

		} );

		// Keybindings to support arrow navigation
		this.dom.addEventListener( 'keyup', function ( event ) {

			switch ( event.code ) {

				case 'ArrowUp':
					scope.selectIndex( scope.selectedIndex - 1 );
					break;
				case 'ArrowDown':
					scope.selectIndex( scope.selectedIndex + 1 );
					break;

			}

		} );

		this.editor = editor;

		this.options = [];
		this.selectedIndex = - 1;
		this.selectedValue = null;

	}

	selectIndex( index ) {

		if ( index >= 0 && index < this.options.length ) {

			this.setValue( this.options[ index ].value );

			const changeEvent = new Event( 'change', { bubbles: true, cancelable: true } );
			this.dom.dispatchEvent( changeEvent );

		}

	}

	setOptions( options ) {

		const scope = this;

		while ( scope.dom.children.length > 0 ) {

			scope.dom.removeChild( scope.dom.firstChild );

		}

		function onClick() {

			scope.setValue( this.value );

			const changeEvent = new Event( 'change', { bubbles: true, cancelable: true } );
			scope.dom.dispatchEvent( changeEvent );

		}

		// Drag

		let currentDrag;

		function onDrag() {

			currentDrag = this;

		}

		function onDragStart( event ) {

			event.dataTransfer.setData( 'text', 'foo' );

		}

		function onDragOver( event ) {

			if ( this === currentDrag ) return;

			const hasSceneTreeItem = this.classList.contains( 'scene-tree-item' );
			const treeIndent = this.style.getPropertyValue( '--tree-indent' );

			const area = event.offsetY / this.clientHeight;

			this.classList.remove( 'dragTop', 'dragBottom', 'drag' );

			if ( area < 0.25 ) {

				this.classList.add( 'dragTop' );

			} else if ( area > 0.75 ) {

				this.classList.add( 'dragBottom' );

			} else {

				this.classList.add( 'drag' );

			}

			// Ensure scene-tree-item class is preserved
			if ( hasSceneTreeItem && !this.classList.contains( 'scene-tree-item' ) ) {
				this.classList.add( 'scene-tree-item' );
			}

			// Ensure option class is present
			if ( !this.classList.contains( 'option' ) ) {
				this.classList.add( 'option' );
			}

			// Restore tree indent if it was set
			if ( treeIndent ) {
				this.style.setProperty( '--tree-indent', treeIndent );
			}

		}

		function onDragLeave() {

			if ( this === currentDrag ) return;

			// Preserve existing classes and styles
			const hasSceneTreeItem = this.classList.contains( 'scene-tree-item' );
			const treeIndent = this.style.getPropertyValue( '--tree-indent' );

			// Remove drag classes
			this.classList.remove( 'dragTop', 'dragBottom', 'drag' );

			// Ensure scene-tree-item class is preserved
			if ( hasSceneTreeItem && !this.classList.contains( 'scene-tree-item' ) ) {
				this.classList.add( 'scene-tree-item' );
			}

			// Ensure option class is present
			if ( !this.classList.contains( 'option' ) ) {
				this.classList.add( 'option' );
			}

			// Restore tree indent if it was set
			if ( treeIndent ) {
				this.style.setProperty( '--tree-indent', treeIndent );
			}

		}

		function onDrop( event ) {

			if ( this === currentDrag || currentDrag === undefined ) return;

			// Preserve existing classes and styles
			const hasSceneTreeItem = this.classList.contains( 'scene-tree-item' );
			const treeIndent = this.style.getPropertyValue( '--tree-indent' );

			// Remove drag classes
			this.classList.remove( 'dragTop', 'dragBottom', 'drag' );

			// Ensure scene-tree-item class is preserved
			if ( hasSceneTreeItem && !this.classList.contains( 'scene-tree-item' ) ) {
				this.classList.add( 'scene-tree-item' );
			}

			// Ensure option class is present
			if ( !this.classList.contains( 'option' ) ) {
				this.classList.add( 'option' );
			}

			// Restore tree indent if it was set
			if ( treeIndent ) {
				this.style.setProperty( '--tree-indent', treeIndent );
			}

			const scene = scope.scene;
			const object = scene.getObjectById( currentDrag.value );

			const area = event.offsetY / this.clientHeight;

			if ( area < 0.25 ) {

				const nextObject = scene.getObjectById( this.value );
				moveObject( object, nextObject.parent, nextObject );

			} else if ( area > 0.75 ) {

				let nextObject, parent;

				if ( this.nextSibling !== null ) {

					nextObject = scene.getObjectById( this.nextSibling.value );
					parent = nextObject.parent;

				} else {

					// end of list (no next object)

					nextObject = null;
					parent = scene.getObjectById( this.value ).parent;

				}

				moveObject( object, parent, nextObject );

			} else {

				const parentObject = scene.getObjectById( this.value );
				moveObject( object, parentObject );

			}

		}

		function moveObject( object, newParent, nextObject ) {

			if ( nextObject === null ) nextObject = undefined;

			let newParentIsChild = false;

			object.traverse( function ( child ) {

				if ( child === newParent ) newParentIsChild = true;

			} );

			if ( newParentIsChild ) return;

			const editor = scope.editor;
			editor.execute( new MoveObjectCommand( editor, object, newParent, nextObject ) );

			const changeEvent = new Event( 'change', { bubbles: true, cancelable: true } );
			scope.dom.dispatchEvent( changeEvent );

		}

		//

		scope.options = [];

		for ( let i = 0; i < options.length; i ++ ) {

			const div = options[ i ];
			// Preserve existing classes (like 'scene-tree-item') and add 'option'
			if ( !div.classList.contains( 'option' ) ) {
				div.classList.add( 'option' );
			}
			scope.dom.appendChild( div );

			scope.options.push( div );

			div.addEventListener( 'click', onClick );

			if ( div.draggable === true && !div.classList.contains( 'system-entity' ) ) {

				div.addEventListener( 'drag', onDrag );
				div.addEventListener( 'dragstart', onDragStart ); // Firefox needs this

				div.addEventListener( 'dragover', onDragOver );
				div.addEventListener( 'dragleave', onDragLeave );
				div.addEventListener( 'drop', onDrop );

			}


		}

		return scope;

	}

	getValue() {

		return this.selectedValue;

	}

	setValue( value ) {

		for ( let i = 0; i < this.options.length; i ++ ) {

			const element = this.options[ i ];

			if ( element.value === value ) {

				element.classList.add( 'active' );
				element.classList.add( 'selected' );

				// scroll into view

				const y = element.offsetTop - this.dom.offsetTop;
				const bottomY = y + element.offsetHeight;
				const minScroll = bottomY - this.dom.offsetHeight;

				if ( this.dom.scrollTop > y ) {

					this.dom.scrollTop = y;

				} else if ( this.dom.scrollTop < minScroll ) {

					this.dom.scrollTop = minScroll;

				}

				this.selectedIndex = i;

			} else {

				element.classList.remove( 'active' );
				element.classList.remove( 'selected' );

			}

		}

		this.selectedValue = value;

		return this;

	}

}

class UIPoints extends UISpan {

	constructor() {

		super();

		this.dom.style.display = 'inline-block';

		this.pointsList = new UIDiv();
		this.add( this.pointsList );

		this.pointsUI = [];
		this.lastPointIdx = 0;
		this.onChangeCallback = null;

		this.update = () => { // bind lexical this

			if ( this.onChangeCallback !== null ) {

				this.onChangeCallback();

			}

		};

	}

	onChange( callback ) {

		this.onChangeCallback = callback;

		return this;

	}

	clear() {

		for ( let i = this.pointsUI.length - 1; i >= 0; -- i ) {

			this.deletePointRow( i, false );

		}

		this.lastPointIdx = 0;

	}

	deletePointRow( idx, needsUpdate = true ) {

		if ( ! this.pointsUI[ idx ] ) return;

		this.pointsList.remove( this.pointsUI[ idx ].row );

		this.pointsUI.splice( idx, 1 );

		if ( needsUpdate === true ) {

			this.update();

		}

		this.lastPointIdx --;

	}

}

class UIPoints2 extends UIPoints {

	constructor() {

		super();

		const row = new UIRow();
		this.add( row );

		const addPointButton = new UIButton( '+' );
		addPointButton.onClick( () => {

			if ( this.pointsUI.length === 0 ) {

				this.pointsList.add( this.createPointRow( 0, 0 ) );

			} else {

				const point = this.pointsUI[ this.pointsUI.length - 1 ];

				this.pointsList.add( this.createPointRow( point.x.getValue(), point.y.getValue() ) );

			}

			this.update();

		} );
		row.add( addPointButton );

	}

	getValue() {

		const points = [];

		let count = 0;

		for ( let i = 0; i < this.pointsUI.length; i ++ ) {

			const pointUI = this.pointsUI[ i ];

			if ( ! pointUI ) continue;

			points.push( new THREE.Vector2( pointUI.x.getValue(), pointUI.y.getValue() ) );
			++ count;
			pointUI.lbl.setValue( count );

		}

		return points;

	}

	setValue( points, needsUpdate = true ) {

		this.clear();

		for ( let i = 0; i < points.length; i ++ ) {

			const point = points[ i ];
			this.pointsList.add( this.createPointRow( point.x, point.y ) );

		}

		if ( needsUpdate === true ) this.update();

		return this;

	}

	createPointRow( x, y ) {

		const pointRow = new UIDiv();
		const lbl = new UIText( this.lastPointIdx + 1 ).setWidth( '20px' );
		const txtX = new UINumber( x ).setWidth( '30px' ).onChange( this.update );
		const txtY = new UINumber( y ).setWidth( '30px' ).onChange( this.update );

		const scope = this;
		const btn = new UIButton( '-' ).onClick( function () {

			if ( scope.isEditing ) return;

			const idx = scope.pointsList.getIndexOfChild( pointRow );
			scope.deletePointRow( idx );

		} );

		this.pointsUI.push( { row: pointRow, lbl: lbl, x: txtX, y: txtY } );
		++ this.lastPointIdx;
		pointRow.add( lbl, txtX, txtY, btn );

		return pointRow;

	}

}

class UIPoints3 extends UIPoints {

	constructor() {

		super();

		const row = new UIRow();
		this.add( row );

		const addPointButton = new UIButton( '+' );
		addPointButton.onClick( () => {

			if ( this.pointsUI.length === 0 ) {

				this.pointsList.add( this.createPointRow( 0, 0, 0 ) );

			} else {

				const point = this.pointsUI[ this.pointsUI.length - 1 ];

				this.pointsList.add( this.createPointRow( point.x.getValue(), point.y.getValue(), point.z.getValue() ) );

			}

			this.update();

		} );
		row.add( addPointButton );

	}

	getValue() {

		const points = [];
		let count = 0;

		for ( let i = 0; i < this.pointsUI.length; i ++ ) {

			const pointUI = this.pointsUI[ i ];

			if ( ! pointUI ) continue;

			points.push( new THREE.Vector3( pointUI.x.getValue(), pointUI.y.getValue(), pointUI.z.getValue() ) );
			++ count;
			pointUI.lbl.setValue( count );

		}

		return points;

	}

	setValue( points, needsUpdate = true ) {

		this.clear();

		for ( let i = 0; i < points.length; i ++ ) {

			const point = points[ i ];
			this.pointsList.add( this.createPointRow( point.x, point.y, point.z ) );

		}

		if ( needsUpdate === true ) this.update();

		return this;

	}

	createPointRow( x, y, z ) {

		const pointRow = new UIDiv();
		const lbl = new UIText( this.lastPointIdx + 1 ).setWidth( '20px' );
		const txtX = new UINumber( x ).setWidth( '30px' ).onChange( this.update );
		const txtY = new UINumber( y ).setWidth( '30px' ).onChange( this.update );
		const txtZ = new UINumber( z ).setWidth( '30px' ).onChange( this.update );

		const scope = this;
		const btn = new UIButton( '-' ).onClick( function () {

			if ( scope.isEditing ) return;

			const idx = scope.pointsList.getIndexOfChild( pointRow );
			scope.deletePointRow( idx );

		} );

		this.pointsUI.push( { row: pointRow, lbl: lbl, x: txtX, y: txtY, z: txtZ } );
		++ this.lastPointIdx;
		pointRow.add( lbl, txtX, txtY, txtZ, btn );

		return pointRow;

	}

}

class UIBoolean extends UISpan {

	constructor( boolean, text ) {

		super();

		this.setMarginRight( '4px' );

		this.checkbox = new UICheckbox( boolean );
		this.text = new UIText( text ).setMarginLeft( '3px' );

		this.add( this.checkbox );
		this.add( this.text );

	}

	getValue() {

		return this.checkbox.getValue();

	}

	setValue( value ) {

		return this.checkbox.setValue( value );

	}

}

let renderer, fsQuad;

function renderToCanvas( texture ) {

	if ( renderer === undefined ) {

		renderer = new THREE.WebGLRenderer();

	}

	if ( fsQuad === undefined ) {

		fsQuad = new FullScreenQuad( new THREE.MeshBasicMaterial() );

	}

	const image = texture.image;

	renderer.setSize( image.width, image.height, false );

	fsQuad.material.map = texture;
	fsQuad.render( renderer );

	return renderer.domElement;

}

export { UITexture, UIOutliner, UIPoints, UIPoints2, UIPoints3, UIBoolean };
