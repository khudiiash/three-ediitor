# Getting Started

## 🚀 Quick Start

### Running the Engine Demo

```bash
cd engine
npm install
npm run dev
```

Visit http://localhost:3000/ to see the demo with:
- Rotating cube
- Ground plane
- Sphere
- Real-time FPS counter

### Running the Editor (Rust)

```bash
cd editor
cargo run
```

## 📁 Project Structure

```
three-engine/
├── engine/                 # TypeScript ECS Engine + Three.js
│   ├── src/
│   │   ├── ecs/           # Core ECS implementation
│   │   │   ├── Component.ts
│   │   │   ├── Entity.ts
│   │   │   ├── System.ts
│   │   │   └── World.ts
│   │   ├── components/    # Built-in components
│   │   │   ├── TransformComponent.ts
│   │   │   ├── MeshComponent.ts
│   │   │   ├── CameraComponent.ts
│   │   │   └── LightComponent.ts
│   │   ├── systems/       # Built-in systems
│   │   │   └── RenderSystem.ts
│   │   ├── renderer/      # Three.js renderer wrapper
│   │   │   └── Renderer.ts
│   │   └── demo.ts        # Demo application
│   └── package.json
│
└── editor/                # Rust Editor (egui)
    ├── src/
    │   └── main.rs        # Editor application
    └── Cargo.toml
```

## 🎮 ECS Architecture

### Components (Data)
Components are pure data containers:

```typescript
class TransformComponent extends Component {
  position: Vector3;
  rotation: Euler;
  scale: Vector3;
}
```

### Entities (Objects)
Entities are containers for components:

```typescript
const entity = new Entity('MyEntity');
entity.addComponent(new TransformComponent());
entity.addComponent(new MeshComponent());
```

### Systems (Logic)
Systems process entities with specific components:

```typescript
class RenderSystem extends System {
  requiredComponents = [TransformComponent, MeshComponent];
  
  update(entity: Entity, deltaTime: number) {
    // Update logic here
  }
}
```

### World (Manager)
World manages everything:

```typescript
const world = new World();
world.addEntity(entity);
world.addSystem(new RenderSystem(scene));
world.update(deltaTime); // Call every frame
```

## 🔧 Creating Your First Scene

```typescript
import { World, Entity } from '@three-engine/core';
import { TransformComponent, MeshComponent } from '@three-engine/core';

// Create world
const world = new World();

// Create entity
const cube = new Entity('MyCube');
cube.addComponent(new TransformComponent());

const mesh = new MeshComponent();
mesh.geometryType = 'box';
mesh.materialParams = { color: 0xff0000 };
cube.addComponent(mesh);

// Add to world
world.addEntity(cube);

// Game loop
function animate() {
  requestAnimationFrame(animate);
  world.update(deltaTime);
  renderer.render();
}
```

## 🎯 Next Steps

1. **Enhance ECS**
   - Add more component types (Physics, Audio, Script)
   - Implement component queries
   - Add event system

2. **Editor Integration**
   - Embed Three.js viewport in Rust editor
   - Implement scene serialization
   - Add component inspector with live editing
   - Asset browser

3. **Advanced Features**
   - Physics system (Rapier/Cannon.js)
   - Audio system
   - Particle system
   - Post-processing effects
   - Custom shader support

4. **Editor Features**
   - Drag & drop entities
   - Gizmos for transform manipulation
   - Play/Pause/Step controls
   - Scene saving/loading
   - Prefab system

## 📚 Architecture Decisions

### Why ECS?
- **Performance**: Cache-friendly data layout
- **Flexibility**: Easy to add/remove features
- **Modularity**: Systems are independent
- **Serialization**: Easy to save/load scenes

### Why Rust for Editor?
- **Performance**: Fast UI rendering
- **Native**: No Electron overhead
- **egui**: Immediate mode GUI is perfect for editors
- **Cross-platform**: Works on Windows, Mac, Linux

### Why Three.js?
- **Mature**: Battle-tested renderer
- **Community**: Huge ecosystem
- **Features**: Everything you need for 3D
- **WebGL**: Runs everywhere

