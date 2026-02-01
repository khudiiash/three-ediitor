# Three.js Engine Editor

An extended version of the [Three.js Editor](https://threejs.org/editor/) built with [Tauri 2.0](https://v2.tauri.app/) for desktop deployment. This project extends the original Three.js editor source code with additional features and customizations.

## Overview

This project is based on the official Three.js Editor source code, which is licensed under the [MIT License](https://github.com/mrdoob/three.js/blob/dev/LICENSE). We extend the editor with:

- Desktop application using Tauri 2.0 (Rust + Web frontend)
- Custom layout similar to PlayCanvas editor
- Enhanced assets management system with model parsing (GLB, GLTF, FBX, OBJ)
- TypeScript-based runtime engine
- Project hub for managing multiple projects
- Local file-based storage (no IndexedDB)
- Modular plugin system for extensibility
- WebGPU renderer with fallback to WebGL
- Additional UI improvements and customizations

## Requirements

- **Rust** (1.77.2 or later) - [Install Rust](https://www.rust-lang.org/tools/install)
- **Node.js** (for frontend development and build)
- **System dependencies** for Tauri 2.0 (see [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/))

### Tauri Prerequisites

- **Windows**: Microsoft Visual C++ Build Tools or Visual Studio 2019/2022 with C++ support
- **macOS**: Xcode Command Line Tools
- **Linux**: System dependencies vary by distribution (see Tauri docs)

## Building and Running

### Development Mode

To run the editor in development mode:

```bash
cd src/rust
cargo tauri dev
```

This will:
1. Start the Vite dev server for the editor frontend (`src/editor/`)
2. Start the Vite dev server for the engine runtime (`src/engine/`)
3. Build the Rust backend
4. Launch the Tauri application windows (Hub and Editor)

### Release Build

To build a release version:

```bash
cd src/rust
cargo tauri build
```

The executable will be located at:
- **Windows**: `src/rust/target/release/three-engine-editor.exe`
- **macOS**: `src/rust/target/release/bundle/macos/Three.js Engine Editor.app`
- **Linux**: `src/rust/target/release/three-engine-editor`

## Project Structure

```
.
├── src/
│   ├── rust/              # Tauri 2.0 backend (Rust)
│   │   ├── src/           # Rust source code
│   │   │   ├── lib.rs     # Main application logic
│   │   │   ├── main.rs    # Entry point
│   │   │   ├── project_manager.rs  # Project management
│   │   │   └── websocket.rs         # WebSocket server
│   │   ├── capabilities/  # Tauri capabilities
│   │   ├── tauri.conf.json # Tauri configuration
│   │   └── Cargo.toml     # Rust dependencies
│   ├── editor/            # Three.js Editor frontend
│   │   ├── js/            # JavaScript modules
│   │   ├── css/           # Stylesheets
│   │   ├── index.html     # Editor entry point
│   │   └── vite.config.js # Vite configuration
│   ├── engine/            # Runtime engine (TypeScript)
│   │   ├── src/           # TypeScript source
│   │   └── vite.config.ts # Vite configuration
│   └── hub/               # Project hub frontend
│       ├── index.html     # Hub entry point
│       └── js/            # Hub JavaScript
├── projects/               # User projects directory
│   └── [ProjectName]/
│       ├── project.json   # Project configuration
│       ├── scene.json     # Scene data
│       └── assets/        # Project assets
├── .gitignore
└── README.md
```

## Features

### Asset Management
- Drag and drop support for models (GLB, GLTF, FBX, OBJ)
- Automatic model parsing and folder structure creation
- Model files are organized in folders named after the model file (e.g., `suzanne.glb/`)
- Script asset compilation (TypeScript to JavaScript)
- Local file-based storage (no browser storage)

### Project Management
- Project hub for creating and managing multiple projects
- Each project has its own directory with `project.json`, `scene.json`, and `assets/` folder
- Projects are stored in the `projects/` directory

### Editor Features
- Scene hierarchy view
- Properties panel for selected objects
- Assets panel with folder structure
- 3D viewport with camera controls
- Play mode with runtime engine integration

## Development

### Frontend Development

The editor frontend uses Vite for development and building:

```bash
cd src/editor
npm install
npm run dev
```

The engine runtime also uses Vite:

```bash
cd src/engine
npm install
npm run dev
```

### Rust Backend Development

The Rust backend is located in `src/rust/`:

```bash
cd src/rust
cargo build
cargo tauri dev
```

## Configuration

### Tauri Configuration

Tauri settings are in `src/rust/tauri.conf.json`:
- Window configurations
- Security capabilities
- Build settings

### Editor Configuration

Editor settings are in `src/editor/vite.config.js`:
- Vite dev server configuration
- Module resolution
- Build output

## Projects Directory

The `projects/` directory contains user-created projects. Each project has:
- `project.json` - Project metadata and settings
- `scene.json` - Scene data (objects, materials, etc.)
- `assets/` - Project assets (models, textures, scripts, etc.)
  - `assets.json` - Asset metadata

Projects are stored locally and managed through the project hub.

## License

This project extends the Three.js Editor, which is licensed under the MIT License. Please refer to the original Three.js Editor license for details.

## Acknowledgments

- [Three.js](https://threejs.org/) - 3D graphics library
- [Three.js Editor](https://threejs.org/editor/) - Original editor source code
- [Tauri 2.0](https://v2.tauri.app/) - Framework for building desktop applications
