# Three.js ECS Game Engine

A modular game engine built with Three.js and ECS architecture, featuring a Rust-based editor.

## Architecture

- **Editor** (`/editor`): Rust-based desktop application (similar to Godot)
- **Engine** (`/engine`): TypeScript ECS engine with Three.js rendering
- **Runtime** (`/runtime`): Game runtime environment

## Project Structure

```
three-engine/
├── editor/          # Rust-based editor application
├── engine/          # Core ECS engine + Three.js
├── runtime/         # Game runtime
└── examples/        # Example projects
```

## Getting Started

### Engine Development
```bash
cd engine
npm install
npm run dev
```

### Editor Development
```bash
cd editor
cargo run
```

## Roadmap

- [x] Project structure
- [ ] Basic ECS implementation
- [ ] Three.js renderer integration
- [ ] Editor-Engine communication protocol
- [ ] Rust editor with egui
- [ ] Scene serialization/deserialization
- [ ] Asset management
- [ ] Component inspector
- [ ] Viewport rendering

# three-ediitor
