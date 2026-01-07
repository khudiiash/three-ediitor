import { Editor } from '../../Editor';
import { UIPanel, UIText } from '../../libs';

/**
 * ViewportInfo class adapted from Three.js Viewport.Info.js
 * Displays viewport information overlay
 */
export class ViewportInfo {
  private editor: Editor;
  private container: UIPanel;
  private infoText: UIText;
  private lastUpdate: number = 0;

  constructor(editor: Editor) {
    this.editor = editor;
    this.container = new UIPanel();
    this.container.setId('viewport-info');
    this.container.setStyle('position', 'absolute');
    this.container.setStyle('top', '10px');
    this.container.setStyle('left', '10px');
    this.container.setStyle('color', '#fff');
    this.container.setStyle('font-family', 'monospace');
    this.container.setStyle('font-size', '12px');
    this.container.setStyle('pointer-events', 'none');

    this.infoText = new UIText('');
    this.container.add(this.infoText);
  }

  update(): void {
    const now = performance.now();
    if (now - this.lastUpdate < 1000) return; // Update once per second
    this.lastUpdate = now;

    const scene = this.editor.getScene();
    const objectCount = scene.children.length;
    const vertexCount = this.countVertices(scene);
    const faceCount = this.countFaces(scene);

    const info = `Objects: ${objectCount} | Vertices: ${vertexCount} | Faces: ${faceCount}`;
    this.infoText.setTextContent(info);
  }

  private countVertices(object: THREE.Object3D): number {
    let count = 0;
    object.traverse((child) => {
      if ((child as any).geometry) {
        const geometry = (child as any).geometry;
        if (geometry.attributes && geometry.attributes.position) {
          count += geometry.attributes.position.count;
        }
      }
    });
    return count;
  }

  private countFaces(object: THREE.Object3D): number {
    let count = 0;
    object.traverse((child) => {
      if ((child as any).geometry) {
        const geometry = (child as any).geometry;
        if (geometry.index) {
          count += geometry.index.count / 3;
        } else if (geometry.attributes && geometry.attributes.position) {
          count += geometry.attributes.position.count / 3;
        }
      }
    });
    return Math.floor(count);
  }

  getContainer(): UIPanel {
    return this.container;
  }
}

