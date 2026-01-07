import * as THREE from 'three';
import { Editor } from '../Editor';
import { Command } from './Command';

/**
 * SetPositionCommand adapted from Three.js SetPositionCommand.js
 */
export class SetPositionCommand extends Command {
  public type: string = 'SetPositionCommand';
  public name: string = 'Set Position';
  public updatable: boolean = true;
  public object: THREE.Object3D;
  public newPosition: THREE.Vector3;
  public oldPosition: THREE.Vector3;

  constructor(editor: Editor, object: THREE.Object3D, newPosition: THREE.Vector3, oldPosition?: THREE.Vector3) {
    super(editor);
    this.object = object;
    this.newPosition = newPosition.clone();
    this.oldPosition = oldPosition ? oldPosition.clone() : object.position.clone();
  }

  execute(): void {
    this.object.position.copy(this.newPosition);
    this.object.updateMatrixWorld(true);
    this.editor.signals.objectChanged?.dispatch(this.object);
  }

  undo(): void {
    this.object.position.copy(this.oldPosition);
    this.object.updateMatrixWorld(true);
    this.editor.signals.objectChanged?.dispatch(this.object);
  }

  update(command: SetPositionCommand): void {
    this.newPosition.copy(command.newPosition);
  }
}

