import { UITabbedPanel, UIPanel } from './libs/ui.js';
import { UICollapsiblePanel } from './libs/UICollapsiblePanel.js';

import { SidebarObject } from './Sidebar.Object.js';
import { SidebarGeometry } from './Sidebar.Geometry.js';
import { SidebarMaterial } from './Sidebar.Material.js';
import { SidebarScript } from './Sidebar.Script.js';
import { SidebarProject } from './Sidebar.Project.js';
import { SidebarSceneSettings } from './Sidebar.Scene.Settings.js';
import { SidebarSettings } from './Sidebar.Settings.js';

function SidebarProperties( editor ) {

	const strings = editor.strings;

	const container = new UITabbedPanel();
	container.setId( 'properties' );

	// Inspector tab with collapsible sections
	const inspectorPanel = new UIPanel();
	inspectorPanel.setBorderTop( '0' );
	inspectorPanel.setPaddingTop( '20px' );

	const objectPanel = new UICollapsiblePanel( strings.getKey( 'sidebar/properties/object' ) || 'Object' );
	const objectContent = new SidebarObject( editor );
	objectPanel.add( objectContent );

	const geometryPanel = new UICollapsiblePanel( strings.getKey( 'sidebar/properties/geometry' ) || 'Geometry' );
	const geometryContent = new SidebarGeometry( editor );
	geometryPanel.add( geometryContent );

	const materialPanel = new UICollapsiblePanel( strings.getKey( 'sidebar/properties/material' ) || 'Material' );
	const materialContent = new SidebarMaterial( editor );
	materialPanel.add( materialContent );

	const scriptPanel = new UICollapsiblePanel( strings.getKey( 'sidebar/properties/script' ) || 'Script' );
	const scriptContent = new SidebarScript( editor );
	scriptPanel.add( scriptContent );

	inspectorPanel.add( objectPanel );
	inspectorPanel.add( geometryPanel );
	inspectorPanel.add( materialPanel );
	inspectorPanel.add( scriptPanel );

	// Project tab
	const projectPanel = new UIPanel();
	projectPanel.setBorderTop( '0' );
	projectPanel.setPaddingTop( '20px' );
	const projectContent = new SidebarProject( editor );
	projectPanel.add( projectContent );

	// Settings tab (combines Scene Settings and Editor Settings)
	const settingsPanel = new UIPanel();
	settingsPanel.setBorderTop( '0' );
	settingsPanel.setPaddingTop( '20px' );
	
	const sceneSettingsContent = new SidebarSceneSettings( editor );
	settingsPanel.add( sceneSettingsContent );
	
	const editorSettingsContent = new SidebarSettings( editor );
	settingsPanel.add( editorSettingsContent );

	// Add tabs
	container.addTab( 'inspector', 'Inspector', inspectorPanel );
	container.addTab( 'project', 'Project', projectPanel );
	container.addTab( 'settings', 'Settings', settingsPanel );
	container.select( 'inspector' );

	function togglePanels( object ) {

		if ( object === null ) {

			// When nothing selected, show scene settings tab
			objectPanel.setHidden( true );
			geometryPanel.setHidden( true );
			materialPanel.setHidden( true );
			scriptPanel.setHidden( true );
			return;

		}

		// Show object panels when object is selected
		objectPanel.setHidden( false );
		geometryPanel.setHidden( ! object.geometry );
		materialPanel.setHidden( ! object.material );
		scriptPanel.setHidden( object === editor.camera );

	}

	editor.signals.objectSelected.add( togglePanels );

	togglePanels( editor.selected );

	return container;

}

export { SidebarProperties };
