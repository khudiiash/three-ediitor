import { Component } from './Component';

let entityIdCounter = 0;

/**
 * Entity represents a game object in the ECS system.
 * It's essentially a container for components.
 */
export class Entity {
  readonly id: number;
  name: string;
  enabled: boolean = true;
  
  private components: Map<string, Component> = new Map();
  private children: Entity[] = [];
  private parent: Entity | null = null;

  constructor(name: string = 'Entity') {
    this.id = entityIdCounter++;
    this.name = name;
  }

  /**
   * Add a component to this entity.
   */
  addComponent<T extends Component>(component: T): T {
    const componentId = (component.constructor as typeof Component).componentId;
    
    if (this.components.has(componentId)) {
      console.warn(`Entity ${this.name} already has component ${componentId}`);
      return this.components.get(componentId) as T;
    }

    this.components.set(componentId, component);
    component.onAdd?.();
    return component;
  }

  /**
   * Get a component by its type.
   */
  getComponent<T extends Component>(componentType: new (...args: any[]) => T): T | null {
    const componentId = (componentType as any).componentId;
    return (this.components.get(componentId) as T) || null;
  }

  /**
   * Check if entity has a component.
   */
  hasComponent<T extends Component>(componentType: new (...args: any[]) => T): boolean {
    const componentId = (componentType as any).componentId;
    return this.components.has(componentId);
  }

  /**
   * Remove a component from this entity.
   */
  removeComponent<T extends Component>(componentType: new (...args: any[]) => T): void {
    const componentId = (componentType as any).componentId;
    const component = this.components.get(componentId);
    
    if (component) {
      component.onRemove?.();
      this.components.delete(componentId);
    }
  }

  /**
   * Get all components on this entity.
   */
  getAllComponents(): Component[] {
    return Array.from(this.components.values());
  }

  /**
   * Add a child entity.
   */
  addChild(entity: Entity): void {
    if (entity.parent) {
      entity.parent.removeChild(entity);
    }
    
    this.children.push(entity);
    entity.parent = this;
  }

  /**
   * Remove a child entity.
   */
  removeChild(entity: Entity): void {
    const index = this.children.indexOf(entity);
    if (index !== -1) {
      this.children.splice(index, 1);
      entity.parent = null;
    }
  }

  /**
   * Get all children.
   */
  getChildren(): Entity[] {
    return [...this.children];
  }

  /**
   * Get parent entity.
   */
  getParent(): Entity | null {
    return this.parent;
  }

  /**
   * Serialize entity to JSON.
   */
  toJSON(): Record<string, any> {
    return {
      id: this.id,
      name: this.name,
      enabled: this.enabled,
      components: Array.from(this.components.values()).map(c => c.toJSON()),
      children: this.children.map(c => c.toJSON()),
    };
  }

  /**
   * Destroy this entity and all its children.
   */
  destroy(): void {
    // Remove all components
    for (const component of this.components.values()) {
      component.onRemove?.();
    }
    this.components.clear();

    // Destroy all children
    for (const child of this.children) {
      child.destroy();
    }
    this.children = [];

    // Remove from parent
    if (this.parent) {
      this.parent.removeChild(this);
    }
  }
}

