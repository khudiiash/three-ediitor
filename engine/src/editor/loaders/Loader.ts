import * as THREE from 'three';
import { Editor } from '../Editor';
import { LoaderUtils } from './LoaderUtils';

/**
 * Loader class adapted from Three.js Loader.js
 * Handles loading of various 3D file formats
 */
export class Loader {
  private editor: Editor;
  private loaderUtils: LoaderUtils;

  constructor(editor: Editor) {
    this.editor = editor;
    this.loaderUtils = new LoaderUtils(editor);
  }

  /**
   * Load files (GLTF, OBJ, FBX, etc.)
   */
  async loadFiles(files: FileList | File[]): Promise<void> {
    const fileArray = Array.from(files);
    
    for (const file of fileArray) {
      await this.loadFile(file);
    }
  }

  /**
   * Load a single file
   */
  async loadFile(file: File): Promise<void> {
    const extension = this.getExtension(file.name);
    
    try {
      switch (extension.toLowerCase()) {
        case 'gltf':
        case 'glb':
          await this.loadGLTF(file);
          break;
        case 'obj':
          await this.loadOBJ(file);
          break;
        case 'fbx':
          await this.loadFBX(file);
          break;
        case 'dae':
          await this.loadDAE(file);
          break;
        case 'json':
          await this.loadJSON(file);
          break;
        default:
          console.warn(`Unsupported file format: ${extension}`);
      }
    } catch (error) {
      console.error(`Error loading file ${file.name}:`, error);
    }
  }

  /**
   * Load GLTF/GLB file
   */
  private async loadGLTF(file: File): Promise<void> {
    const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
    const loader = new GLTFLoader();
    
    const text = await file.text();
    const arrayBuffer = await file.arrayBuffer();
    
    // GLTFLoader can handle both text and binary
    const result = await new Promise<any>((resolve, reject) => {
      if (file.name.endsWith('.glb')) {
        loader.parse(arrayBuffer, '', resolve, reject);
      } else {
        loader.parse(text, '', resolve, reject);
      }
    });

    this.addScene(result.scene);
  }

  /**
   * Load OBJ file
   */
  private async loadOBJ(file: File): Promise<void> {
    const { OBJLoader } = await import('three/examples/jsm/loaders/OBJLoader.js');
    const loader = new OBJLoader();
    
    const text = await file.text();
    const object = loader.parse(text);
    
    this.addScene(object);
  }

  /**
   * Load FBX file
   */
  private async loadFBX(file: File): Promise<void> {
    const { FBXLoader } = await import('three/examples/jsm/loaders/FBXLoader.js');
    const loader = new FBXLoader();
    
    const arrayBuffer = await file.arrayBuffer();
    const object = loader.parse(arrayBuffer, '');
    
    this.addScene(object);
  }

  /**
   * Load DAE (Collada) file
   */
  private async loadDAE(file: File): Promise<void> {
    const { ColladaLoader } = await import('three/examples/jsm/loaders/ColladaLoader.js');
    const loader = new ColladaLoader();
    
    const text = await file.text();
    const result = loader.parse(text);
    
    this.addScene(result.scene);
  }

  /**
   * Load JSON file (Three.js scene format)
   */
  private async loadJSON(file: File): Promise<void> {
    const text = await file.text();
    const json = JSON.parse(text);
    
    // Use editor's fromJSON method if available
    if ((this.editor as any).fromJSON) {
      await (this.editor as any).fromJSON(json);
    } else {
      // Fallback: parse manually
      const loader = new THREE.ObjectLoader();
      const scene = loader.parse(json);
      this.addScene(scene);
    }
  }

  /**
   * Add loaded scene/object to editor
   */
  private addScene(object: THREE.Object3D): void {
    if (object instanceof THREE.Scene) {
      // If it's a scene, add all children
      while (object.children.length > 0) {
        this.editor.addObject(object.children[0]);
      }
    } else {
      // If it's a single object, add it
      this.editor.addObject(object);
    }
  }

  /**
   * Get file extension
   */
  private getExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1] : '';
  }
}

