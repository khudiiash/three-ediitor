import { UIPanel, UIRow, UIText } from './ui.js';

function UICollapsiblePanel( title ) {

	const panel = new UIPanel();
	panel.dom.className = 'Panel CollapsiblePanel';
	let collapsed = false;

	const headerRow = new UIRow();
	headerRow.dom.className = 'CollapsiblePanelHeader';
	headerRow.dom.style.cursor = 'pointer';
	headerRow.dom.style.userSelect = 'none';

	const titleText = new UIText( title ).setClass( 'Label' );
	titleText.dom.style.fontWeight = 'bold';

	const toggleIcon = document.createElement( 'span' );
	toggleIcon.className = 'CollapsiblePanelToggle';
	toggleIcon.textContent = '▼';
	toggleIcon.style.marginRight = '8px';
	toggleIcon.style.display = 'inline-block';
	toggleIcon.style.transition = 'transform 0.2s';

	headerRow.dom.appendChild( toggleIcon );
	headerRow.add( titleText );

	const contentPanel = new UIPanel();
	contentPanel.dom.className = 'CollapsiblePanelContent';
	contentPanel.dom.style.display = 'block';

	headerRow.dom.addEventListener( 'click', function () {

		collapsed = ! collapsed;
		contentPanel.dom.style.display = collapsed ? 'none' : 'block';
		toggleIcon.style.transform = collapsed ? 'rotate(-90deg)' : 'rotate(0deg)';

	} );

	panel.add( headerRow );
	panel.add( contentPanel );

	// Add methods to panel object
	panel.toggle = function () {

		collapsed = ! collapsed;
		contentPanel.dom.style.display = collapsed ? 'none' : 'block';
		toggleIcon.style.transform = collapsed ? 'rotate(-90deg)' : 'rotate(0deg)';

	};

	panel.collapse = function () {

		if ( ! collapsed ) panel.toggle();

	};

	panel.expand = function () {

		if ( collapsed ) panel.toggle();

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
