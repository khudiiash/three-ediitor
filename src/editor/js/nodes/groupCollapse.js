/**
 * Group collapse/expand: rewrite edges at group boundary and hide/show children.
 * Returns { nodes, edges } for the new state.
 */

import { getDefinition } from './nodeDefinitions.js';
import { getHandleType, getTypeColor } from './tslTypes.js';

const GROUP_COLLAPSED_WIDTH = 180;
const GROUP_COLLAPSED_ROW_HEIGHT = 18;
const GROUP_HEADER_HEIGHT = 28;
/** Reserved height at top of expanded group so internal nodes sit in the body below the header. */
export const GROUP_HEADER_HEIGHT_EXPANDED = 52;

function getHandleLabel( node, handleId ) {
  const type = node?.type ?? 'node';
  const label = node?.data?.label ?? type;
  return `${label}.${handleId}`;
}

/** Infer handle type for styling: float (purple) vs vec3/color (yellow). */
function inferOutputType( nodeType ) {
  const t = ( nodeType || '' ).toLowerCase();
  if ( t === 'vec3' || t === 'color' || t === 'vec4' || t === 'vec2' ) return t;
  return 'float';
}

/**
 * Add only "boundary" unconnected handles:
 * - Output: expose only if this output has no edge from it (truly unconnected end of chain).
 * - Input: expose only if this input has no edge to it (truly unconnected / leftmost).
 */
function addUnexposedHandles( nodeMap, childIds, edges, outHandles, inHandles ) {
  const outIds = new Set( outHandles.map( ( h ) => h.id ) );
  const inIds = new Set( inHandles.map( ( h ) => h.id ) );
  for ( const nodeId of childIds ) {
    const node = nodeMap.get( nodeId );
    if ( !node ) continue;
    const def = getDefinition( node.type, node?.data );
    const outputs = def?.outputs ?? [ { id: 'out', label: 'Out' } ];
    for ( const o of outputs ) {
      const hasEdgeFrom = edges.some( ( e ) => {
        if ( e.source !== nodeId ) return false;
        const sh = e.sourceHandle ?? 'out';
        return sh === o.id || ( outputs.length === 1 );
      } );
      if ( hasEdgeFrom ) continue;
      const id = `out-${nodeId}-${o.id}`;
      if ( !outIds.has( id ) ) {
        outIds.add( id );
        outHandles.push( {
          id,
          label: getHandleLabel( node, o.id ),
          source: nodeId,
          sourceHandle: o.id,
          type: inferOutputType( node?.type ),
        } );
      }
    }
    const inputs = def?.inputs ?? [ { id: 'in', label: 'In' } ];
    for ( const i of inputs ) {
      const hasEdgeTo = edges.some( ( e ) => {
        if ( e.target !== nodeId ) return false;
        const th = e.targetHandle ?? 'in';
        return th === i.id || ( inputs.length === 1 );
      } );
      if ( hasEdgeTo ) continue;
      const id = `in-${nodeId}-${i.id}`;
      if ( !inIds.has( id ) ) {
        inIds.add( id );
        inHandles.push( {
          id,
          label: getHandleLabel( node, i.id ),
          target: nodeId,
          targetHandle: i.id,
        } );
      }
    }
  }
}

/**
 * React Flow requires parent nodes to appear before their children in the nodes array.
 * Reorder so the group node is immediately followed by its children.
 */
function orderNodesParentBeforeChildren( nodes, groupId ) {
  const group = nodes.find( ( n ) => n.id === groupId );
  if ( !group ) return nodes;
  const childIds = new Set( nodes.filter( ( n ) => n.parentId === groupId ).map( ( n ) => n.id ) );
  const rest = nodes.filter( ( n ) => n.id !== groupId && !childIds.has( n.id ) );
  const children = nodes.filter( ( n ) => childIds.has( n.id ) );
  return [ ...rest, group, ...children ];
}

/**
 * Collapse a group: replace boundary edges with group proxy edges, hide children, set compact style.
 * @param {Array} nodes - current nodes
 * @param {Array} edges - current edges
 * @param {string} groupId - group node id
 * @returns {{ nodes: Array, edges: Array }}
 */
