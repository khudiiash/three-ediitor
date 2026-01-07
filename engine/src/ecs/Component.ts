/**
 * Base class for all components in the ECS system.
 * Components are pure data containers with no logic.
 */
export abstract class Component {
  /**
   * Unique identifier for the component type.
   * Used for efficient component lookups.
   */
  static readonly componentId: string;

  /**
   * Flag indicating if the component is enabled.
   */
  enabled: boolean = true;

  /**
   * Called when the component is added to an entity.
   */
  onAdd?(): void;

  /**
   * Called when the component is removed from an entity.
   */
  onRemove?(): void;

  /**
   * Serialize the component to JSON.
   */
  toJSON(): Record<string, any> {
    return {
      type: (this.constructor as typeof Component).componentId,
      enabled: this.enabled,
    };
  }

  /**
   * Deserialize the component from JSON.
   */
  fromJSON(data: Record<string, any>): void {
    if (data.enabled !== undefined) {
      this.enabled = data.enabled;
    }
  }
}

