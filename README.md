# Three.js Editor Extended

An extended version of the [Three.js Editor](https://threejs.org/editor/) built with [Tauri](https://tauri.app/) for desktop deployment. This project extends the original Three.js editor source code with additional features and customizations.

## Overview

This project is based on the official Three.js Editor source code, which is licensed under the [MIT License](https://github.com/mrdoob/three.js/blob/dev/LICENSE). We extend the editor with:

- Desktop application using Tauri (Rust + Web frontend)
- Custom layout similar to PlayCanvas editor
- Enhanced assets management system
- Additional UI improvements and customizations

## Requirements

- **Rust** (latest stable version) - [Install Rust](https://www.rust-lang.org/tools/install)
- **Node.js** (for managing frontend dependencies, if any)
- **System dependencies** for Tauri (see [Tauri prerequisites](https://tauri.app/v1/guides/getting-started/prerequisites))

### Tauri Prerequisites

- **Windows**: Microsoft Visual C++ Build Tools or Visual Studio 2019/2022 with C++ support
- **macOS**: Xcode Command Line Tools
- **Linux**: System dependencies vary by distribution (see Tauri docs)

## Building and Running

### Development Mode

To run the editor in development mode:

```bash
cargo run
```

This will:
1. Build the Rust backend
2. Serve the frontend from `src/editor/`
3. Launch the Tauri application window

### Release Build

To build a release version:

```bash
cargo build --release
```

The executable will be located at:
- **Windows**: `target/release/three-engine.exe`
- **macOS**: `target/release/three-engine`
- **Linux**: `target/release/three-engine`

## Project Structure

```
.
├── src/
│   ├── editor/          # Three.js Editor source code (extended)
│   │   ├── js/          # JavaScript modules
│   │   ├── css/         # Stylesheets
│   │   └── index.html   # Main HTML entry point
│   └── main.rs          # Tauri application entry point
├── projects/            # User projects (excluded from Git)
├── Cargo.toml           # Rust dependencies
└── README.md
```

## Projects Directory

The `projects/` directory is excluded from the public GitHub repository (via `.gitignore`). 

**For internal company use:** You can set up a separate Git repository for projects and configure the engine to use it. See [PROJECTS_GIT_SETUP.md](PROJECTS_GIT_SETUP.md) for detailed instructions.

**Quick setup:** Set the `THREE_ENGINE_PROJECTS_DIR` environment variable to point to your projects directory:
```bash
export THREE_ENGINE_PROJECTS_DIR=/path/to/your/projects
```

## Three.js Editor Source Code

This project extends the official Three.js Editor source code. The editor code is located in `src/editor/` and includes:

- Original Three.js Editor JavaScript modules
- UI components and libraries
- Editor controls and viewport rendering
- Scene management and object manipulation

**Note**: This project uses and extends the Three.js Editor source code. The original Three.js Editor is developed by the Three.js community and is available at [threejs.org/editor](https://threejs.org/editor/).

## License

This project extends the Three.js Editor, which is licensed under the MIT License. Please refer to the original Three.js Editor license for details.

## Contributing

When contributing, please note that we are extending the Three.js Editor source code. Be mindful of:
- Maintaining compatibility with the original editor's architecture
- Following the existing code style and patterns
- Properly attributing any code derived from the original editor

## Acknowledgments

- [Three.js](https://threejs.org/) - 3D graphics library
- [Three.js Editor](https://threejs.org/editor/) - Original editor source code
- [Tauri](https://tauri.app/) - Framework for building desktop applications

