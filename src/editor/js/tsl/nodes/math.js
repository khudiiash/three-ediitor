/**
 * Math Nodes
 */

import { registerNode, registerCategory } from '../NodeRegistry.js';

// Binary operations (2 inputs, 1 output)
const binaryMathNodes = [
	'add', 'subtract', 'multiply', 'divide', 'power', 'mod', 'min', 'max',
	'dot', 'cross', 'distance', 'step', 'atan', 'pow2', 'pow3', 'pow4'
];

binaryMathNodes.forEach( type => {

	const name = type.charAt( 0 ).toUpperCase() + type.slice( 1 );
	registerNode( type, {
		name: name,
		color: '#4dabf7',
		inputs: [
			{ name: 'A', type: 'float', label: 'A' },
			{ name: 'B', type: 'float', label: 'B' }
		],
		outputs: [ { name: 'OUT', type: 'float', label: '' } ],
		properties: {},
		height: 28 + 2 * 16 + 4 // Compact
	} );

} );

// Unary operations (1 input, 1 output)
const unaryMathNodes = [
	'abs', 'acos', 'asin', 'ceil', 'cos', 'degrees', 'exp', 'exp2',
	'floor', 'fract', 'inverseSqrt', 'length', 'log', 'log2', 'negate',
	'normalize', 'radians', 'round', 'saturate', 'sign', 'sin', 'sqrt',
	'tan', 'trunc', 'oneMinusX', 'oneDivX', 'cbrt', 'dFdx', 'dFdy', 'fwidth'
];

unaryMathNodes.forEach( type => {

	let name = type.charAt( 0 ).toUpperCase() + type.slice( 1 );
	if ( type === 'oneMinusX' ) name = '1 - X';
	if ( type === 'oneDivX' ) name = '1 / X';
	if ( type === 'dFdx' ) name = 'dFdx';
	if ( type === 'dFdy' ) name = 'dFdy';
	if ( type === 'fwidth' ) name = 'fwidth';
	
	registerNode( type, {
		name: name,
		color: '#4dabf7',
		inputs: [ { name: 'Value', type: 'float', label: '' } ],
		outputs: [ { name: 'OUT', type: 'float', label: '' } ],
		properties: {},
		height: 28 + 16 + 4 // Compact single output
	} );

} );

// Ternary operations (3 inputs, 1 output)
registerNode( 'mix', {
	name: 'Mix',
	color: '#7950f2',
	inputs: [
		{ name: 'A', type: 'vec3', label: 'A' },
		{ name: 'B', type: 'vec3', label: 'B' },
		{ name: 'Factor', type: 'float', label: 'Fac' }
	],
	outputs: [ { name: 'OUT', type: 'vec3', label: '' } ],
	properties: {},
	height: 28 + 3 * 16 + 4 // Compact
} );

registerNode( 'clamp', {
	name: 'Clamp',
	color: '#4dabf7',
	inputs: [
		{ name: 'Value', type: 'float', label: 'Val' },
		{ name: 'Min', type: 'float', label: 'Min' },
		{ name: 'Max', type: 'float', label: 'Max' }
	],
	outputs: [ { name: 'OUT', type: 'float', label: '' } ],
	properties: {},
	height: 32 + 3 * 20 + 4
} );

registerNode( 'smoothstep', {
	name: 'Smoothstep',
	color: '#4dabf7',
	inputs: [
		{ name: 'Edge0', type: 'float', label: 'Edge0' },
		{ name: 'Edge1', type: 'float', label: 'Edge1' },
		{ name: 'Value', type: 'float', label: 'Val' }
	],
	outputs: [ { name: 'OUT', type: 'float', label: '' } ],
	properties: {},
	height: 32 + 3 * 20 + 4
} );

// Constants
registerNode( 'pi', {
	name: 'PI',
	color: '#4dabf7',
	inputs: [],
	outputs: [ { name: 'Value', type: 'float', label: '' } ],
	properties: {},
	height: 32 + 20 + 4
} );

registerNode( 'halfPI', {
	name: 'Half PI',
	color: '#4dabf7',
	inputs: [],
	outputs: [ { name: 'Value', type: 'float', label: '' } ],
	properties: {},
	height: 32 + 20 + 4
} );

registerNode( 'twoPI', {
	name: 'Two PI',
	color: '#4dabf7',
	inputs: [],
	outputs: [ { name: 'Value', type: 'float', label: '' } ],
	properties: {},
	height: 32 + 20 + 4
} );

registerNode( 'epsilon', {
	name: 'Epsilon',
	color: '#4dabf7',
	inputs: [],
	outputs: [ { name: 'Value', type: 'float', label: '' } ],
	properties: {},
	height: 32 + 20 + 4
} );

registerNode( 'infinity', {
	name: 'Infinity',
	color: '#4dabf7',
	inputs: [],
	outputs: [ { name: 'Value', type: 'float', label: '' } ],
	properties: {},
	height: 32 + 20 + 4
} );

// Special math nodes
const specialNodes = [
	{ type: 'reflect', name: 'Reflect' },
	{ type: 'refract', name: 'Refract' },
	{ type: 'faceForward', name: 'Face Forward' },
	{ type: 'split', name: 'Split' },
	{ type: 'range', name: 'Range' },
	{ type: 'remap', name: 'Remap' },
	{ type: 'remapClamp', name: 'Remap Clamp' },
	{ type: 'difference', name: 'Difference' },
	{ type: 'all', name: 'All' },
	{ type: 'any', name: 'Any' },
	{ type: 'equals', name: 'Equals' }
];

