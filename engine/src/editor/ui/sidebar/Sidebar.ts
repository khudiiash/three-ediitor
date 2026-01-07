import { Editor } from '../../Editor';
import { UIPanel } from '../../libs';
import { SidebarGeometry } from './Sidebar.Geometry';
import { SidebarMaterial } from './Sidebar.Material';
import { SidebarObject } from './Sidebar.Object';
import { SidebarProject } from './Sidebar.Project';
import { SidebarScene } from './Sidebar.Scene';
import { SidebarSettings } from './Sidebar.Settings';

/**
 * Sidebar class adapted from Three.js Sidebar.js
 * Main sidebar container with tabs for different panels
 */
export class Sidebar {
  private editor: Editor;
  private container: UIPanel;
  private tabs: UIPanel;
  private panels: UIPanel;

  constructor(editor: Editor) {
    this.editor = editor;
    this.container = new UIPanel();
    this.container.setId('sidebar');

    this.createTabs();
    this.createPanels();
  }

  private createTabs(): void {
    this.tabs = new UIPanel();
    this.tabs.setId('tabs');
    this.container.add(this.tabs);

    // Tab buttons will be added by panels
  }

  private createPanels(): void {
    this.panels = new UIPanel();
    this.panels.setId('panels');
    this.container.add(this.panels);

    // Add main panels
    const scenePanel = new SidebarScene(this.editor);
    const objectPanel = new SidebarObject(this.editor);
    const geometryPanel = new SidebarGeometry(this.editor);
    const materialPanel = new SidebarMaterial(this.editor);
    const projectPanel = new SidebarProject(this.editor);
    const settingsPanel = new SidebarSettings(this.editor);

    this.panels.add(scenePanel.getContainer());
    this.panels.add(objectPanel.getContainer());
    this.panels.add(geometryPanel.getContainer());
    this.panels.add(materialPanel.getContainer());
    this.panels.add(projectPanel.getContainer());
    this.panels.add(settingsPanel.getContainer());
  }

  getContainer(): UIPanel {
    return this.container;
  }
}