export function collapseGroup( nodes, edges, groupId ) {
  nodes = orderNodesParentBeforeChildren( nodes, groupId );
  const group = nodes.find( ( n ) => n.id === groupId );
  if ( !group || group.type !== 'group' ) return { nodes, edges };
  const nodeMap = new Map( nodes.map( ( n ) => [ n.id, n ] ) );
  const childIds = new Set( nodes.filter( ( n ) => n.parentId === groupId ).map( ( n ) => n.id ) );
  if ( childIds.size === 0 ) return { nodes, edges };

  const outEdges = edges.filter( ( e ) => childIds.has( e.source ) && !childIds.has( e.target ) );
  const inEdges = edges.filter( ( e ) => !childIds.has( e.source ) && childIds.has( e.target ) );
  const internalEdges = edges.filter( ( e ) => childIds.has( e.source ) && childIds.has( e.target ) );
  const otherEdges = edges.filter( ( e ) => !childIds.has( e.source ) && !childIds.has( e.target ) );

  const outHandles = outEdges.map( ( e ) => {
    const srcNode = nodeMap.get( e.source );
    const sh = e.sourceHandle || 'out';
    return {
      id: `out-${e.source}-${sh}`,
      label: getHandleLabel( srcNode, sh ),
      source: e.source,
      sourceHandle: sh,
      type: inferOutputType( srcNode?.type ),
    };
  } );
  const inHandles = inEdges.map( ( e ) => {
    const tgtNode = nodeMap.get( e.target );
    const th = e.targetHandle || 'in';
    return {
      id: `in-${e.target}-${th}`,
      label: getHandleLabel( tgtNode, th ),
      target: e.target,
      targetHandle: th,
    };
  } );
  addUnexposedHandles( nodeMap, childIds, edges, outHandles, inHandles );

  const outHandleMap = new Map( outHandles.map( ( h ) => [ h.id, h ] ) );
  const newEdges = [
    ...otherEdges.filter( ( e ) => !childIds.has( e.source ) && !childIds.has( e.target ) ),
    ...internalEdges,
    ...outEdges.map( ( e ) => {
      const proxySourceHandle = `out-${e.source}-${e.sourceHandle || 'out'}`;
      const h = outHandleMap.get( proxySourceHandle );
      const sourceNode = nodeMap.get( e.source );
      const targetNode = nodeMap.get( e.target );
      const sourceTslType = h?.type ?? getHandleType( sourceNode?.type, e.sourceHandle, sourceNode?.data );
      const targetTslType = getHandleType( targetNode?.type, e.targetHandle, targetNode?.data );
      const typeColor = getTypeColor( sourceTslType ) || undefined;
      const targetTypeColor = getTypeColor( targetTslType ) || undefined;
      return {
        ...e,
        id: `group-out-${e.id}-${groupId}`,
        source: groupId,
        sourceHandle: proxySourceHandle,
        target: e.target,
        targetHandle: e.targetHandle,
        data: { ...( e.data || {} ), typeColor, targetTypeColor },
      };
    } ),
    ...inEdges.map( ( e ) => ( {
      ...e,
      id: `group-in-${e.id}-${groupId}`,
      source: e.source,
      sourceHandle: e.sourceHandle,
      target: groupId,
      targetHandle: `in-${e.target}-${e.targetHandle || 'in'}`,
    } ) ),
  ];

  const rowCount = Math.max( 1, inHandles.length + outHandles.length );
  const collapsedHeight = GROUP_HEADER_HEIGHT + rowCount * GROUP_COLLAPSED_ROW_HEIGHT;

  const newNodes = nodes.map( ( n ) => {
    if ( n.id === groupId ) {
      return {
        ...n,
        hidden: false,
        style: { width: GROUP_COLLAPSED_WIDTH, height: collapsedHeight },
        data: {
          ...n.data,
          collapsed: true,
          inHandles,
          outHandles,
          inEdges,
          outEdges,
          expandedWidth: n.data?.expandedWidth ?? n.style?.width,
          expandedHeight: n.data?.expandedHeight ?? n.style?.height,
        },
      };
    }
    if ( childIds.has( n.id ) ) {
      return { ...n, hidden: true };
    }
    return n;
  } );

  return { nodes: orderNodesParentBeforeChildren( newNodes, groupId ), edges: newEdges };
}

const EXPANDED_LEFT_PADDING = 10;
const EXPANDED_RIGHT_PADDING = 2;
const EXPANDED_BOTTOM_PADDING = 5;
const DEFAULT_NODE_W = 120;
const DEFAULT_NODE_H = 64;

/**
 * Compute expanded group size from children bounds: content width/height + padding.
 * Returns { width, height, minX } so expandGroup can shift children to sit at left padding.
 */
