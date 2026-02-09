import { useMemo } from 'react';
import { Handle, Position, useEdges } from 'reactflow';
import { useNodeDisplayValue } from '../NodeDisplayValuesContext.jsx';

const VALUE_INPUT = { id: 'value', label: 'VALUE', type: 'float', default: '(0)' };
const OUT_OUTPUT = { id: 'out', label: 'OUT', type: 'float' };

export function FloatNode( { id, data } ) {
  const edges = useEdges();
  const category = data?.category || 'constants';
  const displayValue = useNodeDisplayValue( id );
  const { connectedTargets, connectedSources } = useMemo( () => {
    const targetSet = new Set(
      edges.filter( ( e ) => e.target === id ).map( ( e ) => e.targetHandle ).filter( Boolean )
    );
    const sourceSet = new Set(
      edges.filter( ( e ) => e.source === id ).map( ( e ) => e.sourceHandle ).filter( Boolean )
    );
    return { connectedTargets: targetSet, connectedSources: sourceSet };
  }, [ edges, id ] );

  const valueConnected = connectedTargets.has( VALUE_INPUT.id );
  const outConnected = connectedSources.has( OUT_OUTPUT.id );
  const valueToShow = displayValue != null
    ? ( typeof displayValue === 'number' ? displayValue.toFixed( 3 ) : String( displayValue ) )
    : ( typeof data?.value === 'number' ? data.value.toFixed( 3 ) : ( VALUE_INPUT.default || '0' ) );

  return (
    <div className={`tsl-node tsl-node--category-${category} tsl-node--compact`}>
      <div className="tsl-node__header">
        <div className="tsl-node__title">FLOAT</div>
      </div>
      <div className="tsl-node__divider" />
      <div className="tsl-node__body">
        <div className="tsl-node__row">
          <Handle
            type="target"
            position={Position.Left}
            id={VALUE_INPUT.id}
            className={`type-${VALUE_INPUT.type} ${valueConnected ? 'connected' : ''}`}
          />
          <span className={`tsl-node__label ${valueConnected ? '' : 'tsl-node__label--dimmed'}`}>
            {VALUE_INPUT.label}
          </span>
          <span className="tsl-node__value">{valueToShow}</span>
        </div>
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
