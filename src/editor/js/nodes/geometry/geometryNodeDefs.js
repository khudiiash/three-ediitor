/**
 * Geometry node definitions: title and input/output rows for each node type.
 * Used by GeometryNode.jsx to render geometry nodes.
 */
export const GEOMETRY_NODE_DEFS = {
  instanceCount: {
    title: 'INSTANCE COUNT',
    outputs: [ { id: 'out', label: 'OUT', type: 'int' } ],
  },
  instanceIndex: {
    title: 'INSTANCE INDEX',
    outputs: [ { id: 'out', label: 'OUT', type: 'int' } ],
  },
  normalLocal: {
    title: 'NORMAL LOCAL',
    outputs: [
      { id: 'x', label: 'X', type: 'float' },
      { id: 'y', label: 'Y', type: 'float' },
      { id: 'z', label: 'Z', type: 'float' },
      { id: 'xyz', label: 'XYZ', type: 'vec3' },
    ],
  },
  normalView: {
    title: 'NORMAL VIEW',
    outputs: [
      { id: 'x', label: 'X', type: 'float' },
      { id: 'y', label: 'Y', type: 'float' },
      { id: 'z', label: 'Z', type: 'float' },
      { id: 'xyz', label: 'XYZ', type: 'vec3' },
    ],
  },
  normalWorld: {
    title: 'NORMAL WORLD',
    outputs: [
      { id: 'x', label: 'X', type: 'float' },
      { id: 'y', label: 'Y', type: 'float' },
      { id: 'z', label: 'Z', type: 'float' },
      { id: 'xyz', label: 'XYZ', type: 'vec3' },
    ],
  },
  positionLocal: {
    title: 'POSITION LOCAL',
    outputs: [
      { id: 'x', label: 'X', type: 'float' },
      { id: 'y', label: 'Y', type: 'float' },
      { id: 'z', label: 'Z', type: 'float' },
      { id: 'xyz', label: 'XYZ', type: 'vec3' },
    ],
  },
  positionView: {
    title: 'POSITION VIEW',
    outputs: [
      { id: 'x', label: 'X', type: 'float' },
      { id: 'y', label: 'Y', type: 'float' },
      { id: 'z', label: 'Z', type: 'float' },
      { id: 'xyz', label: 'XYZ', type: 'vec3' },
    ],
  },
  positionViewDirection: {
    title: 'POSITION VIEW DIRECTION',
    outputs: [
      { id: 'x', label: 'X', type: 'float' },
      { id: 'y', label: 'Y', type: 'float' },
      { id: 'z', label: 'Z', type: 'float' },
      { id: 'xyz', label: 'XYZ', type: 'vec3' },
    ],
  },
  positionWorld: {
    title: 'POSITION WORLD',
    outputs: [
      { id: 'x', label: 'X', type: 'float' },
      { id: 'y', label: 'Y', type: 'float' },
      { id: 'z', label: 'Z', type: 'float' },
      { id: 'xyz', label: 'XYZ', type: 'vec3' },
    ],
  },
  resolution: {
    title: 'RESOLUTION',
    outputs: [
      { id: 'x', label: 'X', type: 'float' },
      { id: 'y', label: 'Y', type: 'float' },
      { id: 'xy', label: 'XY', type: 'vec2' },
    ],
  },
  screenUV: {
    title: 'SCREEN UV',
    outputs: [
      { id: 'x', label: 'X', type: 'float' },
      { id: 'y', label: 'Y', type: 'float' },
      { id: 'xy', label: 'XY', type: 'vec2' },
    ],
  },
  tangentLocal: {
    title: 'TANGENT LOCAL',
    outputs: [
      { id: 'x', label: 'X', type: 'float' },
      { id: 'y', label: 'Y', type: 'float' },
      { id: 'z', label: 'Z', type: 'float' },
      { id: 'w', label: 'W', type: 'float' },
      { id: 'xyzw', label: 'XYZW', type: 'vec4' },
    ],
  },
  time: {
    title: 'TIME',
    outputs: [ { id: 'out', label: 'OUT', type: 'float' } ],
  },
  uv: {
    title: 'UV',
    inputs: [ { id: 'index', label: 'INDEX', type: 'int', default: '(0)' } ],
    outputs: [
      { id: 'x', label: 'X', type: 'float' },
      { id: 'y', label: 'Y', type: 'float' },
      { id: 'xy', label: 'XY', type: 'vec2' },
    ],
  },
};
