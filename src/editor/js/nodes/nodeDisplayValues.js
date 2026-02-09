/**
 * Parse a single return vec3(r,g,b) or return color("#hex") into { r, g, b } in 0..1.
 * Literals only (no variable substitution).
 */
function parseOneReturnColor( matchOrHex, isVec3 ) {
  if ( isVec3 && matchOrHex && matchOrHex.length >= 4 ) {
    const r = Math.max( 0, Math.min( 1, parseFloat( matchOrHex[ 1 ] ) || 0 ) );
    const g = Math.max( 0, Math.min( 1, parseFloat( matchOrHex[ 2 ] ) || 0 ) );
    const b = Math.max( 0, Math.min( 1, parseFloat( matchOrHex[ 3 ] ) || 0 ) );
    return { r, g, b };
  }
  if ( ! isVec3 && matchOrHex && matchOrHex[ 1 ] ) {
    const hex = matchOrHex[ 1 ];
    const expanded = hex.length <= 4
      ? hex.slice( 1 ).replace( /./g, ( c ) => c + c ).padEnd( 6, '0' )
      : hex.slice( 1 ).padEnd( 6, '0' );
    return {
      r: parseInt( expanded.slice( 0, 2 ), 16 ) / 255,
      g: parseInt( expanded.slice( 2, 4 ), 16 ) / 255,
      b: parseInt( expanded.slice( 4, 6 ), 16 ) / 255,
    };
  }
  return null;
}

/**
 * Evaluate vec3(c1, c2, c3) with variable substitution: each component can be a literal number
 * or an input name (a, b, etc.). Resolve inputs via getInput(nodeId, id); clamp to 0..1.
 * @param {RegExpMatchArray} vec3Match - match from return vec3(...) regex
 * @param {string[]} inputIds - custom Fn input ids e.g. ['a','b']
 * @param {string} nodeId - custom node id
 * @param {function(string, string): number|null} getInput - getInput(nodeId, pin)
 * @returns {{ r, g, b } | null}
 */
function evalVec3ReturnWithInputs( vec3Match, inputIds, nodeId, getInput ) {
  if ( ! vec3Match || vec3Match.length < 4 ) return null;
  const parts = [ vec3Match[ 1 ].trim(), vec3Match[ 2 ].trim(), vec3Match[ 3 ].trim() ];
  const comps = parts.map( ( p ) => {
    const num = parseFloat( p );
    if ( Number.isFinite( num ) ) return num;
    if ( inputIds.includes( p ) ) {
      const v = getInput( nodeId, p );
      return v != null && typeof v === 'number' && isFinite( v ) ? v : 0;
    }
    return 0;
  } );
  return {
    r: Math.max( 0, Math.min( 1, comps[ 0 ] ) ),
    g: Math.max( 0, Math.min( 1, comps[ 1 ] ) ),
    b: Math.max( 0, Math.min( 1, comps[ 2 ] ) ),
  };
}

/**
 * Parse all return vec3(...) and return color(...) from custom Fn code (order preserved).
 * @returns {Array<{ r, g, b }>}
 */
