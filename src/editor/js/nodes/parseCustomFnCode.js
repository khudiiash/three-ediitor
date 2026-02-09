/** TSL module from three/tsl for validating unknown variables (lookup only). */
import * as TSLModule from 'three/tsl';

/**
 * Parse Fn(([a, b]) => ...) or Fn((a, b) => ...) to extract input parameter names.
 * Returns array of { id, label } for use as node inputs (e.g. [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }]).
 */
export function parseCustomFnInputs( code ) {
  if ( !code || typeof code !== 'string' ) return [ { id: 'a', label: 'A' } ];
  const trimmed = code.trim();
  // Match Fn( then optional ( then [ or single id, then capture args: [a, b] or (a, b) or a
  const match = trimmed.match( /Fn\s*\(\s*\(?\s*\[?\s*([^\]\)=>]+?)\s*\]?\s*\)?\s*\)\s*=>/ );
  if ( !match ) return [ { id: 'a', label: 'A' } ];
  const argList = match[ 1 ].split( ',' ).map( ( s ) => s.trim() ).filter( Boolean );
  if ( argList.length === 0 ) return [ { id: 'a', label: 'A' } ];
  return argList.map( ( id ) => ( {
    id,
    label: id.length === 1 ? id.toUpperCase() : id.charAt( 0 ).toUpperCase() + id.slice( 1 ),
  } ) );
}

/**
 * Minimal mock TSL so we can run custom Fn code without the real TSL runtime.
 * Supports TSL.float(), TSL.vec2/3/4(), TSL.color(), TSL.Fn(), and chainable .add(), .mul(), etc.
 */
function createMockTSL() {
  const mock = {};
  const noop = () => mock;
  Object.assign( mock, {
    add: noop, sub: noop, mul: noop, div: noop, min: noop, max: noop, mix: noop,
    dot: noop, length: noop, normalize: noop, clamp: noop, saturate: noop,
    sin: noop, cos: noop, tan: noop, pow: noop, sqrt: noop, exp: noop,
  } );
  const Fn = ( f ) => ( typeof f === 'function' ? f : () => mock );
  return {
    Fn,
    float: ( x ) => ( typeof x === 'number' ? Object.assign( { value: x }, mock ) : mock ),
    vec2: () => mock,
    vec3: () => mock,
    vec4: () => mock,
    color: () => mock,
    int: () => mock,
    bool: () => mock,
    time: () => mock,
  };
}

/** Fn(([a,b]) => ...) returns the inner function; inject so user code can call Fn(...). */
function createFn() {
  return ( f ) => ( typeof f === 'function' ? f : () => ( {} ) );
}

/** Check if a name exists on the TSL module (real or mock) for validation. */
function hasTSLName( tslModule, name ) {
  if ( !tslModule || typeof tslModule !== 'object' ) return false;
  return Object.prototype.hasOwnProperty.call( tslModule, name );
}

/** Common TSL export names to always inject so code like sin(), add() works even if module keys differ (e.g. minified). */
const KNOWN_TSL_NAMES = new Set( [
  'float', 'int', 'bool', 'vec2', 'vec3', 'vec4', 'color', 'time', 'Fn',
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2', 'radians', 'degrees',
  'add', 'sub', 'mul', 'div', 'min', 'max', 'mod', 'pow', 'sqrt', 'exp', 'log', 'exp2', 'log2',
  'abs', 'sign', 'floor', 'ceil', 'round', 'fract', 'trunc',
  'clamp', 'saturate', 'mix', 'step', 'smoothstep',
  'dot', 'length', 'normalize', 'distance', 'cross',
  'If', 'Loop', 'Break', 'Continue', 'Discard',
  'positionWorld', 'positionLocal', 'positionView', 'normalWorld', 'normalView', 'uv', 'screenUV',
  'uniform', 'varying', 'attribute', 'texture', 'hash', 'rand',
] );

/**
 * Return expression must be a TSL node: a single identifier (variable) or a complete call expression
 * (e.g. vec3(1,0,0), a.add(b)), not a bare property or incomplete expression.
 */
function isValidReturnExpression( expr ) {
  if ( !expr || typeof expr !== 'string' ) return false;
  const trimmed = expr.trim();
  if ( trimmed.length === 0 ) return false;
  if ( /^\w+$/.test( trimmed ) ) return true;
  let depth = 0;
  for ( let i = 0; i < trimmed.length; i++ ) {
    const ch = trimmed[ i ];
    if ( ch === '(' ) depth++;
    else if ( ch === ')' ) depth--;
  }
  if ( depth !== 0 ) return false;
  if ( !trimmed.includes( '(' ) || trimmed[ trimmed.length - 1 ] !== ')' ) return false;
  return true;
}

