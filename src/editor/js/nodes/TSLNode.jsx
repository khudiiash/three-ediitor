import { Handle, Position } from 'reactflow';
import { getDefinition } from './nodeDefinitions.js';

function handleTop( index, total ) {
  if ( total <= 1 ) return '50%';
  return `${( ( index + 1 ) / ( total + 1 ) ) * 100}%`;
}

export function TSLNode( { data } ) {
  const nodeType = data?.nodeType || 'float';
  const category = data?.category || 'constants';
  const def = getDefinition( nodeType );
  const label = data?.label ?? nodeType;
  const inputs = def.inputs || [];
  const outputs = def.outputs || [];

  return (
    <div className={`tsl-node tsl-node--category-${category}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {inputs.map( ( { id, label: l }, i ) => (
        <Handle
          key={id}
          type="target"
          position={Position.Left}
          id={id}
          style={{ top: handleTop( i, inputs.length ) }}
        />
      ) )}
      <span>{label}</span>
      {outputs.map( ( { id, label: l }, i ) => (
        <Handle
          key={id}
          type="source"
          position={Position.Right}
          id={id}
          style={{ top: handleTop( i, outputs.length ) }}
        />
      ) )}
    </div>
  );
}
