import { Editor } from './Editor';
import { Command } from './commands/Command';

/**
 * History class adapted from Three.js History.js
 * Manages undo/redo functionality for the editor
 */
export class History {
  private editor: Editor;
  private undos: Command[] = [];
  private redos: Command[] = [];
  private lastCmdTime: number = Date.now();
  private idCounter: number = 0;
  private historyDisabled: boolean = false;
  private config: any;

  constructor(editor: Editor) {
    this.editor = editor;
    this.config = (editor as any).config;

    // Listen to player start/stop signals if they exist
    if ((editor as any).signals) {
      const signals = (editor as any).signals;
      if (signals.startPlayer) {
        signals.startPlayer.add(() => {
          this.historyDisabled = true;
        });
      }
      if (signals.stopPlayer) {
        signals.stopPlayer.add(() => {
          this.historyDisabled = false;
        });
      }
    }
  }

  /**
   * Execute a command and add it to history
   */
  execute(cmd: Command, optionalName?: string): void {
    if (this.historyDisabled) {
      return;
    }

    const lastCmd = this.undos[this.undos.length - 1];
    const timeDifference = Date.now() - this.lastCmdTime;

    const isUpdatableCmd = lastCmd &&
      lastCmd.updatable &&
      cmd.updatable &&
      (lastCmd as any).object === (cmd as any).object &&
      lastCmd.type === cmd.type &&
      (lastCmd as any).script === (cmd as any).script &&
      (lastCmd as any).attributeName === (cmd as any).attributeName;

    if (isUpdatableCmd && cmd.type === 'SetScriptValueCommand') {
      // When the cmd.type is "SetScriptValueCommand" the timeDifference is ignored
      lastCmd.update(cmd);
      cmd = lastCmd;
    } else if (isUpdatableCmd && timeDifference < 500) {
      lastCmd.update(cmd);
      cmd = lastCmd;
    } else {
      // The command is not updatable and is added as a new part of the history
      this.undos.push(cmd);
      cmd.id = ++this.idCounter;
    }

    cmd.name = (optionalName !== undefined) ? optionalName : cmd.name;
    cmd.execute();
    cmd.inMemory = true;

    if (this.config && this.config.getKey('settings/history')) {
      (cmd as any).json = cmd.toJSON(); // Serialize the cmd immediately after execution
    }

    this.lastCmdTime = Date.now();

    // Clear all the redo-commands
    this.redos = [];
    
    if ((this.editor as any).signals && (this.editor as any).signals.historyChanged) {
      (this.editor as any).signals.historyChanged.dispatch(cmd);
    }
  }

  /**
   * Undo the last command
   */
  undo(): Command | undefined {
    if (this.historyDisabled) {
      const strings = (this.editor as any).strings;
      if (strings) {
        alert(strings.getKey('prompt/history/forbid'));
      } else {
        alert('History is disabled during playback');
      }
      return undefined;
    }

    let cmd: Command | undefined = undefined;

    if (this.undos.length > 0) {
      cmd = this.undos.pop()!;

      if (cmd.inMemory === false && (cmd as any).json) {
        cmd.fromJSON((cmd as any).json);
      }
    }

    if (cmd !== undefined) {
      cmd.undo();
      this.redos.push(cmd);
      
      if ((this.editor as any).signals && (this.editor as any).signals.historyChanged) {
        (this.editor as any).signals.historyChanged.dispatch(cmd);
      }
    }

    return cmd;
  }

  /**
   * Redo the last undone command
   */
  redo(): Command | undefined {
    if (this.historyDisabled) {
      const strings = (this.editor as any).strings;
      if (strings) {
        alert(strings.getKey('prompt/history/forbid'));
      } else {
        alert('History is disabled during playback');
      }
      return undefined;
    }

    let cmd: Command | undefined = undefined;

    if (this.redos.length > 0) {
      cmd = this.redos.pop()!;

      if (cmd.inMemory === false && (cmd as any).json) {
        cmd.fromJSON((cmd as any).json);
      }
    }

    if (cmd !== undefined) {
      cmd.execute();
      this.undos.push(cmd);
      
      if ((this.editor as any).signals && (this.editor as any).signals.historyChanged) {
        (this.editor as any).signals.historyChanged.dispatch(cmd);
      }
    }

    return cmd;
  }

