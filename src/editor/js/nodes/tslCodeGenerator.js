/**
 * Node graph → TSL code → run → material.
 * Single pipeline for the node editor: generateTSLCode(nodes, edges) produces runnable JS/TSL;
 * runGeneratedTSLCode(code, tslModule) executes it and returns the THREE.Material.
 */

// Geometry/node type → TSL symbol in three/tsl (resolution → screenSize in Three.js)
const GEOMETRY_TSL_NAMES = {
  instanceCount: 'instanceCount',
  instanceIndex: 'instanceIndex',
  normalLocal: 'normalLocal',
  normalView: 'normalView',
  normalWorld: 'normalWorld',
  positionLocal: 'positionLocal',
  positionView: 'positionView',
  positionViewDirection: 'positionViewDirection',
  positionWorld: 'positionWorld',
  resolution: 'screenSize',
  screenUV: 'screenUV',
  tangentLocal: 'tangentLocal',
  time: 'time',
  uv: 'uv',
  // Model (zero-input nodes)
  modelPosition: 'modelPosition',
  modelViewPosition: 'modelViewPosition',
  modelNormalMatrix: 'modelNormalMatrix',
  modelViewMatrix: 'modelViewMatrix',
  modelWorldMatrix: 'modelWorldMatrix',
  modelScale: 'modelScale',
  modelDirection: 'modelDirection',
};

// All TSL symbols that may appear inside custom Fn code — scan code and add any match to imports
const TSL_SYMBOLS_IN_FN = new Set( [
  'vec2', 'vec3', 'vec4', 'color', 'float', 'int', 'bool', 'time', 'Fn',
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2', 'radians', 'degrees',
  'add', 'sub', 'mul', 'div', 'min', 'max', 'mod', 'pow', 'sqrt', 'exp', 'log', 'exp2', 'log2',
  'abs', 'sign', 'floor', 'ceil', 'round', 'fract', 'trunc', 'saturate', 'negate',
  'clamp', 'mix', 'step', 'smoothstep',
  'dot', 'length', 'normalize', 'distance', 'cross',
  'If', 'Loop', 'Break', 'Continue', 'Discard',
  'positionWorld', 'positionLocal', 'positionView', 'normalWorld', 'normalView', 'uv', 'screenUV',
  'uniform', 'varying', 'attribute', 'texture', 'hash', 'rand',
  'pow2', 'pow3', 'pow4', 'inverseSqrt', 'triNoise3D', 'interleavedGradientNoise',
  'oneMinusX', 'oneDivX', 'cbrt', 'equals', 'all', 'any',
] );

// MeshStandardMaterial handle id -> material property name
const MATERIAL_PROP_MAP = {
  color: 'colorNode',
  normal: 'normalNode',
  roughness: 'roughnessNode',
  metalness: 'metalnessNode',
  emissive: 'emissiveNode',
  ao: 'aoNode',
  opacity: 'opacityNode',
  position: 'positionNode',
  output: null,
  backdrop: 'backdropNode',
  backdropAlpha: 'backdropAlphaNode',
};

/**
 * Topological sort: return node ids so that for every edge (source -> target), source comes before target.
 */
function topologicalSort( nodes, edges ) {
  const idToIndex = new Map( nodes.map( ( n, i ) => [ n.id, i ] ) );
  const inDegree = nodes.map( () => 0 );
  const outEdges = nodes.map( () => [] );
  for ( const e of edges ) {
    const si = idToIndex.get( e.source );
    const ti = idToIndex.get( e.target );
    if ( si == null || ti == null ) continue;
    outEdges[ si ].push( ti );
    inDegree[ ti ] += 1;
  }
  const queue = [];
  inDegree.forEach( ( d, i ) => { if ( d === 0 ) queue.push( i ); } );
  const order = [];
  while ( queue.length ) {
    const i = queue.shift();
    order.push( nodes[ i ].id );
    for ( const j of outEdges[ i ] ) {
      inDegree[ j ] -= 1;
      if ( inDegree[ j ] === 0 ) queue.push( j );
    }
  }
  // If there are cycles or disconnected nodes, append the rest
  nodes.forEach( ( n, i ) => {
    if ( !order.includes( n.id ) ) order.push( n.id );
  } );
  return order;
}

