/**
 * Signals class adapted from Three.js editor
 * Provides a simple event/signal system for editor communication
 */
export class Signals {
  private listeners: Map<string, Function[]> = new Map();
  public active: boolean = true;

  /**
   * Add a listener to a signal
   */
  add(listener: Function): void {
    const listeners = this.listeners.get('default') || [];
    listeners.push(listener);
    this.listeners.set('default', listeners);
  }

  /**
   * Remove a listener from a signal
   */
  remove(listener: Function): void {
    const listeners = this.listeners.get('default') || [];
    const index = listeners.indexOf(listener);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
  }

  /**
   * Dispatch a signal event
   */
  dispatch(...args: any[]): void {
    if (!this.active) return;
    const listeners = this.listeners.get('default') || [];
    listeners.forEach(listener => listener(...args));
  }

  /**
   * Clear all listeners
   */
  clear(): void {
    this.listeners.clear();
  }
}

/**
 * Create a signals object with common editor signals
 */
export function createEditorSignals() {
  return {
    // Scene signals
    sceneGraphChanged: new Signals(),
    sceneRendered: new Signals(),
    sceneBackgroundChanged: new Signals(),
    sceneEnvironmentChanged: new Signals(),
    sceneFogChanged: new Signals(),
    objectChanged: new Signals(),
    objectSelected: new Signals(),
    objectFocused: new Signals(),
    objectAdded: new Signals(),
    objectRemoved: new Signals(),
    cameraChanged: new Signals(),
    cameraResetted: new Signals(),
    cameraAdded: new Signals(),
    cameraRemoved: new Signals(),
    geometryChanged: new Signals(),
    
    // History signals
    historyChanged: new Signals(),
    historyCleared: new Signals(),
    
    // Player signals
    startPlayer: new Signals(),
    stopPlayer: new Signals(),
    
    // Editor signals
    editorCleared: new Signals(),
    savingStarted: new Signals(),
    savingFinished: new Signals(),
    
    // Renderer signals
    rendererChanged: new Signals(),
    
    // Viewport signals
    viewportResized: new Signals(),
    
    // Script signals
    scriptAdded: new Signals(),
    scriptRemoved: new Signals(),
    scriptChanged: new Signals(),
    
    // Material signals
    materialAdded: new Signals(),
    materialRemoved: new Signals(),
    materialChanged: new Signals(),
    
    // Sidebar signals
    sidebarChanged: new Signals(),
    
    // Window signals
    windowResize: new Signals(),
    showGridChanged: new Signals(),
    showHelpersChanged: new Signals(),
    
    // Viewport signals
    viewportCameraChanged: new Signals(),
    viewportShadingChanged: new Signals(),
    
    // Sidebar signals
    refreshSidebarObject3D: new Signals(),
  };
}

export type EditorSignals = ReturnType<typeof createEditorSignals>;

