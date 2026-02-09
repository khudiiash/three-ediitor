import { useMemo } from 'react';
import { Handle, Position, useEdges, useNodes } from 'reactflow';
import { useNodeDisplayValueForInput, displayValueToColorInputSwatchHex } from './NodeDisplayValuesContext.jsx';

const INPUTS = [
  { id: 'color', label: 'COLOR', type: 'vec3', dataKey: 'color', default: '#ffffff' },
  { id: 'emissive', label: 'EMISSIVE', color: true, type: 'vec3', dataKey: 'emissive', default: '#000000' },
  { id: 'specular', label: 'SPECULAR', color: true, type: 'vec3', dataKey: 'specular', default: '#111111' },
  { id: 'shininess', label: 'SHININESS', type: 'float', dataKey: 'shininess', default: 30 },
  { id: 'opacity', label: 'OPACITY', type: 'float', dataKey: 'opacity', default: 1 },
  { id: 'output', label: 'OUTPUT', type: 'vec4' },
];

const SIDE_LABELS = [ 'Front', 'Back', 'Double' ];

export function MeshPhongMaterialNode( { id, data } ) {
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
  const specularDisplayValue = useNodeDisplayValueForInput( id, 'specular' );
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
  const resolvedSpecular = useMemo( () => {
    const edge = edges.find( ( e ) => e.target === id && e.targetHandle === 'specular' );
    if ( ! edge ) return data?.specular;
    const hex = displayValueToColorInputSwatchHex( specularDisplayValue );
    if ( hex ) return hex;
    const sourceNode = nodes.find( ( n ) => n.id === edge.source );
    return sourceNode?.data?.color ?? data?.specular;
  }, [ edges, nodes, id, data?.specular, specularDisplayValue ] );

  const getDisplayValue = ( input ) => {
    if ( ! input.dataKey ) return null;
    if ( input.dataKey === 'color' ) return resolvedColor ?? input.default;
    if ( input.dataKey === 'emissive' ) return resolvedEmissive ?? input.default;
    if ( input.dataKey === 'specular' ) return resolvedSpecular ?? input.default;
    const v = data?.[ input.dataKey ];
    if ( v === undefined || v === null ) return input.default;
    return v;
  };

  return (
    <div className={`tsl-node tsl-node--category-${category} mesh-phong-material-node`}>
      <div className="tsl-node__header">
        <div className="tsl-node__title">MESHPHONGMATERIAL</div>
      </div>
      <div className="tsl-node__divider" />
      <div className="tsl-node__body">
        {INPUTS.map( ( input ) => {
          const connected = connectedTargets.has( input.id );
          const displayVal = getDisplayValue( input );
          const isColor = input.id === 'color' || input.color;
          const showSwatch = isColor;
          const swatchColor = isColor ? ( displayVal || '#ffffff' ) : null;
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