/** Get the TSL variable (or default) for a single input handle. */
function getInputVar( nodeId, handleId, nodeVarMap, edgesByTarget, defaultVal ) {
  const edge = ( edgesByTarget[ nodeId ] || [] ).find(
    ( e ) => e.targetHandle === handleId || e.targetHandle === handleId?.toUpperCase?.()
  );
  return edge ? ( nodeVarMap.get( edge.source ) || defaultVal ) : defaultVal;
}

/**
 * Get the TSL expression for a single node (RHS only). Optional: incoming edges to use connected values.
 */
function nodeToTSLExpression( node, nodeVarMap, edgesByTarget ) {
  const type = node.type;
  const nodeId = node.id;

  if ( type === 'meshStandardMaterial' ) {
    return null;
  }

  if ( GEOMETRY_TSL_NAMES[ type ] != null ) {
    const tslName = GEOMETRY_TSL_NAMES[ type ];
    if ( type === 'uv' ) {
      const inputEdge = ( edgesByTarget[ nodeId ] || [] ).find( ( e ) => e.targetHandle === 'index' );
      const indexExpr = inputEdge ? nodeVarMap.get( inputEdge.source ) : '0';
      return `uv( ${indexExpr} )`;
    }
    return tslName;
  }

  switch ( type ) {
    case 'color': {
      const hex = ( node.data && node.data.colorHex ) ? node.data.colorHex : '#ffffff';
      return `color( "${hex}" )`;
    }
    case 'float': {
      const inputEdge = ( edgesByTarget[ nodeId ] || [] ).find( ( e ) => e.targetHandle === 'value' );
      const val = inputEdge ? nodeVarMap.get( inputEdge.source ) : ( typeof node.data?.value === 'number' ? node.data.value : 0 );
      return `float( ${val} )`;
    }
    case 'int': {
      const inputEdge = ( edgesByTarget[ nodeId ] || [] ).find( ( e ) => e.targetHandle === 'value' );
      const val = inputEdge ? nodeVarMap.get( inputEdge.source ) : ( typeof node.data?.value === 'number' ? node.data.value : 0 );
      return `int( ${val} )`;
    }
    case 'vec2': {
      const xE = ( edgesByTarget[ nodeId ] || [] ).find( ( e ) => e.targetHandle === 'x' );
      const yE = ( edgesByTarget[ nodeId ] || [] ).find( ( e ) => e.targetHandle === 'y' );
      const x = xE ? nodeVarMap.get( xE.source ) : '0';
      const y = yE ? nodeVarMap.get( yE.source ) : '0';
      return `vec2( ${x}, ${y} )`;
    }
    case 'vec3': {
      const xE = ( edgesByTarget[ nodeId ] || [] ).find( ( e ) => e.targetHandle === 'x' );
      const yE = ( edgesByTarget[ nodeId ] || [] ).find( ( e ) => e.targetHandle === 'y' );
      const zE = ( edgesByTarget[ nodeId ] || [] ).find( ( e ) => e.targetHandle === 'z' );
      const x = xE ? nodeVarMap.get( xE.source ) : '0';
      const y = yE ? nodeVarMap.get( yE.source ) : '0';
      const z = zE ? nodeVarMap.get( zE.source ) : '0';
      return `vec3( ${x}, ${y}, ${z} )`;
    }
    case 'vec4': {
      const xE = ( edgesByTarget[ nodeId ] || [] ).find( ( e ) => e.targetHandle === 'x' );
      const yE = ( edgesByTarget[ nodeId ] || [] ).find( ( e ) => e.targetHandle === 'y' );
      const zE = ( edgesByTarget[ nodeId ] || [] ).find( ( e ) => e.targetHandle === 'z' );
      const wE = ( edgesByTarget[ nodeId ] || [] ).find( ( e ) => e.targetHandle === 'w' );
      const x = xE ? nodeVarMap.get( xE.source ) : '0';
      const y = yE ? nodeVarMap.get( yE.source ) : '0';
      const z = zE ? nodeVarMap.get( zE.source ) : '0';
      const w = wE ? nodeVarMap.get( wE.source ) : '0';
      return `vec4( ${x}, ${y}, ${z}, ${w} )`;
    }
    case 'sin': {
      const a = getInputVar( nodeId, 'a', nodeVarMap, edgesByTarget, 'float(0)' );
      return `sin( ${a} )`;
    }
    case 'add': {
      const a = getInputVar( nodeId, 'a', nodeVarMap, edgesByTarget, 'float(0)' );
      const b = getInputVar( nodeId, 'b', nodeVarMap, edgesByTarget, 'float(0)' );
      return `add( ${a}, ${b} )`;
    }
    case 'subtract': {
      const a = getInputVar( nodeId, 'a', nodeVarMap, edgesByTarget, 'float(0)' );
      const b = getInputVar( nodeId, 'b', nodeVarMap, edgesByTarget, 'float(0)' );
      return `sub( ${a}, ${b} )`;
    }
    case 'mul':
    case 'multiply': {
      const a = getInputVar( nodeId, 'a', nodeVarMap, edgesByTarget, 'float(1)' );
      const b = getInputVar( nodeId, 'b', nodeVarMap, edgesByTarget, 'float(1)' );
      return `mul( ${a}, ${b} )`;
    }
    case 'divide': {
      const a = getInputVar( nodeId, 'a', nodeVarMap, edgesByTarget, 'float(1)' );
      const b = getInputVar( nodeId, 'b', nodeVarMap, edgesByTarget, 'float(1)' );
      return `div( ${a}, ${b} )`;
    }
    case 'mix': {
      const a = getInputVar( nodeId, 'a', nodeVarMap, edgesByTarget, 'float(0)' );
      const b = getInputVar( nodeId, 'b', nodeVarMap, edgesByTarget, 'float(1)' );
      const t = getInputVar( nodeId, 'c', nodeVarMap, edgesByTarget, 'float(0.5)' ) || getInputVar( nodeId, 't', nodeVarMap, edgesByTarget, 'float(0.5)' );
      return `mix( ${a}, ${b}, ${t} )`;
    }
    case 'cos': {
      const a = getInputVar( nodeId, 'a', nodeVarMap, edgesByTarget, 'float(0)' );
      return `cos( ${a} )`;
    }
    case 'tan': {
      const a = getInputVar( nodeId, 'a', nodeVarMap, edgesByTarget, 'float(0)' );
      return `tan( ${a} )`;
    }
    case 'abs':
    case 'floor':
    case 'ceil':
    case 'round':
    case 'sqrt':
    case 'fract':
    case 'saturate':
    case 'negate': {
      const a = getInputVar( nodeId, 'a', nodeVarMap, edgesByTarget, 'float(0)' ) || getInputVar( nodeId, 'in', nodeVarMap, edgesByTarget, 'float(0)' );
      return `${type}( ${a} )`;
    }
    case 'min':
    case 'max': {
      const a = getInputVar( nodeId, 'a', nodeVarMap, edgesByTarget, 'float(0)' );
      const b = getInputVar( nodeId, 'b', nodeVarMap, edgesByTarget, 'float(0)' );
      return `${type}( ${a}, ${b} )`;
    }
    case 'clamp': {
      const a = getInputVar( nodeId, 'a', nodeVarMap, edgesByTarget, 'float(0)' );
      const b = getInputVar( nodeId, 'b', nodeVarMap, edgesByTarget, 'float(0)' );
      const c = getInputVar( nodeId, 'c', nodeVarMap, edgesByTarget, 'float(1)' );
      return `clamp( ${a}, ${b}, ${c} )`;
    }
    case 'power': {
      const a = getInputVar( nodeId, 'a', nodeVarMap, edgesByTarget, 'float(1)' );
      const b = getInputVar( nodeId, 'b', nodeVarMap, edgesByTarget, 'float(1)' );
      return `pow( ${a}, ${b} )`;
    }
    case 'step': {
      const a = getInputVar( nodeId, 'a', nodeVarMap, edgesByTarget, 'float(0)' );
      const b = getInputVar( nodeId, 'b', nodeVarMap, edgesByTarget, 'float(0)' );
      return `step( ${a}, ${b} )`;
    }
    case 'smoothstep': {
      const a = getInputVar( nodeId, 'a', nodeVarMap, edgesByTarget, 'float(0)' );
      const b = getInputVar( nodeId, 'b', nodeVarMap, edgesByTarget, 'float(0.5)' );
      const c = getInputVar( nodeId, 'c', nodeVarMap, edgesByTarget, 'float(1)' );
      return `smoothstep( ${a}, ${b}, ${c} )`;
    }
    case 'mod': {
      const a = getInputVar( nodeId, 'a', nodeVarMap, edgesByTarget, 'float(0)' );
      const b = getInputVar( nodeId, 'b', nodeVarMap, edgesByTarget, 'float(1)' );
      return `mod( ${a}, ${b} )`;
    }
    // Logic
    case 'equals': {
      const a = getInputVar( nodeId, 'a', nodeVarMap, edgesByTarget, 'float(0)' );
      const b = getInputVar( nodeId, 'b', nodeVarMap, edgesByTarget, 'float(0)' );
      return `equals( ${a}, ${b} )`;
    }
    case 'all': {
      const a = getInputVar( nodeId, 'a', nodeVarMap, edgesByTarget, 'float(0)' );
      return `all( ${a} )`;
    }
    case 'any': {
      const a = getInputVar( nodeId, 'a', nodeVarMap, edgesByTarget, 'float(0)' );
      return `any( ${a} )`;
    }
    // Noise
    case 'trinoise3d':
    case 'triNoise3d': {
      const pos = getInputVar( nodeId, 'position', nodeVarMap, edgesByTarget, getInputVar( nodeId, 'a', nodeVarMap, edgesByTarget, 'positionWorld' ) );
      const speed = getInputVar( nodeId, 'speed', nodeVarMap, edgesByTarget, getInputVar( nodeId, 'b', nodeVarMap, edgesByTarget, 'float(1)' ) );
      const timeVal = getInputVar( nodeId, 'time', nodeVarMap, edgesByTarget, getInputVar( nodeId, 'c', nodeVarMap, edgesByTarget, 'time' ) );
      return `triNoise3D( ${pos}, ${speed}, ${timeVal} )`;
    }
    case 'interleavedgradientnoise':
    case 'interleavedGradientNoise': {
      const pos = getInputVar( nodeId, 'position', nodeVarMap, edgesByTarget, getInputVar( nodeId, 'a', nodeVarMap, edgesByTarget, 'uv( 0 )' ) );
      return `interleavedGradientNoise( ${pos} )`;
    }
    // Unary math (one input)
    case 'oneMinusX':
    case 'oneMinus': {
      const a = getInputVar( nodeId, 'a', nodeVarMap, edgesByTarget, getInputVar( nodeId, 'in', nodeVarMap, edgesByTarget, 'float(0)' ) );
      return `sub( float(1), ${a} )`;
    }
    case 'oneDivX': {
      const a = getInputVar( nodeId, 'a', nodeVarMap, edgesByTarget, getInputVar( nodeId, 'in', nodeVarMap, edgesByTarget, 'float(1)' ) );
      return `div( float(1), ${a} )`;
    }
    case 'acos': {
      const a = getInputVar( nodeId, 'a', nodeVarMap, edgesByTarget, getInputVar( nodeId, 'in', nodeVarMap, edgesByTarget, 'float(0)' ) );
      return `acos( ${a} )`;
    }
    case 'asin': {
      const a = getInputVar( nodeId, 'a', nodeVarMap, edgesByTarget, getInputVar( nodeId, 'in', nodeVarMap, edgesByTarget, 'float(0)' ) );
      return `asin( ${a} )`;
    }
    case 'atan': {
      const a = getInputVar( nodeId, 'a', nodeVarMap, edgesByTarget, getInputVar( nodeId, 'in', nodeVarMap, edgesByTarget, 'float(0)' ) );
      return `atan( ${a} )`;
    }
    case 'exp': {
      const a = getInputVar( nodeId, 'a', nodeVarMap, edgesByTarget, getInputVar( nodeId, 'in', nodeVarMap, edgesByTarget, 'float(0)' ) );
      return `exp( ${a} )`;
    }
    case 'exp2': {
      const a = getInputVar( nodeId, 'a', nodeVarMap, edgesByTarget, getInputVar( nodeId, 'in', nodeVarMap, edgesByTarget, 'float(0)' ) );
      return `exp2( ${a} )`;
    }
    case 'log': {
      const a = getInputVar( nodeId, 'a', nodeVarMap, edgesByTarget, getInputVar( nodeId, 'in', nodeVarMap, edgesByTarget, 'float(1)' ) );
      return `log( ${a} )`;
    }
    case 'log2': {
      const a = getInputVar( nodeId, 'a', nodeVarMap, edgesByTarget, getInputVar( nodeId, 'in', nodeVarMap, edgesByTarget, 'float(1)' ) );
      return `log2( ${a} )`;
    }
    case 'sign': {
      const a = getInputVar( nodeId, 'a', nodeVarMap, edgesByTarget, getInputVar( nodeId, 'in', nodeVarMap, edgesByTarget, 'float(0)' ) );
      return `sign( ${a} )`;
    }
    case 'cbrt': {
      const a = getInputVar( nodeId, 'a', nodeVarMap, edgesByTarget, getInputVar( nodeId, 'in', nodeVarMap, edgesByTarget, 'float(0)' ) );
      return `cbrt( ${a} )`;
    }
    case 'degrees': {
      const a = getInputVar( nodeId, 'a', nodeVarMap, edgesByTarget, getInputVar( nodeId, 'in', nodeVarMap, edgesByTarget, 'float(0)' ) );
      return `degrees( ${a} )`;
    }
    case 'radians': {
      const a = getInputVar( nodeId, 'a', nodeVarMap, edgesByTarget, getInputVar( nodeId, 'in', nodeVarMap, edgesByTarget, 'float(0)' ) );
      return `radians( ${a} )`;
    }
    case 'pow2': {
      const a = getInputVar( nodeId, 'a', nodeVarMap, edgesByTarget, getInputVar( nodeId, 'in', nodeVarMap, edgesByTarget, 'float(0)' ) );
      return `pow2( ${a} )`;
    }
    case 'pow3': {
      const a = getInputVar( nodeId, 'a', nodeVarMap, edgesByTarget, getInputVar( nodeId, 'in', nodeVarMap, edgesByTarget, 'float(0)' ) );
      return `pow3( ${a} )`;
    }
    case 'pow4': {
      const a = getInputVar( nodeId, 'a', nodeVarMap, edgesByTarget, getInputVar( nodeId, 'in', nodeVarMap, edgesByTarget, 'float(0)' ) );
      return `pow4( ${a} )`;
    }
    case 'trunc': {
      const a = getInputVar( nodeId, 'a', nodeVarMap, edgesByTarget, getInputVar( nodeId, 'in', nodeVarMap, edgesByTarget, 'float(0)' ) );
      return `trunc( ${a} )`;
    }
    case 'inversesqrt': {
      const a = getInputVar( nodeId, 'a', nodeVarMap, edgesByTarget, getInputVar( nodeId, 'in', nodeVarMap, edgesByTarget, 'float(1)' ) );
      return `inverseSqrt( ${a} )`;
    }
    // Vector utils (two inputs: a, b or similar)
    case 'dot': {
      const a = getInputVar( nodeId, 'a', nodeVarMap, edgesByTarget, 'float(0)' );
      const b = getInputVar( nodeId, 'b', nodeVarMap, edgesByTarget, 'float(0)' );
      return `dot( ${a}, ${b} )`;
    }
    case 'length': {
      const a = getInputVar( nodeId, 'a', nodeVarMap, edgesByTarget, getInputVar( nodeId, 'in', nodeVarMap, edgesByTarget, 'float(0)' ) );
      return `length( ${a} )`;
    }
    case 'distance': {
      const a = getInputVar( nodeId, 'a', nodeVarMap, edgesByTarget, 'float(0)' );
      const b = getInputVar( nodeId, 'b', nodeVarMap, edgesByTarget, 'float(0)' );
      return `distance( ${a}, ${b} )`;
    }
    case 'cross': {
      const a = getInputVar( nodeId, 'a', nodeVarMap, edgesByTarget, 'float(0)' );
      const b = getInputVar( nodeId, 'b', nodeVarMap, edgesByTarget, 'float(0)' );
      return `cross( ${a}, ${b} )`;
    }
    case 'difference': {
      const a = getInputVar( nodeId, 'a', nodeVarMap, edgesByTarget, 'float(0)' );
      const b = getInputVar( nodeId, 'b', nodeVarMap, edgesByTarget, 'float(0)' );
      return `abs( sub( ${a}, ${b} ) )`;
    }
    // Constants (no inputs)
    case 'epsilon': return 'float( 1e-6 )';
    case 'halfpi':
    case 'halfPi': return 'float( ' + ( Math.PI / 2 ) + ' )';
    case 'pi':
    case 'Pi': return 'float( ' + Math.PI + ' )';
    case 'twopi':
    case 'twoPi': return 'float( ' + ( 2 * Math.PI ) + ' )';
    case 'infinity': return 'float( 1e30 )';
    default:
      return null;
  }
}

