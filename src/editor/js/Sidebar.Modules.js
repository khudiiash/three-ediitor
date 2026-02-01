import { UIPanel, UIRow, UIText, UIButton, UIBreak } from './libs/ui.js';

function SidebarModules( editor ) {

	const signals = editor.signals;
	const modules = editor.modules;

	const container = new UIPanel();
	container.setPadding( '10px' );

	const headerRow = new UIRow();
	headerRow.setMarginBottom( '10px' );

	const headerText = new UIText( 'Editor Modules' );
	headerText.setFontSize( '14px' );
	headerText.setFontWeight( '600' );
	headerRow.add( headerText );

	container.add( headerRow );

	const installRow = new UIRow();
	installRow.setMarginBottom( '15px' );
	installRow.dom.style.display = 'flex';
	installRow.dom.style.gap = '8px';

	const installFromUrlBtn = new UIButton( '+ Install Module' );
	installFromUrlBtn.dom.style.flex = '1';
	installFromUrlBtn.onClick( installModuleFromUrl );
	installRow.add( installFromUrlBtn );

	container.add( installRow );

	const modulesList = new UIPanel();
	container.add( modulesList );

	function refresh() {

		modulesList.clear();

		const moduleConfigs = modules.getAllModuleConfigs();

		if ( moduleConfigs.length === 0 ) {

			const emptyText = new UIText( 'No modules installed' );
			emptyText.setColor( '#666' );
			emptyText.setMarginTop( '20px' );
			emptyText.dom.style.textAlign = 'center';
			modulesList.add( emptyText );
			return;

		}

		for ( let i = 0; i < moduleConfigs.length; i ++ ) {

			modulesList.add( buildModuleRow( moduleConfigs[ i ] ) );

		}

	}

	function buildModuleRow( config ) {

		const card = new UIPanel();
		card.setMarginBottom( '8px' );
		card.setPadding( '0px' );
		card.dom.style.backgroundColor = '#1a1a1a';
		card.dom.style.borderRadius = '3px';
		card.dom.style.border = '1px solid #2a2a2a';
		card.dom.style.overflow = 'hidden';

		// Header (always visible, clickable to expand/collapse)
		const header = new UIRow();
		header.setPadding( '10px' );
		header.dom.style.display = 'flex';
		header.dom.style.alignItems = 'center';
		header.dom.style.justifyContent = 'space-between';
		header.dom.style.cursor = 'pointer';
		header.dom.style.userSelect = 'none';

		const leftSide = new UIPanel();
		leftSide.dom.style.display = 'flex';
		leftSide.dom.style.alignItems = 'center';
		leftSide.dom.style.gap = '8px';

		const nameText = new UIText( config.name );
		nameText.setFontSize( '13px' );
		nameText.setFontWeight( '500' );
		nameText.setColor( config.enabled ? '#ddd' : '#666' );
		leftSide.add( nameText );

		const rightSide = new UIPanel();
		rightSide.dom.style.display = 'flex';
		rightSide.dom.style.gap = '4px';
		rightSide.dom.style.alignItems = 'center';

		const statusIndicator = new UIText( config.enabled ? '●' : '○' );
		statusIndicator.setColor( config.enabled ? '#88cc88' : '#666' );
		statusIndicator.dom.title = config.enabled ? 'Enabled' : 'Disabled';
		statusIndicator.dom.style.fontSize = '14px';
		rightSide.add( statusIndicator );

		header.add( leftSide );
		header.add( rightSide );

		// Content panel (collapsible)
		const contentPanel = new UIPanel();
		contentPanel.setPadding( '10px' );
		contentPanel.dom.style.borderTop = '1px solid #2a2a2a';
		contentPanel.dom.style.backgroundColor = '#151515';
		contentPanel.dom.style.display = 'none';

		// Module info
		const infoSection = new UIPanel();
		infoSection.setMarginBottom( '12px' );

		const versionRow = new UIRow();
		versionRow.setMarginBottom( '4px' );
		versionRow.dom.style.display = 'flex';
		versionRow.dom.style.justifyContent = 'space-between';
		const versionLabel = new UIText( 'Version:' );
		versionLabel.setFontSize( '11px' );
		versionLabel.setColor( '#888' );
		const versionValue = new UIText( config.version );
		versionValue.setFontSize( '11px' );
		versionValue.setColor( '#aaa' );
		versionRow.add( versionLabel );
		versionRow.add( versionValue );
		infoSection.add( versionRow );

		const authorRow = new UIRow();
		authorRow.setMarginBottom( '4px' );
		authorRow.dom.style.display = 'flex';
		authorRow.dom.style.justifyContent = 'space-between';
		const authorLabel = new UIText( 'Author:' );
		authorLabel.setFontSize( '11px' );
		authorLabel.setColor( '#888' );
		const authorValue = new UIText( config.author || 'Unknown' );
		authorValue.setFontSize( '11px' );
		authorValue.setColor( '#aaa' );
		authorRow.add( authorLabel );
		authorRow.add( authorValue );
		infoSection.add( authorRow );

		if ( config.description ) {

			const descRow = new UIRow();
			descRow.setMarginBottom( '4px' );
			const descLabel = new UIText( 'Description:' );
			descLabel.setFontSize( '11px' );
			descLabel.setColor( '#888' );
			descLabel.setMarginBottom( '2px' );
			descRow.add( descLabel );
			infoSection.add( descRow );

			const descText = new UIText( config.description );
			descText.setFontSize( '11px' );
			descText.setColor( '#999' );
			descText.dom.style.lineHeight = '1.4';
			infoSection.add( descText );

		}

		contentPanel.add( infoSection );

		// Actions
		const actionsRow = new UIRow();
		actionsRow.dom.style.display = 'flex';
		actionsRow.dom.style.gap = '4px';

		const enableBtn = new UIButton( config.enabled ? 'Disable' : 'Enable' );
		enableBtn.dom.style.flex = '1';
		enableBtn.dom.style.fontSize = '11px';
		enableBtn.dom.style.padding = '6px';
		enableBtn.onClick( async function () {

			if ( config.enabled ) {

				await modules.disableModule( config.id );

			} else {

				await modules.enableModule( config.id );

			}

			refresh();

		} );
		actionsRow.add( enableBtn );

		const uninstallBtn = new UIButton( 'Uninstall' );
		uninstallBtn.dom.style.flex = '0 0 auto';
		uninstallBtn.dom.style.fontSize = '11px';
		uninstallBtn.dom.style.padding = '6px 12px';
		uninstallBtn.dom.style.color = '#ff6b6b';
		uninstallBtn.dom.style.backgroundColor = '#2a1515';
		uninstallBtn.dom.style.borderColor = '#3a1a1a';
		uninstallBtn.onClick( async function () {

			if ( confirm( `Uninstall module "${config.name}"?` ) ) {

				await modules.unregisterModule( config.id );
				refresh();

			}

		} );
		actionsRow.add( uninstallBtn );

		contentPanel.add( actionsRow );

		// Toggle collapse on header click
		let isExpanded = false;
		header.onClick( function () {

			isExpanded = ! isExpanded;
			
			if ( isExpanded ) {

				contentPanel.dom.style.display = 'block';

			} else {

				contentPanel.dom.style.display = 'none';

			}

		} );

		card.add( header );
		card.add( contentPanel );

		return card;

	}

	function installModuleFromUrl() {

		const overlay = document.createElement( 'div' );
		overlay.style.position = 'fixed';
		overlay.style.top = '0';
		overlay.style.left = '0';
		overlay.style.width = '100%';
		overlay.style.height = '100%';
		overlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
		overlay.style.zIndex = '10000';
		overlay.style.display = 'flex';
		overlay.style.alignItems = 'center';
		overlay.style.justifyContent = 'center';

		const dialog = document.createElement( 'div' );
		dialog.style.backgroundColor = '#2a2a2a';
		dialog.style.border = '1px solid #444';
		dialog.style.borderRadius = '4px';
		dialog.style.padding = '20px';
		dialog.style.minWidth = '400px';
		dialog.style.boxShadow = '0 8px 32px rgba(0,0,0,0.8)';

		const titleEl = document.createElement( 'div' );
		titleEl.textContent = 'Install Module';
		titleEl.style.fontSize = '14px';
		titleEl.style.color = '#ddd';
		titleEl.style.marginBottom = '12px';
		titleEl.style.fontWeight = '500';
		dialog.appendChild( titleEl );

		const input = document.createElement( 'input' );
		input.type = 'text';
		input.placeholder = './modules/my-module/dist/index.js or https://unpkg.com/@org/module';
		input.value = '';
		input.style.width = '100%';
		input.style.padding = '8px';
		input.style.backgroundColor = '#1a1a1a';
		input.style.border = '1px solid #444';
		input.style.borderRadius = '3px';
		input.style.color = '#ddd';
		input.style.fontSize = '13px';
		input.style.marginBottom = '12px';
		input.style.boxSizing = 'border-box';
		dialog.appendChild( input );

		const orText = document.createElement( 'div' );
		orText.textContent = 'or';
		orText.style.textAlign = 'center';
		orText.style.color = '#666';
		orText.style.fontSize = '12px';
		orText.style.marginBottom = '12px';
		dialog.appendChild( orText );

		const filePickerBtn = document.createElement( 'button' );
		filePickerBtn.textContent = 'Browse Files...';
		filePickerBtn.style.width = '100%';
		filePickerBtn.style.padding = '8px';
		filePickerBtn.style.backgroundColor = '#333';
		filePickerBtn.style.border = '1px solid #555';
		filePickerBtn.style.borderRadius = '3px';
		filePickerBtn.style.color = '#ddd';
		filePickerBtn.style.cursor = 'pointer';
		filePickerBtn.style.fontSize = '13px';
		filePickerBtn.style.marginBottom = '16px';
		filePickerBtn.onmouseenter = () => filePickerBtn.style.backgroundColor = '#3a3a3a';
		filePickerBtn.onmouseleave = () => filePickerBtn.style.backgroundColor = '#333';
		filePickerBtn.onclick = async () => {

			if ( window.__TAURI__ ) {

				const { open } = window.__TAURI__.dialog;
				const filePath = await open( {
					multiple: false,
					filters: [ {
						name: 'JavaScript Module',
						extensions: [ 'js', 'mjs' ]
					} ]
				} );

				if ( filePath ) {

					input.value = filePath;

				}

			}

		};
		dialog.appendChild( filePickerBtn );

		const buttonRow = document.createElement( 'div' );
		buttonRow.style.display = 'flex';
		buttonRow.style.gap = '8px';
		buttonRow.style.justifyContent = 'flex-end';

		const cancelBtn = document.createElement( 'button' );
		cancelBtn.textContent = 'Cancel';
		cancelBtn.style.padding = '6px 16px';
		cancelBtn.style.backgroundColor = '#333';
		cancelBtn.style.border = '1px solid #555';
		cancelBtn.style.borderRadius = '3px';
		cancelBtn.style.color = '#ddd';
		cancelBtn.style.cursor = 'pointer';
		cancelBtn.style.fontSize = '12px';
		cancelBtn.onmouseenter = () => cancelBtn.style.backgroundColor = '#3a3a3a';
		cancelBtn.onmouseleave = () => cancelBtn.style.backgroundColor = '#333';
		cancelBtn.onclick = () => {

			document.body.removeChild( overlay );

		};
		buttonRow.appendChild( cancelBtn );

		const installBtn = document.createElement( 'button' );
		installBtn.textContent = 'Install';
		installBtn.style.padding = '6px 16px';
		installBtn.style.backgroundColor = '#2ea8ff';
		installBtn.style.border = '1px solid #2ea8ff';
		installBtn.style.borderRadius = '3px';
		installBtn.style.color = '#fff';
		installBtn.style.cursor = 'pointer';
		installBtn.style.fontSize = '12px';
		installBtn.onmouseenter = () => installBtn.style.backgroundColor = '#3eb5ff';
		installBtn.onmouseleave = () => installBtn.style.backgroundColor = '#2ea8ff';
		installBtn.onclick = async () => {

			const url = input.value.trim();
			
			if ( ! url ) return;

			installBtn.disabled = true;
			installBtn.textContent = 'Installing...';
			installBtn.style.opacity = '0.5';

			const success = await modules.loadModuleFromUrl( url );

			if ( success ) {

				document.body.removeChild( overlay );
				refresh();

			} else {

				alert( 'Failed to install module. Check console for details.' );
				installBtn.disabled = false;
				installBtn.textContent = 'Install';
				installBtn.style.opacity = '1';

			}

		};
		buttonRow.appendChild( installBtn );

		dialog.appendChild( buttonRow );
		overlay.appendChild( dialog );

		input.onkeydown = ( e ) => {

			if ( e.key === 'Enter' ) {

				installBtn.click();

			} else if ( e.key === 'Escape' ) {

				cancelBtn.click();

			}

		};

		document.body.appendChild( overlay );
		setTimeout( () => {

			input.focus();

		}, 10 );

	}

	signals.moduleRegistered.add( refresh );
	signals.moduleUnregistered.add( refresh );
	signals.moduleEnabled.add( refresh );
	signals.moduleDisabled.add( refresh );

	refresh();

	return container;

}

export { SidebarModules };
