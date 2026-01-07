import * as THREE from 'three';
import { Editor } from '../Editor';
import { World } from '../../ecs/World';
import { Entity } from '../../ecs/Entity';
import { TransformComponent, MeshComponent, CameraComponent, LightComponent } from '../../components';
import { object3DRegistry } from '../../utils/Object3DRegistry';
import { AddObjectCommand, RemoveObjectCommand, SetPositionCommand, SetRotationCommand, SetScaleCommand } from '../commands';

/**
 * ECSAdapter bridges the Three.js Editor with the ECS engine
 * Maps ECS entities to Three.js Object3D and syncs operations
 */
export class ECSAdapter {
  private editor: Editor;
  private world: World;
  private entityToObject3D: Map<number, THREE.Object3D> = new Map();
  private object3DToEntity: Map<THREE.Object3D, number> = new Map();

  constructor(editor: Editor, world: World) {
    this.editor = editor;
    this.world = world;

    this.setupIntegration();
  }

  /**
   * Setup integration between editor and ECS
   */
  private setupIntegration(): void {
    // Override editor's addObject to work with ECS
    const originalAddObject = this.editor.addObject.bind(this.editor);
    this.editor.addObject = (object: THREE.Object3D, parent?: THREE.Object3D, index?: number) => {
      // Check if this object is already associated with an entity
      const existingEntityId = this.object3DToEntity.get(object);
      if (existingEntityId) {
        // Already an ECS entity, just add to scene
        originalAddObject(object, parent, index);
        return;
      }

      // Create ECS entity from Object3D
      const entity = this.createEntityFromObject3D(object);
      if (entity) {
        this.world.addEntity(entity);
        this.entityToObject3D.set(entity.id, object);
        this.object3DToEntity.set(object, entity.id);

        // Handle parent relationship
        if (parent) {
          const parentEntityId = this.object3DToEntity.get(parent);
          if (parentEntityId) {
            const parentEntity = this.world.getEntity(parentEntityId);
            if (parentEntity) {
              parentEntity.addChild(entity);
            }
          }
        }
      }

      originalAddObject(object, parent, index);
    };

    // Override editor's removeObject
    const originalRemoveObject = this.editor.removeObject.bind(this.editor);
    this.editor.removeObject = (object: THREE.Object3D) => {
      const entityId = this.object3DToEntity.get(object);
      if (entityId) {
        const entity = this.world.getEntity(entityId);
        if (entity) {
          this.world.removeEntity(entity);
          this.entityToObject3D.delete(entityId);
          this.object3DToEntity.delete(object);
        }
      }
      originalRemoveObject(object);
    };

    // Override editor's selectObject to select ECS entity
    const originalSelectObject = this.editor.selectObject.bind(this.editor);
    this.editor.selectObject = (object: THREE.Object3D | null) => {
      if (object) {
        const entityId = this.object3DToEntity.get(object);
        if (entityId) {
          const entity = this.world.getEntity(entityId);
          if (entity) {
            this.editor.select(entity);
          }
        }
      } else {
        this.editor.select(null);
      }
      originalSelectObject(object);
    };

    // Listen for ECS entity changes and sync to editor
    this.setupECSSync();
  }

  /**
   * Create an ECS entity from a Three.js Object3D
   */
  private createEntityFromObject3D(object: THREE.Object3D): Entity | null {
    const entity = new Entity(object.name || 'Entity');

    // Add TransformComponent
    const transform = new TransformComponent(
      object.position.clone(),
      object.rotation.clone(),
      object.scale.clone()
    );
    entity.addComponent(transform);

    // Add MeshComponent if it's a mesh
    if (object instanceof THREE.Mesh) {
      const mesh = new MeshComponent();
      // Store reference to the actual Three.js mesh
      (mesh as any).mesh = object;
      entity.addComponent(mesh);
    }

    // Add CameraComponent if it's a camera
    if (object instanceof THREE.Camera) {
      const camera = new CameraComponent();
      (camera as any).camera = object;
      entity.addComponent(camera);
    }

    // Add LightComponent if it's a light
    if (object instanceof THREE.Light) {
      const light = new LightComponent();
      (light as any).light = object;
      entity.addComponent(light);
    }

    return entity;
  }

