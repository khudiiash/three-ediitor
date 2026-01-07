import * as THREE from 'three';
import { Editor } from './Editor';

/**
 * Selector class adapted from Three.js Selector.js
 * Handles object selection via raycasting
 */
export class Selector {
  private editor: Editor;
  private signals: any;
  private static mouse = new THREE.Vector2();
  private static raycaster = new THREE.Raycaster();

  constructor(editor: Editor) {
    this.editor = editor;
    this.signals = editor.signals;

    // Listen for intersection detections
    if (this.signals.intersectionsDetected) {
      this.signals.intersectionsDetected.add((intersects: THREE.Intersection[]) => {
        if (intersects.length > 0) {
          // Resolve helpers to their actual objects
          const objects: THREE.Object3D[] = [];

          for (let i = 0; i < intersects.length; i++) {
            let object = intersects[i].object;

            if ((object.userData as any).object !== undefined) {
              object = (object.userData as any).object;
            }

            if (objects.indexOf(object) === -1) {
              objects.push(object);
            }
          }

          // Cycle through objects if the first one is already selected
          const selectedObject = (this.editor as any).selectedObject || (this.editor as any).selected;
          const index = objects.indexOf(selectedObject);

          if (index !== -1 && index < objects.length - 1) {
            this.select(objects[index + 1]);
          } else {
            this.select(objects[0]);
          }
        } else {
          this.select(null);
        }
      });
    }
  }

  /**
   * Get intersections with scene objects
   */
  getIntersects(raycaster: THREE.Raycaster): THREE.Intersection[] {
    const objects: THREE.Object3D[] = [];

    this.editor.getScene().traverseVisible((child) => {
      objects.push(child);
    });

    this.editor.getSceneHelpers().traverseVisible((child) => {
      if (child.name === 'picker') {
        objects.push(child);
      }
    });

    return raycaster.intersectObjects(objects, false);
  }

  /**
   * Get pointer intersections
   */
  getPointerIntersects(point: { x: number; y: number }, camera: THREE.Camera): THREE.Intersection[] {
    Selector.mouse.set((point.x * 2) - 1, -(point.y * 2) + 1);
    Selector.raycaster.setFromCamera(Selector.mouse, camera);
    return this.getIntersects(Selector.raycaster);
  }

  /**
   * Select an object
   */
  select(object: THREE.Object3D | null): void {
    const selectedObject = (this.editor as any).selectedObject || (this.editor as any).selected;
    if (selectedObject === object) return;

    let uuid: string | null = null;
    if (object !== null) {
      uuid = object.uuid;
    }

    // Update editor's selected object
    (this.editor as any).selectedObject = object;
    (this.editor as any).selected = object;
    this.editor.config.setKey('selected', uuid);

    this.signals.objectSelected.dispatch(object);
  }

  /**
   * Deselect current object
   */
  deselect(): void {
    this.select(null);
  }
}