function parseAllReturnColors( code ) {
  if ( ! code || typeof code !== 'string' ) return [];
  const trimmed = code.replace( /\/\/[^\n]*/g, '' ).replace( /\/\*[\s\S]*?\*\//g, '' );
  const out = [];
  const vec3Re = /return\s+vec3\s*\(\s*([^,)]+)\s*,\s*([^,)]+)\s*,\s*([^)]+)\s*\)/g;
  const colorRe = /return\s+color\s*\(\s*["'](#[\da-fA-F]{3,8})["']\s*\)/g;
  let m;
  const vec3Matches = [];
  while ( ( m = vec3Re.exec( trimmed ) ) !== null ) vec3Matches.push( m );
  const colorMatches = [];
  while ( ( m = colorRe.exec( trimmed ) ) !== null ) colorMatches.push( m );
  // Merge by position in string so order matches code
  const all = [ ...vec3Matches.map( ( x ) => ( { pos: x.index, vec3: x } ) ), ...colorMatches.map( ( x ) => ( { pos: x.index, color: x } ) ) ]
    .sort( ( a, b ) => a.pos - b.pos );
  for ( const { vec3, color } of all ) {
    const parsed = vec3 ? parseOneReturnColor( vec3, true ) : parseOneReturnColor( color, false );
    if ( parsed ) out.push( parsed );
  }
  return out;
}

/**
 * Parse a simple condition for display: if (a > 0), if (a >= 0), if (a < 0), etc.
 * @returns {{ varName: string, op: string, constant: number } | null}
 */
function parseCustomFnCondition( code ) {
  if ( ! code || typeof code !== 'string' ) return null;
  const trimmed = code.replace( /\/\/[^\n]*/g, '' ).replace( /\/\*[\s\S]*?\*\//g, '' );
  const condMatch = trimmed.match( /if\s*\(\s*([a-zA-Z_]\w*)\s*(>|>=|<|<=|===?|!==?)\s*([^)]+)\)/ );
  if ( ! condMatch ) return null;
  const constant = parseFloat( condMatch[ 3 ] );
  if ( Number.isNaN( constant ) ) return null;
  return { varName: condMatch[ 1 ], op: condMatch[ 2 ], constant };
}

function evaluateCondition( inputVal, cond ) {
  if ( ! cond || typeof inputVal !== 'number' ) return false;
  const { op, constant } = cond;
  switch ( op ) {
    case '>': return inputVal > constant;
    case '>=': return inputVal >= constant;
    case '<': return inputVal < constant;
    case '<=': return inputVal <= constant;
    case '==': case '===': return inputVal === constant;
    case '!=': case '!==': return inputVal !== constant;
    default: return false;
  }
}

/**
 * Single return color (backward compat): first return only.
 * @returns {{ r, g, b } | null}
 */
function parseCustomFnReturnColor( code ) {
  const all = parseAllReturnColors( code );
  return all.length > 0 ? all[ 0 ] : null;
}

/**
 * Computes numeric and vec3/color display values for nodes (time, float, sin, vec3, color, etc.)
 * for showing current value on the node. Uses previewTime for time node.
 * Returns { valueMap: Map<nodeId, number>, colorMap: Map<nodeId, { r, g, b }> }.
 * valueMap: float-like outputs (time, sin, add, etc.). colorMap: vec3/color outputs for swatches.
 */
export function computeNodeDisplayValues( nodes, edges, previewTime = 0 ) {
  const nodeMap = new Map( nodes.map( ( n ) => [ n.id, n ] ) );
  const values = new Map();
  const colors = new Map();
  const visited = new Set();

  function resolveSourceNodeId( sourceId, sourceHandle ) {
    const srcNode = nodeMap.get( sourceId );
    if ( srcNode?.type === 'group' && srcNode.data?.outHandles?.length ) {
      const h = srcNode.data.outHandles.find( ( x ) => x.id === sourceHandle );
      if ( h?.source != null ) return h.source;
    }
    return sourceId;
  }

  function getInput( nodeId, toPin ) {
    const conn = edges.find( ( e ) => e.target === nodeId && ( e.targetHandle === toPin || e.targetHandle === toPin.toUpperCase?.() ) );
    if ( ! conn ) return null;
    const sourceId = resolveSourceNodeId( conn.source, conn.sourceHandle );
    if ( values.has( sourceId ) ) return values.get( sourceId );
    if ( colors.has( sourceId ) ) {
      const c = colors.get( sourceId );
      return c != null && typeof c === 'object' && 'r' in c ? ( c.r + c.g + c.b ) / 3 : null;
    }
    return null;
  }

  function getInputColor( nodeId, toPin ) {
    const conn = edges.find( ( e ) => e.target === nodeId && ( e.targetHandle === toPin || e.targetHandle === toPin.toUpperCase?.() ) );
    if ( ! conn ) return null;
    const sourceId = resolveSourceNodeId( conn.source, conn.sourceHandle );
    if ( colors.has( sourceId ) ) return colors.get( sourceId );
    if ( values.has( sourceId ) ) {
      const n = values.get( sourceId );
      const t = typeof n === 'number' && isFinite( n ) ? Math.max( 0, Math.min( 1, ( n + 1 ) * 0.5 ) ) : 0.5;
      return { r: t, g: t, b: t };
    }
    return null;
  }

  function resolve( id ) {
    if ( visited.has( id ) ) return;
    const node = nodeMap.get( id );
    if ( ! node ) return;
    visited.add( id );
    edges.filter( ( e ) => e.target === id ).forEach( ( e ) => {
      const effectiveSource = resolveSourceNodeId( e.source, e.sourceHandle );
      resolve( effectiveSource );
    } );
    const type = ( node.type || '' ).toLowerCase();
    const data = node.data || {};
    let num = null;
    if ( type === 'time' ) {
      num = previewTime;
    } else if ( type === 'float' ) {
      const fromInput = getInput( id, 'value' );
      num = fromInput !== null ? fromInput : ( typeof data.value === 'number' ? data.value : 0 );
    } else if ( type === 'sin' ) {
      num = Math.sin( getInput( id, 'a' ) ?? 0 );
    } else if ( type === 'add' ) {
      num = ( getInput( id, 'a' ) ?? 0 ) + ( getInput( id, 'b' ) ?? 0 );
    } else if ( type === 'customfn' ) {
      // Single source of truth: same defaults as TSL (unconnected = 0) and same branch logic for conditionals
      const inputIds = ( data.inputs && Array.isArray( data.inputs ) )
        ? data.inputs.map( ( i ) => ( typeof i === 'object' && i && i.id != null ? i.id : 'a' ) )
        : [ 'a' ];
      const firstInputVal = getInput( id, inputIds[ 0 ] ) ?? 0;
      const codeTrimmed = ( data.code || '' ).replace( /\/\/[^\n]*/g, '' ).replace( /\/\*[\s\S]*?\*\//g, '' );
      const vec3ReturnMatch = codeTrimmed.match( /return\s+vec3\s*\(\s*([^,)]+)\s*,\s*([^,)]+)\s*,\s*([^)]+)\s*\)/ );
      // Evaluate vec3(a, b, 0) using connected input values so swatch matches live preview
      const evaluatedColor = vec3ReturnMatch
        ? evalVec3ReturnWithInputs( vec3ReturnMatch, inputIds, id, getInput )
        : null;
      const allReturns = parseAllReturnColors( data.code );
      const condition = parseCustomFnCondition( data.code );
      let displayColor = evaluatedColor;
      if ( ! displayColor && allReturns.length >= 2 && condition ) {
        const branchTrue = evaluateCondition( firstInputVal, condition );
        displayColor = branchTrue ? allReturns[ 0 ] : allReturns[ 1 ];
      } else if ( ! displayColor && allReturns.length === 1 ) {
        displayColor = allReturns[ 0 ];
      }
      if ( displayColor ) {
        colors.set( id, displayColor );
      } else {
        const outputType = ( data.outputType || 'float' ).toLowerCase();
        if ( outputType === 'vec3' || outputType === 'color' ) {
          const incoming = edges.filter( ( e ) => e.target === id );
          const sourceValues = incoming.map( ( e ) => {
            const srcId = resolveSourceNodeId( e.source, e.sourceHandle );
            if ( colors.has( srcId ) ) return colors.get( srcId );
            if ( values.has( srcId ) ) {
              const n = values.get( srcId );
              const t = typeof n === 'number' && isFinite( n ) ? Math.max( 0, Math.min( 1, ( n + 1 ) * 0.5 ) ) : 0.5;
              return { r: t, g: t, b: t };
            }
            return null;
          } );
          const firstColor = sourceValues.find( ( c ) => c && typeof c === 'object' && 'r' in c );
          if ( firstColor ) colors.set( id, firstColor );
        }
      }
      if ( ! colors.has( id ) ) {
        const incoming = edges.filter( ( e ) => e.target === id );
        const sourceValues = incoming.map( ( e ) => {
          const srcId = resolveSourceNodeId( e.source, e.sourceHandle );
          if ( values.has( srcId ) ) return values.get( srcId );
          if ( colors.has( srcId ) ) {
            const c = colors.get( srcId );
            return c != null && typeof c === 'object' && 'r' in c ? ( c.r + c.g + c.b ) / 3 : null;
          }
          return null;
        } );
        const numeric = sourceValues.filter( ( v ) => v !== null && typeof v === 'number' && isFinite( v ) );
        if ( numeric.length === 1 ) {
          num = numeric[ 0 ];
        } else if ( numeric.length >= 2 ) {
          num = numeric.reduce( ( s, v ) => s + v, 0 );
        } else {
          num = 0;
        }
      }
    } else if ( type === 'mul' || type === 'multiply' ) {
      num = ( getInput( id, 'a' ) ?? 1 ) * ( getInput( id, 'b' ) ?? 1 );
    } else if ( type === 'subtract' ) {
      num = ( getInput( id, 'a' ) ?? 0 ) - ( getInput( id, 'b' ) ?? 0 );
    } else if ( type === 'divide' ) {
      const a = getInput( id, 'a' ) ?? 1;
      const b = getInput( id, 'b' ) ?? 1;
      num = b !== 0 ? a / b : 0;
    } else if ( type === 'mix' ) {
      const a = getInput( id, 'a' ) ?? 0;
      const b = getInput( id, 'b' ) ?? 1;
      const t = getInput( id, 'c' ) ?? getInput( id, 't' ) ?? 0.5;
      num = a + ( b - a ) * ( t !== null ? t : 0.5 );
    } else if ( type === 'oneMinusX' || type === 'oneMinus' ) {
      num = 1 - ( getInput( id, 'a' ) ?? getInput( id, 'in' ) ?? 0 );
    } else if ( type === 'oneDivX' ) {
      const a = getInput( id, 'a' ) ?? getInput( id, 'in' ) ?? 1;
      num = a !== 0 ? 1 / a : 0;
    } else if ( type === 'negate' ) {
      num = -( getInput( id, 'a' ) ?? getInput( id, 'in' ) ?? 0 );
    } else if ( type === 'abs' || type === 'floor' || type === 'ceil' || type === 'round' || type === 'sqrt' || type === 'fract' || type === 'saturate' ) {
      const a = getInput( id, 'a' ) ?? getInput( id, 'in' ) ?? 0;
      if ( type === 'abs' ) num = Math.abs( a );
      else if ( type === 'floor' ) num = Math.floor( a );
      else if ( type === 'ceil' ) num = Math.ceil( a );
      else if ( type === 'round' ) num = Math.round( a );
      else if ( type === 'sqrt' ) num = Math.sqrt( a );
      else if ( type === 'fract' ) num = a - Math.floor( a );
      else if ( type === 'saturate' ) num = Math.min( 1, Math.max( 0, a ) );
    } else if ( type === 'cos' || type === 'tan' ) {
      const a = getInput( id, 'a' ) ?? getInput( id, 'in' ) ?? 0;
      num = type === 'cos' ? Math.cos( a ) : Math.tan( a );
    } else if ( type === 'min' || type === 'max' ) {
      const a = getInput( id, 'a' ) ?? 0;
      const b = getInput( id, 'b' ) ?? 0;
      num = type === 'min' ? Math.min( a, b ) : Math.max( a, b );
    } else if ( type === 'clamp' ) {
      const a = getInput( id, 'a' ) ?? 0;
      const b = getInput( id, 'b' ) ?? 0;
      const c = getInput( id, 'c' ) ?? 1;
      num = Math.max( b, Math.min( c, a ) );
    } else if ( type === 'power' ) {
      const a = getInput( id, 'a' ) ?? 1;
      const b = getInput( id, 'b' ) ?? 1;
      num = Math.pow( a, b );
    } else if ( type === 'step' ) {
      const a = getInput( id, 'a' ) ?? 0;
      const b = getInput( id, 'b' ) ?? 0;
      num = b < a ? 0 : 1;
    } else if ( type === 'smoothstep' ) {
      const a = getInput( id, 'a' ) ?? 0;
      const b = getInput( id, 'b' ) ?? 0.5;
      const c = getInput( id, 'c' ) ?? 1;
      const t = b !== a ? Math.max( 0, Math.min( 1, ( c - a ) / ( b - a ) ) ) : 0;
      num = t * t * ( 3 - 2 * t );
    } else if ( type === 'mod' ) {
      const a = getInput( id, 'a' ) ?? 0;
      const b = getInput( id, 'b' ) ?? 1;
      num = b !== 0 ? a % b : 0;
    } else if ( type === 'acos' || type === 'asin' || type === 'atan' ) {
      const a = getInput( id, 'a' ) ?? getInput( id, 'in' ) ?? 0;
      if ( type === 'acos' ) num = Math.acos( Math.max( -1, Math.min( 1, a ) ) );
      else if ( type === 'asin' ) num = Math.asin( Math.max( -1, Math.min( 1, a ) ) );
      else num = Math.atan( a );
    } else if ( type === 'exp' || type === 'exp2' || type === 'log' || type === 'log2' ) {
      const a = getInput( id, 'a' ) ?? getInput( id, 'in' ) ?? 1;
      if ( type === 'exp' ) num = Math.exp( a );
      else if ( type === 'exp2' ) num = Math.pow( 2, a );
      else if ( type === 'log' ) num = a > 0 ? Math.log( a ) : 0;
      else num = a > 0 ? Math.log2( a ) : 0;
    } else if ( type === 'cbrt' || type === 'degrees' || type === 'radians' || type === 'sign' || type === 'trunc' || type === 'inversesqrt' ) {
      const a = getInput( id, 'a' ) ?? getInput( id, 'in' ) ?? 0;
      if ( type === 'cbrt' ) num = Math.cbrt( a );
      else if ( type === 'degrees' ) num = a * ( 180 / Math.PI );
      else if ( type === 'radians' ) num = a * ( Math.PI / 180 );
      else if ( type === 'sign' ) num = a < 0 ? -1 : a > 0 ? 1 : 0;
      else if ( type === 'trunc' ) num = Math.trunc( a );
      else if ( type === 'inversesqrt' ) num = a > 0 ? 1 / Math.sqrt( a ) : 0;
    } else if ( type === 'pow2' || type === 'pow3' || type === 'pow4' ) {
      const a = getInput( id, 'a' ) ?? getInput( id, 'in' ) ?? 0;
      if ( type === 'pow2' ) num = a * a;
      else if ( type === 'pow3' ) num = a * a * a;
      else num = a * a * a * a;
    } else if ( type === 'epsilon' ) {
      num = 1e-6;
    } else if ( type === 'halfpi' ) {
      num = Math.PI / 2;
    } else if ( type === 'pi' ) {
      num = Math.PI;
    } else if ( type === 'twopi' ) {
      num = 2 * Math.PI;
    } else if ( type === 'infinity' ) {
      num = Infinity;
    } else if ( type === 'vec3' ) {
      const x = getInput( id, 'x' );
      const y = getInput( id, 'y' );
      const z = getInput( id, 'z' );
      const dx = typeof data.x === 'number' ? data.x : 0;
      const dy = typeof data.y === 'number' ? data.y : 0;
      const dz = typeof data.z === 'number' ? data.z : 0;
      const r = x !== null ? ( typeof x === 'number' ? Math.max( 0, Math.min( 1, ( x + 1 ) * 0.5 ) ) : 0.5 ) : Math.max( 0, Math.min( 1, dx ) );
      const g = y !== null ? ( typeof y === 'number' ? Math.max( 0, Math.min( 1, ( y + 1 ) * 0.5 ) ) : 0.5 ) : Math.max( 0, Math.min( 1, dy ) );
      const bl = z !== null ? ( typeof z === 'number' ? Math.max( 0, Math.min( 1, ( z + 1 ) * 0.5 ) ) : 0.5 ) : Math.max( 0, Math.min( 1, dz ) );
      colors.set( id, { r, g, b: bl } );
    } else if ( type === 'color' ) {
      const r = typeof data.r === 'number' ? data.r : 1;
      const g = typeof data.g === 'number' ? data.g : 1;
      const b = typeof data.b === 'number' ? data.b : 1;
      colors.set( id, { r, g, b } );
    }
    if ( num !== null && typeof num === 'number' && isFinite( num ) ) values.set( id, num );
  }

  nodes.forEach( ( n ) => resolve( n.id ) );
  return { valueMap: values, colorMap: colors };
}
