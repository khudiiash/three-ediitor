import * as THREE from 'three';
import { World } from '../ecs/World';
import { Entity } from '../ecs/Entity';
import { Config } from './Config';
import { History } from './History';
import { Storage } from './Storage';
import { Strings } from './Strings';
import { Command } from './commands/Command';
import { createEditorSignals, EditorSignals } from './Signals';

/**
 * Editor class adapted from Three.js Editor.js
 * This is a TypeScript version of the core editor functionality
 */
export class Editor {
  private scene: THREE.Scene;
  private sceneHelpers: THREE.Scene;
  private world: World;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer | null = null;
  private selected: Entity | null = null;
  private selectedObject: THREE.Object3D | null = null;
  
  public config: Config;
  public history: History;
  public storage: Storage;
  public strings: Strings;
  public signals: EditorSignals;
  
  // Resource management
  private object: Record<string, THREE.Object3D> = {};
  private geometries: Record<string, THREE.BufferGeometry> = {};
  private materials: Record<string, THREE.Material> = {};
  private textures: Record<string, THREE.Texture> = {};
  private scripts: Record<string, any> = {};
  private materialsRefCounter: Map<THREE.Material, number> = new Map();
  public mixer: THREE.AnimationMixer | null = null;
  private helpers: Record<string, THREE.Object3D> = {};
  public cameras: Record<string, THREE.Camera> = {};
  
  // Viewport
  public viewportCamera: THREE.Camera;
  public viewportShading: string = 'default';

  constructor(scene: THREE.Scene, world: World) {
    this.scene = scene;
    this.world = world;
    
    // Initialize core systems
    this.config = new Config();
    this.storage = new Storage();
    this.strings = new Strings(this.config);
    this.signals = createEditorSignals();
    this.history = new History(this);
    
    // Initialize default camera
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.01, 1000);
    this.camera.name = 'Camera';
    this.camera.position.set(0, 5, 10);
    this.camera.lookAt(new THREE.Vector3());
    
