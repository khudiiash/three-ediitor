import { Editor } from '../../Editor';
import { UIPanel, UIRow } from '../../libs';

/**
 * MenubarView class adapted from Three.js Menubar.View.js
 * View menu for viewport options
 */
export class MenubarView {
  private editor: Editor;
  private strings: any;
  private container: UIPanel;

  constructor(editor: Editor) {
    this.editor = editor;
    this.strings = editor.strings;
    this.container = new UIPanel();
    this.container.setClass('menu');

    this.createMenu();
  }

  private createMenu(): void {
    const title = new UIPanel();
    title.setClass('title');
    title.setTextContent('View');
    this.container.add(title);

    const options = new UIPanel();
    options.setClass('options');
    this.container.add(options);

    // View options to be expanded
    const viewOption = new UIRow()
      .setClass('option')
      .setTextContent('Viewport Options')
      .onClick(() => {
        console.log('Viewport options - to be implemented');
      });
    options.add(viewOption);
  }

  getContainer(): UIPanel {
    return this.container;
  }
}

