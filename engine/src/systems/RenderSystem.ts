import { System } from '../ecs/System';
import { Entity } from '../ecs/Entity';
import { TransformComponent } from '../components/TransformComponent';
import { MeshComponent } from '../components/MeshComponent';
import { World } from '../ecs/World';
import { object3DRegistry } from '../utils/Object3DRegistry';
import * as THREE from 'three';

/**
 * RenderSystem handles rendering of entities with mesh components.
 */
export class RenderSystem extends System {
  readonly requiredComponents = [TransformComponent, MeshComponent];

  private scene: THREE.Scene;
  private entityMeshMap: Map<number, THREE.Mesh> = new Map();
  private gizmoSystem: any = null; // Reference to GizmoSystem to check if entity is being dragged

  constructor(scene: THREE.Scene) {
    super();
    this.scene = scene;
  }

  onInit(world: World): void {
    this.world = world;
    // Find GizmoSystem to check if entities are being dragged
    const systems = world.getSystems();
    this.gizmoSystem = systems.find(s => s.constructor.name === 'GizmoSystem');
    
    // Initialize any existing entities
    for (const entity of world.getAllEntities()) {
      if (this.matchesEntity(entity)) {
        this.addEntityToScene(entity);
      }
    }
  }

  update(entity: Entity, _deltaTime: number): void {
    const transform = entity.getComponent(TransformComponent)!;
    const meshComp = entity.getComponent(MeshComponent)!;

    // Create mesh if it doesn't exist
    if (!meshComp.mesh) {
      this.addEntityToScene(entity);
    }

    const mesh = this.entityMeshMap.get(entity.id);
    if (!mesh) return;

    // Check if gizmo is actively dragging this entity
    // If so, don't overwrite the Object3D transform (gizmo is controlling it)
    const isBeingDragged = this.gizmoSystem && 
      this.gizmoSystem.getSelectedEntityId() === entity.id &&
      this.gizmoSystem.isDraggingGizmo();

    // Update transform from component to Object3D
    // Skip if gizmo is actively dragging (gizmo updates Object3D directly, then we sync to component)
    if (!isBeingDragged) {
      // Check if transform actually changed to avoid unnecessary updates
      if (!mesh.position.equals(transform.position) ||
          !mesh.rotation.equals(transform.rotation) ||
          !mesh.scale.equals(transform.scale)) {
        mesh.position.copy(transform.position);
        mesh.rotation.copy(transform.rotation);
        mesh.scale.copy(transform.scale);
      }
    }
    
    mesh.visible = entity.enabled && meshComp.enabled;
    
    // Update parent relationship if it changed
    this.updateParentRelationship(entity, mesh);
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
  private updateParentRelationship(entity: Entity, mesh: THREE.Mesh): void {
    const parent = entity.getParent();
    const currentParent = mesh.parent;
    
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
        currentParent.remove(mesh);
      }
      
      // Add to new parent
      targetParent.add(mesh);
    }
  }

  private addEntityToScene(entity: Entity): void {
    const meshComp = entity.getComponent(MeshComponent)!;
    
    if (!meshComp.mesh) {
      meshComp.createMesh();
    }

    if (meshComp.mesh) {
      const mesh = meshComp.mesh;
      this.entityMeshMap.set(entity.id, mesh);
      
      // Store entity ID in mesh userData for raycasting
      mesh.userData.entityId = entity.id;
      
      // Register in global registry
      object3DRegistry.register(entity.id, mesh);
      
      // Determine parent based on ECS hierarchy
      const parent = entity.getParent();
      if (parent) {
        const parentObject3D = this.getEntityObject3D(parent);
        if (parentObject3D) {
          parentObject3D.add(mesh);
        } else {
          // Parent doesn't have a Three.js object yet, add to scene for now
          // It will be reparented when parent's object is created
          this.scene.add(mesh);
        }
      } else {
        // No parent, add directly to scene
        this.scene.add(mesh);
      }
    }
  }

  onDestroy(): void {
    // Clean up all meshes
    for (const [entityId, mesh] of this.entityMeshMap.entries()) {
      object3DRegistry.unregister(entityId);
      if (mesh.parent) {
        mesh.parent.remove(mesh);
      }
      mesh.geometry.dispose();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(m => m.dispose());
      } else {
        mesh.material.dispose();
      }
    }
    this.entityMeshMap.clear();
  }
}

