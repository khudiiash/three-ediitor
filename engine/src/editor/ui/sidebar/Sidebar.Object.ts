import { Editor } from '../../Editor';
import { UIPanel, UIText, UIInput, UIRow } from '../../libs';
import * as THREE from 'three';

/**
 * SidebarObject class adapted from Three.js Sidebar.Object.js
 * Object properties panel
 */
export class SidebarObject {
  private editor: Editor;
  private container: UIPanel;

  constructor(editor: Editor) {
    this.editor = editor;
    this.container = new UIPanel();
    this.container.setId('object');

    this.createPanel();
    this.setupEventListeners();
  }

  private createPanel(): void {
    const title = new UIText('Object');
    title.setClass('title');
    this.container.add(title);

    // Properties will be populated when object is selected
  }

  private setupEventListeners(): void {
    this.editor.signals.objectSelected?.add((object: THREE.Object3D | null) => {
      this.update(object);
    });
  }

  private update(object: THREE.Object3D | null): void {
    // Clear existing content
    while (this.container.dom.children.length > 1) {
      this.container.dom.removeChild(this.container.dom.lastChild!);
    }

    if (!object) {
      const emptyText = new UIText('No object selected');
      this.container.add(emptyText);
      return;
    }

    // Name
    const nameRow = new UIRow();
    nameRow.add(new UIText('Name').setWidth('90px'));
    const nameInput = new UIInput();
    nameInput.setValue(object.name);
    nameInput.onChange(() => {
      object.name = nameInput.getValue();
      this.editor.signals.objectChanged?.dispatch(object);
    });
    nameRow.add(nameInput);
    this.container.add(nameRow);

    // UUID
    const uuidRow = new UIRow();
    uuidRow.add(new UIText('UUID').setWidth('90px'));
    uuidRow.add(new UIText(object.uuid).setFontSize('12px'));
    this.container.add(uuidRow);

    // Position, Rotation, Scale will be added by TransformComponent inspector
  }

  getContainer(): UIPanel {
    return this.container;
  }
}

