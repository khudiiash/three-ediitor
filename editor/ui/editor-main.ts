/**
 * Main entry point for the Three.js Editor in Tauri
 * IDENTICAL to original Three.js editor initialization pattern
 */

import * as THREE from 'three';
import { World } from '../../engine/src/ecs/World';
import { Editor } from '../../engine/src/editor/Editor';
import { Viewport } from '../../engine/src/editor/ui/viewport/Viewport';
import { Toolbar } from '../../engine/src/editor/ui/Toolbar';
import { Sidebar } from '../../engine/src/editor/ui/sidebar/Sidebar';
import { Menubar } from '../../engine/src/editor/ui/menubar/Menubar';

// Wait for Tauri API
let invoke: any, listen: any;

async function initTauri() {
  let attempts = 0;
  while (!(window as any).__TAURI__ && attempts < 50) {
    await new Promise(resolve => setTimeout(resolve, 100));
    attempts++;
  }
  
  if (!(window as any).__TAURI__) {
    console.error('Tauri API not available');
    return false;
  }
  
  invoke = (window as any).__TAURI__.tauri.invoke;
  listen = (window as any).__TAURI__.event.listen;
  return true;
}

// Initialize editor - matches original Three.js editor pattern
async function initEditor() {
  try {
    console.log('[Editor] Starting initialization...');

    // Wait for Tauri
    const tauriReady = await initTauri();
    if (!tauriReady) {
      console.warn('Running without Tauri API');
    }

    // Check if THREE is available
    if (typeof THREE === 'undefined') {
      console.error('[Editor] THREE is not defined! Make sure Three.js is loaded.');
      document.body.innerHTML = '<div style="padding: 20px; color: red;">Error: Three.js not loaded. Check console for details.</div>';
      return;
    }

    console.log('[Editor] THREE available:', typeof THREE);

    // Create World for ECS (our addition, not in original)
    const world = new World();

    // Create editor - matches original: const editor = new Editor();
    // Note: Our Editor takes (scene, world) but we'll create a scene and pass it
    // The original Editor creates its own scene, but we need to pass world for ECS
    const scene = new THREE.Scene();
    scene.name = 'Scene';
    const editor = new Editor(scene, world);
    
    // Expose editor to console - matches original: window.editor = editor;
    (window as any).editor = editor;
    (window as any).THREE = THREE;

    console.log('[Editor] Created editor instance');

    // Create UI components - matches original pattern exactly
    // Original: const viewport = new Viewport(editor); document.body.appendChild(viewport.dom);
    const viewport = new Viewport(editor);
    const viewportContainer = document.getElementById('viewport-container');
    if (viewportContainer) {
      viewportContainer.appendChild(viewport.getContainer().dom);
    } else {
      document.body.appendChild(viewport.getContainer().dom);
    }
    console.log('[Editor] Viewport initialized');

    const toolbar = new Toolbar(editor);
    const toolbarContainer = document.getElementById('toolbar');
    if (toolbarContainer) {
      toolbarContainer.appendChild(toolbar.getContainer().dom);
    } else {
      document.body.appendChild(toolbar.getContainer().dom);
    }
    console.log('[Editor] Toolbar initialized');

    const sidebar = new Sidebar(editor);
    const sidebarLeftContainer = document.getElementById('sidebar-left');
    if (sidebarLeftContainer) {
      sidebarLeftContainer.appendChild(sidebar.getContainer().dom);
    } else {
      document.body.appendChild(sidebar.getContainer().dom);
    }
    console.log('[Editor] Sidebar initialized');

    const menubar = new Menubar(editor);
    const menubarContainer = document.getElementById('menubar');
    if (menubarContainer) {
      menubarContainer.appendChild(menubar.getContainer().dom);
    } else {
      document.body.appendChild(menubar.getContainer().dom);
    }
    console.log('[Editor] Menubar initialized');

    // Handle window resize - matches original
    function onWindowResize() {
      editor.signals.windowResize.dispatch();
    }
    window.addEventListener('resize', onWindowResize);
    onWindowResize();

    // Initialize storage - matches original pattern
    editor.storage.init(() => {
      editor.storage.get(async (state: any) => {
        if (state !== undefined) {
          // await editor.fromJSON(state); // TODO: Implement fromJSON
        }

        const selected = editor.config.getKey('selected');
        if (selected !== undefined) {
          // editor.selectByUuid(selected); // TODO: Implement selectByUuid
        }
      });

      // Auto-save - matches original
      let timeout: number | null = null;
      function saveState() {
        if (editor.config.getKey('autosave') === false) {
          return;
        }

        if (timeout !== null) {
          clearTimeout(timeout);
        }

        timeout = setTimeout(() => {
          editor.signals.savingStarted.dispatch();
          timeout = setTimeout(() => {
            // editor.storage.set(editor.toJSON()); // TODO: Implement toJSON
            editor.signals.savingFinished.dispatch();
          }, 100) as any;
        }, 1000) as any;
      }

      const signals = editor.signals;
      signals.geometryChanged.add(saveState);
      signals.objectAdded.add(saveState);
      signals.objectChanged.add(saveState);
      signals.objectRemoved.add(saveState);
      signals.materialChanged.add(saveState);
      signals.sceneBackgroundChanged?.add(saveState);
      signals.sceneEnvironmentChanged?.add(saveState);
      signals.sceneFogChanged?.add(saveState);
      signals.sceneGraphChanged.add(saveState);
      signals.scriptChanged?.add(saveState);
      signals.historyChanged.add(saveState);
    });

    // Handle drag and drop - matches original
    document.addEventListener('dragover', (event) => {
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'copy';
      }
    });

    document.addEventListener('drop', (event) => {
      event.preventDefault();
      if (event.dataTransfer) {
        if (event.dataTransfer.types[0] === 'text/plain') return; // Outliner drop
        // TODO: Implement loader.loadItemList or loader.loadFiles
      }
    });

    console.log('[Editor] Three.js Editor initialized successfully');
  } catch (error) {
    console.error('[Editor] Fatal error during initialization:', error);
    document.body.innerHTML = `<div style="padding: 20px; color: red;">
      <h2>Editor Initialization Error</h2>
      <pre>${error instanceof Error ? error.stack : String(error)}</pre>
    </div>`;
  }
}

// Start when DOM is ready - matches original
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initEditor);
} else {
  initEditor();
}
