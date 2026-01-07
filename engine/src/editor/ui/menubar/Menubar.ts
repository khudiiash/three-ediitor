import * as THREE from 'three';
import { Editor } from '../../Editor';
import { UIPanel } from '../../libs';
import { MenubarFile } from './Menubar.File';
import { MenubarEdit } from './Menubar.Edit';
import { MenubarAdd } from './Menubar.Add';
import { MenubarView } from './Menubar.View';
import { MenubarHelp } from './Menubar.Help';
import { MenubarStatus } from './Menubar.Status';

/**
 * Menubar class adapted from Three.js Menubar.js
 * Main menubar container
 */
export class Menubar {
  private editor: Editor;
  private container: UIPanel;

  constructor(editor: Editor) {
    this.editor = editor;
    this.container = new UIPanel();
    this.container.setId('menubar');

    this.container.add(new MenubarFile(editor).getContainer());
    this.container.add(new MenubarEdit(editor).getContainer());
    this.container.add(new MenubarAdd(editor).getContainer());
    this.container.add(new MenubarView(editor).getContainer());
    this.container.add(new MenubarHelp(editor).getContainer());
    this.container.add(new MenubarStatus(editor).getContainer());
  }

  getContainer(): UIPanel {
    return this.container;
  }
}

