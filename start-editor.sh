#!/bin/bash
echo "Starting Three.js Engine Editor..."
echo

# Kill any existing processes
pkill -f "three-engine-editor" 2>/dev/null
pkill -f "vite.*engine" 2>/dev/null

# Start the engine (Vite dev server)
echo "Starting engine..."
cd engine
npm run dev &
ENGINE_PID=$!
cd ..

# Wait for engine to start
sleep 3

# Start the editor
echo "Starting editor..."
cd editor
cargo run

# When editor closes, kill the engine
echo
echo "Editor closed. Cleaning up..."
kill $ENGINE_PID 2>/dev/null
echo "Done."

