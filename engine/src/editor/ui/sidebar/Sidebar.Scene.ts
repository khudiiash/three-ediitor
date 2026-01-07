import { Editor } from '../../Editor';
import { UIPanel, UIText, UIInput } from '../../libs';

/**
 * SidebarScene class adapted from Three.js Sidebar.Scene.js
 * Scene properties panel
 */
export class SidebarScene {
  private editor: Editor;
  private container: UIPanel;

  constructor(editor: Editor) {
    this.editor = editor;
    this.container = new UIPanel();
    this.container.setId('scene');

    this.createPanel();
  }

  private createPanel(): void {
    const title = new UIText('Scene');
    title.setClass('title');
    this.container.add(title);

    // Scene properties
    const nameRow = new UIPanel();
    nameRow.add(new UIText('Name').setWidth('90px'));
    const nameInput = new UIInput();
    nameInput.setValue(this.editor.getScene().name);
    nameInput.onChange(() => {
      this.editor.getScene().name = nameInput.getValue();
    });
    nameRow.add(nameInput);
    this.container.add(nameRow);
  }

  getContainer(): UIPanel {
    return this.container;
  }
}

