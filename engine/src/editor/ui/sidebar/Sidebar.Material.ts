import { Editor } from '../../Editor';
import { UIPanel, UIText } from '../../libs';

/**
 * SidebarMaterial class adapted from Three.js Sidebar.Material.js
 * Material properties panel (simplified - full version has many material types)
 */
export class SidebarMaterial {
  private editor: Editor;
  private container: UIPanel;

  constructor(editor: Editor) {
    this.editor = editor;
    this.container = new UIPanel();
    this.container.setId('material');

    this.createPanel();
  }

  private createPanel(): void {
    const title = new UIText('Material');
    title.setClass('title');
    this.container.add(title);

    // Material properties will be populated based on selected object's material
    // Full implementation would include all material types and properties
  }

  getContainer(): UIPanel {
    return this.container;
  }
}

