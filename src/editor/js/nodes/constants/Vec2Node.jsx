import { useMemo } from 'react';
import { Handle, Position, useEdges } from 'reactflow';
import { useNodeDisplayValueForInput } from '../NodeDisplayValuesContext.jsx';

const INPUTS = [
  { id: 'x', label: 'X', type: 'float', default: '(0)' },
  { id: 'y', label: 'Y', type: 'float', default: '(0)' },
];
const OUT_OUTPUT = { id: 'xy', label: 'XY', type: 'vec2' };

function formatInputDisplay( val, connected ) {
  if ( ! connected ) return typeof val === 'number' ? val : 0;
  if ( val == null || ( typeof val !== 'number' && typeof val !== 'string' ) ) return '—';
  return typeof val === 'number' && isFinite( val ) ? val.toFixed( 3 ) : String( val );
}

export function Vec2Node( { id, data } ) {
  const edges = useEdges();
  const category = data?.category || 'constants';
  const { connectedTargets, connectedSources } = useMemo( () => {
    const targetSet = new Set(
      edges.filter( ( e ) => e.target === id ).map( ( e ) => e.targetHandle ).filter( Boolean )
    );
    const sourceSet = new Set(
      edges.filter( ( e ) => e.source === id ).map( ( e ) => e.sourceHandle ).filter( Boolean )
    );
    return { connectedTargets: targetSet, connectedSources: sourceSet };
  }, [ edges, id ] );

  const outConnected = connectedSources.has( OUT_OUTPUT.id );
  const xDisplay = useNodeDisplayValueForInput( id, 'x' );
  const yDisplay = useNodeDisplayValueForInput( id, 'y' );

  return (
    <div className={`tsl-node tsl-node--category-${category} tsl-node--compact`}>
      <div className="tsl-node__header">
        <div className="tsl-node__title">VEC2</div>
      </div>
      <div className="tsl-node__divider" />
      <div className="tsl-node__body">
        {INPUTS.map( ( input ) => {
          const connected = connectedTargets.has( input.id );
          const val = data?.[ input.id ];
          const connectedVal = input.id === 'x' ? xDisplay : yDisplay;
          const display = formatInputDisplay( connected ? connectedVal : val, connected );
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
              <span className="tsl-node__value">{display}</span>
            </div>
          );
        } )}
        <div className="tsl-node__row tsl-node__row--output">
          <span className={`tsl-node__label ${outConnected ? '' : 'tsl-node__label--dimmed'}`}>
            {OUT_OUTPUT.label}
          </span>
          <Handle
            type="source"
            position={Position.Right}
            id={OUT_OUTPUT.id}
            className={`type-${OUT_OUTPUT.type} ${outConnected ? 'connected' : ''}`}
          />
        </div>
      </div>
    </div>
  );
}
