import * as THREE from 'three';

import { UIPanel, UIBreak, UIRow, UIColor, UISelect, UIText, UINumber, UIInput } from './libs/ui.js';
import { UIOutliner, UITexture } from './libs/ui.three.js';

function SidebarScene( editor ) {

	const signals = editor.signals;
	const strings = editor.strings;

	const container = new UIPanel();
	container.setBorderTop( '0' );
	container.setPaddingTop( '0' );
	container.dom.style.height = 'calc(100% - 4px)';
	container.dom.style.display = 'flex';
	container.dom.style.flexDirection = 'column';
	container.dom.style.marginBottom = '4px';

	const searchRow = new UIRow();
	searchRow.setPadding( '4px' );
	const searchInput = new UIInput( '' ).setWidth( '100%' ).setFontSize( '12px' );
	searchInput.dom.placeholder = 'Search...';
	searchInput.dom.style.cssText = 'padding: 4px 8px; background: #1e1e1e; border: 1px solid #444; color: #aaa;';
	searchRow.add( searchInput );
	container.add( searchRow );

	let searchFilter = '';

	searchInput.onChange( function () {
		const value = this.getValue();
		searchFilter = ( value || '' ).toLowerCase().trim();
		refreshUI();
	} );

	const nodeStates = new WeakMap();

	function isBatchedRenderer( object ) {
		return object.type === 'BatchedRenderer' || object.name === 'BatchedRenderer';
	}

	function buildOption( object, draggable ) {

		const option = document.createElement( 'div' );
		const isSystemEntity = isBatchedRenderer( object );
		option.draggable = draggable && !isSystemEntity;
		option.innerHTML = buildHTML( object );
		option.value = object.id;
		
		if ( isSystemEntity ) {
			option.classList.add( 'system-entity' );
		}

		// opener

		if ( nodeStates.has( object ) ) {

			const state = nodeStates.get( object );

			const opener = document.createElement( 'span' );
			opener.classList.add( 'opener' );

			if ( object.children.length > 0 ) {

				opener.classList.add( state ? 'open' : 'closed' );

			}

			opener.addEventListener( 'click', function () {

				nodeStates.set( object, nodeStates.get( object ) === false ); // toggle
				refreshUI();

			} );

			option.insertBefore( opener, option.firstChild );

		}

		return option;

	}

	function getMaterialName( material ) {

		if ( Array.isArray( material ) ) {

			const array = [];

			for ( let i = 0; i < material.length; i ++ ) {

				array.push( material[ i ] && material[ i ].name ? material[ i ].name : '' );

			}

			return array.join( ',' );

		}

		return material && material.name ? material.name : '';

	}

	function escapeHTML( html ) {

		if ( html === undefined || html === null ) return '';

		return String( html )
			.replace( /&/g, '&amp;' )
			.replace( /"/g, '&quot;' )
			.replace( /'/g, '&#39;' )
			.replace( /</g, '&lt;' )
			.replace( />/g, '&gt;' );

	}

	function getObjectType( object ) {

		if ( object.isScene ) return 'Scene';
		if ( object.isCamera ) return 'Camera';
		if ( object.isLight ) return 'Light';
		if ( object.isMesh ) return 'Mesh';
		if ( object.isLine ) return 'Line';
		if ( object.isPoints ) return 'Points';
		if ( object.type === 'BatchedRenderer' || object.name === 'BatchedRenderer' ) return 'BatchedRenderer';
		if ( object.type === 'ParticleSystem' || ( object.userData && object.userData.isParticleSystem ) ) return 'Particles';

		return 'Object3D';

	}

	function buildHTML( object ) {

		const objectName = object.name || '';
		const isSystemEntity = isBatchedRenderer( object );
		const typeClass = getObjectType( object );
		const nameClass = isSystemEntity ? 'system-entity-name' : '';
		let html = `<span class="type ${ typeClass }${ isSystemEntity ? ' system-entity-type' : '' }"></span> <span class="${ nameClass }">${ escapeHTML( objectName ) }</span>`;

		if ( object.isMesh ) {

			const geometry = object.geometry;
			const material = object.material;

			const geometryName = geometry && geometry.name ? geometry.name : '';
			const materialName = material ? getMaterialName( material ) : '';

			html += ` <span class="type Geometry"></span> ${ escapeHTML( geometryName ) }`;
			html += ` <span class="type Material"></span> ${ escapeHTML( materialName ) }`;

		}

		html += getScript( object.uuid );

		return html;

	}

	function getScript( uuid ) {

		if ( editor.scripts[ uuid ] === undefined ) return '';

		if ( editor.scripts[ uuid ].length === 0 ) return '';

		return ' <span class="type Script"></span>';

	}

	let ignoreObjectSelectedSignal = false;

	const outliner = new UIOutliner( editor );
	outliner.setId( 'outliner' );
	outliner.dom.style.flex = '1';
	outliner.dom.style.height = '100%';
	
	// Apply minimal scrollbar styling directly (only once)
	if ( ! document.getElementById( 'outliner-scrollbar-style' ) ) {
		const style = document.createElement( 'style' );
		style.id = 'outliner-scrollbar-style';
		style.textContent = `
			#outliner::-webkit-scrollbar { width: 2px !important; height: 2px !important; }
			#outliner::-webkit-scrollbar-track { background: transparent !important; }
			#outliner::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, 0.05) !important; border-radius: 1px !important; }
			#outliner::-webkit-scrollbar-thumb:hover { background: rgba(0, 0, 0, 0.15) !important; }
		`;
		document.head.appendChild( style );
	}
	outliner.onChange( function () {

		ignoreObjectSelectedSignal = true;

		const objectId = parseInt( outliner.getValue() );
		const object = editor.scene.getObjectById( objectId );
		
		if ( object && ( object.type === 'BatchedRenderer' || object.name === 'BatchedRenderer' ) ) {
			editor.select( object );
		} else {
			editor.selectById( objectId );
		}

		ignoreObjectSelectedSignal = false;

	} );
	outliner.onDblClick( function () {

		editor.focusById( parseInt( outliner.getValue() ) );

	} );
	container.add( outliner );

	// Background, Environment, and Fog moved to Inspector tab

	function matchesFilter( object ) {
		if ( !searchFilter ) return true;
		if ( !object.name ) return false;
		return object.name.toLowerCase().includes( searchFilter );
	}

	function hasMatchingChild( object ) {
		if ( matchesFilter( object ) ) return true;
		for ( let i = 0; i < object.children.length; i ++ ) {
			if ( hasMatchingChild( object.children[ i ] ) ) {
				return true;
			}
		}
		return false;
	}

	function refreshUI() {

		const camera = editor.camera;
		const scene = editor.scene;

		const options = [];

		if ( !searchFilter || matchesFilter( camera ) || hasMatchingChild( camera ) ) {
			options.push( buildOption( camera, false ) );
		}

		if ( !searchFilter || matchesFilter( scene ) || hasMatchingChild( scene ) ) {
			options.push( buildOption( scene, false ) );
		}

		( function addObjects( objects, pad ) {

			for ( let i = 0, l = objects.length; i < l; i ++ ) {

				const object = objects[ i ];

				if ( object.userData && object.userData.skipSerialization === true ) {
					continue;
				}

				if ( object.type === 'ParticleEmitter' ) {
					continue;
				}

				if ( object.type === 'BatchedRenderer' || object.name === 'BatchedRenderer' ) {
					if ( object.children.length === 0 ) {
						continue;
					}
				}

				if ( !searchFilter || matchesFilter( object ) || hasMatchingChild( object ) ) {

					if ( nodeStates.has( object ) === false ) {

						nodeStates.set( object, false );

					}

					const option = buildOption( object, true );
					option.style.paddingLeft = ( pad * 18 ) + 'px';
					options.push( option );

					const shouldExpand = nodeStates.get( object ) === true || ( searchFilter && hasMatchingChild( object ) );
					if ( shouldExpand ) {

						addObjects( object.children, pad + 1 );

					}

				}

			}

		} )( scene.children, 0 );

		outliner.setOptions( options );

		if ( editor.selected !== null ) {

			outliner.setValue( editor.selected.id );

		}


	}


	refreshUI();

	// events

	signals.editorCleared.add( refreshUI );

	signals.sceneGraphChanged.add( refreshUI );

	signals.refreshSidebarEnvironment.add( refreshUI );

	signals.objectChanged.add( function ( object ) {

		const options = outliner.options;

		for ( let i = 0; i < options.length; i ++ ) {

			const option = options[ i ];

			if ( option.value === object.id ) {

				const openerElement = option.querySelector( ':scope > .opener' );

				const openerHTML = openerElement ? openerElement.outerHTML : '';

				option.innerHTML = openerHTML + buildHTML( object );

				return;

			}

		}

	} );

	signals.scriptAdded.add( function () {

		if ( editor.selected !== null ) signals.objectChanged.dispatch( editor.selected );

	} );

	signals.scriptRemoved.add( function () {

		if ( editor.selected !== null ) signals.objectChanged.dispatch( editor.selected );

	} );


	signals.objectSelected.add( function ( object ) {

		if ( ignoreObjectSelectedSignal === true ) return;

		if ( object !== null && object.parent !== null ) {

			let needsRefresh = false;
			let parent = object.parent;

			while ( parent !== editor.scene ) {

				if ( nodeStates.get( parent ) !== true ) {

					nodeStates.set( parent, true );
					needsRefresh = true;

				}

				parent = parent.parent;

			}

			if ( needsRefresh ) refreshUI();

			outliner.setValue( object.id );

		} else {

			outliner.setValue( null );

		}

	} );


	return container;

}

export { SidebarScene };
