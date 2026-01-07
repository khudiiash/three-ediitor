import { System } from '../ecs/System';
import { Entity } from '../ecs/Entity';
import { TransformComponent } from '../components/TransformComponent';
import { CameraComponent } from '../components/CameraComponent';

/**
 * CameraSystem updates camera transforms.
 */
export class CameraSystem extends System {
  readonly requiredComponents = [TransformComponent, CameraComponent];

  update(entity: Entity, deltaTime: number): void {
    const transform = entity.getComponent(TransformComponent)!;
    const cameraComp = entity.getComponent(CameraComponent)!;

    // Update camera transform if camera exists
    if (cameraComp.camera) {
      cameraComp.camera.position.copy(transform.position);
      cameraComp.camera.rotation.copy(transform.rotation);
      cameraComp.camera.quaternion.setFromEuler(transform.rotation);
    }
  }
}

