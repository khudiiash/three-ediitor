/**
 * Logic Nodes
 */

import { registerNode, registerCategory } from '../NodeRegistry.js';

const binaryLogicNodes = [
	{ type: 'and', name: 'And' },
	{ type: 'or', name: 'Or' },
	{ type: 'xor', name: 'Xor' },
	{ type: 'greaterThan', name: 'Greater Than' },
	{ type: 'greaterEqual', name: 'Greater Equal' },
	{ type: 'lessThan', name: 'Less Than' },
	{ type: 'lessEqual', name: 'Less Equal' }
];

binaryLogicNodes.forEach( node => {

	registerNode( node.type, {
		name: node.name,
		color: '#f59e0b',
		inputs: [
			{ name: 'A', type: 'float', label: 'A' },
			{ name: 'B', type: 'float', label: 'B' }
		],
		outputs: [ { name: 'OUT', type: 'bool', label: '' } ],
		properties: {},
		height: 32 + 2 * 20 + 4
	} );

} );

registerNode( 'not', {
	name: 'Not',
	color: '#f59e0b',
	inputs: [ { name: 'Value', type: 'bool', label: '' } ],
	outputs: [ { name: 'OUT', type: 'bool', label: '' } ],
	properties: {},
	height: 32 + 20 + 4
} );

registerNode( 'select', {
	name: 'Select',
	color: '#f59e0b',
	inputs: [
		{ name: 'Condition', type: 'bool', label: 'Cond' },
		{ name: 'True', type: 'float', label: 'True' },
		{ name: 'False', type: 'float', label: 'False' }
	],
	outputs: [ { name: 'OUT', type: 'float', label: '' } ],
	properties: {},
	height: 32 + 3 * 20 + 4
} );

registerNode( 'discard', {
	name: 'Discard',
	color: '#f59e0b',
	inputs: [ { name: 'Condition', type: 'bool', label: '' } ],
	outputs: [],
	properties: {},
	height: 32 + 20 + 4
} );

registerCategory( {
	name: 'Logic',
	nodes: [
		{ name: 'And', type: 'and', color: '#f59e0b' },
		{ name: 'Discard', type: 'discard', color: '#f59e0b' },
		{ name: 'Greater Equal', type: 'greaterEqual', color: '#f59e0b' },
		{ name: 'Greater Than', type: 'greaterThan', color: '#f59e0b' },
		{ name: 'Less Equal', type: 'lessEqual', color: '#f59e0b' },
		{ name: 'Less Than', type: 'lessThan', color: '#f59e0b' },
		{ name: 'Not', type: 'not', color: '#f59e0b' },
		{ name: 'Or', type: 'or', color: '#f59e0b' },
		{ name: 'Select', type: 'select', color: '#f59e0b' },
		{ name: 'Xor', type: 'xor', color: '#f59e0b' }
	]
} );
