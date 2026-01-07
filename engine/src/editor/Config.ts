/**
 * Config class adapted from Three.js Config.js
 * Manages editor configuration with localStorage persistence
 */
export class Config {
  private name: string = 'threejs-editor';
  private storage: Record<string, any>;

  constructor() {
    const userLanguage = navigator.language.split('-')[0];
    const suggestedLanguage = ['fr', 'ja', 'zh', 'ko', 'fa'].includes(userLanguage) 
      ? userLanguage 
      : 'en';

    const defaultStorage: Record<string, any> = {
      'language': suggestedLanguage,
      'autosave': true,
      'project/title': '',
      'project/editable': false,
      'project/vr': false,
      'project/renderer/antialias': true,
      'project/renderer/shadows': true,
      'project/renderer/shadowType': 1, // PCF
      'project/renderer/toneMapping': 0, // NoToneMapping
      'project/renderer/toneMappingExposure': 1,
      'settings/history': false,
      'settings/shortcuts/translate': 'w',
      'settings/shortcuts/rotate': 'e',
      'settings/shortcuts/scale': 'r',
      'settings/shortcuts/undo': 'z',
      'settings/shortcuts/focus': 'f'
    };

    if (window.localStorage[this.name] === undefined) {
      window.localStorage[this.name] = JSON.stringify(defaultStorage);
      this.storage = defaultStorage;
    } else {
      const data = JSON.parse(window.localStorage[this.name]);
      this.storage = { ...defaultStorage, ...data };
    }
  }

  /**
   * Get a configuration value by key
   */
  getKey(key: string): any {
    return this.storage[key];
  }

  /**
   * Set configuration values (key, value, key, value, ...)
   */
  setKey(...args: any[]): void {
    for (let i = 0; i < args.length; i += 2) {
      const key = args[i];
      const value = args[i + 1];
      this.storage[key] = value;
    }

    window.localStorage[this.name] = JSON.stringify(this.storage);
    
    const time = new Date().toTimeString().split(' ')[0];
    console.log(`[${time}] Saved config to LocalStorage.`);
  }

  /**
   * Clear all configuration
   */
  clear(): void {
    delete window.localStorage[this.name];
  }
}

