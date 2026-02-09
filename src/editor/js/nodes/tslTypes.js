import { inferCustomFnOutputType } from './parseCustomFnCode.js';

/**
 * TSL data type colors for handles and edges.
 * When a handle is connected, it and its edge use this color.
 */
export const TYPE_COLORS = {
  float: '#9c27b0',
  int: '#9c27b0',
  vec2: '#2196f3',
  vec3: '#ffc107',
  vec4: '#e91e63',
  color: '#e91e63',
  texture: '#4caf50',
  bool: '#795548',
};

/** Math node ids – used for fallback handle type (float) when not explicitly defined */
const MATH_NODE_IDS = new Set( [
  'oneMinusX', 'oneDivX', 'abs', 'acos', 'add', 'all', 'any', 'asin', 'atan', 'cbrt', 'ceil', 'clamp', 'cos', 'cross',
  'customFn', 'degrees', 'dfdx', 'dfdy', 'difference', 'distance', 'divide', 'dot', 'epsilon', 'equals', 'exp', 'exp2', 'faceForward',
  'floor', 'fract', 'fwidth', 'halfPi', 'infinity', 'inverseSqrt', 'length', 'log', 'log2', 'max', 'min', 'mix', 'mod',
  'multiOp', 'multiply', 'negate', 'normalize', 'pi', 'pow2', 'pow3', 'pow4', 'power', 'radians', 'range', 'reflect',
  'refract', 'remap', 'remapClamp', 'round', 'saturate', 'sign', 'sin', 'smoothstep', 'split', 'sqrt', 'step', 'subtract',
  'tan', 'trunc', 'twoPi', 'mul'
] );

/**
 * Returns the TSL type for a given node type and handle id, or null.
 * Used for coloring handles and edges.
 * For customFn, nodeData.inputTypes[handleId] is used when provided (use 'any' to accept any type).
 */
export function getHandleType( nodeType, handleId, nodeData ) {
  if ( !nodeType || !handleId ) return null;
  if ( nodeType === 'customFn' ) {
    if ( handleId === 'out' ) return nodeData?.outputType || ( nodeData?.code ? inferCustomFnOutputType( nodeData.code ) : 'float' );
    if ( nodeData?.inputTypes?.[ handleId ] ) {
      const t = nodeData.inputTypes[ handleId ];
      return t === 'any' ? null : t;
    }
  }
  const key = `${nodeType}:${handleId}`;
  if ( HANDLE_TYPES[ key ] != null ) return HANDLE_TYPES[ key ];
  if ( MATH_NODE_IDS.has( nodeType ) ) {
    if ( [ 'a', 'b', 'c', 'in', 'out' ].includes( handleId ) ) return 'float';
    if ( [ 'n', 'i', 'ng', 'eta' ].includes( handleId ) ) return 'vec3';
    if ( [ 'min', 'max', 'value' ].includes( handleId ) ) return 'float';
  }
  return null;
}

export function getTypeColor( tslType ) {
  return tslType ? TYPE_COLORS[ tslType ] ?? null : null;
}

