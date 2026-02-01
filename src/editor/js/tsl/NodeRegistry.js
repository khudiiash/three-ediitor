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
function createNodeConfig( type ) {

	const definition = getNodeDefinition( type );
	
	if ( ! definition ) {

		console.warn( `[NodeRegistry] Unknown node type: ${type}` );
		return {
			inputs: [ { name: 'Input', type: 'float', label: '' } ],
			outputs: [ { name: 'OUT', type: 'float', label: '' } ],
			properties: {},
			height: 56,
			width: 120,
			color: '#4dabf7'
		};

	}

	const config = {
		inputs: definition.inputs ? [ ...definition.inputs ] : [],
		outputs: definition.outputs ? [ ...definition.outputs ] : [],
		properties: definition.properties ? { ...definition.properties } : {},
		height: definition.height || 56,
		width: definition.width || 120,
		color: definition.color || '#4dabf7'
	};

	// Calculate height if not specified
	if ( ! definition.height ) {

		const socketCount = Math.max( config.inputs.length, config.outputs.length, 1 );
		config.height = 36 + socketCount * 20 + 4; // 32px header + sockets * 20px + 4px padding
		
		// Add extra space for inline content
		if ( definition.hasInlineContent ) {

			config.height += 8; // Extra space for inline displays

		}

	}

	return config;

}

export { registerNode, getNodeDefinition, registerCategory, getCategories, createNodeConfig };
