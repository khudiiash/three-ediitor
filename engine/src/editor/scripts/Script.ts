import { Editor } from '../Editor';

/**
 * Script class adapted from Three.js Script.js
 * Manages script execution in the editor
 */
export class Script {
  private editor: Editor;
  private name: string;
  private source: string;
  private language: string;

  constructor(editor: Editor, name: string, source: string, language: string = 'javascript') {
    this.editor = editor;
    this.name = name;
    this.source = source;
    this.language = language;
  }

  getName(): string {
    return this.name;
  }

  getSource(): string {
    return this.source;
  }

  setSource(source: string): void {
    this.source = source;
    this.editor.signals.scriptChanged?.dispatch(this);
  }

  getLanguage(): string {
    return this.language;
  }

  setLanguage(language: string): void {
    this.language = language;
  }

  /**
   * Execute the script
   */
  execute(): void {
    try {
      // Script execution logic would go here
      // For now, just a placeholder
      console.log(`Executing script: ${this.name}`);
    } catch (error) {
      console.error(`Error executing script ${this.name}:`, error);
    }
  }
}