/**
 * Resolve which variable to use for an edge into a material input.
 * The edge has source + sourceHandle; we need the variable name of the source node.
 * For geometry/constant nodes with multiple outputs we'd need sourceHandle to pick the right output;
 * in TSL the node is usually one expression (e.g. positionLocal), so we use the node var.
 */
function getSourceNodeVar( edge, nodeVarMap ) {
  return nodeVarMap.get( edge.source ) || '_nodeUnknown';
}

/**
 * Generate full TSL code from the graph.
 * @param {Array} nodes - React Flow nodes
 * @param {Array} edges - React Flow edges
 * @returns {string} JavaScript/TSL code
 */
export function generateTSLCode( nodes, edges ) {
  if ( !nodes.length ) return '// Empty graph';

  const edgesByTarget = {};
  edges.forEach( ( e ) => {
    if ( !edgesByTarget[ e.target ] ) edgesByTarget[ e.target ] = [];
    edgesByTarget[ e.target ].push( e );
  } );

  const order = topologicalSort( nodes, edges );
  const nodeVarMap = new Map();
  const imports = new Set( [ 'color', 'float', 'int' ] );
  if ( nodes.some( ( n ) => n.type === 'meshStandardMaterial' ) ) {
    imports.add( 'MeshStandardNodeMaterial' );
  }

  const lines = [];
  let nodeIndex = 0;

  for ( const nodeId of order ) {
    const node = nodes.find( ( n ) => n.id === nodeId );
    if ( !node ) continue;

    const type = node.type;
    if ( type === 'meshStandardMaterial' ) {
      nodeVarMap.set( nodeId, 'material' );
      continue;
    }

    const varName = `_node${nodeIndex}`;
    nodeIndex += 1;
    nodeVarMap.set( nodeId, varName );

    if ( GEOMETRY_TSL_NAMES[ type ] != null ) {
      imports.add( GEOMETRY_TSL_NAMES[ type ] );
      if ( type === 'uv' ) {
        const inputEdge = ( edgesByTarget[ nodeId ] || [] ).find( ( e ) => e.targetHandle === 'index' );
        const indexExpr = inputEdge ? nodeVarMap.get( inputEdge.source ) : '0';
        lines.push( `const ${varName} = uv( ${indexExpr} );` );
      } else {
        lines.push( `const ${varName} = ${GEOMETRY_TSL_NAMES[ type ]};` );
      }
      continue;
    }

    if ( type === 'customFn' ) {
      let code = ( node.data && node.data.code ) || 'Fn(([a,b]) => { return a.add(b); })';
      // Strip comments so single-line output is valid (// would comment out the rest of the line)
      code = code.replace( /\/\/[^\n]*/g, '' ).replace( /\/\*[\s\S]*?\*\//g, '' );
      code = code.replace( /\s+/g, ' ' ).trim();
      const inputs = ( node.data && node.data.inputs ) || [ { id: 'a', label: 'A' }, { id: 'b', label: 'B' } ];
      const inputIds = Array.isArray( inputs )
        ? inputs.map( ( i ) => ( typeof i === 'string' ? i : ( i && i.id ) || 'a' ) )
        : [ 'a', 'b' ];
      const argVars = inputIds.map( ( id ) => {
        const idLower = ( id && id.toLowerCase() ) || '';
        const edge = ( edgesByTarget[ nodeId ] || [] ).find( ( e ) => {
          const th = e.targetHandle;
          return th === id || ( th && th.toLowerCase() === idLower );
        } );
        return edge ? ( nodeVarMap.get( edge.source ) || 'float(0)' ) : 'float(0)';
      } );
      imports.add( 'Fn' );
      for ( const sym of TSL_SYMBOLS_IN_FN ) {
        const re = new RegExp( '\\b' + sym.replace( /[.*+?^${}()|[\]\\]/g, '\\$&' ) + '\\b' );
        if ( re.test( code ) ) imports.add( sym );
      }
      // TSL Fn() always receives separate args; for ([a,b]) => ... it binds them to the destructured params
      lines.push( `const ${varName} = (${code})(${argVars.join( ', ' )});` );
      continue;
    }

    switch ( type ) {
      case 'color':
        imports.add( 'color' );
        break;
      case 'float':
        imports.add( 'float' );
        break;
      case 'int':
        imports.add( 'int' );
        break;
      case 'vec2':
        imports.add( 'vec2' );
        break;
      case 'vec3':
        imports.add( 'vec3' );
        break;
      case 'vec4':
        imports.add( 'vec4' );
        break;
      case 'sin':
      case 'cos':
      case 'tan':
        imports.add( type );
        break;
      case 'add':
        imports.add( 'add' );
        break;
      case 'subtract':
        imports.add( 'sub' );
        break;
      case 'mul':
      case 'multiply':
        imports.add( 'mul' );
        break;
      case 'divide':
        imports.add( 'div' );
        break;
      case 'mix':
      case 'min':
      case 'max':
      case 'clamp':
      case 'step':
      case 'smoothstep':
      case 'mod':
        imports.add( type );
        break;
      case 'power':
        imports.add( 'pow' );
        break;
      case 'abs':
      case 'floor':
      case 'ceil':
      case 'round':
      case 'sqrt':
      case 'fract':
      case 'saturate':
      case 'negate':
        imports.add( type );
        break;
      case 'equals':
      case 'all':
      case 'any':
        imports.add( type );
        break;
      case 'trinoise3d':
      case 'triNoise3d':
        imports.add( 'triNoise3D' );
        break;
      case 'interleavedgradientnoise':
      case 'interleavedGradientNoise':
        imports.add( 'interleavedGradientNoise' );
        break;
      case 'oneMinusX':
      case 'oneMinus':
        imports.add( 'sub' );
        break;
      case 'oneDivX':
        imports.add( 'div' );
        break;
      case 'acos':
      case 'asin':
      case 'atan':
      case 'exp':
      case 'exp2':
      case 'log':
      case 'log2':
      case 'sign':
      case 'cbrt':
      case 'degrees':
      case 'radians':
      case 'pow2':
      case 'pow3':
      case 'pow4':
      case 'trunc':
        imports.add( type === 'exp2' ? 'exp2' : type === 'log2' ? 'log2' : type );
        break;
      case 'inversesqrt':
        imports.add( 'inverseSqrt' );
        break;
      case 'dot':
      case 'length':
      case 'distance':
      case 'cross':
        imports.add( type );
        break;
      case 'epsilon':
      case 'halfpi':
      case 'halfPi':
      case 'pi':
      case 'Pi':
      case 'twopi':
      case 'twoPi':
      case 'infinity':
        // constants: no extra import (use float())
        break;
      default:
        break;
    }

    const expr = nodeToTSLExpression( node, nodeVarMap, edgesByTarget );
    if ( expr != null ) {
      lines.push( `const ${varName} = ${expr};` );
    }
  }

  const materialNodes = nodes.filter( ( n ) => n.type === 'meshStandardMaterial' );
  if ( materialNodes.length ) {
    lines.push( '' );
    lines.push( '// Material' );
    const materialNode = materialNodes[ 0 ];
    const materialVar = nodeVarMap.get( materialNode.id ) || 'material';
    lines.push( `const ${materialVar} = new MeshStandardNodeMaterial();` );

    const incoming = edgesByTarget[ materialNode.id ] || [];
    const propDefaults = {
      colorNode: 'color("#ffffff")',
      roughnessNode: 'float(0.5)',
      metalnessNode: 'float(0)',
      emissiveNode: 'color("#000000")',
      aoNode: 'float(1)',
      opacityNode: 'float(1)',
    };
    const propsSet = new Set();
    for ( const e of incoming ) {
      const prop = MATERIAL_PROP_MAP[ e.targetHandle ];
      if ( !prop ) continue;
      const srcVar = getSourceNodeVar( e, nodeVarMap );
      lines.push( `${materialVar}.${prop} = ${srcVar};` );
      propsSet.add( prop );
    }
    for ( const [ prop, defaultExpr ] of Object.entries( propDefaults ) ) {
      if ( !propsSet.has( prop ) ) {
        lines.push( `${materialVar}.${prop} = ${defaultExpr};` );
      }
    }
    lines.push( `${materialVar}.side = 0;` );
    lines.push( `${materialVar}.transparent = false;` );
    lines.push( `${materialVar}.depthWrite = true;` );
  }

  const importLine = `import { ${[ ...imports ].sort().join( ', ' )} } from 'three/tsl';`;
  return [ importLine, '', '// Generated TSL Code', '', ...lines ].join( '\n' );
}

/**
 * Execute generated TSL code string and return the material.
 * Parses the import line to get required symbols, wraps the body in a function, runs it with the provided tslModule.
 * @param {string} code - Full output of generateTSLCode()
 * @param {Object} tslModule - Namespace with TSL symbols (Fn, MeshStandardNodeMaterial, color, float, int, vec2, vec3, vec4, ...)
 * @returns {THREE.Material|null} material or null on error
 */
export function runGeneratedTSLCode( code, tslModule ) {
  if ( !code || !tslModule ) return null;
  try {
    const importMatch = code.match( /import\s*\{\s*([^}]+)\s*\}\s*from\s*['"]three\/tsl['"]\s*;/ );
    if ( !importMatch ) return null;
    const symbols = importMatch[ 1 ].split( ',' ).map( ( s ) => s.trim() ).filter( Boolean );
    const afterImport = code.slice( code.indexOf( importMatch[ 0 ] ) + importMatch[ 0 ].length ).trim();
    const body = afterImport.replace( /^\/\/[^\n]*\n?/gm, '' ).replace( /^\s*\n/gm, '\n' ).trim();
    const runnable = `(function(${symbols.join( ', ' )}) { ${body} return material; })`;
    const factory = new Function( ...symbols, 'return ' + runnable );
    const args = symbols.map( ( s ) => {
      const v = tslModule[ s ];
      if ( v === undefined ) throw new Error( `TSL symbol not provided: ${s}` );
      return v;
    } );
    const run = factory( ...args );
    return ( run && typeof run === 'function' ? run( ...args ) : run ) || null;
  } catch ( err ) {
    console.warn( '[runGeneratedTSLCode]', err );
    return null;
  }
}
