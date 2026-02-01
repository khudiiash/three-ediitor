/**
 * Material Output Nodes
 */

import { registerNode, registerCategory } from '../NodeRegistry.js';
const NODE_WIDTH = 140;

// MeshStandardMaterial Output
registerNode( 'outputStandard', {
	name: 'MeshStandardMaterial',
	color: '#ff6b6b',
	width: NODE_WIDTH, // Wider for material outputs
	inputs: [
		{ name: 'Color', type: 'vec3', label: 'Color' },
		{ name: 'Roughness', type: 'float', label: 'Roughness' },
		{ name: 'Metalness', type: 'float', label: 'Metalness' },
		{ name: 'Normal', type: 'vec3', label: 'Normal' },
		{ name: 'Emissive', type: 'vec3', label: 'Emissive' },
		{ name: 'AO', type: 'float', label: 'AO' }
	],
	outputs: [],
	properties: {},
	height: 32 + 6 * 20 + 8 // More spacing: 32px header + 6 inputs * 20px + 8px padding
} );

// MeshPhysicalMaterial Output
registerNode( 'outputPhysical', {
	name: 'MeshPhysicalMaterial',
	color: '#ff6b6b',
	width: NODE_WIDTH,
	inputs: [
		{ name: 'Color', type: 'vec3', label: 'Color' },
		{ name: 'Roughness', type: 'float', label: 'Roughness' },
		{ name: 'Metalness', type: 'float', label: 'Metalness' },
		{ name: 'Normal', type: 'vec3', label: 'Normal' },
		{ name: 'Emissive', type: 'vec3', label: 'Emissive' },
		{ name: 'AO', type: 'float', label: 'AO' },
		{ name: 'Clearcoat', type: 'float', label: 'Clearcoat' },
		{ name: 'Clearcoat Roughness', type: 'float', label: 'CC Rough' },
		{ name: 'Transmission', type: 'float', label: 'Transmission' },
		{ name: 'Thickness', type: 'float', label: 'Thickness' },
		{ name: 'IOR', type: 'float', label: 'IOR' }
	],
	outputs: [],
	properties: {},
	height: 32 + 11 * 20 + 8
} );

// MeshBasicMaterial Output
registerNode( 'outputBasic', {
	name: 'MeshBasicMaterial',
	color: '#ff6b6b',
	width: NODE_WIDTH,
	inputs: [
		{ name: 'Color', type: 'vec3', label: 'Color' },
		{ name: 'Opacity', type: 'float', label: 'Opacity' }
	],
	outputs: [],
	properties: {},
	height: 32 + 2 * 20 + 8
} );

// MeshPhongMaterial Output
registerNode( 'outputPhong', {
	name: 'MeshPhongMaterial',
	color: '#ff6b6b',
	width: NODE_WIDTH,
	inputs: [
		{ name: 'Color', type: 'vec3', label: 'Color' },
		{ name: 'Specular', type: 'vec3', label: 'Specular' },
		{ name: 'Shininess', type: 'float', label: 'Shininess' },
		{ name: 'Normal', type: 'vec3', label: 'Normal' },
		{ name: 'Emissive', type: 'vec3', label: 'Emissive' }
	],
	outputs: [],
	properties: {},
	height: 32 + 5 * 20 + 8
} );

// Legacy output (backwards compatibility)
registerNode( 'output', {
	name: 'Material Output',
	color: '#ff6b6b',
	width: NODE_WIDTH,
	inputs: [
		{ name: 'Color', type: 'vec3', label: 'Color' },
		{ name: 'Roughness', type: 'float', label: 'Roughness' },
		{ name: 'Metalness', type: 'float', label: 'Metalness' },
		{ name: 'Normal', type: 'vec3', label: 'Normal' }
	],
	outputs: [],
	properties: {},
	height: 32 + 4 * 20 + 8
} );

registerCategory( {
	name: 'Output',
	nodes: [
		{ name: 'MeshStandardMaterial', type: 'outputStandard', color: '#ff6b6b' },
		{ name: 'MeshPhysicalMaterial', type: 'outputPhysical', color: '#ff6b6b' },
		{ name: 'MeshBasicMaterial', type: 'outputBasic', color: '#ff6b6b' },
		{ name: 'MeshPhongMaterial', type: 'outputPhong', color: '#ff6b6b' }
	]
} );
