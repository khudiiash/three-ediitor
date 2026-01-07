import { Editor } from '../../Editor';
import { UIPanel, UIText } from '../../libs';

/**
 * SidebarGeometry class adapted from Three.js Sidebar.Geometry.js
 * Geometry properties panel (simplified - full version has many geometry types)
 */
export class SidebarGeometry {
  private editor: Editor;
  private container: UIPanel;

  constructor(editor: Editor) {
    this.editor = editor;
    this.container = new UIPanel();
    this.container.setId('geometry');

    this.createPanel();
  }

  private createPanel(): void {
    const title = new UIText('Geometry');
    title.setClass('title');
    this.container.add(title);

    // Geometry properties will be populated based on selected object's geometry
    // Full implementation would include all geometry types (Box, Sphere, etc.)
  }

  getContainer(): UIPanel {
    return this.container;
  }
}

