import * as THREE from 'three';
import { Editor } from '../Editor';
import { Command } from './Command';

/**
 * RemoveObjectCommand adapted from Three.js RemoveObjectCommand.js
 */
export class RemoveObjectCommand extends Command {
  public type: string = 'RemoveObjectCommand';
  public name: string = 'Remove Object';
  public object: THREE.Object3D;
  public parent: THREE.Object3D | null = null;
  public index: number | undefined = undefined;

  constructor(editor: Editor, object: THREE.Object3D) {
    super(editor);
    this.object = object;
    this.name = `Remove ${object.type}`;
  }

  execute(): void {
    if (this.object.parent !== null) {
      this.parent = this.object.parent;
      this.index = this.parent.children.indexOf(this.object);
    }
    this.editor.removeObject(this.object);
    this.editor.selectObject(null);
  }

  undo(): void {
    this.editor.addObject(this.object, this.parent, this.index);
    this.editor.selectObject(this.object);
  }
}

