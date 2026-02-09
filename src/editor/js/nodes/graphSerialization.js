/**
 * Serialize and deserialize the node graph to/from JSON.
 * exportGraphToJSON / importGraphFromJSON: React Flow format (Copy/Load JSON in node editor).
 * graphToNodeMaterial: React Flow → engine format for createMaterialFromGraph (e.g. loading saved materials/scenes).
 */

import { inferCustomFnOutputType } from './parseCustomFnCode.js';


/**
 * Export current graph state to a JSON-serializable object.
 * @param {Array} nodes - React Flow nodes
 * @param {Array} edges - React Flow edges
 * @returns {Object} { nodes, edges } safe to JSON.stringify
 */
export function exportGraphToJSON( nodes, edges ) {
  return {
    nodes: nodes.map( ( n ) => ( {
      id: n.id,
      type: n.type,
      position: n.position,
      data: n.data,
    } ) ),
    edges: edges.map( ( e ) => ( {
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle ?? null,
      targetHandle: e.targetHandle ?? null,
      data: e.data,
    } ) ),
  };
}

/**
 * Parse JSON graph state back into nodes and edges for React Flow.
 * @param {Object} json - Object from JSON.parse(exportGraphToJSON(...))
 * @returns {{ nodes: Array, edges: Array }}
 */
export function importGraphFromJSON( json ) {
  const nodes = ( json.nodes || [] ).map( ( n ) => ( {
    id: n.id,
    type: n.type || 'default',
    position: n.position || { x: 0, y: 0 },
    data: n.data || {},
  } ) );
  const edges = ( json.edges || [] ).map( ( e ) => ( {
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle ?? null,
    targetHandle: e.targetHandle ?? null,
    data: e.data || {},
  } ) );
  return { nodes, edges };
}

function hexToRgb( hex ) {
  if ( ! hex || typeof hex !== 'string' ) return null;
  const m = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec( hex );
  if ( ! m ) return null;
  let s = m[ 1 ];
  if ( s.length === 3 ) s = s[ 0 ] + s[ 0 ] + s[ 1 ] + s[ 1 ] + s[ 2 ] + s[ 2 ];
  return {
    r: parseInt( s.slice( 0, 2 ), 16 ) / 255,
    g: parseInt( s.slice( 2, 4 ), 16 ) / 255,
    b: parseInt( s.slice( 4, 6 ), 16 ) / 255,
  };
}

/** Node types that are the single output material node */
const OUTPUT_MATERIAL_TYPES = [ 'meshBasicMaterial', 'meshPhongMaterial', 'meshPhysicalMaterial', 'meshStandardMaterial', 'meshSSSMaterial', 'meshToonMaterial', 'meshLambertMaterial', 'meshNormalMaterial', 'pointsMaterial', 'spriteNodeMaterial' ];

/** Material input handle id -> engine toPin (createMaterialFromGraph expects these) */
const MATERIAL_INPUT_TO_PIN = {
  color: 'colorNode',
  roughness: 'roughnessNode',
  metalness: 'metalnessNode',
  emissive: 'emissiveNode',
  opacity: 'opacityNode',
  specular: 'specularNode',
  shininess: 'shininessNode',
  ao: 'aoNode',
  clearcoat: 'clearcoatNode',
  clearcoatRoughness: 'clearcoatRoughnessNode',
  clearcoatNormal: 'clearcoatNormalNode',
  sheen: 'sheenNode',
  sheenRoughness: 'sheenRoughnessNode',
  iridescence: 'iridescenceNode',
  iridescenceIOR: 'iridescenceIORNode',
  iridescenceThickness: 'iridescenceThicknessNode',
  transmission: 'transmissionNode',
  thickness: 'thicknessNode',
  ior: 'iorNode',
  dispersion: 'dispersionNode',
  anisotropy: 'anisotropyNode',
  attenuationColor: 'attenuationColorNode',
  attenuationDistance: 'attenuationDistanceNode',
  specularColor: 'specularColorNode',
  specularIntensity: 'specularIntensityNode',
  size: 'sizeNode',
};