    // Initialize scene helpers
    this.sceneHelpers = new THREE.Scene();
    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x888888, 2);
    this.sceneHelpers.add(hemisphereLight);
    
    // Initialize mixer for animations
    this.mixer = new THREE.AnimationMixer(this.scene);
    
    // Set viewport camera
    this.viewportCamera = this.camera;
    
    // Add default camera
    this.addCamera(this.camera);
  }

  /**
   * Set the renderer
   */
  setRenderer(renderer: THREE.WebGLRenderer): void {
    this.renderer = renderer;
  }

  /**
   * Set the camera
   */
  setCamera(camera: THREE.PerspectiveCamera): void {
    this.camera = camera;
  }

  /**
   * Select an entity
   */
  select(entity: Entity | null): void {
    if (this.selected === entity) return;
    
    this.selected = entity;
    this.signals.objectSelected.dispatch(entity);
  }

  /**
   * Get the selected entity
   */
  getSelected(): Entity | null {
    return this.selected;
  }

  /**
   * Deselect current entity
   */
  deselect(): void {
    this.select(null);
  }

  /**
   * Execute a command (for undo/redo)
   */
  execute(command: Command, optionalName?: string): void {
    this.history.execute(command, optionalName);
    this.signals.historyChanged.dispatch();
  }

  /**
   * Undo last command
   */
  undo(): void {
    this.history.undo();
    this.signals.historyChanged.dispatch();
  }

  /**
   * Redo last undone command
   */
  redo(): void {
    this.history.redo();
    this.signals.historyChanged.dispatch();
  }

  /**
   * Get the scene
   */
  getScene(): THREE.Scene {
    return this.scene;
  }

  /**
   * Get the world
   */
  getWorld(): World {
    return this.world;
  }

  /**
   * Get the camera
   */
  getCamera(): THREE.PerspectiveCamera | null {
    return this.camera;
  }

  /**
   * Get the renderer
   */
  getRenderer(): THREE.WebGLRenderer | null {
    return this.renderer;
  }

  /**
   * Get scene helpers
   */
  getSceneHelpers(): THREE.Scene {
    return this.sceneHelpers;
  }

  /**
   * Add an object to the scene
   */
  addObject(object: THREE.Object3D, parent?: THREE.Object3D, index?: number): void {
    // Traverse and register geometries, materials, cameras, helpers
    object.traverse((child) => {
      if ((child as any).geometry !== undefined) {
        this.addGeometry((child as any).geometry);
      }
      if ((child as any).material !== undefined) {
        this.addMaterial((child as any).material);
      }
      this.addCamera(child as THREE.Camera);
      this.addHelper(child);
    });

    if (parent === undefined) {
      this.scene.add(object);
    } else {
      parent.children.splice(index || 0, 0, object);
      object.parent = parent;
    }

    this.signals.objectAdded.dispatch(object);
    this.signals.sceneGraphChanged.dispatch();
  }

  /**
   * Remove an object from the scene
   */
  removeObject(object: THREE.Object3D): void {
    if (object.parent === null) return; // avoid deleting the camera or scene

    object.parent.remove(object);
    this.signals.objectRemoved.dispatch(object);
    this.signals.sceneGraphChanged.dispatch();
  }

  /**
   * Add a geometry
   */
  addGeometry(geometry: THREE.BufferGeometry): void {
    if (this.geometries[geometry.uuid] === undefined) {
      this.geometries[geometry.uuid] = geometry;
      this.signals.geometryChanged.dispatch();
    }
  }

  /**
   * Add a texture
   */
  addTexture(texture: THREE.Texture): void {
    if (this.textures[texture.uuid] === undefined) {
      this.textures[texture.uuid] = texture;
    }
  }

  /**
   * Add a material
   */
  addMaterial(material: THREE.Material): void {
    if (this.materials[material.uuid] === undefined) {
      this.materials[material.uuid] = material;
      this.materialsRefCounter.set(material, 0);
      this.signals.materialAdded.dispatch(material);
    }
    this.materialsRefCounter.set(material, (this.materialsRefCounter.get(material) || 0) + 1);
  }

  /**
   * Remove a material
   */
  removeMaterial(material: THREE.Material): void {
    const refCount = this.materialsRefCounter.get(material) || 0;
    this.materialsRefCounter.set(material, refCount - 1);
    
    if (refCount <= 1) {
      delete this.materials[material.uuid];
      this.materialsRefCounter.delete(material);
      this.signals.materialRemoved.dispatch(material);
    }
  }

  /**
   * Add a camera
   */
  addCamera(camera: THREE.Camera): void {
    if (camera instanceof THREE.Camera && this.cameras[camera.uuid] === undefined) {
      this.cameras[camera.uuid] = camera;
      this.signals.cameraAdded.dispatch(camera);
    }
  }

  /**
   * Remove a camera
   */
  removeCamera(camera: THREE.Camera): void {
    if (this.cameras[camera.uuid] !== undefined) {
      delete this.cameras[camera.uuid];
      this.signals.cameraRemoved.dispatch(camera);
    }
  }

  /**
   * Add a helper
   */
  addHelper(object: THREE.Object3D): void {
    // Helper logic would go here
    // For now, just a placeholder
  }

  /**
   * Select an object (Three.js Object3D)
   */
  selectObject(object: THREE.Object3D | null): void {
    if (this.selectedObject === object) return;
    
    this.selectedObject = object;
    this.signals.objectSelected.dispatch(object);
  }

  /**
   * Get selected object
   */
  getSelectedObject(): THREE.Object3D | null {
    return this.selectedObject;
  }

  /**
   * Focus on an object
   */
  focusObject(object: THREE.Object3D): void {
    this.signals.objectFocused.dispatch(object);
  }

  /**
   * Set viewport camera by UUID - matches original Editor.setViewportCamera
   */
  setViewportCamera(uuid: string): void {
    this.viewportCamera = this.cameras[uuid] || this.camera;
    this.signals.viewportCameraChanged?.dispatch();
  }

  /**
   * Set viewport shading - matches original Editor.setViewportShading
   */
  setViewportShading(value: string): void {
    this.viewportShading = value;
    this.signals.viewportShadingChanged?.dispatch();
  }
}


