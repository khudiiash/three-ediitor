import * as THREE from 'three';
import { Editor } from '../Editor';
import { Command } from './Command';

/**
 * SetScaleCommand adapted from Three.js SetScaleCommand.js
 */
export class SetScaleCommand extends Command {
  public type: string = 'SetScaleCommand';
  public name: string = 'Set Scale';
  public updatable: boolean = true;
  public object: THREE.Object3D;
  public newScale: THREE.Vector3;
  public oldScale: THREE.Vector3;

  constructor(editor: Editor, object: THREE.Object3D, newScale: THREE.Vector3, oldScale?: THREE.Vector3) {
    super(editor);
    this.object = object;
    this.newScale = newScale.clone();
    this.oldScale = oldScale ? oldScale.clone() : object.scale.clone();
  }

  execute(): void {
    this.object.scale.copy(this.newScale);
    this.object.updateMatrixWorld(true);
    this.editor.signals.objectChanged?.dispatch(this.object);
  }

  undo(): void {
    this.object.scale.copy(this.oldScale);
    this.object.updateMatrixWorld(true);
    this.editor.signals.objectChanged?.dispatch(this.object);
  }

  update(command: SetScaleCommand): void {
    this.newScale.copy(command.newScale);
  }
}

