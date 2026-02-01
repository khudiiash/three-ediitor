import { UITabbedPanel, UIPanel } from './libs/ui.js';
import { UICollapsiblePanel } from './libs/UICollapsiblePanel.js';

import { SidebarObject } from './Sidebar.Object.js';
import { SidebarScript } from './Sidebar.Script.js';
import { SidebarProject } from './Sidebar.Project.js';
import { SidebarSettings } from './Sidebar.Settings.js';

function SidebarProperties( editor ) {

	const strings = editor.strings;

	const container = new UITabbedPanel();
	container.setId( 'properties' );

	const inspectorPanel = new UIPanel();

	const objectPanels = new SidebarObject( editor );
	const scriptPanel = new UICollapsiblePanel( 'Script' );
	const scriptContent = new SidebarScript( editor );
	scriptPanel.add( scriptContent );
	scriptPanel.collapse();

	inspectorPanel.add( objectPanels );
	inspectorPanel.add( scriptPanel );
	
	const projectPanel = new UIPanel();
	const projectContent = new SidebarProject( editor );
	projectPanel.add( projectContent );

	const settingsPanel = new UIPanel();
	const editorSettingsContent = new SidebarSettings( editor );
	settingsPanel.add( editorSettingsContent );

	
	container.addTab( 'inspector', 'Inspector', inspectorPanel );
	container.addTab( 'project', 'Project', projectPanel );
	container.addTab( 'settings', 'Settings', settingsPanel );
	container.select( 'inspector' );

	function togglePanels( object ) {

		if ( object === null ) {
			objectPanels.setDisplay( 'none' );
			scriptPanel.setHidden( true );
			return;
		}

		objectPanels.setDisplay( 'block' );
		scriptPanel.setHidden( object === editor.camera );

	}

	editor.signals.objectSelected.add( togglePanels );

	togglePanels( editor.selected );

	return container;

}

export { SidebarProperties };
