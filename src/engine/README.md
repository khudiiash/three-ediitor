# Three.js Game Engine

A PlayCanvas-like game engine built on top of Three.js with TypeScript support.

## Architecture

The engine follows a **minimal extension** approach - Entity directly extends Three.js Object3D, keeping all native Three.js functionality while adding component and script support.

- **Engine (`pc`)**: Global singleton instance that manages the renderer and apps
- **App**: Represents a scene/application, contains the root entity
- **Entity**: Extends `THREE.Object3D` with component and script support
- **Component**: Extends entity functionality (Mesh, Camera, Light, Physics, Sound, etc.)
- **Script**: Custom behavior with `start()` and `update()` lifecycle methods

### Key Features

- ✅ **Entity extends Object3D directly** - All Three.js methods work (position, rotation, scale, add, remove, traverse, etc.)
- ✅ Component system for extending entities
- ✅ Script system with lifecycle methods
- ✅ Global `pc` engine object (like PlayCanvas)
- ✅ TypeScript support
- ✅ Editor-friendly architecture

## Usage

```typescript
import { pc, App, MeshComponent, CameraComponent, TransformComponent } from './index';
import * as THREE from 'three';


const canvas = document.getElementById('canvas') as HTMLCanvasElement;
pc.init(canvas);


const app = pc.createApp('main');
pc.setCurrentApp('main');


const cameraEntity = app.createEntity('Camera');
const cameraComponent = cameraEntity.addComponent(CameraComponent);
cameraComponent.createPerspective(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
cameraComponent.setAsMainCamera();


cameraEntity.position.set(0, 0, 5);
cameraEntity.lookAt(0, 0, 0);


const cubeEntity = app.createEntity('Cube');
const meshComponent = cubeEntity.addComponent(MeshComponent);
meshComponent.setMesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0x00ff00 })
);


cubeEntity.position.set(0, 0, 0);
cubeEntity.rotation.set(0, Math.PI / 4, 0);
cubeEntity.scale.set(2, 2, 2);


pc.start();
```

## Creating Scripts

Scripts extend the `Script` base class and implement `onStart()` and `onUpdate()`:

```typescript
import { Script } from './index';

class RotateScript extends Script {
    private speed: number = 1;

    protected onStart(): void {
        console.log('Script started');
    }

    protected onUpdate(deltaTime: number): void {
        
        this.getEntity().rotateY(this.speed * deltaTime);
        
        
        this.getEntity().position.y += deltaTime;
    }
}


entity.addScript(RotateScript);
```

## Components

### TransformComponent (Optional)
Provides convenience methods, but you can use Object3D methods directly:
```typescript

entity.position.set(0, 1, 0);
entity.rotation.set(0, Math.PI / 4, 0);
entity.scale.set(2, 2, 2);


const transform = entity.addComponent(TransformComponent);
transform.setPosition(0, 1, 0);
```

### MeshComponent
Adds a mesh renderer:
```typescript
const mesh = entity.addComponent(MeshComponent);
mesh.setMesh(geometry, material);
```

### CameraComponent
Adds a camera:
```typescript
const camera = entity.addComponent(CameraComponent);
camera.createPerspective(75, aspect, 0.1, 1000);
camera.setAsMainCamera();
```

### LightComponent
Adds lights:
```typescript
const light = entity.addComponent(LightComponent);
light.createDirectional(0xffffff, 1);
```

## Three.js Integration

Since Entity extends Object3D, you can use all Three.js methods:

```typescript

entity.add(childEntity);
entity.remove(childEntity);
entity.traverse(callback);


entity.position.set(x, y, z);
entity.rotation.set(x, y, z);
entity.scale.set(x, y, z);
entity.lookAt(target);


entity.getObjectByName(name);
entity.getObjectById(id);


```

## Development

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build
npm run build
```

## Integration with Editor

The engine is designed to work seamlessly with the Three.js Editor:

1. Editor exports scene as JSON
2. Engine loads scene via `app.loadScene(sceneJson)`
3. Entities are automatically created from Three.js objects
4. Scripts and components can be attached via editor UI