  /**
   * Convert history to JSON for serialization
   */
  toJSON(): any {
    const history: any = {
      undos: [],
      redos: []
    };

    if (!this.config || !this.config.getKey('settings/history')) {
      return history;
    }

    // Append Undos to History
    for (let i = 0; i < this.undos.length; i++) {
      const cmd = this.undos[i];
      if ((cmd as any).json) {
        history.undos.push((cmd as any).json);
      }
    }

    // Append Redos to History
    for (let i = 0; i < this.redos.length; i++) {
      const cmd = this.redos[i];
      if ((cmd as any).json) {
        history.redos.push((cmd as any).json);
      }
    }

    return history;
  }

  /**
   * Restore history from JSON
   */
  fromJSON(json: any): void {
    if (json === undefined) return;

    // Note: This requires Commands to be available
    // We'll need to implement command registration system
    const Commands = (this.editor as any).Commands;
    if (!Commands) {
      console.warn('Commands not available for history restoration');
      return;
    }

    for (let i = 0; i < json.undos.length; i++) {
      const cmdJSON = json.undos[i];
      const CmdClass = Commands[cmdJSON.type];
      if (!CmdClass) {
        console.warn(`Command type ${cmdJSON.type} not found`);
        continue;
      }
      const cmd = new CmdClass(this.editor);
      (cmd as any).json = cmdJSON;
      cmd.id = cmdJSON.id;
      cmd.name = cmdJSON.name;
      this.undos.push(cmd);
      this.idCounter = (cmdJSON.id > this.idCounter) ? cmdJSON.id : this.idCounter;
    }

    for (let i = 0; i < json.redos.length; i++) {
      const cmdJSON = json.redos[i];
      const CmdClass = Commands[cmdJSON.type];
      if (!CmdClass) {
        console.warn(`Command type ${cmdJSON.type} not found`);
        continue;
      }
      const cmd = new CmdClass(this.editor);
      (cmd as any).json = cmdJSON;
      cmd.id = cmdJSON.id;
      cmd.name = cmdJSON.name;
      this.redos.push(cmd);
      this.idCounter = (cmdJSON.id > this.idCounter) ? cmdJSON.id : this.idCounter;
    }

    // Select the last executed undo-command
    if ((this.editor as any).signals && (this.editor as any).signals.historyChanged) {
      (this.editor as any).signals.historyChanged.dispatch(this.undos[this.undos.length - 1]);
    }
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.undos = [];
    this.redos = [];
    this.idCounter = 0;

    if ((this.editor as any).signals && (this.editor as any).signals.historyChanged) {
      (this.editor as any).signals.historyChanged.dispatch();
    }
  }

  /**
   * Go to a specific state in history by command ID
   */
  goToState(id: number): void {
    if (this.historyDisabled) {
      const strings = (this.editor as any).strings;
      if (strings) {
        alert(strings.getKey('prompt/history/forbid'));
      } else {
        alert('History is disabled during playback');
      }
      return;
    }

    const signals = (this.editor as any).signals;
    if (signals) {
      if (signals.sceneGraphChanged) signals.sceneGraphChanged.active = false;
      if (signals.historyChanged) signals.historyChanged.active = false;
    }

    let cmd = this.undos.length > 0 ? this.undos[this.undos.length - 1] : undefined;

    if (cmd === undefined || id > cmd.id) {
      cmd = this.redo();
      while (cmd !== undefined && id > cmd.id) {
        cmd = this.redo();
      }
    } else {
      while (true) {
        cmd = this.undos[this.undos.length - 1];
        if (cmd === undefined || id === cmd.id) break;
        this.undo();
      }
    }

    if (signals) {
      if (signals.sceneGraphChanged) signals.sceneGraphChanged.active = true;
      if (signals.historyChanged) signals.historyChanged.active = true;
      if (signals.sceneGraphChanged) signals.sceneGraphChanged.dispatch();
      if (signals.historyChanged) signals.historyChanged.dispatch(cmd);
    }
  }

  /**
   * Enable serialization for all commands
   */
  enableSerialization(id: number): void {
    this.goToState(-1);

    const signals = (this.editor as any).signals;
    if (signals) {
      if (signals.sceneGraphChanged) signals.sceneGraphChanged.active = false;
      if (signals.historyChanged) signals.historyChanged.active = false;
    }

    let cmd = this.redo();
    while (cmd !== undefined) {
      if (!(cmd as any).json) {
        (cmd as any).json = cmd.toJSON();
      }
      cmd = this.redo();
    }

    if (signals) {
      if (signals.sceneGraphChanged) signals.sceneGraphChanged.active = true;
      if (signals.historyChanged) signals.historyChanged.active = true;
    }

    this.goToState(id);
  }
}

