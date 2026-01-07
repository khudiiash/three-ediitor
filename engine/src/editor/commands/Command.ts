import { Editor } from '../Editor';

/**
 * Base Command class adapted from Three.js Command.js
 * All editor commands extend this class for undo/redo functionality
 */
export class Command {
  public id: number = -1;
  public inMemory: boolean = false;
  public updatable: boolean = false;
  public type: string = '';
  public name: string = '';
  protected editor: Editor;

  /**
   * @param editor - Pointer to main editor object used to initialize each command object
   */
  constructor(editor: Editor) {
    this.editor = editor;
  }

  /**
   * Convert command to JSON for serialization
   */
  toJSON(): any {
    const output: any = {};
    output.type = this.type;
    output.id = this.id;
    output.name = this.name;
    return output;
  }

  /**
   * Restore command from JSON
   */
  fromJSON(json: any): void {
    this.inMemory = true;
    this.type = json.type;
    this.id = json.id;
    this.name = json.name;
  }

  /**
   * Execute the command
   * Must be implemented by subclasses
   */
  execute(): void {
    throw new Error('Command.execute() must be implemented by subclass');
  }

  /**
   * Undo the command
   * Must be implemented by subclasses
   */
  undo(): void {
    throw new Error('Command.undo() must be implemented by subclass');
  }

  /**
   * Update the command (for updatable commands)
   * Optional - only needed for commands that can be updated
   */
  update(_command: Command): void {
    // Override in subclasses if needed
  }
}

