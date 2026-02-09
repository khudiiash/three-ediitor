/**
 * Editable properties per node type for the node parameters panel.
 * Each entry: { key, label, type: 'number'|'color'|'checkbox'|'select', options?: [{ value, label }], default }
 */

export const NODE_EDITABLE_PROPERTIES = {
  meshStandardMaterial: [
    { key: 'color', label: 'COLOR', type: 'color', default: '#ffffff' },
   { key: 'emissive', label: 'EMISSIVE', type: 'color', default: '#000000' },
    { key: 'roughness', label: 'ROUGHNESS', type: 'number', default: 0.5, min: 0, max: 1, step: 0.01 },
    { key: 'metalness', label: 'METALNESS', type: 'number', default: 0, min: 0, max: 1, step: 0.01 },
    { key: 'ao', label: 'AO', type: 'number', default: 1, min: 0, max: 1, step: 0.01 },
    { key: 'opacity', label: 'OPACITY', type: 'number', default: 1, min: 0, max: 1, step: 0.01 },
    { key: 'side', label: 'SIDE', type: 'select', default: 0, options: [ { value: 0, label: 'Front' }, { value: 1, label: 'Back' }, { value: 2, label: 'Double' } ] },
    { key: 'transparent', label: 'TRANSPARENT', type: 'checkbox', default: false },
    { key: 'depthWrite', label: 'DEPTH WRITE', type: 'checkbox', default: true },
  ],
  meshBasicMaterial: [
    { key: 'color', label: 'COLOR', type: 'color', default: '#ffffff' },
    { key: 'opacity', label: 'OPACITY', type: 'number', default: 1, min: 0, max: 1, step: 0.01 },
    { key: 'side', label: 'SIDE', type: 'select', default: 0, options: [ { value: 0, label: 'Front' }, { value: 1, label: 'Back' }, { value: 2, label: 'Double' } ] },
    { key: 'transparent', label: 'TRANSPARENT', type: 'checkbox', default: false },
    { key: 'depthWrite', label: 'DEPTH WRITE', type: 'checkbox', default: true },
  ],
  meshPhongMaterial: [
    { key: 'color', label: 'COLOR', type: 'color', default: '#ffffff' },
    { key: 'emissive', label: 'EMISSIVE', type: 'color', default: '#000000' },
    { key: 'specular', label: 'SPECULAR', type: 'color', default: '#111111' },
    { key: 'shininess', label: 'SHININESS', type: 'number', default: 30, min: 0, max: 200, step: 1 },
    { key: 'opacity', label: 'OPACITY', type: 'number', default: 1, min: 0, max: 1, step: 0.01 },
    { key: 'side', label: 'SIDE', type: 'select', default: 0, options: [ { value: 0, label: 'Front' }, { value: 1, label: 'Back' }, { value: 2, label: 'Double' } ] },
    { key: 'transparent', label: 'TRANSPARENT', type: 'checkbox', default: false },
    { key: 'depthWrite', label: 'DEPTH WRITE', type: 'checkbox', default: true },
  ],
  meshPhysicalMaterial: [
    { key: 'color', label: 'COLOR', type: 'color', default: '#ffffff' },
    { key: 'emissive', label: 'EMISSIVE', type: 'color', default: '#000000' },
    { key: 'roughness', label: 'ROUGHNESS', type: 'number', default: 0.5, min: 0, max: 1, step: 0.01 },
    { key: 'metalness', label: 'METALNESS', type: 'number', default: 0, min: 0, max: 1, step: 0.01 },
    { key: 'clearcoat', label: 'CLEARCOAT', type: 'number', default: 0, min: 0, max: 1, step: 0.01 },
    { key: 'clearcoatRoughness', label: 'CLEARCOAT ROUGH', type: 'number', default: 0, min: 0, max: 1, step: 0.01 },
    { key: 'sheen', label: 'SHEEN', type: 'color', default: '#000000' },
    { key: 'sheenRoughness', label: 'SHEEN ROUGH', type: 'number', default: 0, min: 0, max: 1, step: 0.01 },
    { key: 'iridescence', label: 'IRIDESCENCE', type: 'number', default: 0, min: 0, max: 1, step: 0.01 },
    { key: 'iridescenceIOR', label: 'IRIDESCENCE IOR', type: 'number', default: 1.3, min: 1, max: 2, step: 0.01 },
    { key: 'iridescenceThickness', label: 'IRIDESCENCE THICKNESS', type: 'number', default: 0, min: 0, max: 2000, step: 1 },
    { key: 'transmission', label: 'TRANSMISSION', type: 'number', default: 0, min: 0, max: 1, step: 0.01 },
    { key: 'thickness', label: 'THICKNESS', type: 'number', default: 0, min: 0, max: 1, step: 0.01 },
    { key: 'ior', label: 'IOR', type: 'number', default: 1.5, min: 1, max: 2.333, step: 0.01 },
    { key: 'dispersion', label: 'DISPERSION', type: 'number', default: 0, min: 0, max: 5, step: 0.01 },
    { key: 'anisotropy', label: 'ANISOTROPY', type: 'number', default: 0, min: 0, max: 1, step: 0.01 },
    { key: 'attenuationColor', label: 'ATTENUATION COLOR', type: 'color', default: '#ffffff' },
    { key: 'attenuationDistance', label: 'ATTENUATION DIST', type: 'number', default: 0, min: 0, max: 100, step: 0.1 },
    { key: 'specularColor', label: 'SPECULAR COLOR', type: 'color', default: '#ffffff' },
    { key: 'specularIntensity', label: 'SPECULAR INTENSITY', type: 'number', default: 1, min: 0, max: 2, step: 0.01 },
    { key: 'ao', label: 'AO', type: 'number', default: 1, min: 0, max: 1, step: 0.01 },
    { key: 'opacity', label: 'OPACITY', type: 'number', default: 1, min: 0, max: 1, step: 0.01 },
    { key: 'side', label: 'SIDE', type: 'select', default: 0, options: [ { value: 0, label: 'Front' }, { value: 1, label: 'Back' }, { value: 2, label: 'Double' } ] },
    { key: 'transparent', label: 'TRANSPARENT', type: 'checkbox', default: false },
    { key: 'depthWrite', label: 'DEPTH WRITE', type: 'checkbox', default: true },
  ],
  meshSSSMaterial: [
    { key: 'color', label: 'COLOR', type: 'color', default: '#ffffff' },
    { key: 'emissive', label: 'EMISSIVE', type: 'color', default: '#000000' },
    { key: 'roughness', label: 'ROUGHNESS', type: 'number', default: 0.5, min: 0, max: 1, step: 0.01 },
    { key: 'metalness', label: 'METALNESS', type: 'number', default: 0, min: 0, max: 1, step: 0.01 },
    { key: 'clearcoat', label: 'CLEARCOAT', type: 'number', default: 0, min: 0, max: 1, step: 0.01 },
    { key: 'clearcoatRoughness', label: 'CLEARCOAT ROUGH', type: 'number', default: 0, min: 0, max: 1, step: 0.01 },
    { key: 'sheen', label: 'SHEEN', type: 'color', default: '#000000' },
    { key: 'sheenRoughness', label: 'SHEEN ROUGH', type: 'number', default: 0, min: 0, max: 1, step: 0.01 },
    { key: 'iridescence', label: 'IRIDESCENCE', type: 'number', default: 0, min: 0, max: 1, step: 0.01 },
    { key: 'transmission', label: 'TRANSMISSION', type: 'number', default: 0, min: 0, max: 1, step: 0.01 },
    { key: 'thickness', label: 'THICKNESS', type: 'number', default: 0, min: 0, max: 1, step: 0.01 },
    { key: 'ior', label: 'IOR', type: 'number', default: 1.5, min: 1, max: 2.333, step: 0.01 },
    { key: 'dispersion', label: 'DISPERSION', type: 'number', default: 0, min: 0, max: 5, step: 0.01 },
    { key: 'ao', label: 'AO', type: 'number', default: 1, min: 0, max: 1, step: 0.01 },
    { key: 'opacity', label: 'OPACITY', type: 'number', default: 1, min: 0, max: 1, step: 0.01 },
    { key: 'side', label: 'SIDE', type: 'select', default: 0, options: [ { value: 0, label: 'Front' }, { value: 1, label: 'Back' }, { value: 2, label: 'Double' } ] },
    { key: 'transparent', label: 'TRANSPARENT', type: 'checkbox', default: false },
    { key: 'depthWrite', label: 'DEPTH WRITE', type: 'checkbox', default: true },
  ],
  meshToonMaterial: [
    { key: 'color', label: 'COLOR', type: 'color', default: '#ffffff' },
    { key: 'emissive', label: 'EMISSIVE', type: 'color', default: '#000000' },
    { key: 'opacity', label: 'OPACITY', type: 'number', default: 1, min: 0, max: 1, step: 0.01 },
    { key: 'side', label: 'SIDE', type: 'select', default: 0, options: [ { value: 0, label: 'Front' }, { value: 1, label: 'Back' }, { value: 2, label: 'Double' } ] },
    { key: 'transparent', label: 'TRANSPARENT', type: 'checkbox', default: false },
    { key: 'depthWrite', label: 'DEPTH WRITE', type: 'checkbox', default: true },
  ],
  meshLambertMaterial: [
    { key: 'color', label: 'COLOR', type: 'color', default: '#ffffff' },
    { key: 'emissive', label: 'EMISSIVE', type: 'color', default: '#000000' },
    { key: 'opacity', label: 'OPACITY', type: 'number', default: 1, min: 0, max: 1, step: 0.01 },
    { key: 'side', label: 'SIDE', type: 'select', default: 0, options: [ { value: 0, label: 'Front' }, { value: 1, label: 'Back' }, { value: 2, label: 'Double' } ] },
    { key: 'transparent', label: 'TRANSPARENT', type: 'checkbox', default: false },
    { key: 'depthWrite', label: 'DEPTH WRITE', type: 'checkbox', default: true },
  ],
  meshNormalMaterial: [
    { key: 'opacity', label: 'OPACITY', type: 'number', default: 1, min: 0, max: 1, step: 0.01 },
    { key: 'side', label: 'SIDE', type: 'select', default: 0, options: [ { value: 0, label: 'Front' }, { value: 1, label: 'Back' }, { value: 2, label: 'Double' } ] },
    { key: 'transparent', label: 'TRANSPARENT', type: 'checkbox', default: false },
    { key: 'depthWrite', label: 'DEPTH WRITE', type: 'checkbox', default: true },
  ],
  pointsMaterial: [
    { key: 'color', label: 'COLOR', type: 'color', default: '#ffffff' },
    { key: 'opacity', label: 'OPACITY', type: 'number', default: 1, min: 0, max: 1, step: 0.01 },
    { key: 'side', label: 'SIDE', type: 'select', default: 0, options: [ { value: 0, label: 'Front' }, { value: 1, label: 'Back' }, { value: 2, label: 'Double' } ] },
    { key: 'transparent', label: 'TRANSPARENT', type: 'checkbox', default: false },
    { key: 'depthWrite', label: 'DEPTH WRITE', type: 'checkbox', default: true },
  ],
  float: [
    { key: 'value', label: 'VALUE', type: 'number', default: 0 },
  ],
  int: [
    { key: 'value', label: 'VALUE', type: 'number', default: 0, step: 1 },
  ],
  color: [
    { key: 'color', label: 'COLOR', type: 'color', default: '#ffffff' },
  ],
  vec2: [
    { key: 'x', label: 'X', type: 'number', default: 0 },
    { key: 'y', label: 'Y', type: 'number', default: 0 },
  ],
  vec3: [
    { key: 'x', label: 'X', type: 'number', default: 0 },
    { key: 'y', label: 'Y', type: 'number', default: 0 },
    { key: 'z', label: 'Z', type: 'number', default: 0 },
  ],
  vec4: [
    { key: 'x', label: 'X', type: 'number', default: 0 },
    { key: 'y', label: 'Y', type: 'number', default: 0 },
    { key: 'z', label: 'Z', type: 'number', default: 0 },
    { key: 'w', label: 'W', type: 'number', default: 0 },
  ],
  group: [
    { key: 'groupName', label: 'GROUP NAME', type: 'text', default: 'Group' },
  ],
  customFn: [
    { key: 'code', label: 'CODE', type: 'code', default: 'Fn(([a]) => TSL.vec3(0.5, 0, 0.5))' },
  ],
};

