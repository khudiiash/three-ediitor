import { Editor } from '../../Editor';
import { UIPanel, UIRow } from '../../libs';

/**
 * MenubarHelp class adapted from Three.js Menubar.Help.js
 * Help menu
 */
export class MenubarHelp {
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
    title.setTextContent('Help');
    this.container.add(title);

    const options = new UIPanel();
    options.setClass('options');
    this.container.add(options);

    // Help options to be expanded
    const aboutOption = new UIRow()
      .setClass('option')
      .setTextContent('About')
      .onClick(() => {
        alert('Three.js Editor - TypeScript Edition');
      });
    options.add(aboutOption);
  }

  getContainer(): UIPanel {
    return this.container;
  }
}

