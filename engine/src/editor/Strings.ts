import { Config } from './Config';

/**
 * Strings class adapted from Three.js Strings.js
 * Manages internationalization strings for the editor
 */
export class Strings {
  private config: Config;
  private values: Record<string, Record<string, string>> = {};

  constructor(config: Config) {
    this.config = config;
    this.initializeStrings();
  }

  /**
   * Initialize all language strings
   */
  private initializeStrings(): void {

    // English (default)
    this.values.en = {
      'prompt/file/open': 'All unsaved data will be lost. Are you sure?',
      'prompt/file/failedToOpenProject': 'An error occurred while opening the project',
      'prompt/file/export/noMeshSelected': 'No mesh selected',
      'prompt/file/export/noObjectSelected': 'No object selected!',
      'prompt/script/remove': 'Are you sure?',
      'prompt/history/clear': 'The history before/after (undo/redo) will be cleared. Are you sure?',
      'prompt/history/preserve': 'The history will be preserved across sessions.\nThis can have an impact on performance when working with textures.',
      'prompt/history/forbid': 'Undo/Redo disabled while scene is playing.',
      'prompt/rendering/realistic/unsupportedMaterial': 'REALISTIC Shading: Only MeshStandardMaterial and MeshPhysicalMaterial are supported',

      'command/AddObject': 'Add Object',
      'command/AddScript': 'Add Script',
      'command/MoveObject': 'Move Object',
      'command/MultiCmds': 'Multiple Changes',
      'command/RemoveObject': 'Remove Object',
      'command/RemoveScript': 'Remove Script',
      'command/SetColor': 'Set Color',
      'command/SetGeometry': 'Set Geometry',
      'command/SetGeometryValue': 'Set Geometry Value',
      'command/SetMaterialColor': 'Set Material Color',
      'command/SetMaterial': 'Set Material',
      'command/SetMaterialMap': 'Set Material Map',
      'command/SetMaterialRange': 'Set Material Range',
      'command/SetMaterialValue': 'Set Material Value',
      'command/SetMaterialVector': 'Set Material Vector',
      'command/SetPosition': 'Set Position',
      'command/SetRotation': 'Set Rotation',
      'command/SetScale': 'Set Scale',
      'command/SetScene': 'Set Scene',
      'command/SetScriptValue': 'Set Script Value',
      'command/SetShadowValue': 'Set Shadow Value',
      'command/SetUuid': 'Set UUID',
      'command/SetValue': 'Set Value',

      'menubar/file': 'File',
      'menubar/file/new': 'New',
      'menubar/file/new/empty': 'Empty Project',
      'menubar/file/open': 'Open',
      'menubar/file/save': 'Save Changes',
      'menubar/file/import': 'Import',
      'menubar/file/export': 'Export',

      'menubar/edit': 'Edit',
      'menubar/edit/undo': 'Undo',
      'menubar/edit/redo': 'Redo',
      'menubar/edit/center': 'Center',
      'menubar/edit/clone': 'Clone',
      'menubar/edit/delete': 'Delete',

      'menubar/add': 'Add',
      'menubar/add/group': 'Group',
      'menubar/add/mesh': 'Mesh',
      'menubar/add/mesh/plane': 'Plane',
      'menubar/add/mesh/box': 'Box',
      'menubar/add/mesh/sphere': 'Sphere',
      'menubar/add/mesh/cylinder': 'Cylinder',
      'menubar/add/mesh/torus': 'Torus',
      // Add more as needed...
    };

    // Add other languages here (fa, ja, zh, ko, etc.)
    // For now, we'll use English as default
  }

  /**
   * Get a string by key
   */
  getKey(key: string): string {
    const language = this.config.getKey('language') || 'en';
    const langStrings = this.values[language] || this.values.en;
    return langStrings[key] || key;
  }
}

