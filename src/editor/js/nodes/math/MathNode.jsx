import { useMemo } from 'react';
import { Handle, Position, useEdges } from 'reactflow';
import { getDefinition } from '../nodeDefinitions.js';
import { getHandleType } from '../tslTypes.js';
import { useNodeDisplayValue, rgbToHex } from '../NodeDisplayValuesContext.jsx';

/**
 * Shared component for all math nodes. Renders header (title only) and body with
 * input/output rows like FloatNode and material nodes – no (variable name).
 */
export function MathNode( { id, data } ) {
  const edges = useEdges();
  const nodeType = data?.nodeType || 'float';
  const category = data?.category || 'math';
  const def = getDefinition( nodeType, data );
  const inputs = def.inputs || [];
  const outputs = def.outputs || [];
  const title = ( data?.label ?? nodeType ).toString().toUpperCase();
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

  const compact = inputs.length + outputs.length <= 3;

  return (
    <div className={`tsl-node tsl-node--category-${category} math-node ${compact ? 'tsl-node--compact' : ''}`}>
      <div className="tsl-node__header">
        <div className="tsl-node__title">{title}</div>
      </div>
      <div className="tsl-node__divider" />
      <div className="tsl-node__body">
        {inputs.map( ( { id: handleId, label: inputLabel } ) => {
          const connected = connectedTargets.has( handleId );
          const type = getHandleType( nodeType, handleId, data ) || 'float';
          return (
            <div key={handleId} className="tsl-node__row">
              <Handle
                type="target"
                position={Position.Left}
                id={handleId}
                className={`type-${type} ${connected ? 'connected' : ''}`}
              />
              <span className={`tsl-node__label ${connected ? '' : 'tsl-node__label--dimmed'}`}>
                {inputLabel}
              </span>
            </div>
          );
        } )}
        {outputs.map( ( { id: handleId, label: outputLabel } ) => {
          const connected = connectedSources.has( handleId );
          const type = getHandleType( nodeType, handleId, data ) || 'float';
          const showValue = displayValue != null;
          const isColorObj = showValue && typeof displayValue === 'object' && ( 'r' in displayValue || 'g' in displayValue || 'b' in displayValue );
          const swatchHex = isColorObj ? rgbToHex( displayValue ) : null;
          return (
            <div key={handleId} className="tsl-node__row tsl-node__row--output">
              <span className={`tsl-node__label ${connected ? '' : 'tsl-node__label--dimmed'}`}>
                {outputLabel}
              </span>
              {showValue && (
                swatchHex
                  ? <span className="tsl-node__value tsl-node__value-swatch" style={{ backgroundColor: swatchHex }} title={swatchHex} />
                  : <span className="tsl-node__value">{typeof displayValue === 'number' ? displayValue.toFixed( 3 ) : String( displayValue )}</span>
              )}
              <Handle
                type="source"
                position={Position.Right}
                id={handleId}
                className={`type-${type} ${connected ? 'connected' : ''}`}
              />
            </div>
          );
        } )}
      </div>
    </div>
  );
}
