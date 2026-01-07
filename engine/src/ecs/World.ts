import { Entity } from './Entity';
import { System } from './System';

/**
 * World manages all entities and systems in the game.
 * It's the main entry point for the ECS.
 */
export class World {
  private entities: Map<number, Entity> = new Map();
  private systems: System[] = [];
  private rootEntities: Entity[] = [];

  /**
   * Add an entity to the world.
   */
  addEntity(entity: Entity): void {
    this.entities.set(entity.id, entity);
    
    // If entity has no parent, it's a root entity
    if (!entity.getParent()) {
      this.rootEntities.push(entity);
    }
  }

  /**
   * Remove an entity from the world.
   */
  removeEntity(entity: Entity): void {
    this.entities.delete(entity.id);
    
    const index = this.rootEntities.indexOf(entity);
    if (index !== -1) {
      this.rootEntities.splice(index, 1);
    }
    
    entity.destroy();
  }

  /**
   * Get an entity by ID.
   */
  getEntity(id: number): Entity | null {
    return this.entities.get(id) || null;
  }

  /**
   * Get all entities in the world.
   */
  getAllEntities(): Entity[] {
    return Array.from(this.entities.values());
  }

  /**
   * Get all root entities (entities without parents).
   */
  getRootEntities(): Entity[] {
    return [...this.rootEntities];
  }

  /**
   * Add a system to the world.
   */
  addSystem(system: System): void {
    this.systems.push(system);
    system.setWorld(this);
    system.onInit?.(this);
  }

  /**
   * Remove a system from the world.
   */
  removeSystem(system: System): void {
    const index = this.systems.indexOf(system);
    if (index !== -1) {
      system.onDestroy?.();
      this.systems.splice(index, 1);
    }
  }

  /**
   * Get all systems.
   */
  getSystems(): System[] {
    return [...this.systems];
  }

  /**
   * Update all systems with their matching entities.
   */
  update(deltaTime: number): void {
    for (const system of this.systems) {
      if (!system.enabled) continue;

      system.onBeforeUpdate?.(deltaTime);

      // Process all entities
      for (const entity of this.entities.values()) {
        if (system.matchesEntity(entity)) {
          system.update(entity, deltaTime);
        }
      }

      system.onAfterUpdate?.(deltaTime);
    }
  }

  /**
   * Clear all entities and systems.
   */
  clear(): void {
    // Destroy all systems
    for (const system of this.systems) {
      system.onDestroy?.();
    }
    this.systems = [];

    // Destroy all entities
    for (const entity of this.entities.values()) {
      entity.destroy();
    }
    this.entities.clear();
    this.rootEntities = [];
  }

  /**
   * Serialize the world to JSON.
   */
  toJSON(): Record<string, any> {
    return {
      entities: this.rootEntities.map(e => e.toJSON()),
    };
  }
}

