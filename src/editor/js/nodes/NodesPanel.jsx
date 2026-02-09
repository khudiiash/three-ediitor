import { useState, useMemo } from 'react';
import { NODE_CATEGORIES } from './nodeList.js';

const PANEL_TOP = 12;
const PANEL_GAP = 12;
const PANEL_RADIUS = 10;
const PANEL_WIDTH = 260;

const panelStyle = {
  position: 'fixed',
  left: PANEL_GAP,
  top: PANEL_TOP,
  bottom: PANEL_GAP,
  width: PANEL_WIDTH,
  zIndex: 10,
  background: 'rgba(30, 30, 30, 0.85)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(51, 51, 51, 0.6)',
  borderRadius: PANEL_RADIUS,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

const titleStyle = {
  padding: '12px 14px',
  fontSize: 13,
  fontWeight: 600,
  color: '#eee',
  borderBottom: '1px solid #333',
  flexShrink: 0,
};

const searchStyle = {
  padding: '10px 12px',
  borderBottom: '1px solid #333',
  flexShrink: 0,
};

const inputStyle = {
  width: '100%',
  padding: '8px 10px 8px 32px',
  background: '#2a2a2a',
  border: '1px solid #444',
  borderRadius: 4,
  color: '#eee',
  fontSize: 13,
  boxSizing: 'border-box',
};

const searchWrapStyle = { position: 'relative' };
const searchIconStyle = {
  position: 'absolute',
  left: 12,
  top: '50%',
  transform: 'translateY(-50%)',
  color: '#888',
  fontSize: 14,
  pointerEvents: 'none',
};

const listStyle = {
  flex: 1,
  overflow: 'auto',
  padding: '8px 0',
};

const categoryHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '8px 12px',
  cursor: 'pointer',
  color: '#ccc',
  fontSize: 12,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  userSelect: 'none',
  borderBottom: '1px solid #2a2a2a',
};

const categoryItemsStyle = {
  padding: '4px 0',
};

const nodeItemStyle = {
  padding: '6px 12px 6px 24px',
  cursor: 'pointer',
  color: '#e0e0e0',
  fontSize: 12,
};

const nodeItemHoverStyle = { ...nodeItemStyle, background: '#2a2a2a' };

export function NodesPanel( { onAddNode, customNodes = [], onCreateCustomNode, onOpenCreateFromCode } ) {
  const [search, setSearch] = useState( '' );
  const [collapsed, setCollapsed] = useState( () => {
    const o = {};
    NODE_CATEGORIES.forEach( ( c ) => { o[ c.id ] = false; } );
    return o;
  } );

  const categoriesWithCustom = useMemo( () => {
    const customCategory = NODE_CATEGORIES.find( ( c ) => c.id === 'custom' );
    const rest = NODE_CATEGORIES.filter( ( c ) => c.id !== 'custom' );
    if ( !customCategory ) return NODE_CATEGORIES;
    return [
      ...rest,
      {
        ...customCategory,
        nodes: [
          { id: 'createFromCode', label: 'Create from Code...' },
          ...customNodes,
        ],
      },
    ];
  }, [ customNodes ] );

  const filtered = useMemo( () => {
    const q = search.trim().toLowerCase();
    const source = categoriesWithCustom;
    if ( !q ) return source;
    return source.map( ( cat ) => ( {
      ...cat,
      nodes: cat.nodes.filter( ( n ) =>
        n.label.toLowerCase().includes( q )
      ),
    } ) ).filter( ( cat ) => cat.nodes.length > 0 );
  }, [ search, categoriesWithCustom ] );

  const toggle = ( id ) => {
    setCollapsed( ( prev ) => ( { ...prev, [ id ]: !prev[ id ] } ) );
  };

  return (
    <div style={panelStyle} className="nodes-panel">
      <div style={titleStyle}>Nodes</div>
      <div style={searchStyle}>
        <div style={searchWrapStyle}>
          <span style={searchIconStyle} aria-hidden>🔍</span>
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={ ( e ) => setSearch( e.target.value ) }
            style={inputStyle}
          />
        </div>
      </div>
      <div style={listStyle}>
        {filtered.map( ( category ) => (
          <div key={category.id}>
            <div
              style={categoryHeaderStyle}
              onClick={() => toggle( category.id )}
              role="button"
              tabIndex={0}
              onKeyDown={( e ) => {
                if ( e.key === 'Enter' || e.key === ' ' ) toggle( category.id );
              }}
            >
              <span>{category.label}</span>
              <span style={{ fontSize: 10 }}>{collapsed[ category.id ] ? '▶' : '▼'}</span>
            </div>
            {!collapsed[ category.id ] && (
              <div style={categoryItemsStyle}>
                {category.nodes.map( ( node ) => (
                  <div
                    key={node.id}
                    style={nodeItemStyle}
                    onMouseEnter={( e ) => {
                      e.currentTarget.style.background = nodeItemHoverStyle.background;
                    }}
                    onMouseLeave={( e ) => {
                      e.currentTarget.style.background = '';
                    }}
                    onClick={() => {
                      if ( node.id === 'createFromCode' ) {
                        if ( onOpenCreateFromCode ) onOpenCreateFromCode();
                      } else {
                        onAddNode( { ...node, categoryId: category.id } );
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={( e ) => {
                      if ( e.key === 'Enter' || e.key === ' ' ) {
                        if ( node.id === 'createFromCode' && onOpenCreateFromCode ) onOpenCreateFromCode();
                        else onAddNode( { ...node, categoryId: category.id } );
                      }
                    }}
                  >
                    {node.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) )}
      </div>
    </div>
  );
}
