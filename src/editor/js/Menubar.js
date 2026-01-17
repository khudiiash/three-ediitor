import { UIPanel } from './libs/ui.js';

import { MenubarAdd } from './Menubar.Add.js';
import { MenubarEdit } from './Menubar.Edit.js';
import { MenubarFile } from './Menubar.File.js';
import { MenubarView } from './Menubar.View.js';
import { MenubarHelp } from './Menubar.Help.js';
import { MenubarStatus } from './Menubar.Status.js';

function Menubar( editor ) {

	const container = new UIPanel();
	container.setId( 'menubar' );
	container.dom.style.display = 'flex';
	container.dom.style.flexDirection = 'row';
	container.dom.style.alignItems = 'stretch';

	function closeAllMenus( exceptMenu ) {
		const allMenus = container.dom.querySelectorAll( '.menu' );
		allMenus.forEach( menu => {
			if ( menu !== exceptMenu && !menu.matches( ':hover' ) ) {
				const options = menu.querySelector( '.options:not(.submenu)' );
				if ( options ) {
					options.style.display = 'none';
				}
				const submenus = menu.querySelectorAll( '.options.submenu' );
				submenus.forEach( submenu => {
					submenu.style.display = 'none';
				} );
			}
		} );
		const allSubmenus = document.querySelectorAll( '.options.submenu' );
		allSubmenus.forEach( submenu => {
			if ( !exceptMenu || !exceptMenu.contains( submenu ) ) {
				const parentMenu = submenu.closest( '.menu' );
				if ( !parentMenu || !parentMenu.matches( ':hover' ) ) {
					submenu.style.display = 'none';
				}
			}
		} );
	}

	let currentHoveredMenu = null;
	let closeTimeout = null;

	container.dom.addEventListener( 'mouseleave', function () {
		if ( closeTimeout ) {
			clearTimeout( closeTimeout );
			closeTimeout = null;
		}
		closeAllMenus();
		currentHoveredMenu = null;
	} );

	container.dom.addEventListener( 'mouseenter', function ( event ) {
		const menu = event.target.closest( '.menu' );
		if ( menu ) {
			if ( closeTimeout ) {
				clearTimeout( closeTimeout );
				closeTimeout = null;
			}
			
			if ( menu === currentHoveredMenu ) {
				const options = menu.querySelector( '.options:not(.submenu)' );
				if ( options && options.style.display === 'none' ) {
					options.style.display = '';
				}
				return;
			}
			
			const previousMenu = currentHoveredMenu;
			currentHoveredMenu = menu;
			
			closeTimeout = setTimeout( function () {
				if ( currentHoveredMenu === menu ) {
					if ( !previousMenu || !previousMenu.matches( ':hover' ) ) {
						closeAllMenus( menu );
					}
				}
				closeTimeout = null;
			}, 200 );
		}
	}, true );
	
	container.dom.addEventListener( 'mouseleave', function ( event ) {
		const menu = event.target.closest( '.menu' );
		if ( menu && menu === currentHoveredMenu ) {
			currentHoveredMenu = null;
		}
	}, true );

	container.add( new MenubarFile( editor ) );
	container.add( new MenubarEdit( editor ) );
	container.add( new MenubarAdd( editor ) );
	container.add( new MenubarView( editor ) );
	container.add( new MenubarHelp( editor ) );

	container.add( new MenubarStatus( editor ) );

	return container;

}

export { Menubar };
