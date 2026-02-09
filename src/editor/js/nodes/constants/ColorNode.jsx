import { useMemo } from 'react';
import { Handle, Position, useEdges } from 'reactflow';

const COLOR_INPUT = { id: 'color', label: 'COLOR', type: 'vec4' };
const OUTPUT_ROWS = [
  { id: 'r', label: 'R', type: 'float' },
  { id: 'g', label: 'G', type: 'float' },
  { id: 'b', label: 'B', type: 'float' },
  { id: 'rgb', label: 'RGB', type: 'vec3' },
];

export function ColorNode( { id, data } ) {
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

  const colorConnected = connectedTargets.has( COLOR_INPUT.id );
  return (
    <div className={`tsl-node tsl-node--category-${category} color-node`}>
      <div className="tsl-node__header">
        <div className="tsl-node__title">COLOR</div>
      </div>
      <div className="tsl-node__divider" />
      <div className="tsl-node__body">
        <div className="tsl-node__row">
          <Handle
            type="target"
            position={Position.Left}
            id={COLOR_INPUT.id}
            className={`type-${COLOR_INPUT.type} ${colorConnected ? 'connected' : ''}`}
          />
          <span className={`tsl-node__label ${colorConnected ? '' : 'tsl-node__label--dimmed'}`}>
            {COLOR_INPUT.label}
          </span>
          <span className="tsl-node__value-swatch" title={data?.color || 'Color'} style={{ background: data?.color ?? '#ffffff' }} />
        </div>
        {OUTPUT_ROWS.map( ( row ) => {
          const connected = connectedSources.has( row.id );
          return (
            <div key={row.id} className="tsl-node__row tsl-node__row--output">
              <span className={`tsl-node__label ${connected ? '' : 'tsl-node__label--dimmed'}`}>
                {row.label}
              </span>
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
