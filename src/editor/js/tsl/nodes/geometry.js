/**
 * Geometry Nodes
 */

import { registerNode, registerCategory } from '../NodeRegistry.js';

// Helper to create component outputs for vector types
function createVectorOutputs( type ) {

	if ( type === 'vec2' ) {

		return [
			{ name: 'X', type: 'float', label: 'X', component: 0 },
			{ name: 'Y', type: 'float', label: 'Y', component: 1 },
			{ name: 'XY', type: 'vec2', label: 'XY' }
		];

	} else if ( type === 'vec3' ) {

		return [
			{ name: 'X', type: 'float', label: 'X', component: 0 },
			{ name: 'Y', type: 'float', label: 'Y', component: 1 },
			{ name: 'Z', type: 'float', label: 'Z', component: 2 },
			{ name: 'XYZ', type: 'vec3', label: 'XYZ' }
		];

	} else if ( type === 'vec4' ) {

		return [
			{ name: 'X', type: 'float', label: 'X', component: 0 },
			{ name: 'Y', type: 'float', label: 'Y', component: 1 },
			{ name: 'Z', type: 'float', label: 'Z', component: 2 },
			{ name: 'W', type: 'float', label: 'W', component: 3 },
			{ name: 'XYZW', type: 'vec4', label: 'XYZW' }
		];

	} else {

		// For non-vector types (float, int, etc.), just use a single output
		return [ { name: 'OUT', type: type, label: '' } ];

	}

}

const geometryNodes = [
	{ type: 'uv', name: 'UV', outputType: 'vec2' },
	{ type: 'normalLocal', name: 'Normal Local', outputType: 'vec3' },
	{ type: 'normalView', name: 'Normal View', outputType: 'vec3' },
	{ type: 'normalWorld', name: 'Normal World', outputType: 'vec3' },
	{ type: 'positionLocal', name: 'Position Local', outputType: 'vec3' },
	{ type: 'positionView', name: 'Position View', outputType: 'vec3' },
	{ type: 'positionWorld', name: 'Position World', outputType: 'vec3' },
	{ type: 'positionViewDirection', name: 'Position View Direction', outputType: 'vec3' },
	{ type: 'tangentLocal', name: 'Tangent Local', outputType: 'vec3' },
	{ type: 'screenUV', name: 'Screen UV', outputType: 'vec2' },
	{ type: 'time', name: 'Time', outputType: 'float' },
	{ type: 'instanceCount', name: 'Instance Count', outputType: 'int' },
	{ type: 'instanceIndex', name: 'Instance Index', outputType: 'int' }
];

geometryNodes.forEach( node => {

	const outputs = createVectorOutputs( node.outputType );
	const socketCount = Math.max( outputs.length, 1 );

	registerNode( node.type, {
		name: node.name,
		color: '#ff8787',
		inputs: [],
		outputs: outputs,
		properties: {},
		height: 32 + socketCount * 20 + 4
	} );

} );

registerCategory( {
	name: 'Geometry',
	nodes: geometryNodes.map( n => ( { name: n.name, type: n.type, color: '#ff8787' } ) )
} );
