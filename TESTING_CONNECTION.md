# Testing Editor-Engine Connection

## How It Works

The editor and engine communicate via WebSocket:

- **Editor (Rust)**: WebSocket server on `ws://127.0.0.1:9001`
- **Engine (TypeScript)**: WebSocket client that connects to the editor

## Testing Steps

### 1. Start the Editor First

```bash
cd editor
cargo run
```

The editor will:
- Start a WebSocket server on port 9001
- Display "Waiting for engine connection..." in the console

### 2. Start the Engine

```bash
cd engine
npm run dev
```

Then open http://localhost:3000/ in your browser.

The engine will:
- Automatically connect to the editor
- Send initial scene state
- Start sending FPS and entity count updates every second

### 3. Verify Connection

**In the Editor:**
- Top bar should show: `🟢 Connected | FPS: XX | Entities: X`
- Console should show: `🟢 Engine connected!`

**In the Browser:**
- Info panel should show: `Editor: 🟢 Connected ⏸ Paused`
- Browser console should show: `✅ Connected to editor!`

## Features to Test

### 1. Play/Pause Control

- Click the `▶ Play` button in the editor
- The cube in the browser should start rotating
- Click `⏸ Pause` to stop it
- Status should update in both editor and browser

### 2. Entity Selection

- Click on entities in the Scene Hierarchy panel
- Inspector panel should show the entity's components
- Selected entity name appears at the top of the inspector

### 3. Create Entity

- Click `➕ Add Entity` button
- Console should show: `➕ Creating new entity...`
- Browser console should show: `Created entity: NewEntity`
- Entity count should increase

### 4. Console Messages

All actions should log to the console:
- Connection status
- Play/pause changes
- Entity creation
- Scene saves

### 5. Real-time Stats

The editor should show live updates:
- FPS counter (updates every second)
- Entity count
- Connection status

## Troubleshooting

### "Failed to connect to editor"

- Make sure the editor is running first
- Check that port 9001 is not blocked by firewall
- The engine will automatically retry connection every 2 seconds

### "WebSocket server failed to bind"

- Port 9001 might be in use
- Close any other instances of the editor
- Change the port in both `editor/src/websocket.rs` and `engine/src/bridge/EditorBridge.ts`

### Hot Reload Issues

- Vite should automatically reload the engine when you make changes
- If not, refresh the browser manually
- For editor changes, you need to close and restart it

## Current Limitations

1. **Transform editing** - Not yet implemented (values are read-only)
2. **Scene loading** - Not yet implemented
3. **Entity deletion** - Backend works, but no UI button yet
4. **Component adding** - Not yet implemented

## Next Steps

1. Implement live transform editing
2. Add entity deletion button
3. Implement scene save/load to files
4. Add component add/remove UI
5. Embed Three.js viewport in editor window

