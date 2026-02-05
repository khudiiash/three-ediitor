/**
 * TSL Node Registry
 * Central registry for all node types and their configurations
 */

const nodeDefinitions = new Map();
const nodeCategories = [];

/**
 * Register a node definition
 * @param {string} type - Node type identifier
 * @param {Object} definition - Node definition
 */
function registerNode( type, definition ) {

	nodeDefinitions.set( type, definition );

}

/**
 * Get node definition by type
 * @param {string} type - Node type identifier
 * @returns {Object|null} Node definition
 */
function getNodeDefinition( type ) {

	return nodeDefinitions.get( type ) || null;

}

/**
 * Register a node category
 * @param {Object} category - Category definition
 */
function registerCategory( category ) {

	nodeCategories.push( category );

}

/**
 * Get all node categories
 * @returns {Array} Array of categories
 */
function getCategories() {

	return nodeCategories;

}

/**
 * Create node configuration from type
 * @param {string} type - Node type
 * @returns {Object} Node configuration (inputs, outputs, properties, height, width, color)
 */
// Universal layout: compact (second-screenshot style). One row per socket: label + value inline.
const HEADER_H = 22;
const SOCKET_SPACING = 14;
const BODY_PADDING = 0;
const MIN_NODE_WIDTH = 68;

function computeNodeWidth( definition, type ) {

	if ( definition.width != null ) return definition.width;
	const inputs = definition.inputs || [];
	const outputs = definition.outputs || [];
	const labels = [ ...inputs, ...outputs ].map( i => ( i.label || i.name || '' ).length );
	const maxLabelLen = Math.max( 0, ...labels );
	// Output-only nodes (e.g. MeshStandardMaterial): no right sockets, keep width tight
	const outputOnly = ! outputs || outputs.length === 0;
	const fromLabels = outputOnly
		? Math.max( MIN_NODE_WIDTH, 24 + maxLabelLen * 5 )
		: Math.min( 140, MIN_NODE_WIDTH + maxLabelLen * 4 );
	// Color node: swatch + hex need room so hex doesn't overlap R output label
	const fromContent = definition.hasInlineContent
		? ( type === 'color' ? 110 : type === 'vec3' || type === 'vec4' ? 76 : 72 )
		: MIN_NODE_WIDTH;
	return Math.max( fromLabels, fromContent, MIN_NODE_WIDTH );

}

function computeNodeHeight( definition ) {

	if ( definition.height != null ) return definition.height;
	const socketCount = Math.max( ( definition.inputs || [] ).length, ( definition.outputs || [] ).length, 1 );
	// Rows centered with 0.5 offset so first row clears header; height fits all rows
	return HEADER_H + socketCount * SOCKET_SPACING + BODY_PADDING;

}

function createNodeConfig( type ) {

	const definition = getNodeDefinition( type );
	
	if ( ! definition ) {

		console.warn( `[NodeRegistry] Unknown node type: ${type}` );
		return {
			inputs: [ { name: 'Input', type: 'float', label: '' } ],
			outputs: [ { name: 'OUT', type: 'float', label: '' } ],
			properties: {},
			height: HEADER_H + SOCKET_SPACING + BODY_PADDING,
			width: 120,
			color: '#4dabf7'
		};

	}

	const config = {
		inputs: definition.inputs ? [ ...definition.inputs ] : [],
		outputs: definition.outputs ? [ ...definition.outputs ] : [],
		properties: definition.properties ? { ...definition.properties } : {},
		height: computeNodeHeight( definition ),
		width: computeNodeWidth( definition, type ),
		color: definition.color || '#4dabf7'
	};

	return config;

}

export { registerNode, getNodeDefinition, registerCategory, getCategories, createNodeConfig, HEADER_H, SOCKET_SPACING, BODY_PADDING };
