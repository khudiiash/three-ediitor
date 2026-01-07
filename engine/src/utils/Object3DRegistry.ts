import { Entity } from '../ecs/Entity';
import * as THREE from 'three';

/**
 * Global registry for mapping entities to their Three.js Object3D instances.
 * This allows systems to find parent Object3D objects for establishing hierarchy.
 */
class Object3DRegistry {
  private entityToObject3D: Map<number, THREE.Object3D> = new Map();

  /**
   * Register an entity's Object3D
   */
  register(entityId: number, object3D: THREE.Object3D): void {
    this.entityToObject3D.set(entityId, object3D);
  }

  /**
   * Unregister an entity's Object3D
   */
  unregister(entityId: number): void {
    this.entityToObject3D.delete(entityId);
  }

  /**
   * Get the Object3D for an entity
   */
  get(entityId: number): THREE.Object3D | null {
    return this.entityToObject3D.get(entityId) || null;
  }

  /**
   * Get the Object3D for an entity (returns the entity itself if it's an Object3D)
   */
  getForEntity(entity: Entity): THREE.Object3D | null {
    return this.get(entity.id);
  }

  /**
   * Clear all registrations
   */
  clear(): void {
    this.entityToObject3D.clear();
  }
}

// Export singleton instance
export const object3DRegistry = new Object3DRegistry();

