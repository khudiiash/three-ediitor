/**
 * Noise, Texture, Utils, Model, and Advanced Nodes
 */

import { registerNode, registerCategory } from '../NodeRegistry.js';

// === NOISE NODES ===
const noiseNodes = [
	{ type: 'cellNoiseFloat', name: 'Cell Noise (Float)', output: 'float' },
	{ type: 'noiseFloat', name: 'Noise (Float)', output: 'float' },
	{ type: 'fractalNoiseFloat', name: 'Fractal Noise (Float)', output: 'float' },
	{ type: 'fractalNoiseVec2', name: 'Fractal Noise (Vec2)', output: 'vec2' },
	{ type: 'fractalNoiseVec3', name: 'Fractal Noise (Vec3)', output: 'vec3' },
	{ type: 'fractalNoiseVec4', name: 'Fractal Noise (Vec4)', output: 'vec4' },
	{ type: 'worleyNoiseFloat', name: 'Worley Noise (Float)', output: 'float' },
	{ type: 'worleyNoiseVec2', name: 'Worley Noise (Vec2)', output: 'vec2' },
	{ type: 'worleyNoiseVec3', name: 'Worley Noise (Vec3)', output: 'vec3' },
	{ type: 'noiseVec3', name: 'Noise (Vec3)', output: 'vec3' },
	{ type: 'noiseVec4', name: 'Noise (Vec4)', output: 'vec4' },
	{ type: 'triNoise3D', name: 'Tri Noise 3D', output: 'vec3' },
	{ type: 'unifiedNoise2D', name: 'Unified Noise 2D', output: 'float' },
	{ type: 'unifiedNoise3D', name: 'Unified Noise 3D', output: 'float' },
	{ type: 'interleavedGradientNoise', name: 'Interleaved Gradient Noise', output: 'float' }
];

noiseNodes.forEach( node => {

	registerNode( node.type, {
		name: node.name,
		color: '#10b981',
		inputs: [ { name: 'UV', type: 'vec2', label: 'UV' } ],
		outputs: [ { name: 'OUT', type: node.output, label: '' } ],
		properties: {},
		height: 32 + 20 + 4
	} );

} );

registerCategory( {
	name: 'Noise',
	nodes: noiseNodes.map( n => ( { name: n.name, type: n.type, color: '#10b981' } ) )
} );

// === TEXTURE NODES ===
registerNode( 'texture', {
	name: 'Texture',
	color: '#f783ac',
	inputs: [ { name: 'UV', type: 'vec2', label: 'UV' } ],
	outputs: [ { name: 'Color', type: 'vec4', label: '' } ],
	properties: { texture: null },
	height: 32 + 20 + 4
} );

registerNode( 'triplanarTexture', {
	name: 'Triplanar Texture',
	color: '#f783ac',
	inputs: [ { name: 'Position', type: 'vec3', label: 'Pos' } ],
	outputs: [ { name: 'Color', type: 'vec4', label: '' } ],
	properties: { texture: null },
	height: 32 + 20 + 4
} );

registerNode( 'backdrop', {
	name: 'Backdrop',
	color: '#f783ac',
	inputs: [],
	outputs: [ { name: 'Color', type: 'vec4', label: '' } ],
	properties: {},
	height: 32 + 20 + 4
} );

registerNode( 'viewportDepth', {
	name: 'Viewport Depth',
	color: '#f783ac',
	inputs: [],
	outputs: [ { name: 'Depth', type: 'float', label: '' } ],
	properties: {},
	height: 32 + 20 + 4
} );

registerCategory( {
	name: 'Texture',
	nodes: [
		{ name: 'Backdrop', type: 'backdrop', color: '#f783ac' },
		{ name: 'Texture', type: 'texture', color: '#f783ac' },
		{ name: 'Triplanar Texture', type: 'triplanarTexture', color: '#f783ac' },
		{ name: 'Viewport Depth', type: 'viewportDepth', color: '#f783ac' }
	]
} );

// === UTILS NODES ===
const utilNodes = [
	{ type: 'checker', name: 'Checker' },
	{ type: 'fresnel', name: 'Fresnel' },
	{ type: 'hue', name: 'Hue' },
	{ type: 'luminance', name: 'Luminance' },
	{ type: 'posterize', name: 'Posterize' },
	{ type: 'utilRemap', name: 'Remap' },
	{ type: 'utilRemapClamp', name: 'Remap Clamp' },
	{ type: 'rotation2D', name: 'Rotation 2D' },
	{ type: 'rotation3D', name: 'Rotation 3D' },
	{ type: 'saturation', name: 'Saturation' },
	{ type: 'transformDir', name: 'Transform Dir' },
	{ type: 'uvTransform', name: 'UV Transform' },
	{ type: 'vibrance', name: 'Vibrance' }
];

utilNodes.forEach( node => {

	registerNode( node.type, {
		name: node.name,
		color: '#a855f7',
		inputs: [ { name: 'Value', type: 'vec3', label: '' } ],
		outputs: [ { name: 'OUT', type: 'float', label: '' } ],
		properties: {},
		height: 32 + 20 + 4
	} );

} );

registerCategory( {
	name: 'Utils',
	nodes: utilNodes.map( n => ( { name: n.name, type: n.type, color: '#a855f7' } ) )
} );

// === MODEL NODES ===
const modelNodes = [
	{ type: 'modelDirection', name: 'Model Direction' },
	{ type: 'modelNormalMatrix', name: 'Model Normal Matrix' },
	{ type: 'modelPosition', name: 'Model Position' },
	{ type: 'modelScale', name: 'Model Scale' },
	{ type: 'modelViewMatrix', name: 'Model View Matrix' },
	{ type: 'modelViewPosition', name: 'Model View Position' },
	{ type: 'modelWorldMatrix', name: 'Model World Matrix' }
];

modelNodes.forEach( node => {

	registerNode( node.type, {
		name: node.name,
		color: '#06b6d4',
		inputs: [],
		outputs: [ { name: 'OUT', type: 'auto', label: '' } ],
		properties: {},
		height: 32 + 20 + 4
	} );

} );

registerCategory( {
	name: 'Model',
	nodes: modelNodes.map( n => ( { name: n.name, type: n.type, color: '#06b6d4' } ) )
} );

// === ADVANCED NODES ===
const advancedNodes = [
	{ type: 'frontFacing', name: 'Front Facing' },
	{ type: 'hashBlur', name: 'Hash Blur' },
	{ type: 'linearDepth', name: 'Linear Depth' },
	{ type: 'linearDepthFrom', name: 'Linear Depth (From)' },
	{ type: 'var', name: 'Var' },
	{ type: 'varying', name: 'Varying' },
	{ type: 'viewportLinearDepth', name: 'Viewport Linear Depth' }
];

advancedNodes.forEach( node => {

	registerNode( node.type, {
		name: node.name,
		color: '#8b5cf6',
		inputs: [],
		outputs: [ { name: 'OUT', type: 'auto', label: '' } ],
		properties: {},
		height: 32 + 20 + 4
	} );

} );

registerCategory( {
	name: 'Advanced',
	nodes: advancedNodes.map( n => ( { name: n.name, type: n.type, color: '#8b5cf6' } ) )
} );
