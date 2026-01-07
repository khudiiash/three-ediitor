import * as THREE from 'three';
import { Editor } from '../Editor';
import { World } from '../../ecs/World';
import { Entity } from '../../ecs/Entity';
import { TransformComponent } from '../../components';
import { ECSAdapter } from './ECSAdapter';
import { EditorBridge } from '../../bridge/EditorBridge';
import { object3DRegistry } from '../../utils/Object3DRegistry';

/**
 * EditorIntegration manages the integration between the Three.js Editor and ECS engine
 * This is the main entry point for using the editor with the ECS system
 */
export class EditorIntegration {
  private editor: Editor;
  private world: World;
  private adapter: ECSAdapter;
  private editorBridge: EditorBridge | null = null;

  constructor(scene: THREE.Scene, world: World, editorBridge?: EditorBridge) {
    this.world = world;
    this.editor = new Editor(scene, world);
    this.adapter = new ECSAdapter(this.editor, world);
    this.editorBridge = editorBridge || null;

    this.setupIntegration();
  }

  /**
   * Setup integration between editor and ECS/EditorBridge
   */
  private setupIntegration(): void {
    // Sync ECS entities to editor when they're created
    this.syncEntitiesToEditor();

    // Listen for editor selection and sync to EditorBridge
    this.editor.signals.objectSelected.add((object: THREE.Object3D | null) => {
      if (this.editorBridge && this.editorBridge.isConnected()) {
        if (object) {
          const entity = this.adapter.getEntityForObject3D(object);
          if (entity) {
            (this.editorBridge as any).sendMessage({
              type: 'EntitySelected',
              entity_id: entity.id
            });
          }
        } else {
          (this.editorBridge as any).sendMessage({
            type: 'EntitySelected',
            entity_id: null
          });
        }
      }
    });

    // Listen for editor object changes and sync to ECS
    this.editor.signals.objectChanged.add((object: THREE.Object3D) => {
      const entity = this.adapter.getEntityForObject3D(object);
      if (entity) {
        // Update transform component
        const transform = entity.getComponent(TransformComponent);
        if (transform) {
          transform.position.copy(object.position);
          transform.rotation.copy(object.rotation);
          transform.scale.copy(object.scale);
        }

        // Notify EditorBridge of transform update via message
        if (this.editorBridge && this.editorBridge.isConnected()) {
          (this.editorBridge as any).sendMessage({
            type: 'TransformUpdated',
            entity_id: entity.id,
            position: [object.position.x, object.position.y, object.position.z],
            rotation: [object.rotation.x, object.rotation.y, object.rotation.z],
            scale: [object.scale.x, object.scale.y, object.scale.z]
          });
        }
      }
    });
  }

  /**
   * Sync existing ECS entities to the editor
   */
  private syncEntitiesToEditor(): void {
    const entities = this.world.getAllEntities();
    for (const entity of entities) {
      const object3D = this.adapter.getObject3DForEntity(entity);
      if (object3D && !this.editor.getScene().getObjectById(object3D.id)) {
        // Object3D exists but not in editor scene, add it
        this.editor.addObject(object3D);
      } else if (!object3D) {
        // Create Object3D from entity
        const newObject3D = this.adapter.createObject3DFromEntity(entity);
        if (newObject3D) {
          this.editor.addObject(newObject3D);
        }
      }
    }
  }

  /**
   * Get the editor instance
   */
  getEditor(): Editor {
    return this.editor;
  }

  /**
   * Get the ECS adapter
   */
  getAdapter(): ECSAdapter {
    return this.adapter;
  }

  /**
   * Select an entity in the editor
   */
  selectEntity(entity: Entity): void {
    const object3D = this.adapter.getObject3DForEntity(entity);
    if (object3D) {
      this.editor.selectObject(object3D);
    }
  }

  /**
   * Create an entity from editor (called when editor creates an object)
   */
  createEntityFromEditor(object: THREE.Object3D): Entity {
    const entity = this.adapter.createEntityFromObject3D(object) || new Entity(object.name);
    this.world.addEntity(entity);
    return entity;
  }
}