/** Per output material type: which input handles are driven by connection (when connected, omit from output) */
const MATERIAL_INPUT_HANDLES_BY_TYPE = {
  meshStandardMaterial: [ 'color', 'emissive', 'roughness', 'metalness', 'ao', 'opacity' ],
  meshBasicMaterial: [ 'color', 'opacity' ],
  meshPhongMaterial: [ 'color', 'emissive', 'specular', 'shininess', 'opacity' ],
  meshPhysicalMaterial: [ 'color', 'normal', 'roughness', 'metalness', 'emissive', 'clearcoat', 'clearcoatRoughness', 'clearcoatNormal', 'sheen', 'sheenRoughness', 'iridescence', 'iridescenceIOR', 'iridescenceThickness', 'transmission', 'thickness', 'ior', 'dispersion', 'anisotropy', 'attenuationColor', 'attenuationDistance', 'specularColor', 'specularIntensity', 'ao', 'opacity', 'position', 'backdrop', 'backdropAlpha' ],
  meshSSSMaterial: [ 'color', 'normal', 'roughness', 'metalness', 'emissive', 'clearcoat', 'clearcoatRoughness', 'sheen', 'sheenRoughness', 'iridescence', 'transmission', 'thickness', 'ior', 'dispersion', 'ao', 'opacity', 'position', 'backdrop', 'backdropAlpha' ],
  meshToonMaterial: [ 'color', 'emissive', 'opacity', 'position', 'backdrop', 'backdropAlpha' ],
  meshLambertMaterial: [ 'color', 'emissive', 'opacity', 'position', 'backdrop', 'backdropAlpha' ],
  meshNormalMaterial: [ 'opacity', 'position', 'backdrop', 'backdropAlpha' ],
  pointsMaterial: [ 'color', 'opacity', 'position', 'size', 'backdrop', 'backdropAlpha' ],
  spriteNodeMaterial: [],
};

function getConnectedMaterialHandles( materialNodeId, materialType, edges ) {
  const handles = MATERIAL_INPUT_HANDLES_BY_TYPE[ materialType ];
  if ( ! handles ) return new Set();
  const set = new Set();
  for ( const e of edges ) {
    if ( e.target === materialNodeId && e.targetHandle && handles.includes( e.targetHandle ) ) set.add( e.targetHandle );
  }
  return set;
}

function isOutputMaterialType( type ) {
  return OUTPUT_MATERIAL_TYPES.includes( type );
}

/**
 * Convert React Flow graph (nodes, edges) to engine NodeMaterial format for createMaterialFromGraph.
 * Engine expects: { type: 'NodeMaterial', nodes: { [id]: { type, ... } }, connections: [ { from, to, toPin } ] }
 * Only sets output node props (color, roughness, etc.) when that input is not connected so the graph stays in sync.
 * @param {Array} nodes - React Flow nodes
 * @param {Array} edges - React Flow edges
 * @returns {Object} nodeMaterial - { type, nodes, connections } for createMaterialFromGraph
 */
