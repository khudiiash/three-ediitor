import { Editor } from '../../Editor';
import { UIPanel, UIText } from '../../libs';

/**
 * SidebarProject class adapted from Three.js Sidebar.Project.js
 * Project settings panel
 */
export class SidebarProject {
  private editor: Editor;
  private container: UIPanel;

  constructor(editor: Editor) {
    this.editor = editor;
    this.container = new UIPanel();
    this.container.setId('project');

    this.createPanel();
  }

  private createPanel(): void {
    const title = new UIText('Project');
    title.setClass('title');
    this.container.add(title);

    // Project settings (title, editable, VR, renderer settings, etc.)
    // Full implementation would include all project configuration options
  }

  getContainer(): UIPanel {
    return this.container;
  }
}

