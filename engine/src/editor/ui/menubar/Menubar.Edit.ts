import { Editor } from '../../Editor';
import { UIPanel, UIRow } from '../../libs';

/**
 * MenubarEdit class adapted from Three.js Menubar.Edit.js
 * Edit menu with Undo, Redo, Clone, Delete, etc.
 */
export class MenubarEdit {
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
    title.setTextContent(this.strings.getKey('menubar/edit') || 'Edit');
    this.container.add(title);

    const options = new UIPanel();
    options.setClass('options');
    this.container.add(options);

    // Undo
    const undoOption = new UIRow()
      .setClass('option')
      .setTextContent(this.strings.getKey('menubar/edit/undo') || 'Undo')
      .onClick(() => {
        this.editor.undo();
      });
    options.add(undoOption);

    // Redo
    const redoOption = new UIRow()
      .setClass('option')
      .setTextContent(this.strings.getKey('menubar/edit/redo') || 'Redo')
      .onClick(() => {
        this.editor.redo();
      });
    options.add(redoOption);

    // Center
    const centerOption = new UIRow()
      .setClass('option')
      .setTextContent(this.strings.getKey('menubar/edit/center') || 'Center')
      .onClick(() => {
        const selected = (this.editor as any).selectedObject;
        if (selected) {
          // Center logic to be implemented
          console.log('Center object - to be implemented');
        }
      });
    options.add(centerOption);

    // Clone
    const cloneOption = new UIRow()
      .setClass('option')
      .setTextContent(this.strings.getKey('menubar/edit/clone') || 'Clone')
      .onClick(() => {
        const selected = (this.editor as any).selectedObject;
        if (selected) {
          // Clone logic to be implemented
          console.log('Clone object - to be implemented');
        }
      });
    options.add(cloneOption);

    // Delete
    const deleteOption = new UIRow()
      .setClass('option')
      .setTextContent(this.strings.getKey('menubar/edit/delete') || 'Delete')
      .onClick(() => {
        const selected = (this.editor as any).selectedObject;
        if (selected) {
          this.editor.removeObject(selected);
        }
      });
    options.add(deleteOption);
  }

  getContainer(): UIPanel {
    return this.container;
  }
}

