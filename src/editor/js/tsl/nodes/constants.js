/**
 * Constant Nodes
 */

import { registerNode, registerCategory } from '../NodeRegistry.js';

registerNode( 'color', {
	name: 'Color',
	color: '#ffd43b',
	inputs: [
		{ name: 'Color', type: 'vec3', label: '' }
	],
	outputs: [
		{ name: 'R', type: 'float', label: 'R', component: 0 },
		{ name: 'G', type: 'float', label: 'G', component: 1 },
		{ name: 'B', type: 'float', label: 'B', component: 2 },
		{ name: 'RGB', type: 'vec3', label: 'RGB' }
	],
	properties: { color: '#ffffff' },
	hasInlineContent: true
} );

registerNode( 'float', {
	name: 'Float',
	color: '#74c0fc',
	inputs: [ { name: 'Value', type: 'float', label: '' } ],
	outputs: [ { name: 'Value', type: 'float', label: '' } ],
	properties: { value: 1.0 },
	hasInlineContent: true
} );

registerNode( 'int', {
	name: 'Int',
	color: '#74c0fc',
	inputs: [ { name: 'Value', type: 'int', label: '' } ],
	outputs: [ { name: 'Value', type: 'int', label: '' } ],
	properties: { value: 0 },
	hasInlineContent: true
} );

registerNode( 'vec2', {
	name: 'Vec2',
	color: '#a9e34b',
	inputs: [
		{ name: 'X', type: 'float', label: 'X' },
		{ name: 'Y', type: 'float', label: 'Y' }
	],
	outputs: [
		{ name: 'X', type: 'float', label: 'X', component: 0 },
		{ name: 'Y', type: 'float', label: 'Y', component: 1 },
		{ name: 'XY', type: 'vec2', label: 'XY' }
	],
	properties: { x: 0.0, y: 0.0 },
	hasInlineContent: true
} );

registerNode( 'vec3', {
	name: 'Vec3',
	color: '#69db7c',
	inputs: [
		{ name: 'X', type: 'float', label: 'X' },
		{ name: 'Y', type: 'float', label: 'Y' },
		{ name: 'Z', type: 'float', label: 'Z' }
	],
	outputs: [
		{ name: 'X', type: 'float', label: 'X', component: 0 },
		{ name: 'Y', type: 'float', label: 'Y', component: 1 },
		{ name: 'Z', type: 'float', label: 'Z', component: 2 },
		{ name: 'XYZ', type: 'vec3', label: 'XYZ' }
	],
	properties: { x: 0.0, y: 0.0, z: 0.0 },
	hasInlineContent: true
} );

registerNode( 'vec4', {
	name: 'Vec4',
	color: '#51cf66',
	inputs: [
		{ name: 'X', type: 'float', label: 'X' },
		{ name: 'Y', type: 'float', label: 'Y' },
		{ name: 'Z', type: 'float', label: 'Z' },
		{ name: 'W', type: 'float', label: 'W' }
	],
	outputs: [
		{ name: 'X', type: 'float', label: 'X', component: 0 },
		{ name: 'Y', type: 'float', label: 'Y', component: 1 },
		{ name: 'Z', type: 'float', label: 'Z', component: 2 },
		{ name: 'W', type: 'float', label: 'W', component: 3 },
		{ name: 'XYZW', type: 'vec4', label: 'XYZW' }
	],
	properties: { x: 0.0, y: 0.0, z: 0.0, w: 0.0 },
	hasInlineContent: true
} );

registerCategory( {
	name: 'Constants',
	nodes: [
		{ name: 'Color', type: 'color', color: '#ffd43b' },
		{ name: 'Float', type: 'float', color: '#74c0fc' },
		{ name: 'Int', type: 'int', color: '#74c0fc' },
		{ name: 'Vec2', type: 'vec2', color: '#a9e34b' },
		{ name: 'Vec3', type: 'vec3', color: '#69db7c' },
		{ name: 'Vec4', type: 'vec4', color: '#51cf66' }
	]
} );