/**
 * Extract the return expression from Fn code. Returns { returnExpr, hasReturn } or null if structure invalid.
 * Handles both => { return x; } and => x expression bodies.
 */
function getReturnFromFnCode( trimmed ) {
  const fnMatch = trimmed.match( /Fn\s*\(\s*\(?\s*\[?\s*[^\]\)=>]*\s*\]?\s*\)?\s*\)\s*=>/ );
  if ( !fnMatch ) return null;
  const afterArrow = trimmed.indexOf( '=>', fnMatch.index ) + 2;
  const openBraceIndex = trimmed.indexOf( '{', afterArrow );
  if ( openBraceIndex === -1 ) {
    const exprBody = trimmed.slice( afterArrow ).trim();
    return { returnExpr: exprBody, hasReturn: true };
  }
  let depth = 0;
  let bodyStart = -1;
  let bodyEnd = -1;
  for ( let i = openBraceIndex; i < trimmed.length; i++ ) {
    const ch = trimmed[ i ];
    if ( ch === '{' ) {
      if ( depth === 0 ) bodyStart = i + 1;
      depth++;
    } else if ( ch === '}' ) {
      depth--;
      if ( depth === 0 ) {
        bodyEnd = i;
        break;
      }
    }
  }
  if ( bodyEnd === -1 ) return null;
  const body = trimmed.slice( bodyStart, bodyEnd ).replace( /\/\/[^\n]*/g, '' ).replace( /\/\*[\s\S]*?\*\//g, '' );
  const returnMatch = body.match( /\breturn\s+([\s\S]*?)\s*;/ );
  if ( !returnMatch ) return { returnExpr: null, hasReturn: false };
  return { returnExpr: returnMatch[ 1 ].trim(), hasReturn: true };
}

/**
 * Validates TSL custom Fn code by running it in a try-catch. Unknown variables are looked up
 * in the three/tsl module: if the name exists there (or is defined in code with const/let), it is valid
 * and we inject it and retry; otherwise we show the error.
 * @param {string} code - Custom Fn code to validate
 * @returns {{ valid: true, argNames: string[] } | { valid: false, error: string }}
 */
