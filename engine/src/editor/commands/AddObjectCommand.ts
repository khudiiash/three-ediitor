import * as THREE from 'three';
import { Editor } from '../Editor';
import { Command } from './Command';

/**
 * AddObjectCommand adapted from Three.js AddObjectCommand.js
 */
export class AddObjectCommand extends Command {
  public type: string = 'AddObjectCommand';
  public name: string = 'Add Object';
  public object: THREE.Object3D;
  public parent: THREE.Object3D | null = null;
  public index: number | undefined = undefined;

  constructor(editor: Editor, object: THREE.Object3D) {
    super(editor);
    this.object = object;
    this.name = `Add ${object.type}`;
  }

  execute(): void {
    this.editor.addObject(this.object, this.parent, this.index);
    this.editor.selectObject(this.object);
  }

  undo(): void {
    this.editor.removeObject(this.object);
    this.editor.selectObject(null);
  }

  toJSON(): any {
    const output = super.toJSON();
    output.object = this.object.toJSON();
    return output;
  }

  fromJSON(json: any): void {
    super.fromJSON(json);
    const loader = new THREE.ObjectLoader();
    this.object = loader.parse(json.object);
  }
}

