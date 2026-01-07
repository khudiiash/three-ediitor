import * as THREE from 'three';
import { Editor } from '../Editor';

/**
 * LoaderUtils class adapted from Three.js LoaderUtils.js
 * Utility functions for loading and processing assets
 */
export class LoaderUtils {
  private editor: Editor;

  constructor(editor: Editor) {
    this.editor = editor;
  }

  /**
   * Load texture from URL
   */
  async loadTexture(url: string): Promise<THREE.Texture> {
    const loader = new THREE.TextureLoader();
    return new Promise((resolve, reject) => {
      loader.load(
        url,
        (texture) => {
          this.editor.addTexture(texture);
          resolve(texture);
        },
        undefined,
        reject
      );
    });
  }

  /**
   * Add texture to editor
   */
  addTexture(texture: THREE.Texture): void {
    if ((this.editor as any).textures) {
      (this.editor as any).textures[texture.uuid] = texture;
    }
  }

  /**
   * Load geometry from URL
   */
  async loadGeometry(url: string): Promise<THREE.BufferGeometry> {
    const loader = new THREE.BufferGeometryLoader();
    return new Promise((resolve, reject) => {
      loader.load(
        url,
        (geometry) => {
          this.editor.addGeometry(geometry);
          resolve(geometry);
        },
        undefined,
        reject
      );
    });
  }

  /**
   * Load material from URL
   */
  async loadMaterial(url: string): Promise<THREE.Material> {
    const loader = new THREE.MaterialLoader();
    return new Promise((resolve, reject) => {
      loader.load(
        url,
        (material) => {
          this.editor.addMaterial(material);
          resolve(material);
        },
        undefined,
        reject
      );
    });
  }
}

