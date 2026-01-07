# Editor UI

This directory contains the Three.js Editor UI that runs in the Tauri webview.

## Building

To build the editor UI:

```bash
cd editor/ui
npm install
npm run build
```

This will create `editor-main.js` that can be loaded by the Tauri application.

## Development

For development with hot reload:

```bash
npm run dev
```

This will watch for changes and rebuild automatically.

## Structure

- `index.html` - Main HTML file loaded by Tauri
- `editor-main.ts` - Entry point that initializes the Three.js Editor
- `vite.config.js` - Vite configuration for building
- `package.json` - Node dependencies
- `tsconfig.json` - TypeScript configuration

The editor code itself is in `../../engine/src/editor/` and is imported from there.