  /**
   * Create a Three.js Object3D from an ECS entity
   */
  createObject3DFromEntity(entity: Entity): THREE.Object3D | null {
    const transform = entity.getComponent(TransformComponent);
    if (!transform) return null;

    let object3D: THREE.Object3D | null = null;

    // Check for mesh
    const mesh = entity.getComponent(MeshComponent);
    if (mesh && (mesh as any).mesh) {
      object3D = (mesh as any).mesh;
    }

    // Check for camera
    const camera = entity.getComponent(CameraComponent);
    if (camera && (camera as any).camera) {
      object3D = (camera as any).camera;
    }

    // Check for light
    const light = entity.getComponent(LightComponent);
    if (light && (light as any).light) {
      object3D = (light as any).light;
    }

    // If no specific component, create a group
    if (!object3D) {
      object3D = new THREE.Group();
      object3D.name = entity.name;
    }

    // Apply transform
    object3D.position.copy(transform.position);
    object3D.rotation.copy(transform.rotation);
    object3D.scale.copy(transform.scale);

    // Register mapping
    this.entityToObject3D.set(entity.id, object3D);
    this.object3DToEntity.set(object3D, entity.id);

    return object3D;
  }

  /**
   * Get Object3D for an entity
   */
  getObject3DForEntity(entity: Entity): THREE.Object3D | null {
    // First check registry
    const object3D = object3DRegistry.get(entity.id);
    if (object3D) {
      return object3D;
    }

    // Then check our mapping
    return this.entityToObject3D.get(entity.id) || null;
  }

  /**
   * Get entity for an Object3D
   */
  getEntityForObject3D(object: THREE.Object3D): Entity | null {
    const entityId = this.object3DToEntity.get(object);
    if (entityId) {
      return this.world.getEntity(entityId);
    }

    // Check registry
    const entityIdFromRegistry = (object.userData as any)?.entityId;
    if (entityIdFromRegistry) {
      return this.world.getEntity(entityIdFromRegistry);
    }

    return null;
  }

  /**
   * Setup sync from ECS to editor
   */
  private setupECSSync(): void {
    // When entities are added to world, create Object3D if needed
    // This will be handled by RenderSystem, but we can listen for changes

    // When transform changes in ECS, update editor selection
    // This is handled by the transform commands
  }

  /**
   * Execute editor command with ECS integration
   */
  executeCommand(command: AddObjectCommand | RemoveObjectCommand | SetPositionCommand | SetRotationCommand | SetScaleCommand): void {
    if (command instanceof AddObjectCommand) {
      // Object will be added via overridden addObject
      command.execute();
    } else if (command instanceof RemoveObjectCommand) {
      // Object will be removed via overridden removeObject
      command.execute();
    } else if (command instanceof SetPositionCommand) {
      // Update ECS TransformComponent
      const entity = this.getEntityForObject3D(command.object);
      if (entity) {
        const transform = entity.getComponent(TransformComponent);
        if (transform) {
          transform.position.copy(command.newPosition);
        }
      }
      command.execute();
    } else if (command instanceof SetRotationCommand) {
      // Update ECS TransformComponent
      const entity = this.getEntityForObject3D(command.object);
      if (entity) {
        const transform = entity.getComponent(TransformComponent);
        if (transform) {
          transform.rotation.copy(command.newRotation);
        }
      }
      command.execute();
    } else if (command instanceof SetScaleCommand) {
      // Update ECS TransformComponent
      const entity = this.getEntityForObject3D(command.object);
      if (entity) {
        const transform = entity.getComponent(TransformComponent);
        if (transform) {
          transform.scale.copy(command.newScale);
        }
      }
      command.execute();
    }
  }
}

