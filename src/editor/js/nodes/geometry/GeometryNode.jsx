import { useMemo } from 'react';
import { Handle, Position, useEdges } from 'reactflow';
import { GEOMETRY_NODE_DEFS } from './geometryNodeDefs.js';
import { useNodeDisplayValue } from '../NodeDisplayValuesContext.jsx';

export function GeometryNode( { id, data } ) {
  const nodeType = data?.nodeType;
  const def = nodeType ? GEOMETRY_NODE_DEFS[ nodeType ] : null;
  const edges = useEdges();
  const category = data?.category || 'geometry';
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

  if ( !def ) return null;

  const { title, inputs = [], outputs } = def;

  return (
    <div className={`tsl-node tsl-node--category-${category} tsl-node--compact`}>
      <div className="tsl-node__header">
        <div className="tsl-node__title">{title}</div>
      </div>
      <div className="tsl-node__divider" />
      <div className="tsl-node__body">
        {inputs.map( ( input ) => {
          const connected = connectedTargets.has( input.id );
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
              {input.default != null && (
                <span className="tsl-node__value">{input.default}</span>
              )}
            </div>
          );
        } )}
        {outputs.map( ( row ) => {
          const connected = connectedSources.has( row.id );
          const showValue = nodeType === 'time' && row.id === 'out' && displayValue != null;
          return (
            <div key={row.id} className="tsl-node__row tsl-node__row--output">
              <span className={`tsl-node__label ${connected ? '' : 'tsl-node__label--dimmed'}`}>
                {row.label}
              </span>
              {showValue && (
                <span className="tsl-node__value">{typeof displayValue === 'number' ? displayValue.toFixed( 3 ) : String( displayValue )}</span>
              )}
              <Handle
                type="source"
                position={Position.Right}
                id={row.id}
                className={`type-${row.type} ${connected ? 'connected' : ''}`}
              />
            </div>
          );
        } )}
      </div>
    </div>
  );
}