export function validateCustomFnCode( code ) {
  if ( !code || typeof code !== 'string' ) {
    return { valid: false, error: 'Enter TSL code' };
  }
  const trimmed = code.trim();
  if ( !trimmed ) return { valid: false, error: 'Enter TSL code' };

  const returnInfo = getReturnFromFnCode( trimmed );
  if ( !returnInfo ) {
    return { valid: false, error: 'Code must be in the form Fn(([a, b]) => { ... }) or Fn(([a]) => expr)' };
  }
  if ( !returnInfo.hasReturn || returnInfo.returnExpr == null ) {
    return { valid: false, error: 'Function must have a return statement' };
  }
  if ( !isValidReturnExpression( returnInfo.returnExpr ) ) {
    return { valid: false, error: 'Return value must be a TSL node (e.g. vec3(1,0,0) or a.add(b)), not a property or incomplete expression' };
  }

  const mockTSL = createMockTSL();
  const Fn = createFn();
  const lookupTSL = TSLModule && typeof TSLModule === 'object' ? TSLModule : mockTSL;
  // Pre-inject all TSL exports + known names so code can use sin(), add(), vec3(), etc. without TSL. prefix
  const mock = { add: () => mock, mul: () => mock, sub: () => mock, value: 0 };
  const namesToInject = new Set( KNOWN_TSL_NAMES );
  for ( const k of Object.keys( lookupTSL ) ) {
    if ( /^[a-zA-Z_][a-zA-Z0-9_]*$/.test( k ) && k !== 'default' ) namesToInject.add( k );
  }
  const injectedNames = [ ...namesToInject ];
  for ( const k of injectedNames ) {
    if ( !( k in mockTSL ) ) {
      mockTSL[ k ] = hasTSLName( lookupTSL, k ) && typeof lookupTSL[ k ] === 'function' ? ( () => mock ) : ( () => mock );
    }
  }

  function run( names ) {
    const paramList = [ 'TSL', 'Fn', ...names ].join( ', ' );
    const fnFactory = new Function( paramList, 'return (' + trimmed + ')' );
    const args = [ mockTSL, Fn, ...names.map( ( n ) => ( mockTSL[ n ] != null ? mockTSL[ n ] : () => mockTSL.float( 0 ) ) ) ];
    const innerFn = fnFactory( ...args );
    if ( typeof innerFn !== 'function' ) {
      return { valid: false, error: 'Code must evaluate to a function (e.g. Fn(([a, b]) => { ... }))' };
    }
    const inputs = parseCustomFnInputs( trimmed );
    const mock = { add: () => mock, mul: () => mock, value: 0 };
    const mockArgs = inputs.map( () => ( { ...mock } ) );
    const hasArrayDestructure = /Fn\s*\(\s*\(?\s*\[/.test( trimmed );
    if ( hasArrayDestructure ) {
      innerFn( mockArgs );
    } else {
      innerFn( ...mockArgs );
    }
    return null;
  }

  const maxRetries = 50;
  let lastError = null;

  for ( let r = 0; r <= maxRetries; r++ ) {
    try {
      const errResult = run( injectedNames );
      if ( errResult ) return errResult;
      const argNames = parseCustomFnInputs( trimmed ).map( ( i ) => i.id );
      return { valid: true, argNames };
    } catch ( e ) {
      lastError = e;
      const msg = e && e.message ? String( e.message ) : 'Unknown error';
      const refMatch = e.name === 'ReferenceError' && /(\w+)\s+is not defined/.exec( msg );
      if ( refMatch ) {
        const name = refMatch[ 1 ];
        if ( name !== 'TSL' && name !== 'Fn' && hasTSLName( lookupTSL, name ) ) {
          injectedNames = [ ...injectedNames, name ];
          if ( !mockTSL[ name ] ) mockTSL[ name ] = () => mockTSL.float( 0 );
          continue;
        }
      }
      const clean = msg.replace( /^[^:]+:\s*/, '' ).replace( /\s*\(<anonymous>\)$/, '' );
      return { valid: false, error: clean };
    }
  }

  const clean = ( lastError && lastError.message ) ? String( lastError.message ).replace( /^[^:]+:\s*/, '' ) : 'Unknown error';
  return { valid: false, error: clean };
}

/**
 * Infer customFn output type from the return expression (e.g. vec3(1,0,0) → 'vec3', a.add(b) → 'float').
 * Returns one of: 'float', 'vec2', 'vec3', 'vec4', 'color'.
 */
export function inferCustomFnOutputType( code ) {
  if ( !code || typeof code !== 'string' ) return 'float';
  const trimmed = code.trim();
  const fnMatch = trimmed.match( /Fn\s*\(\s*\(?\s*\[?\s*[^\]\)=>]*\s*\]?\s*\)?\s*\)\s*=>/ );
  if ( !fnMatch ) return 'float';
  const afterArrow = trimmed.indexOf( '=>', fnMatch.index ) + 2;
  const openBraceIndex = trimmed.indexOf( '{', afterArrow );
  // Expression body (e.g. Fn(([a]) => TSL.vec3(1,0,0)))
  if ( openBraceIndex === -1 ) {
    const exprBody = trimmed.slice( afterArrow ).trim();
    const tslCall = exprBody.match( /TSL\.(vec2|vec3|vec4|color|float|int)\s*\(/ );
    if ( tslCall ) {
      const name = tslCall[ 1 ].toLowerCase();
      if ( name === 'vec2' ) return 'vec2';
      if ( name === 'vec3' || name === 'color' ) return 'vec3';
      if ( name === 'vec4' ) return 'vec4';
      if ( name === 'float' ) return 'float';
      if ( name === 'int' ) return 'int';
    }
    return 'float';
  }
  let depth = 0;
  let bodyStart = -1;
  let bodyEnd = -1;
  for ( let i = openBraceIndex; i < trimmed.length; i++ ) {
    const ch = trimmed[ i ];
    if ( ch === '{' ) {
      if ( depth === 0 ) bodyStart = i + 1;
      depth++;
    } else if ( ch === '}' ) {
      depth--;
      if ( depth === 0 ) {
        bodyEnd = i;
        break;
      }
    }
  }
  if ( bodyEnd === -1 ) return 'float';
  const body = trimmed.slice( bodyStart, bodyEnd ).replace( /\/\/[^\n]*/g, '' ).replace( /\/\*[\s\S]*?\*\//g, '' );
  const returnMatch = body.match( /\breturn\s+([\s\S]*?)\s*;/ );
  if ( !returnMatch ) return 'float';
  const expr = returnMatch[ 1 ].trim();
  const callMatch = expr.match( /^(\w+)\s*\(/ );
  if ( callMatch ) {
    const name = callMatch[ 1 ].toLowerCase();
    if ( name === 'vec2' ) return 'vec2';
    if ( name === 'vec3' ) return 'vec3';
    if ( name === 'vec4' ) return 'vec4';
    if ( name === 'color' ) return 'color';
    if ( name === 'float' ) return 'float';
    if ( name === 'int' ) return 'int';
    if ( name === 'bool' ) return 'bool';
  }
  return 'float';
}
