import { useMemo } from 'react';
import { Handle, Position, useEdges, useNodes } from 'reactflow';
import { useNodeDisplayValueForInput, displayValueToColorInputSwatchHex } from './NodeDisplayValuesContext.jsx';

const INPUTS = [
  { id: 'color', label: 'COLOR', type: 'vec3', dataKey: 'color', default: '#ffffff' },
  { id: 'normal', label: 'NORMAL', type: 'vec3' },
  { id: 'roughness', label: 'ROUGHNESS', type: 'float', dataKey: 'roughness', default: 0.5 },
  { id: 'metalness', label: 'METALNESS', type: 'float', dataKey: 'metalness', default: 0 },
  { id: 'emissive', label: 'EMISSIVE', color: true, type: 'vec3', dataKey: 'emissive', default: '#000000' },
  { id: 'ao', label: 'AO', type: 'float', dataKey: 'ao', default: 1 },
  { id: 'opacity', label: 'OPACITY', type: 'float', dataKey: 'opacity', default: 1 },
  { id: 'position', label: 'POSITION', type: 'vec3' },
  { id: 'output', label: 'OUTPUT', type: 'vec4' },
  { id: 'backdrop', label: 'BACKDROP', type: 'texture' },
  { id: 'backdropAlpha', label: 'BACKDROP ALPHA', type: 'float' },
];

const SIDE_LABELS = [ 'Front', 'Back', 'Double' ];

export function MeshStandardMaterialNode( { id, data } ) {
  const edges = useEdges();
  const nodes = useNodes();
  const category = data?.category || 'material';
  const connectedTargets = useMemo(
    () =>
      new Set(
        edges.filter( ( e ) => e.target === id ).map( ( e ) => e.targetHandle ).filter( Boolean )
      ),
    [ edges, id ]
  );

  const colorDisplayValue = useNodeDisplayValueForInput( id, 'color' );
  const emissiveDisplayValue = useNodeDisplayValueForInput( id, 'emissive' );

  const resolvedColor = useMemo( () => {
    const colorEdge = edges.find( ( e ) => e.target === id && e.targetHandle === 'color' );
    if ( ! colorEdge ) return data?.color;
    const hex = displayValueToColorInputSwatchHex( colorDisplayValue );
    if ( hex ) return hex;
    const sourceNode = nodes.find( ( n ) => n.id === colorEdge.source );
    return sourceNode?.data?.color ?? data?.color;
  }, [ edges, nodes, id, data?.color, colorDisplayValue ] );

  const resolvedEmissive = useMemo( () => {
    const edge = edges.find( ( e ) => e.target === id && e.targetHandle === 'emissive' );
    if ( ! edge ) return data?.emissive;
    const hex = displayValueToColorInputSwatchHex( emissiveDisplayValue );
    if ( hex ) return hex;
    const sourceNode = nodes.find( ( n ) => n.id === edge.source );
    return sourceNode?.data?.color ?? data?.emissive;
  }, [ edges, nodes, id, data?.emissive, emissiveDisplayValue ] );

  const getDisplayValue = ( input ) => {
    if ( ! input.dataKey ) return null;
    if ( input.dataKey === 'color' ) return resolvedColor ?? input.default;
    if ( input.dataKey === 'emissive' ) return resolvedEmissive ?? input.default;
    const v = data?.[ input.dataKey ];
    if ( v === undefined || v === null ) return input.default;
    return v;
  };

  return (
    <div className={`tsl-node tsl-node--category-${category} mesh-standard-material-node`}>
      <div className="tsl-node__header">
        <div className="tsl-node__title">MESHSTANDARDMATERIAL</div>
      </div>
      <div className="tsl-node__divider" />
      <div className="tsl-node__body">
        {INPUTS.map( ( input ) => {
          const connected = connectedTargets.has( input.id );
          const displayVal = getDisplayValue( input );
          const isColorInput = input.id === 'color' || input.id === 'emissive';
          const showSwatch = input.color || input.id === 'color';
          const swatchColor = isColorInput ? ( displayVal || ( input.id === 'emissive' ? '#000000' : '#ffffff' ) ) : null;
          return (
            <div key={input.id} className="tsl-node__row">
              <Handle
                type="target"
                position={Position.Left}
                id={input.id}
                className={`type-${input.type} ${connected ? 'connected' : ''}`}
              />
              <span className={`tsl-node__label ${connected ? '' : 'tsl-node__label--dimmed'}`}>
                {input.label}
              </span>
              {! connected && displayVal != null && ! showSwatch && (
                <span className="tsl-node__value">
                  {typeof displayVal === 'number' ? displayVal.toFixed( 2 ) : String( displayVal )}
                </span>
              )}
              {showSwatch && (
                <span
                  className="tsl-node__value-swatch"
                  title={swatchColor || 'Color'}
                  style={swatchColor ? { background: swatchColor } : undefined}
                />
              )}
            </div>
          );
        } )}
        <div className="tsl-node__row tsl-node__row--no-handle">
          <span className="tsl-node__label tsl-node__label--dimmed">SIDE</span>
          <span className="tsl-node__value">{SIDE_LABELS[ data?.side ] ?? 'Front'}</span>
        </div>
        <div className="tsl-node__row tsl-node__row--no-handle">
          <span className="tsl-node__label tsl-node__label--dimmed">TRANSPARENT</span>
          <span className="tsl-node__value">{data?.transparent ? 'True' : 'False'}</span>
        </div>
        <div className="tsl-node__row tsl-node__row--no-handle">
          <span className="tsl-node__label tsl-node__label--dimmed">DEPTH WRITE</span>
          <span className="tsl-node__value">{data?.depthWrite !== false ? 'True' : 'False'}</span>
        </div>
      </div>
    </div>
  );
}
