import { createContext, memo, useCallback, useContext, useMemo } from 'react';
import { Handle, Position, useEdges } from 'reactflow';
import { NodeDisplayValuesContext, displayValueToSwatchHex } from './NodeDisplayValuesContext.jsx';

export const GroupActionsContext = createContext( null );

const headerBtnStyle = {
  marginRight: 4,
  padding: '2px 6px',
  fontSize: 9,
  cursor: 'pointer',
  background: 'rgba(255,255,255,0.15)',
  border: 'none',
  borderRadius: 4,
  color: 'inherit',
};

function GroupNodeComponent( { id, data, selected } ) {
  const edges = useEdges();
  const { getDisplayValue } = useContext( NodeDisplayValuesContext ) || {};
  const onToggle = useContext( GroupActionsContext )?.onToggleGroupCollapse;
  const collapsed = data?.collapsed === true;
  const inHandles = data?.inHandles ?? [];
  const outHandles = data?.outHandles ?? [];
  const label = data?.groupName ?? data?.label ?? 'Group';

  const { connectedTargets, connectedSources } = useMemo( () => {
    const targetSet = new Set(
      edges.filter( ( e ) => e.target === id ).map( ( e ) => e.targetHandle ).filter( Boolean )
    );
    const sourceSet = new Set(
      edges.filter( ( e ) => e.source === id ).map( ( e ) => e.sourceHandle ).filter( Boolean )
    );
    return { connectedTargets: targetSet, connectedSources: sourceSet };
  }, [ edges, id ] );

  const handleToggle = useCallback( () => {
    if ( onToggle ) onToggle( id );
  }, [ onToggle, id ] );

  const header = (
    <div className="tsl-node__header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div className="tsl-node__title">{ ( label || 'Group' ).toString().toUpperCase() }</div>
      <button
        type="button"
        className="group-node__toggle-btn"
        onClick={handleToggle}
        title={collapsed ? 'Expand to edit' : 'Collapse to single node'}
        style={headerBtnStyle}
      >
        { collapsed ? 'Expand' : 'Collapse' }
      </button>
    </div>
  );

  // Only show input/output handles and labels when collapsed; when expanded we show the internal nodes.
  const body = collapsed ? (
    <div className="tsl-node__body">
      { inHandles.map( ( h ) => {
        const connected = connectedTargets.has( h.id );
        return (
          <div key={h.id} className="tsl-node__row">
            <Handle
              type="target"
              position={Position.Left}
              id={h.id}
              className={`type-vec3 ${connected ? 'connected' : ''}`}
            />
            <span className={`tsl-node__label ${connected ? '' : 'tsl-node__label--dimmed'}`}>
              { h.label }
            </span>
          </div>
        );
      } ) }
      { outHandles.map( ( h ) => {
        const connected = connectedSources.has( h.id );
        const handleType = h.type || 'float';
        const displayVal = getDisplayValue && h.source ? getDisplayValue( h.source ) : null;
        const swatchHex = displayVal != null ? displayValueToSwatchHex( displayVal ) : null;
        const showNumber = typeof displayVal === 'number' && isFinite( displayVal );
        return (
          <div key={h.id} className="tsl-node__row tsl-node__row--output">
            <span className={`tsl-node__label ${connected ? '' : 'tsl-node__label--dimmed'}`}>
              { h.label }
            </span>
            { showNumber && (
              <span className="tsl-node__value">{ Number( displayVal ).toFixed( 3 ) }</span>
            ) }
            { swatchHex && ! showNumber && (
              <span
                className="tsl-node__value-swatch"
                title={swatchHex}
                style={{ background: swatchHex }}
              />
            ) }
            <Handle
              type="source"
              position={Position.Right}
              id={h.id}
              className={`type-${handleType} ${connected ? 'connected' : ''}`}
            />
          </div>
        );
      } ) }
      { inHandles.length === 0 && outHandles.length === 0 && (
        <div className="tsl-node__row">
          <span className="tsl-node__label tsl-node__label--dimmed">No exposed connections</span>
        </div>
      ) }
    </div>
  ) : null;

  return (
    <div
      className={`tsl-node tsl-node--category-advanced group-node ${collapsed ? 'group-node--collapsed' : 'group-node--expanded'}`}
    >
      { header }
      { collapsed && <div className="tsl-node__divider" /> }
      { body }
    </div>
  );
}

export const GroupNode = memo( GroupNodeComponent );