const HANDLE_TYPES = {
  // Constant nodes
  'color:color': 'vec4',
  'color:r': 'float',
  'color:g': 'float',
  'color:b': 'float',
  'color:rgb': 'vec3',
  'float:value': 'float',
  'float:out': 'float',
  'int:value': 'int',
  'int:out': 'int',
  'vec2:x': 'float',
  'vec2:y': 'float',
  'vec2:xy': 'vec2',
  'vec3:x': 'float',
  'vec3:y': 'float',
  'vec3:z': 'float',
  'vec3:xyz': 'vec3',
  'vec4:x': 'float',
  'vec4:y': 'float',
  'vec4:z': 'float',
  'vec4:w': 'float',
  'vec4:xyzw': 'vec4',
  // MeshStandardMaterial
  'meshStandardMaterial:color': 'vec3',
  'meshStandardMaterial:normal': 'vec3',
  'meshStandardMaterial:roughness': 'float',
  'meshStandardMaterial:metalness': 'float',
  'meshStandardMaterial:emissive': 'vec3',
  'meshStandardMaterial:ao': 'float',
  'meshStandardMaterial:opacity': 'float',
  'meshStandardMaterial:position': 'vec3',
  'meshStandardMaterial:output': 'vec4',
  'meshStandardMaterial:backdrop': 'texture',
  'meshStandardMaterial:backdropAlpha': 'float',
  // MeshBasicMaterial
  'meshBasicMaterial:color': 'vec3',
  'meshBasicMaterial:opacity': 'float',
  'meshBasicMaterial:output': 'vec4',
  // MeshPhongMaterial
  'meshPhongMaterial:color': 'vec3',
  'meshPhongMaterial:emissive': 'vec3',
  'meshPhongMaterial:specular': 'vec3',
  'meshPhongMaterial:shininess': 'float',
  'meshPhongMaterial:opacity': 'float',
  'meshPhongMaterial:output': 'vec4',
  // MeshPhysicalMaterial
  'meshPhysicalMaterial:color': 'vec3',
  'meshPhysicalMaterial:normal': 'vec3',
  'meshPhysicalMaterial:roughness': 'float',
  'meshPhysicalMaterial:metalness': 'float',
  'meshPhysicalMaterial:emissive': 'vec3',
  'meshPhysicalMaterial:clearcoat': 'float',
  'meshPhysicalMaterial:clearcoatRoughness': 'float',
  'meshPhysicalMaterial:clearcoatNormal': 'vec3',
  'meshPhysicalMaterial:sheen': 'vec3',
  'meshPhysicalMaterial:sheenRoughness': 'float',
  'meshPhysicalMaterial:iridescence': 'float',
  'meshPhysicalMaterial:iridescenceIOR': 'float',
  'meshPhysicalMaterial:iridescenceThickness': 'float',
  'meshPhysicalMaterial:transmission': 'float',
  'meshPhysicalMaterial:thickness': 'float',
  'meshPhysicalMaterial:ior': 'float',
  'meshPhysicalMaterial:dispersion': 'float',
  'meshPhysicalMaterial:anisotropy': 'float',
  'meshPhysicalMaterial:attenuationColor': 'vec3',
  'meshPhysicalMaterial:attenuationDistance': 'float',
  'meshPhysicalMaterial:specularColor': 'vec3',
  'meshPhysicalMaterial:specularIntensity': 'float',
  'meshPhysicalMaterial:ao': 'float',
  'meshPhysicalMaterial:opacity': 'float',
  'meshPhysicalMaterial:position': 'vec3',
  'meshPhysicalMaterial:output': 'vec4',
  'meshPhysicalMaterial:backdrop': 'texture',
  'meshPhysicalMaterial:backdropAlpha': 'float',
  // MeshSSSMaterial
  'meshSSSMaterial:color': 'vec3',
  'meshSSSMaterial:normal': 'vec3',
  'meshSSSMaterial:roughness': 'float',
  'meshSSSMaterial:metalness': 'float',
  'meshSSSMaterial:emissive': 'vec3',
  'meshSSSMaterial:clearcoat': 'float',
  'meshSSSMaterial:clearcoatRoughness': 'float',
  'meshSSSMaterial:sheen': 'vec3',
  'meshSSSMaterial:sheenRoughness': 'float',
  'meshSSSMaterial:iridescence': 'float',
  'meshSSSMaterial:transmission': 'float',
  'meshSSSMaterial:thickness': 'float',
  'meshSSSMaterial:ior': 'float',
  'meshSSSMaterial:dispersion': 'float',
  'meshSSSMaterial:ao': 'float',
  'meshSSSMaterial:opacity': 'float',
  'meshSSSMaterial:position': 'vec3',
  'meshSSSMaterial:backdrop': 'texture',
  'meshSSSMaterial:backdropAlpha': 'float',
  // MeshToonMaterial
  'meshToonMaterial:color': 'vec3',
  'meshToonMaterial:emissive': 'vec3',
  'meshToonMaterial:opacity': 'float',
  'meshToonMaterial:position': 'vec3',
  'meshToonMaterial:backdrop': 'texture',
  'meshToonMaterial:backdropAlpha': 'float',
  // MeshLambertMaterial
  'meshLambertMaterial:color': 'vec3',
  'meshLambertMaterial:emissive': 'vec3',
  'meshLambertMaterial:opacity': 'float',
  'meshLambertMaterial:position': 'vec3',
  'meshLambertMaterial:backdrop': 'texture',
  'meshLambertMaterial:backdropAlpha': 'float',
  // MeshNormalMaterial
  'meshNormalMaterial:opacity': 'float',
  'meshNormalMaterial:position': 'vec3',
  'meshNormalMaterial:backdrop': 'texture',
  'meshNormalMaterial:backdropAlpha': 'float',
  // PointsMaterial
  'pointsMaterial:color': 'vec3',
  'pointsMaterial:opacity': 'float',
  'pointsMaterial:position': 'vec3',
  'pointsMaterial:size': 'vec2',
  'pointsMaterial:backdrop': 'texture',
  'pointsMaterial:backdropAlpha': 'float',
  // Geometry nodes
  'instanceCount:out': 'int',
  'instanceIndex:out': 'int',
  'normalLocal:x': 'float',
  'normalLocal:y': 'float',
  'normalLocal:z': 'float',
  'normalLocal:xyz': 'vec3',
  'normalView:x': 'float',
  'normalView:y': 'float',
  'normalView:z': 'float',
  'normalView:xyz': 'vec3',
  'normalWorld:x': 'float',
  'normalWorld:y': 'float',
  'normalWorld:z': 'float',
  'normalWorld:xyz': 'vec3',
  'positionLocal:x': 'float',
  'positionLocal:y': 'float',
  'positionLocal:z': 'float',
  'positionLocal:xyz': 'vec3',
  'positionView:x': 'float',
  'positionView:y': 'float',
  'positionView:z': 'float',
  'positionView:xyz': 'vec3',
  'positionViewDirection:x': 'float',
  'positionViewDirection:y': 'float',
  'positionViewDirection:z': 'float',
  'positionViewDirection:xyz': 'vec3',
  'positionWorld:x': 'float',
  'positionWorld:y': 'float',
  'positionWorld:z': 'float',
  'positionWorld:xyz': 'vec3',
  'resolution:x': 'float',
  'resolution:y': 'float',
  'resolution:xy': 'vec2',
  'screenUV:x': 'float',
  'screenUV:y': 'float',
  'screenUV:xy': 'vec2',
  'tangentLocal:x': 'float',
  'tangentLocal:y': 'float',
  'tangentLocal:z': 'float',
  'tangentLocal:w': 'float',
  'tangentLocal:xyzw': 'vec4',
  'time:out': 'float',
  'uv:index': 'int',
  'uv:x': 'float',
  'uv:y': 'float',
  'uv:xy': 'vec2',
};
