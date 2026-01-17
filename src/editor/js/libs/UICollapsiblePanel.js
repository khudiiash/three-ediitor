import { UIPanel, UIRow, UIText } from './ui.js';

function UICollapsiblePanel( title ) {

	const panel = new UIPanel();
	panel.dom.className = 'Panel CollapsiblePanel';
	let collapsed = false;
	
	const originalSetHidden = panel.setHidden.bind( panel );
	panel.setHidden = function( isHidden ) {
		originalSetHidden( isHidden );
		if ( isHidden ) {
			panel.dom.style.display = 'none';
		} else {
			panel.dom.style.display = '';
		}
		return panel;
	};

	const headerRow = new UIRow();
	headerRow.dom.className = 'CollapsiblePanelHeader';

	const titleText = new UIText( title ).setClass( 'Label' );

	const toggleIcon = document.createElement( 'span' );
	toggleIcon.className = 'CollapsiblePanelToggle';
	toggleIcon.textContent = '▼';

	headerRow.dom.appendChild( toggleIcon );
	headerRow.add( titleText );

	const contentPanel = new UIPanel();
	contentPanel.dom.className = 'CollapsiblePanelContent';

	headerRow.dom.addEventListener( 'click', function () {

		collapsed = ! collapsed;
		if (collapsed) {
			contentPanel.dom.style.display = 'none';
			toggleIcon.style.transform = 'rotate(-90deg)';
		} else {
			contentPanel.dom.style.display = 'block';
			toggleIcon.style.transform = 'rotate(0deg)';
		}

	} );

	panel.add( headerRow );
	panel.add( contentPanel );

	// Add methods to panel object
	panel.toggle = function () {

		collapsed = ! collapsed;
		if (collapsed) {
			contentPanel.dom.style.display = 'none';
			toggleIcon.style.transform = 'rotate(-90deg)';
		} else {
			contentPanel.dom.style.display = 'block';
			toggleIcon.style.transform = 'rotate(0deg)';
		}

	};

	panel.collapse = function () {

		if ( ! collapsed ) {
			collapsed = true;
			contentPanel.dom.style.display = 'none';
			toggleIcon.style.transform = 'rotate(-90deg)';
		}

	};

	panel.expand = function () {

		if ( collapsed ) {
			collapsed = false;
			contentPanel.dom.style.display = 'block';
			toggleIcon.style.transform = 'rotate(0deg)';
		}

	};

	// Override add/remove/clear to work with contentPanel
	const originalAdd = panel.add.bind( panel );
	panel.add = function () {

		contentPanel.add.apply( contentPanel, arguments );
		return panel;

	};

	const originalRemove = panel.remove.bind( panel );
	panel.remove = function () {

		contentPanel.remove.apply( contentPanel, arguments );
		return panel;

	};

	const originalClear = panel.clear.bind( panel );
	panel.clear = function () {

		contentPanel.clear();
		return panel;

	};

	return panel;

}

export { UICollapsiblePanel };