/**
 * For each node type, which editable property key is driven by which input handle.
 * When an edge targets that handle, the property is not editable in the params panel.
 */
export const EDITABLE_PROP_TO_INPUT_HANDLE = {
  meshStandardMaterial: { color: 'color', emissive: 'emissive', roughness: 'roughness', metalness: 'metalness', ao: 'ao', opacity: 'opacity' },
  meshBasicMaterial: { color: 'color', opacity: 'opacity' },
  meshPhongMaterial: { color: 'color', emissive: 'emissive', specular: 'specular', shininess: 'shininess', opacity: 'opacity' },
  meshPhysicalMaterial: { color: 'color', emissive: 'emissive', roughness: 'roughness', metalness: 'metalness', clearcoat: 'clearcoat', clearcoatRoughness: 'clearcoatRoughness', sheen: 'sheen', sheenRoughness: 'sheenRoughness', iridescence: 'iridescence', iridescenceIOR: 'iridescenceIOR', iridescenceThickness: 'iridescenceThickness', transmission: 'transmission', thickness: 'thickness', ior: 'ior', dispersion: 'dispersion', anisotropy: 'anisotropy', attenuationColor: 'attenuationColor', attenuationDistance: 'attenuationDistance', specularColor: 'specularColor', specularIntensity: 'specularIntensity', ao: 'ao', opacity: 'opacity' },
  meshSSSMaterial: { color: 'color', emissive: 'emissive', roughness: 'roughness', metalness: 'metalness', clearcoat: 'clearcoat', clearcoatRoughness: 'clearcoatRoughness', sheen: 'sheen', sheenRoughness: 'sheenRoughness', iridescence: 'iridescence', transmission: 'transmission', thickness: 'thickness', ior: 'ior', dispersion: 'dispersion', ao: 'ao', opacity: 'opacity' },
  meshToonMaterial: { color: 'color', emissive: 'emissive', opacity: 'opacity' },
  meshLambertMaterial: { color: 'color', emissive: 'emissive', opacity: 'opacity' },
  meshNormalMaterial: { opacity: 'opacity' },
  pointsMaterial: { color: 'color', opacity: 'opacity' },
  color: { color: 'color' },
  float: { value: 'value' },
  int: { value: 'value' },
  vec2: { x: 'x', y: 'y' },
  vec3: { x: 'x', y: 'y', z: 'z' },
  vec4: { x: 'x', y: 'y', z: 'z', w: 'w' },
  customFn: {}, // code is not driven by an input handle
};

/**
 * @param {string} nodeType - e.g. 'meshStandardMaterial', 'float'
 * @returns {Array<{ key, label, type, options?, default, min?, max?, step? }>}
 */
export function getEditableProperties( nodeType ) {
  return NODE_EDITABLE_PROPERTIES[ nodeType ] || [];
}

/**
 * @param {string} nodeType
 * @param {string} propKey
 * @returns {string|null} input handle id if this prop is driven by an input, else null
 */
export function getInputHandleForProp( nodeType, propKey ) {
  const map = EDITABLE_PROP_TO_INPUT_HANDLE[ nodeType ];
  return map && map[ propKey ] != null ? map[ propKey ] : null;
}