function computeExpandedSizeFromChildren( nodes, childIds ) {
  if ( childIds.size === 0 ) return { width: 320, height: 300, minX: 0 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for ( const n of nodes ) {
    if ( !childIds.has( n.id ) ) continue;
    const w = n.measured?.width ?? n.style?.width ?? DEFAULT_NODE_W;
    const h = n.measured?.height ?? n.style?.height ?? DEFAULT_NODE_H;
    const x = n.position.x ?? 0;
    const y = n.position.y ?? 0;
    minX = Math.min( minX, x );
    minY = Math.min( minY, y );
    maxX = Math.max( maxX, x + ( typeof w === 'number' ? w : DEFAULT_NODE_W ) );
    maxY = Math.max( maxY, y + ( typeof h === 'number' ? h : DEFAULT_NODE_H ) );
  }
  const contentWidth = maxX - minX;
  const contentHeight = maxY;
  return {
    width: Math.max( 240, EXPANDED_LEFT_PADDING + contentWidth + EXPANDED_RIGHT_PADDING ),
    height: Math.max( 100, contentHeight + EXPANDED_BOTTOM_PADDING ),
    minX,
  };
}

/**
 * Expand a group: restore boundary edges from group.data, show children, set large style.
 * @param {Array} nodes - current nodes
 * @param {Array} edges - current edges
 * @param {string} groupId - group node id
 * @param {{ width: number, height: number }} expandedSize - size when expanded (used as fallback; recomputed from children)
 * @returns {{ nodes: Array, edges: Array }}
 */
export function expandGroup( nodes, edges, groupId, expandedSize ) {
  const group = nodes.find( ( n ) => n.id === groupId );
  if ( !group || group.type !== 'group' || !group.data?.collapsed ) return { nodes, edges };
  const childIds = new Set( nodes.filter( ( n ) => n.parentId === groupId ).map( ( n ) => n.id ) );
  const sizeFromChildren = computeExpandedSizeFromChildren( nodes, childIds );
  const finalSize = { width: sizeFromChildren.width, height: sizeFromChildren.height };
  const shiftX = EXPANDED_LEFT_PADDING - sizeFromChildren.minX;
  const outHandles = group.data.outHandles || [];
  const inHandles = group.data.inHandles || [];
  const outHandleMap = new Map( outHandles.filter( ( h ) => h.source != null ).map( ( h ) => [ h.id, h ] ) );
  const inHandleMap = new Map( inHandles.filter( ( h ) => h.target != null ).map( ( h ) => [ h.id, h ] ) );

  const groupEdgeIds = new Set( edges.filter( ( e ) => e.source === groupId || e.target === groupId ).map( ( e ) => e.id ) );

  // Rewrite group proxy edges to internal node edges. Do NOT also add stored outEdges/inEdges
  // or we duplicate connections and get duplicated handles on next collapse.
  const convertedFromGroup = [];
  for ( const e of edges ) {
    if ( e.source === groupId && outHandleMap.has( e.sourceHandle ) ) {
      const h = outHandleMap.get( e.sourceHandle );
      convertedFromGroup.push( {
        ...e,
        id: `expanded-out-${e.id}`,
        source: h.source,
        sourceHandle: h.sourceHandle,
        target: e.target,
        targetHandle: e.targetHandle,
      } );
    } else if ( e.target === groupId && inHandleMap.has( e.targetHandle ) ) {
      const h = inHandleMap.get( e.targetHandle );
      convertedFromGroup.push( {
        ...e,
        id: `expanded-in-${e.id}`,
        source: e.source,
        sourceHandle: e.sourceHandle,
        target: h.target,
        targetHandle: h.targetHandle,
      } );
    }
  }

  const newEdges = [
    ...edges.filter( ( e ) => !groupEdgeIds.has( e.id ) ),
    ...convertedFromGroup,
  ];

  const newNodes = nodes.map( ( n ) => {
    if ( n.id === groupId ) {
      return {
        ...n,
        style: { width: finalSize.width, height: finalSize.height },
        zIndex: 0,
        data: {
          ...n.data,
          collapsed: false,
          inEdges: undefined,
          outEdges: undefined,
        },
      };
    }
    if ( childIds.has( n.id ) ) {
      const pos = n.position || { x: 0, y: 0 };
      const x = ( pos.x ?? 0 ) + shiftX;
      const y = Math.max( pos.y ?? 0, GROUP_HEADER_HEIGHT_EXPANDED );
      return {
        ...n,
        hidden: false,
        zIndex: 1,
        extent: 'parent',
        position: { x, y },
      };
    }
    return n;
  } );

  return { nodes: orderNodesParentBeforeChildren( newNodes, groupId ), edges: newEdges };
}
