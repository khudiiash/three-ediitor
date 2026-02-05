/**
 * Material Output Nodes
 * Width and height are calculated automatically by NodeRegistry layout.
 */

import { registerNode, registerCategory } from '../NodeRegistry.js';

// MeshStandardMaterial Output
registerNode( 'outputStandard', {
	name: 'MeshStandardMaterial',
	color: '#ff6b6b',
	inputs: [
		{ name: 'Color', type: 'vec3', label: 'Color' },
		{ name: 'Roughness', type: 'float', label: 'Roughness' },
		{ name: 'Metalness', type: 'float', label: 'Metalness' },
		{ name: 'Normal', type: 'vec3', label: 'Normal' },
		{ name: 'Emissive', type: 'vec3', label: 'Emissive' },
		{ name: 'AO', type: 'float', label: 'AO' }
	],
	outputs: [],
	properties: {}
} );

// MeshPhysicalMaterial Output
registerNode( 'outputPhysical', {
	name: 'MeshPhysicalMaterial',
	color: '#ff6b6b',
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
	properties: {}
} );

// MeshBasicMaterial Output
registerNode( 'outputBasic', {
	name: 'MeshBasicMaterial',
	color: '#ff6b6b',
	inputs: [
		{ name: 'Color', type: 'vec3', label: 'Color' },
		{ name: 'Opacity', type: 'float', label: 'Opacity' }
	],
	outputs: [],
	properties: {}
} );

// MeshPhongMaterial Output
registerNode( 'outputPhong', {
	name: 'MeshPhongMaterial',
	color: '#ff6b6b',
	inputs: [
		{ name: 'Color', type: 'vec3', label: 'Color' },
		{ name: 'Specular', type: 'vec3', label: 'Specular' },
		{ name: 'Shininess', type: 'float', label: 'Shininess' },
		{ name: 'Normal', type: 'vec3', label: 'Normal' },
		{ name: 'Emissive', type: 'vec3', label: 'Emissive' }
	],
	outputs: [],
	properties: {}
} );

// Legacy output (backwards compatibility)
registerNode( 'output', {
	name: 'Material Output',
	color: '#ff6b6b',
	inputs: [
		{ name: 'Color', type: 'vec3', label: 'Color' },
		{ name: 'Roughness', type: 'float', label: 'Roughness' },
		{ name: 'Metalness', type: 'float', label: 'Metalness' },
		{ name: 'Normal', type: 'vec3', label: 'Normal' }
	],
	outputs: [],
	properties: {}
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