export function graphToNodeMaterial( nodes, edges ) {
  const nodeMap = new Map( nodes.map( ( n ) => [ n.id, n ] ) );
  const engineNodes = {};
  const engineConnections = [];

  for ( const n of nodes ) {
    const data = n.data || {};
    const typeLower = ( n.type || '' ).toLowerCase();
    if ( typeLower === 'meshstandardmaterial' ) {
      const connected = getConnectedMaterialHandles( n.id, n.type, edges );
      const rgb = ! connected.has( 'color' ) ? hexToRgb( data.color ) : null;
      const emissiveRgb = ! connected.has( 'emissive' ) ? hexToRgb( data.emissive ) : null;
      engineNodes[ n.id ] = {
        type: 'output',
        position: n.position,
        color: rgb != null ? ( ( rgb.r * 255 ) << 16 | ( rgb.g * 255 ) << 8 | ( rgb.b * 255 ) ) : undefined,
        emissive: emissiveRgb != null ? ( ( emissiveRgb.r * 255 ) << 16 | ( emissiveRgb.g * 255 ) << 8 | ( emissiveRgb.b * 255 ) ) : undefined,
        roughness: ! connected.has( 'roughness' ) && typeof data.roughness === 'number' ? data.roughness : undefined,
        metalness: ! connected.has( 'metalness' ) && typeof data.metalness === 'number' ? data.metalness : undefined,
        ao: ! connected.has( 'ao' ) && typeof data.ao === 'number' ? data.ao : undefined,
        opacity: ! connected.has( 'opacity' ) && typeof data.opacity === 'number' ? data.opacity : undefined,
        side: data.side,
        transparent: data.transparent,
        depthWrite: data.depthWrite,
      };
      continue;
    }
    if ( typeLower === 'meshbasicmaterial' ) {
      const connected = getConnectedMaterialHandles( n.id, n.type, edges );
      const rgb = ! connected.has( 'color' ) ? hexToRgb( data.color ) : null;
      engineNodes[ n.id ] = {
        type: 'output',
        position: n.position,
        materialClass: 'MeshBasicNodeMaterial',
        color: rgb != null ? ( ( rgb.r * 255 ) << 16 | ( rgb.g * 255 ) << 8 | ( rgb.b * 255 ) ) : undefined,
        opacity: ! connected.has( 'opacity' ) && typeof data.opacity === 'number' ? data.opacity : undefined,
        side: data.side,
        transparent: data.transparent,
        depthWrite: data.depthWrite,
      };
      continue;
    }
    if ( typeLower === 'meshphongmaterial' ) {
      const connected = getConnectedMaterialHandles( n.id, n.type, edges );
      const rgb = ! connected.has( 'color' ) ? hexToRgb( data.color ) : null;
      const emissiveRgb = ! connected.has( 'emissive' ) ? hexToRgb( data.emissive ) : null;
      const specularRgb = ! connected.has( 'specular' ) ? hexToRgb( data.specular ) : null;
      engineNodes[ n.id ] = {
        type: 'output',
        position: n.position,
        materialClass: 'MeshPhongNodeMaterial',
        color: rgb != null ? ( ( rgb.r * 255 ) << 16 | ( rgb.g * 255 ) << 8 | ( rgb.b * 255 ) ) : undefined,
        emissive: emissiveRgb != null ? ( ( emissiveRgb.r * 255 ) << 16 | ( emissiveRgb.g * 255 ) << 8 | ( emissiveRgb.b * 255 ) ) : undefined,
        specular: specularRgb != null ? ( ( specularRgb.r * 255 ) << 16 | ( specularRgb.g * 255 ) << 8 | ( specularRgb.b * 255 ) ) : undefined,
        shininess: ! connected.has( 'shininess' ) && typeof data.shininess === 'number' ? data.shininess : undefined,
        opacity: ! connected.has( 'opacity' ) && typeof data.opacity === 'number' ? data.opacity : undefined,
        side: data.side,
        transparent: data.transparent,
        depthWrite: data.depthWrite,
      };
      continue;
    }
    if ( typeLower === 'meshphysicalmaterial' ) {
      const connected = getConnectedMaterialHandles( n.id, n.type, edges );
      const toHex = ( rgb ) => rgb != null ? ( ( rgb.r * 255 ) << 16 | ( rgb.g * 255 ) << 8 | ( rgb.b * 255 ) ) : undefined;
      const rgb = ! connected.has( 'color' ) ? hexToRgb( data.color ) : null;
      const emissiveRgb = ! connected.has( 'emissive' ) ? hexToRgb( data.emissive ) : null;
      const sheenRgb = ! connected.has( 'sheen' ) ? hexToRgb( data.sheen ) : null;
      const attenuationRgb = ! connected.has( 'attenuationColor' ) ? hexToRgb( data.attenuationColor ) : null;
      const specularColorRgb = ! connected.has( 'specularColor' ) ? hexToRgb( data.specularColor ) : null;
      engineNodes[ n.id ] = {
        type: 'output',
        position: n.position,
        materialClass: 'MeshPhysicalNodeMaterial',
        color: toHex( rgb ),
        emissive: toHex( emissiveRgb ),
        roughness: ! connected.has( 'roughness' ) && typeof data.roughness === 'number' ? data.roughness : undefined,
        metalness: ! connected.has( 'metalness' ) && typeof data.metalness === 'number' ? data.metalness : undefined,
        ao: ! connected.has( 'ao' ) && typeof data.ao === 'number' ? data.ao : undefined,
        opacity: ! connected.has( 'opacity' ) && typeof data.opacity === 'number' ? data.opacity : undefined,
        clearcoat: ! connected.has( 'clearcoat' ) && typeof data.clearcoat === 'number' ? data.clearcoat : undefined,
        clearcoatRoughness: ! connected.has( 'clearcoatRoughness' ) && typeof data.clearcoatRoughness === 'number' ? data.clearcoatRoughness : undefined,
        sheen: toHex( sheenRgb ),
        sheenRoughness: ! connected.has( 'sheenRoughness' ) && typeof data.sheenRoughness === 'number' ? data.sheenRoughness : undefined,
        iridescence: ! connected.has( 'iridescence' ) && typeof data.iridescence === 'number' ? data.iridescence : undefined,
        iridescenceIOR: ! connected.has( 'iridescenceIOR' ) && typeof data.iridescenceIOR === 'number' ? data.iridescenceIOR : undefined,
        iridescenceThickness: ! connected.has( 'iridescenceThickness' ) && typeof data.iridescenceThickness === 'number' ? data.iridescenceThickness : undefined,
        transmission: ! connected.has( 'transmission' ) && typeof data.transmission === 'number' ? data.transmission : undefined,
        thickness: ! connected.has( 'thickness' ) && typeof data.thickness === 'number' ? data.thickness : undefined,
        ior: ! connected.has( 'ior' ) && typeof data.ior === 'number' ? data.ior : undefined,
        dispersion: ! connected.has( 'dispersion' ) && typeof data.dispersion === 'number' ? data.dispersion : undefined,
        anisotropy: ! connected.has( 'anisotropy' ) && typeof data.anisotropy === 'number' ? data.anisotropy : undefined,
        attenuationColor: toHex( attenuationRgb ),
        attenuationDistance: ! connected.has( 'attenuationDistance' ) && typeof data.attenuationDistance === 'number' ? data.attenuationDistance : undefined,
        specularColor: toHex( specularColorRgb ),
        specularIntensity: ! connected.has( 'specularIntensity' ) && typeof data.specularIntensity === 'number' ? data.specularIntensity : undefined,
        side: data.side,
        transparent: data.transparent,
        depthWrite: data.depthWrite,
      };
      continue;
    }
    if ( typeLower === 'meshsssmaterial' ) {
      const connected = getConnectedMaterialHandles( n.id, n.type, edges );
      const toHex = ( rgb ) => rgb != null ? ( ( rgb.r * 255 ) << 16 | ( rgb.g * 255 ) << 8 | ( rgb.b * 255 ) ) : undefined;
      const rgb = ! connected.has( 'color' ) ? hexToRgb( data.color ) : null;
      const emissiveRgb = ! connected.has( 'emissive' ) ? hexToRgb( data.emissive ) : null;
      const sheenRgb = ! connected.has( 'sheen' ) ? hexToRgb( data.sheen ) : null;
      engineNodes[ n.id ] = {
        type: 'output',
        position: n.position,
        materialClass: 'MeshSSSNodeMaterial',
        color: toHex( rgb ),
        emissive: toHex( emissiveRgb ),
        roughness: ! connected.has( 'roughness' ) && typeof data.roughness === 'number' ? data.roughness : undefined,
        metalness: ! connected.has( 'metalness' ) && typeof data.metalness === 'number' ? data.metalness : undefined,
        ao: ! connected.has( 'ao' ) && typeof data.ao === 'number' ? data.ao : undefined,
        opacity: ! connected.has( 'opacity' ) && typeof data.opacity === 'number' ? data.opacity : undefined,
        clearcoat: ! connected.has( 'clearcoat' ) && typeof data.clearcoat === 'number' ? data.clearcoat : undefined,
        clearcoatRoughness: ! connected.has( 'clearcoatRoughness' ) && typeof data.clearcoatRoughness === 'number' ? data.clearcoatRoughness : undefined,
        sheen: toHex( sheenRgb ),
        sheenRoughness: ! connected.has( 'sheenRoughness' ) && typeof data.sheenRoughness === 'number' ? data.sheenRoughness : undefined,
        iridescence: ! connected.has( 'iridescence' ) && typeof data.iridescence === 'number' ? data.iridescence : undefined,
        transmission: ! connected.has( 'transmission' ) && typeof data.transmission === 'number' ? data.transmission : undefined,
        thickness: ! connected.has( 'thickness' ) && typeof data.thickness === 'number' ? data.thickness : undefined,
        ior: ! connected.has( 'ior' ) && typeof data.ior === 'number' ? data.ior : undefined,
        dispersion: ! connected.has( 'dispersion' ) && typeof data.dispersion === 'number' ? data.dispersion : undefined,
        side: data.side,
        transparent: data.transparent,
        depthWrite: data.depthWrite,
      };
      continue;
    }
    if ( typeLower === 'meshtoonmaterial' ) {
      const connected = getConnectedMaterialHandles( n.id, n.type, edges );
      const rgb = ! connected.has( 'color' ) ? hexToRgb( data.color ) : null;
      const emissiveRgb = ! connected.has( 'emissive' ) ? hexToRgb( data.emissive ) : null;
      const toHex = ( r ) => r != null ? ( ( r.r * 255 ) << 16 | ( r.g * 255 ) << 8 | ( r.b * 255 ) ) : undefined;
      engineNodes[ n.id ] = {
        type: 'output',
        position: n.position,
        materialClass: 'MeshToonNodeMaterial',
        color: toHex( rgb ),
        emissive: toHex( emissiveRgb ),
        opacity: ! connected.has( 'opacity' ) && typeof data.opacity === 'number' ? data.opacity : undefined,
        side: data.side,
        transparent: data.transparent,
        depthWrite: data.depthWrite,
      };
      continue;
    }
    if ( typeLower === 'meshlambertmaterial' ) {
      const connected = getConnectedMaterialHandles( n.id, n.type, edges );
      const rgb = ! connected.has( 'color' ) ? hexToRgb( data.color ) : null;
      const emissiveRgb = ! connected.has( 'emissive' ) ? hexToRgb( data.emissive ) : null;
      const toHex = ( r ) => r != null ? ( ( r.r * 255 ) << 16 | ( r.g * 255 ) << 8 | ( r.b * 255 ) ) : undefined;
      engineNodes[ n.id ] = {
        type: 'output',
        position: n.position,
        materialClass: 'MeshLambertNodeMaterial',
        color: toHex( rgb ),
        emissive: toHex( emissiveRgb ),
        opacity: ! connected.has( 'opacity' ) && typeof data.opacity === 'number' ? data.opacity : undefined,
        side: data.side,
        transparent: data.transparent,
        depthWrite: data.depthWrite,
      };
      continue;
    }
    if ( typeLower === 'meshnormalmaterial' ) {
      const connected = getConnectedMaterialHandles( n.id, n.type, edges );
      engineNodes[ n.id ] = {
        type: 'output',
        position: n.position,
        materialClass: 'MeshNormalNodeMaterial',
        opacity: ! connected.has( 'opacity' ) && typeof data.opacity === 'number' ? data.opacity : undefined,
        side: data.side,
        transparent: data.transparent,
        depthWrite: data.depthWrite,
      };
      continue;
    }
    if ( typeLower === 'pointsmaterial' ) {
      const connected = getConnectedMaterialHandles( n.id, n.type, edges );
      const rgb = ! connected.has( 'color' ) ? hexToRgb( data.color ) : null;
      const toHex = ( r ) => r != null ? ( ( r.r * 255 ) << 16 | ( r.g * 255 ) << 8 | ( r.b * 255 ) ) : undefined;
      engineNodes[ n.id ] = {
        type: 'output',
        position: n.position,
        materialClass: 'PointsNodeMaterial',
        color: toHex( rgb ),
        opacity: ! connected.has( 'opacity' ) && typeof data.opacity === 'number' ? data.opacity : undefined,
        side: data.side,
        transparent: data.transparent,
        depthWrite: data.depthWrite,
      };
      continue;
    }
    if ( typeLower === 'spritenodematerial' ) {
      const rgb = hexToRgb( data.color );
      engineNodes[ n.id ] = {
        type: 'output',
        position: n.position,
        materialClass: 'SpriteNodeMaterial',
        color: rgb != null ? ( ( rgb.r * 255 ) << 16 | ( rgb.g * 255 ) << 8 | ( rgb.b * 255 ) ) : undefined,
        side: data.side,
        transparent: data.transparent,
        depthWrite: data.depthWrite,
      };
      continue;
    }
    switch ( typeLower ) {
      case 'color': {
        const rgb = hexToRgb( data.color );
        engineNodes[ n.id ] = {
          type: 'Color',
          r: rgb ? rgb.r : ( typeof data.r === 'number' ? data.r : 1 ),
          g: rgb ? rgb.g : ( typeof data.g === 'number' ? data.g : 1 ),
          b: rgb ? rgb.b : ( typeof data.b === 'number' ? data.b : 1 ),
          position: n.position,
        };
        break;
      }
      case 'float':
        engineNodes[ n.id ] = {
          type: 'float',
          value: typeof data.value === 'number' ? data.value : 0,
          position: n.position,
        };
        break;
      case 'vec2':
        engineNodes[ n.id ] = {
          type: 'Vec2',
          x: typeof data.x === 'number' ? data.x : 0,
          y: typeof data.y === 'number' ? data.y : 0,
          position: n.position,
        };
        break;
      case 'vec3':
        engineNodes[ n.id ] = {
          type: 'Vec3',
          x: typeof data.x === 'number' ? data.x : 0,
          y: typeof data.y === 'number' ? data.y : 0,
          z: typeof data.z === 'number' ? data.z : 0,
          position: n.position,
        };
        break;
      case 'vec4':
        engineNodes[ n.id ] = {
          type: 'Vec4',
          x: typeof data.x === 'number' ? data.x : 0,
          y: typeof data.y === 'number' ? data.y : 0,
          z: typeof data.z === 'number' ? data.z : 0,
          w: typeof data.w === 'number' ? data.w : 0,
          position: n.position,
        };
        break;
      case 'time':
        engineNodes[ n.id ] = { type: 'time', position: n.position };
        break;
      case 'add':
      case 'subtract':
      case 'multiply':
      case 'divide':
      case 'min':
      case 'max':
      case 'mod':
      case 'power':
      case 'step':
      case 'dot':
      case 'distance':
      case 'cross':
      case 'equals':
      case 'difference':
        engineNodes[ n.id ] = { type: n.type.charAt( 0 ).toUpperCase() + n.type.slice( 1 ), position: n.position };
        break;
      case 'mul':
        engineNodes[ n.id ] = { type: 'Multiply', position: n.position };
        break;
      case 'mix':
      case 'clamp':
      case 'smoothstep':
      case 'remap':
      case 'remapClamp':
        engineNodes[ n.id ] = { type: n.type.charAt( 0 ).toUpperCase() + n.type.slice( 1 ), position: n.position };
        break;
      case 'oneMinusX':
        engineNodes[ n.id ] = { type: 'OneMinusX', position: n.position };
        break;
      case 'oneDivX':
        engineNodes[ n.id ] = { type: 'OneDivX', position: n.position };
        break;
      case 'abs':
      case 'acos':
      case 'asin':
      case 'atan':
      case 'cbrt':
      case 'ceil':
      case 'cos':
      case 'degrees':
      case 'dfdx':
      case 'dfdy':
      case 'exp':
      case 'exp2':
      case 'floor':
      case 'fract':
      case 'fwidth':
      case 'inverseSqrt':
      case 'length':
      case 'log':
      case 'log2':
      case 'negate':
      case 'normalize':
      case 'radians':
      case 'round':
      case 'saturate':
      case 'sign':
      case 'sin':
      case 'sqrt':
      case 'tan':
      case 'trunc':
      case 'all':
      case 'any':
      case 'pow2':
      case 'pow3':
      case 'pow4':
      case 'multiOp':
      case 'split':
        engineNodes[ n.id ] = { type: n.type.charAt( 0 ).toUpperCase() + n.type.slice( 1 ), position: n.position };
        break;
      case 'faceForward':
        engineNodes[ n.id ] = { type: 'FaceForward', position: n.position };
        break;
      case 'reflect':
        engineNodes[ n.id ] = { type: 'Reflect', position: n.position };
        break;
      case 'refract':
        engineNodes[ n.id ] = { type: 'Refract', position: n.position };
        break;
      case 'range':
        engineNodes[ n.id ] = { type: 'Range', position: n.position };
        break;
      case 'epsilon':
      case 'halfPi':
      case 'infinity':
      case 'pi':
      case 'twoPi':
        engineNodes[ n.id ] = { type: n.type.charAt( 0 ).toUpperCase() + n.type.slice( 1 ), position: n.position };
        break;
      case 'customfn': {
        const code = typeof data.code === 'string' ? data.code.trim() : '';
        const effectiveCode = code || 'Fn(([a]) => TSL.vec3(0.5, 0, 0.5))';
        const inferred = inferCustomFnOutputType( effectiveCode );
        engineNodes[ n.id ] = {
          type: 'customFn',
          position: n.position,
          code: effectiveCode,
          inputs: Array.isArray( data.inputs ) ? data.inputs : [ { id: 'a', label: 'A' }, { id: 'b', label: 'B' } ],
          outputType: ( data.outputType || inferred ).toLowerCase(),
        };
        break;
      }
      case 'positionWorld':
      case 'positionLocal':
      case 'positionView':
      case 'positionViewDirection':
      case 'normalLocal':
      case 'normalView':
      case 'normalWorld':
      case 'screenUV':
      case 'resolution':
      case 'tangentLocal':
        engineNodes[ n.id ] = { type: n.type, position: n.position };
        break;
      case 'modelPosition':
      case 'modelViewPosition':
      case 'modelNormalMatrix':
      case 'modelViewMatrix':
      case 'modelWorldMatrix':
      case 'modelScale':
      case 'modelDirection':
        engineNodes[ n.id ] = { type: n.type, position: n.position };
        break;
      case 'uv': {
        const index = typeof data.index === 'number' ? data.index : 0;
        engineNodes[ n.id ] = { type: 'uv', index, position: n.position };
        break;
      }
      case 'group':
        /* Group nodes are not added to engine graph; their edges are expanded to internal nodes below. */
        break;
      case 'triNoise3d':
      case 'interleavedGradientNoise':
      case 'noiseFloat':
      case 'noiseVec3':
      case 'noiseVec4':
      case 'fractalNoiseFloat':
      case 'fractalNoiseVec2':
      case 'fractalNoiseVec3':
      case 'fractalNoiseVec4':
      case 'cellNoiseFloat':
      case 'worleyNoiseFloat':
      case 'worleyNoiseVec2':
      case 'worleyNoiseVec3':
      case 'unifiedNoise2d':
      case 'unifiedNoise3d':
        engineNodes[ n.id ] = { type: n.type, position: n.position, ...( data && typeof data === 'object' ? data : {} ) };
        break;
      default:
        engineNodes[ n.id ] = { type: 'float', value: 0, position: n.position };
    }
  }

  const materialPinKey = ( h ) => ( h && MATERIAL_INPUT_TO_PIN[ ( String( h ).toLowerCase() ) ] ) || h;

  for ( const e of edges ) {
    let fromId = e.source;
    let toId = e.target;
    const targetHandle = e.targetHandle || 'a';
    let toPin = ( nodeMap.get( e.target ) && isOutputMaterialType( nodeMap.get( e.target ).type ) )
      ? ( materialPinKey( targetHandle ) || targetHandle )
      : targetHandle;

    const sourceNode = nodeMap.get( e.source );
    const targetNode = nodeMap.get( e.target );
    if ( sourceNode?.type === 'group' && sourceNode.data?.outHandles ) {
      const h = sourceNode.data.outHandles.find( ( x ) => x.id === e.sourceHandle );
      if ( h && h.source != null ) {
        fromId = h.source;
        /* toId and toPin unchanged */
      } else {
        continue;
      }
    }
    if ( targetNode?.type === 'group' && targetNode.data?.inHandles ) {
      const h = targetNode.data.inHandles.find( ( x ) => x.id === e.targetHandle );
      if ( h && h.target != null ) {
        toId = h.target;
        toPin = h.targetHandle;
      } else {
        continue;
      }
    }
    const finalTargetNode = nodeMap.get( toId );
    if ( finalTargetNode && isOutputMaterialType( finalTargetNode.type ) ) {
      toPin = materialPinKey( toPin ) || toPin;
    }
    if ( !engineNodes[ fromId ] || !engineNodes[ toId ] ) continue;
    engineConnections.push( {
      from: fromId,
      to: toId,
      toPin,
    } );
  }

  return {
    type: 'NodeMaterial',
    name: 'NodeMaterial',
    nodes: engineNodes,
    connections: engineConnections,
  };
}
