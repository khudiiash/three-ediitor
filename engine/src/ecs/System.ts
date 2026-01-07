import { World } from './World';
import { Entity } from './Entity';
import { Component } from './Component';

/**
 * Base class for all systems in the ECS.
 * Systems contain the logic that operates on entities with specific components.
 */
export abstract class System {
  protected world: World | null = null;
  enabled: boolean = true;

  /**
   * Define which components this system requires.
   * Entities must have ALL of these components to be processed.
   */
  abstract readonly requiredComponents: (new (...args: any[]) => Component)[];

  /**
   * Called when the system is added to the world.
   */
  onInit?(world: World): void;

  /**
   * Called every frame before update.
   */
  onBeforeUpdate?(deltaTime: number): void;

  /**
   * Called every frame for each entity that matches the required components.
   */
  abstract update(entity: Entity, deltaTime: number): void;

  /**
   * Called every frame after all entities have been updated.
   */
  onAfterUpdate?(deltaTime: number): void;

  /**
   * Called when the system is removed from the world.
   */
  onDestroy?(): void;

  /**
   * Set the world reference.
   * @internal
   */
  setWorld(world: World): void {
    this.world = world;
  }

  /**
   * Check if an entity matches this system's requirements.
   */
  matchesEntity(entity: Entity): boolean {
    if (!entity.enabled) return false;
    
    for (const componentType of this.requiredComponents) {
      if (!entity.hasComponent(componentType)) {
        return false;
      }
    }
    
    return true;
  }
}

