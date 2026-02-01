# TSL Node System

Modular node system for the TSL (Three.js Shading Language) Editor.

## Structure

```
src/editor/js/tsl/
├── NodeRegistry.js          # Central node registry and configuration system
├── nodes.js                 # Index file that imports all node definitions
└── nodes/
    ├── output.js           # Material output nodes (Standard, Physical, Basic, Phong)
    ├── constants.js        # Constant nodes (Color, Float, Int, Vec2/3/4)
    ├── geometry.js         # Geometry nodes (UV, Position, Normal, Time, etc.)
    ├── math.js             # Math operations (Add, Multiply, Trigonometry, etc.)
    ├── logic.js            # Logic nodes (And, Or, Select, Compare, etc.)
    └── misc.js             # Noise, Texture, Utils, Model, and Advanced nodes
```

## Node Registration

Each node is registered with the following structure:

```javascript
registerNode( 'nodeType', {
    name: 'Display Name',
    color: '#hex-color',
    inputs: [
        { name: 'InputName', type: 'float|vec2|vec3|vec4|bool', label: 'Label' }
    ],
    outputs: [
        { name: 'OutputName', type: 'float|vec2|vec3|vec4|bool', label: 'Label' }
    ],
    properties: { 
        propertyName: defaultValue 
    },
    hasInlineContent: true|false,  // Shows inline preview (color, value, etc.)
    height: 56  // Optional, auto-calculated if not provided
} );
```

## Categories

Nodes are organized into categories for the sidebar:

```javascript
registerCategory( {
    name: 'Category Name',
    nodes: [
        { name: 'Display Name', type: 'nodeType', color: '#hex' }
    ]
} );
```

## Adding New Nodes

### 1. Choose the appropriate file in `nodes/`

- **output.js** - Material output nodes
- **constants.js** - Constant value nodes
- **geometry.js** - Geometry attribute nodes
- **math.js** - Mathematical operations
- **logic.js** - Boolean logic and comparisons
- **misc.js** - Everything else (noise, textures, utils, model, advanced)

### 2. Register your node

```javascript
import { registerNode, registerCategory } from '../NodeRegistry.js';

registerNode( 'myNewNode', {
    name: 'My New Node',
    color: '#4dabf7',
    inputs: [
        { name: 'Input1', type: 'float', label: 'In' }
    ],
    outputs: [
        { name: 'Result', type: 'float', label: 'Out' }
    ],
    properties: {
        multiplier: 2.0
    }
} );
```

### 3. Add to category

Add your node to the appropriate category's `nodes` array at the bottom of the file.

## Material Output Nodes

The editor now supports multiple material types with dedicated output nodes:

- **MeshStandardMaterial** (`outputStandard`) - Standard PBR material
- **MeshPhysicalMaterial** (`outputPhysical`) - Advanced PBR with clearcoat, transmission
- **MeshBasicMaterial** (`outputBasic`) - Simple unlit material
- **MeshPhongMaterial** (`outputPhong`) - Phong lighting model

Each material output has inputs specific to its material properties.

## Node Configuration

The `createNodeConfig()` function automatically generates node configurations from registered definitions:

- Calculates node height based on socket count
- Deep clones properties to avoid reference issues
- Adds extra space for inline content
- Provides fallback for unknown node types

## Benefits

1. **Modularity** - Each node category in its own file
2. **Maintainability** - Easy to find and update specific nodes
3. **Extensibility** - Simple to add new nodes without touching the editor
4. **Performance** - Nodes only loaded once at startup
5. **Type Safety** - Centralized type definitions
6. **Consistency** - All nodes follow the same structure
