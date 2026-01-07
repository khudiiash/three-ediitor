import { System } from '../ecs/System';
import { Entity } from '../ecs/Entity';
import { TransformComponent } from '../components/TransformComponent';
import { LightComponent } from '../components/LightComponent';
import { World } from '../ecs/World';
import { object3DRegistry } from '../utils/Object3DRegistry';
import * as THREE from 'three';

/**
 * LightSystem updates light transforms and properties.
 */
export class LightSystem extends System {
  readonly requiredComponents = [TransformComponent, LightComponent];

  private scene: THREE.Scene;
  private entityLightMap: Map<number, THREE.Light> = new Map();

  constructor(scene: THREE.Scene) {
    super();
    this.scene = scene;
  }

  onInit(world: World): void {
    this.world = world;
    // Initialize any existing entities
    for (const entity of world.getAllEntities()) {
      if (this.matchesEntity(entity)) {
        this.addEntityToScene(entity);
      }
    }
  }

  update(entity: Entity, _deltaTime: number): void {
    const transform = entity.getComponent(TransformComponent)!;
    const lightComp = entity.getComponent(LightComponent)!;

    // Create light if it doesn't exist
    if (!lightComp.light) {
      this.addEntityToScene(entity);
    }

    const light = this.entityLightMap.get(entity.id);
    if (!light) return;

    // Update light transform (Three.js will handle world transforms automatically via parent/child)
    light.position.copy(transform.position);
    light.rotation.copy(transform.rotation);
    light.visible = entity.enabled;
    
    // Update parent relationship if it changed
    this.updateParentRelationship(entity, light);
  }

  /**
   * Get the Three.js Object3D for an entity (used for parent/child relationships)
   */
  private getEntityObject3D(entity: Entity): THREE.Object3D | null {
    // Use the global registry which aggregates Object3D from all systems
    return object3DRegistry.getForEntity(entity);
  }

  /**
   * Update parent relationship in Three.js based on ECS hierarchy
   */
  private updateParentRelationship(entity: Entity, light: THREE.Light): void {
    const parent = entity.getParent();
    const currentParent = light.parent;
    
    // Determine what the parent should be
    let targetParent: THREE.Object3D = this.scene;
    if (parent) {
      const parentObject3D = this.getEntityObject3D(parent);
      if (parentObject3D) {
        targetParent = parentObject3D;
      }
    }
    
    // Only update if parent changed
    if (currentParent !== targetParent) {
      // Remove from current parent
      if (currentParent) {
        currentParent.remove(light);
      }
      
      // Add to new parent
      targetParent.add(light);
    }
  }

  private addEntityToScene(entity: Entity): void {
    const lightComp = entity.getComponent(LightComponent)!;
    
    if (!lightComp.light) {
      lightComp.createLight();
    }

    if (lightComp.light) {
      const light = lightComp.light;
      this.entityLightMap.set(entity.id, light);
      
      // Register in global registry
      object3DRegistry.register(entity.id, light);
      
      // Determine parent based on ECS hierarchy
      const parent = entity.getParent();
      if (parent) {
        const parentObject3D = this.getEntityObject3D(parent);
        if (parentObject3D) {
          parentObject3D.add(light);
        } else {
          // Parent doesn't have a Three.js object yet, add to scene for now
          // It will be reparented when parent's object is created
          this.scene.add(light);
        }
      } else {
        // No parent, add directly to scene
        this.scene.add(light);
      }
    }
  }

  onDestroy(): void {
    // Clean up all lights
    for (const [entityId, light] of this.entityLightMap.entries()) {
      object3DRegistry.unregister(entityId);
      if (light.parent) {
        light.parent.remove(light);
      }
    }
    this.entityLightMap.clear();
  }
}

