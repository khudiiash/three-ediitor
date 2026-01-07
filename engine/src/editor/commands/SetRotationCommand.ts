import * as THREE from 'three';
import { Editor } from '../Editor';
import { Command } from './Command';

/**
 * SetRotationCommand adapted from Three.js SetRotationCommand.js
 */
export class SetRotationCommand extends Command {
  public type: string = 'SetRotationCommand';
  public name: string = 'Set Rotation';
  public updatable: boolean = true;
  public object: THREE.Object3D;
  public newRotation: THREE.Euler;
  public oldRotation: THREE.Euler;

  constructor(editor: Editor, object: THREE.Object3D, newRotation: THREE.Euler, oldRotation?: THREE.Euler) {
    super(editor);
    this.object = object;
    this.newRotation = newRotation.clone();
    this.oldRotation = oldRotation ? oldRotation.clone() : object.rotation.clone();
  }

  execute(): void {
    this.object.rotation.copy(this.newRotation);
    this.object.updateMatrixWorld(true);
    this.editor.signals.objectChanged?.dispatch(this.object);
  }

  undo(): void {
    this.object.rotation.copy(this.oldRotation);
    this.object.updateMatrixWorld(true);
    this.editor.signals.objectChanged?.dispatch(this.object);
  }

  update(command: SetRotationCommand): void {
    this.newRotation.copy(command.newRotation);
  }
}

