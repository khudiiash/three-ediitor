import { Editor } from '../../Editor';
import { UIPanel, UIText } from '../../libs';

/**
 * MenubarStatus class adapted from Three.js Menubar.Status.js
 * Status bar showing editor information
 */
export class MenubarStatus {
  private editor: Editor;
  private container: UIPanel;
  private statusText: UIText;

  constructor(editor: Editor) {
    this.editor = editor;
    this.container = new UIPanel();
    this.container.setId('status');

    this.statusText = new UIText('Ready');
    this.container.add(this.statusText);
  }

  setText(text: string): void {
    this.statusText.setTextContent(text);
  }

  getContainer(): UIPanel {
    return this.container;
  }
}