specialNodes.forEach( node => {

	registerNode( node.type, {
		name: node.name,
		color: '#4dabf7',
		inputs: [
			{ name: 'A', type: 'float', label: 'A' },
			{ name: 'B', type: 'float', label: 'B' }
		],
		outputs: [ { name: 'OUT', type: 'float', label: '' } ],
		properties: {},
		height: 28 + 2 * 16 + 4 // Compact
	} );

} );

// Build category
const categoryNodes = [
	{ name: '1 - X', type: 'oneMinusX', color: '#4dabf7' },
	{ name: '1 / X', type: 'oneDivX', color: '#4dabf7' },
	{ name: 'Abs', type: 'abs', color: '#4dabf7' },
	{ name: 'ACos', type: 'acos', color: '#4dabf7' },
	{ name: 'Add', type: 'add', color: '#4dabf7' },
	{ name: 'All', type: 'all', color: '#4dabf7' },
	{ name: 'Any', type: 'any', color: '#4dabf7' },
	{ name: 'ASin', type: 'asin', color: '#4dabf7' },
	{ name: 'ATan', type: 'atan', color: '#4dabf7' },
	{ name: 'Cbrt', type: 'cbrt', color: '#4dabf7' },
	{ name: 'Ceil', type: 'ceil', color: '#4dabf7' },
	{ name: 'Clamp', type: 'clamp', color: '#4dabf7' },
	{ name: 'Cos', type: 'cos', color: '#4dabf7' },
	{ name: 'Cross', type: 'cross', color: '#4dabf7' },
	{ name: 'Degrees', type: 'degrees', color: '#4dabf7' },
	{ name: 'dFdx', type: 'dFdx', color: '#4dabf7' },
	{ name: 'dFdy', type: 'dFdy', color: '#4dabf7' },
	{ name: 'Difference', type: 'difference', color: '#4dabf7' },
	{ name: 'Distance', type: 'distance', color: '#4dabf7' },
	{ name: 'Divide', type: 'divide', color: '#4dabf7' },
	{ name: 'Dot', type: 'dot', color: '#4dabf7' },
	{ name: 'Epsilon', type: 'epsilon', color: '#4dabf7' },
	{ name: 'Equals', type: 'equals', color: '#4dabf7' },
	{ name: 'Exp', type: 'exp', color: '#4dabf7' },
	{ name: 'Exp2', type: 'exp2', color: '#4dabf7' },
	{ name: 'Face Forward', type: 'faceForward', color: '#4dabf7' },
	{ name: 'Floor', type: 'floor', color: '#4dabf7' },
	{ name: 'Fract', type: 'fract', color: '#4dabf7' },
	{ name: 'fwidth', type: 'fwidth', color: '#4dabf7' },
	{ name: 'Half PI', type: 'halfPI', color: '#4dabf7' },
	{ name: 'Infinity', type: 'infinity', color: '#4dabf7' },
	{ name: 'Inverse Sqrt', type: 'inverseSqrt', color: '#4dabf7' },
	{ name: 'Length', type: 'length', color: '#4dabf7' },
	{ name: 'Log', type: 'log', color: '#4dabf7' },
	{ name: 'Log2', type: 'log2', color: '#4dabf7' },
	{ name: 'Max', type: 'max', color: '#4dabf7' },
	{ name: 'Min', type: 'min', color: '#4dabf7' },
	{ name: 'Mix', type: 'mix', color: '#7950f2' },
	{ name: 'Mod', type: 'mod', color: '#4dabf7' },
	{ name: 'Multiply', type: 'multiply', color: '#4dabf7' },
	{ name: 'Negate', type: 'negate', color: '#4dabf7' },
	{ name: 'Normalize', type: 'normalize', color: '#4dabf7' },
	{ name: 'PI', type: 'pi', color: '#4dabf7' },
	{ name: 'Pow2', type: 'pow2', color: '#4dabf7' },
	{ name: 'Pow3', type: 'pow3', color: '#4dabf7' },
	{ name: 'Pow4', type: 'pow4', color: '#4dabf7' },
	{ name: 'Power', type: 'power', color: '#4dabf7' },
	{ name: 'Radians', type: 'radians', color: '#4dabf7' },
	{ name: 'Range', type: 'range', color: '#4dabf7' },
	{ name: 'Reflect', type: 'reflect', color: '#4dabf7' },
	{ name: 'Refract', type: 'refract', color: '#4dabf7' },
	{ name: 'Remap', type: 'remap', color: '#4dabf7' },
	{ name: 'Remap Clamp', type: 'remapClamp', color: '#4dabf7' },
	{ name: 'Round', type: 'round', color: '#4dabf7' },
	{ name: 'Saturate', type: 'saturate', color: '#4dabf7' },
	{ name: 'Sign', type: 'sign', color: '#4dabf7' },
	{ name: 'Sin', type: 'sin', color: '#4dabf7' },
	{ name: 'Smoothstep', type: 'smoothstep', color: '#4dabf7' },
	{ name: 'Split', type: 'split', color: '#4dabf7' },
	{ name: 'Sqrt', type: 'sqrt', color: '#4dabf7' },
	{ name: 'Step', type: 'step', color: '#4dabf7' },
	{ name: 'Subtract', type: 'subtract', color: '#4dabf7' },
	{ name: 'Tan', type: 'tan', color: '#4dabf7' },
	{ name: 'Trunc', type: 'trunc', color: '#4dabf7' },
	{ name: 'Two PI', type: 'twoPI', color: '#4dabf7' }
];

registerCategory( {
	name: 'Math',
	nodes: categoryNodes
} );
