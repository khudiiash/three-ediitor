/**
 * Default inputs/outputs per TSL node type. Used by TSLNode for handle layout.
 * Each entry: { inputs: [ { id, label } ], outputs: [ { id, label } ] }
 * Add specific socket definitions as needed; unknown types get 1 in / 1 out.
 */
const oneOut = [ { id: 'out', label: 'Out' } ];
const oneIn = [ { id: 'in', label: 'In' } ];
const twoInOneOut = {
  inputs: [ { id: 'a', label: 'A' }, { id: 'b', label: 'B' } ],
  outputs: oneOut,
};
const oneInOneOut = { inputs: [ { id: 'a', label: 'A' } ], outputs: oneOut };
const threeInOneOut = {
  inputs: [ { id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' } ],
  outputs: oneOut,
};
const noInputsOneOut = { inputs: [], outputs: oneOut };
const customFnDefaultInputs = [ { id: 'a', label: 'A' } ];

export const NODE_DEFINITIONS = {
  customFn: { inputs: customFnDefaultInputs, outputs: oneOut },
  float: { inputs: [], outputs: [ { id: 'value', label: 'Value' } ] },
  int: { inputs: [], outputs: [ { id: 'value', label: 'Value' } ] },
  vec2: { inputs: [], outputs: [ { id: 'xy', label: 'XY' } ] },
  vec3: { inputs: [], outputs: [ { id: 'xyz', label: 'XYZ' } ] },
  vec4: { inputs: [], outputs: [ { id: 'xyzw', label: 'XYZW' } ] },
  color: { inputs: [], outputs: [ { id: 'color', label: 'Color' } ] },
  add: twoInOneOut,
  multiply: twoInOneOut,
  subtract: twoInOneOut,
  divide: twoInOneOut,
  // Math – unary (1 input)
  oneMinusX: oneInOneOut,
  oneDivX: oneInOneOut,
  abs: oneInOneOut,
  acos: oneInOneOut,
  asin: oneInOneOut,
  atan: oneInOneOut,
  cbrt: oneInOneOut,
  ceil: oneInOneOut,
  cos: oneInOneOut,
  degrees: oneInOneOut,
  dfdx: oneInOneOut,
  dfdy: oneInOneOut,
  exp: oneInOneOut,
  exp2: oneInOneOut,
  floor: oneInOneOut,
  fract: oneInOneOut,
  fwidth: oneInOneOut,
  inverseSqrt: oneInOneOut,
  length: oneInOneOut,
  log: oneInOneOut,
  log2: oneInOneOut,
  negate: oneInOneOut,
  normalize: oneInOneOut,
  radians: oneInOneOut,
  round: oneInOneOut,
  saturate: oneInOneOut,
  sign: oneInOneOut,
  sin: oneInOneOut,
  sqrt: oneInOneOut,
  tan: oneInOneOut,
  trunc: oneInOneOut,
  // Math – binary (2 inputs)
  difference: twoInOneOut,
  distance: twoInOneOut,
  dot: twoInOneOut,
  cross: twoInOneOut,
  equals: twoInOneOut,
  max: twoInOneOut,
  min: twoInOneOut,
  mod: twoInOneOut,
  power: twoInOneOut,
  step: twoInOneOut,
  faceForward: { inputs: [ { id: 'n', label: 'N' }, { id: 'i', label: 'I' }, { id: 'ng', label: 'Ng' } ], outputs: oneOut },
  reflect: { inputs: [ { id: 'i', label: 'I' }, { id: 'n', label: 'N' } ], outputs: oneOut },
  refract: { inputs: [ { id: 'i', label: 'I' }, { id: 'n', label: 'N' }, { id: 'eta', label: 'Eta' } ], outputs: oneOut },
  // Math – ternary (3 inputs)
  clamp: threeInOneOut,
  mix: threeInOneOut,
  smoothstep: threeInOneOut,
  remap: threeInOneOut,
  remapClamp: threeInOneOut,
  // Math – constants (no inputs)
  epsilon: noInputsOneOut,
  halfPi: noInputsOneOut,
  infinity: noInputsOneOut,
  pi: noInputsOneOut,
  twoPi: noInputsOneOut,
  // Math – special
  all: oneInOneOut,
  any: oneInOneOut,
  range: { inputs: [ { id: 'min', label: 'Min' }, { id: 'max', label: 'Max' }, { id: 'value', label: 'Value' } ], outputs: oneOut },
  multiOp: twoInOneOut,
  pow2: oneInOneOut,
  pow3: oneInOneOut,
  pow4: oneInOneOut,
  split: oneInOneOut,
  meshStandardMaterial: {
    inputs: [
      { id: 'color', label: 'Color' },
      { id: 'roughness', label: 'Roughness' },
      { id: 'metalness', label: 'Metalness' },
      { id: 'emissive', label: 'Emissive' },
    ],
    outputs: oneOut,
  },
  meshBasicMaterial: {
    inputs: [ { id: 'color', label: 'Color' }, { id: 'opacity', label: 'Opacity' } ],
    outputs: oneOut,
  },
  meshPhongMaterial: {
    inputs: [
      { id: 'color', label: 'Color' },
      { id: 'emissive', label: 'Emissive' },
      { id: 'specular', label: 'Specular' },
      { id: 'shininess', label: 'Shininess' },
      { id: 'opacity', label: 'Opacity' },
    ],
    outputs: oneOut,
  },
  meshPhysicalMaterial: {
    inputs: [
      { id: 'color', label: 'Color' },
      { id: 'normal', label: 'Normal' },
      { id: 'roughness', label: 'Roughness' },
      { id: 'metalness', label: 'Metalness' },
      { id: 'emissive', label: 'Emissive' },
      { id: 'clearcoat', label: 'Clearcoat' },
      { id: 'clearcoatRoughness', label: 'Clearcoat Roughness' },
      { id: 'clearcoatNormal', label: 'Clearcoat Normal' },
      { id: 'sheen', label: 'Sheen' },
      { id: 'sheenRoughness', label: 'Sheen Roughness' },
      { id: 'iridescence', label: 'Iridescence' },
      { id: 'iridescenceIOR', label: 'Iridescence IOR' },
      { id: 'iridescenceThickness', label: 'Iridescence Thickness' },
      { id: 'transmission', label: 'Transmission' },
      { id: 'thickness', label: 'Thickness' },
      { id: 'ior', label: 'IOR' },
      { id: 'dispersion', label: 'Dispersion' },
      { id: 'anisotropy', label: 'Anisotropy' },
      { id: 'attenuationColor', label: 'Attenuation Color' },
      { id: 'attenuationDistance', label: 'Attenuation Distance' },
      { id: 'specularColor', label: 'Specular Color' },
      { id: 'specularIntensity', label: 'Specular Intensity' },
      { id: 'ao', label: 'AO' },
      { id: 'opacity', label: 'Opacity' },
      { id: 'position', label: 'Position' },
      { id: 'backdrop', label: 'Backdrop' },
      { id: 'backdropAlpha', label: 'Backdrop Alpha' },
    ],
    outputs: oneOut,
  },
  meshSSSMaterial: {
    inputs: [
      { id: 'color', label: 'Color' },
      { id: 'normal', label: 'Normal' },
      { id: 'roughness', label: 'Roughness' },
      { id: 'metalness', label: 'Metalness' },
      { id: 'emissive', label: 'Emissive' },
      { id: 'clearcoat', label: 'Clearcoat' },
      { id: 'clearcoatRoughness', label: 'Clearcoat Roughness' },
      { id: 'sheen', label: 'Sheen' },
      { id: 'sheenRoughness', label: 'Sheen Roughness' },
      { id: 'iridescence', label: 'Iridescence' },
      { id: 'transmission', label: 'Transmission' },
      { id: 'thickness', label: 'Thickness' },
      { id: 'ior', label: 'IOR' },
      { id: 'dispersion', label: 'Dispersion' },
      { id: 'ao', label: 'AO' },
      { id: 'opacity', label: 'Opacity' },
      { id: 'position', label: 'Position' },
      { id: 'backdrop', label: 'Backdrop' },
      { id: 'backdropAlpha', label: 'Backdrop Alpha' },
    ],
    outputs: oneOut,
  },
  meshToonMaterial: {
    inputs: [
      { id: 'color', label: 'Color' },
      { id: 'emissive', label: 'Emissive' },
      { id: 'opacity', label: 'Opacity' },
      { id: 'position', label: 'Position' },
      { id: 'backdrop', label: 'Backdrop' },
      { id: 'backdropAlpha', label: 'Backdrop Alpha' },
    ],
    outputs: oneOut,
  },
  meshLambertMaterial: {
    inputs: [
      { id: 'color', label: 'Color' },
      { id: 'emissive', label: 'Emissive' },
      { id: 'opacity', label: 'Opacity' },
      { id: 'position', label: 'Position' },
      { id: 'backdrop', label: 'Backdrop' },
      { id: 'backdropAlpha', label: 'Backdrop Alpha' },
    ],
    outputs: oneOut,
  },
  meshNormalMaterial: {
    inputs: [
      { id: 'opacity', label: 'Opacity' },
      { id: 'position', label: 'Position' },
      { id: 'backdrop', label: 'Backdrop' },
      { id: 'backdropAlpha', label: 'Backdrop Alpha' },
    ],
    outputs: oneOut,
  },
  pointsMaterial: {
    inputs: [
      { id: 'color', label: 'Color' },
      { id: 'opacity', label: 'Opacity' },
      { id: 'position', label: 'Position' },
      { id: 'size', label: 'Size' },
      { id: 'backdrop', label: 'Backdrop' },
      { id: 'backdropAlpha', label: 'Backdrop Alpha' },
    ],
    outputs: oneOut,
  },
  output: { inputs: oneIn, outputs: [] },
  group: {
    inputs: [ { id: 'in', label: 'In' } ],
    outputs: [ { id: 'out', label: 'Out' } ],
  },
  uv: { inputs: [], outputs: [ { id: 'uv', label: 'UV' } ] },
  screenUV: { inputs: [], outputs: [ { id: 'uv', label: 'UV' } ] },
  time: { inputs: [], outputs: [ { id: 'value', label: 'Time' } ] },
};

function getDefinition( nodeType, nodeData ) {
  const base = NODE_DEFINITIONS[ nodeType ] || {
    inputs: [ { id: 'in', label: 'In' } ],
    outputs: [ { id: 'out', label: 'Out' } ],
  };
  if ( nodeType === 'customFn' && nodeData?.inputs?.length ) {
    return { inputs: nodeData.inputs, outputs: base.outputs };
  }
  return base;
}

export { getDefinition };
