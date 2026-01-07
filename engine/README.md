# Three.js ECS Engine

A lightweight, modular game engine built with Three.js and Entity-Component-System architecture.

## Features

✨ **Pure ECS Architecture** - Clean separation of data and logic  
🎮 **Three.js Integration** - Powerful 3D rendering  
📦 **Component-Based** - Modular and extensible  
🔄 **Scene Serialization** - Save and load scenes as JSON  
⚡ **High Performance** - Optimized for real-time games  
🛠️ **TypeScript** - Full type safety  

## Quick Start

```bash
npm install
npm run dev
```

Visit http://localhost:3000/ to see the demo.

## Basic Usage

```typescript
import { World, Entity, Renderer } from '@three-engine/core';
import { TransformComponent, MeshComponent } from '@three-engine/core';
import { RenderSystem } from '@three-engine/core';

// Create world
const world = new World();

// Setup renderer
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const renderer = new Renderer(canvas, world);
const renderSystem = new RenderSystem(renderer.getScene());
world.addSystem(renderSystem);

// Create entity
const cube = new Entity('Cube');
cube.addComponent(new TransformComponent());

const mesh = new MeshComponent();
mesh.geometryType = 'box';
mesh.materialParams = { color: 0x00ff00 };
cube.addComponent(mesh);

world.addEntity(cube);

// Game loop
function animate() {
  requestAnimationFrame(animate);
  world.update(deltaTime);
  renderer.render();
}
```

## Core Concepts

### Entity
A container for components representing a game object.

### Component
Pure data with no logic. Examples: Transform, Mesh, Camera.

### System
Logic that processes entities with specific components.

### World
Manages all entities and systems.

## Documentation

- [Getting Started](../GETTING_STARTED.md)
- [Architecture](../ARCHITECTURE.md)
- [Quick Reference](../QUICK_REFERENCE.md)
- [Roadmap](../ROADMAP.md)

## License

MIT

