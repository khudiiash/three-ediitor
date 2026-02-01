import { UISpan } from './libs/ui.js';
import { UICollapsiblePanel } from './libs/UICollapsiblePanel.js';

import { SidebarScenes } from './Sidebar.Scenes.js';
import { SidebarProjectApp } from './Sidebar.Project.App.js';
import { SidebarProjectRenderer } from './Sidebar.Project.Renderer.js';
import { SidebarProjectImage } from './Sidebar.Project.Image.js';
import { SidebarProjectVideo } from './Sidebar.Project.Video.js';

function SidebarProject( editor ) {

	const container = new UISpan();

	const appPanel = new UICollapsiblePanel( 'App' );
	const appContent = new SidebarProjectApp( editor );
	appPanel.add( appContent );
	container.add( appPanel );

	const scenesPanel = new UICollapsiblePanel( 'Scenes' );
	const scenesContent = new SidebarScenes( editor );
	scenesPanel.add( scenesContent );
	container.add( scenesPanel );

	const rendererPanel = new UICollapsiblePanel( 'Renderer' );
	const rendererContent = new SidebarProjectRenderer( editor );
	rendererPanel.add( rendererContent );
	container.add( rendererPanel );

	const imagePanel = new UICollapsiblePanel( 'Image' );
	const imageContent = new SidebarProjectImage( editor );
	imagePanel.add( imageContent );
	container.add( imagePanel );

	if ( 'SharedArrayBuffer' in window ) {

		const videoPanel = new UICollapsiblePanel( 'Video' );
		const videoContent = new SidebarProjectVideo( editor );
		videoPanel.add( videoContent );
		container.add( videoPanel );

	}

	return container;

}

export { SidebarProject };
