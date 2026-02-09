import { useCallback, useEffect, useRef, useState } from 'react';
import ReactFlow, {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  useViewport,
} from 'reactflow';

import { NodesPanel } from './NodesPanel.jsx';
import { CreateNodeFromCodeModal } from './CreateNodeFromCodeModal.jsx';
import { LivePreviewPanel } from './LivePreviewPanel.jsx';
import { NodeParametersPanel } from './NodeParametersPanel.jsx';
import { NODE_TYPE_COMPONENTS } from './nodeTypeComponents.jsx';
import { getHandleType, getTypeColor } from './tslTypes.js';
import GradientEdge from './GradientEdge.jsx';
import { exportGraphToJSON, importGraphFromJSON } from './graphSerialization.js';
import { generateTSLCode } from './tslCodeGenerator.js';
import { NodeDisplayValuesProvider } from './NodeDisplayValuesContext.jsx';
import { collapseGroup, expandGroup, GROUP_HEADER_HEIGHT_EXPANDED } from './groupCollapse.js';
import { GroupActionsContext } from './GroupNode.jsx';
import { parseCustomFnInputs } from './parseCustomFnCode.js';

import 'reactflow/dist/style.css';
import '../../css/tsl-node-overrides.css';

const nodeTypes = NODE_TYPE_COMPONENTS;
const edgeTypes = { default: GradientEdge };

const initialNodes = [
  {
    id: 'mesh-standard-material-1',
    type: 'meshStandardMaterial',
    position: { x: 100, y: 80 },
    data: { label: 'MeshStandardMaterial', category: 'material' },
  },
];
const initialEdges = [];

/** Node type ids that act as the single output material node; only one may exist. */
const OUTPUT_MATERIAL_TYPES = [ 'meshBasicMaterial', 'meshPhongMaterial', 'meshPhysicalMaterial', 'meshStandardMaterial', 'meshSSSMaterial', 'meshToonMaterial', 'meshLambertMaterial', 'meshNormalMaterial', 'pointsMaterial', 'spriteNodeMaterial' ];

const NODE_WIDTH = 260;
const NODE_HEIGHT = 40;
const NODE_GAP = 24;
/** Height used for overlap detection when placing new nodes (covers tall nodes). */
const NODE_PLACE_HEIGHT = 100;

function rectsOverlap( a, b ) {
  return ! ( a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y );
}

/** Find a position for a new node that does not overlap any existing node. */
function findFreePosition( existingNodes, nodeWidth, nodeHeight, gap ) {
  if ( existingNodes.length === 0 ) return { x: 100, y: 80 };
  const placeWidth = nodeWidth + gap;
  const placeHeight = nodeHeight + gap;
  const existingRects = existingNodes.map( ( n ) => ( {
    x: n.position.x,
    y: n.position.y,
    width: nodeWidth,
    height: NODE_PLACE_HEIGHT,
  } ) );
  const minX = Math.min( ...existingRects.map( ( r ) => r.x ) ) - placeWidth;
  const minY = Math.min( ...existingRects.map( ( r ) => r.y ) ) - placeHeight;
  const maxX = Math.max( ...existingRects.map( ( r ) => r.x + r.width ) ) + placeWidth;
  const maxY = Math.max( ...existingRects.map( ( r ) => r.y + r.height ) ) + placeHeight;
  const centerX = ( minX + maxX - nodeWidth ) / 2;
  const centerY = ( minY + maxY - nodeHeight ) / 2;
  const newRect = { width: nodeWidth, height: NODE_PLACE_HEIGHT };
  const tryPosition = ( px, py ) => {
    newRect.x = px;
    newRect.y = py;
    return existingRects.every( ( r ) => ! rectsOverlap( newRect, r ) );
  };
  if ( tryPosition( centerX, centerY ) ) return { x: centerX, y: centerY };
  for ( let radius = 1; radius <= 20; radius++ ) {
    for ( let dy = -radius; dy <= radius; dy++ ) {
      for ( let dx = -radius; dx <= radius; dx++ ) {
        if ( Math.abs( dx ) !== radius && Math.abs( dy ) !== radius ) continue;
        const x = centerX + dx * placeWidth;
        const y = centerY + dy * placeHeight;
        if ( tryPosition( x, y ) ) return { x, y };
      }
    }
  }
  return { x: maxX + gap, y: minY };
}

/** Get flow position at the center of the current viewport (for placing new nodes). */
function getViewportCenter( viewportRef, containerRef ) {
  const vp = viewportRef?.current ?? { x: 0, y: 0, zoom: 1 };
  const rect = containerRef?.current?.getBoundingClientRect?.();
  const w = rect?.width ?? 800;
  const h = rect?.height ?? 600;
  return {
    x: ( - vp.x + w / 2 ) / vp.zoom,
    y: ( - vp.y + h / 2 ) / vp.zoom,
  };
}

function ViewportSync( { viewportRef } ) {
  const viewport = useViewport();
  viewportRef.current = viewport;
  return null;
}

const PANEL_TOP = 12;
const GAP = 12;
const TOOLBAR_HEIGHT = 40;
const NODES_PANEL_WIDTH = 260;
const PREVIEW_PANEL_SIZE = 280;
const PARAMS_PANEL_TOP = PANEL_TOP + PREVIEW_PANEL_SIZE + GAP;
const PARAMS_PANEL_HEIGHT = `calc(100vh - ${PARAMS_PANEL_TOP + GAP}px)`;

const rootStyle = {
  position: 'relative',
  width: '100%',
  height: '100%',
};

const nodesAreaStyle = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
};

const toolbarStyle = {
  position: 'fixed',
  top: PANEL_TOP,
  left: PANEL_TOP + NODES_PANEL_WIDTH + GAP,
  right: PANEL_TOP + PREVIEW_PANEL_SIZE + GAP,
  height: TOOLBAR_HEIGHT,
  zIndex: 10,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '0 10px',
  background: 'rgba(37, 37, 37, 0.85)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(51, 51, 51, 0.6)',
  borderRadius: 10,
  boxSizing: 'border-box',
};

const flowWrapStyle = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  minHeight: 0,
};

const exportBtnStyle = {
  padding: '4px 10px',
  fontSize: 11,
  cursor: 'pointer',
  background: '#444',
  color: '#eee',
  border: 'none',
  borderRadius: 4,
};

export function Nodes() {
  const [nodes, setNodes] = useState( initialNodes );
  const [edges, setEdges] = useState( initialEdges );
  const [graphVersion, setGraphVersion] = useState( 0 );
  const [customNodeDefs, setCustomNodeDefs] = useState( [] );
  const [createNodeModalOpen, setCreateNodeModalOpen] = useState( false );
  const addCounterRef = useRef( 0 );
  const nodesRef = useRef( nodes );
  const edgesRef = useRef( edges );
  const refreshPreviewRef = useRef( null );
  const viewportRef = useRef( { x: 0, y: 0, zoom: 1 } );
  const flowContainerRef = useRef( null );
  useEffect( () => { nodesRef.current = nodes; }, [ nodes ] );
  useEffect( () => { edgesRef.current = edges; }, [ edges ] );

  const onNodesChange = useCallback(
    ( changes ) => setNodes( ( nds ) => applyNodeChanges( changes, nds ) ),
    []
  );
  const onEdgesChange = useCallback(
    ( changes ) => setEdges( ( eds ) => applyEdgeChanges( changes, eds ) ),
    []
  );
  const onConnect = useCallback( ( params ) => {
    const currentNodes = nodesRef.current;
    const sourceNode = currentNodes.find( ( n ) => n.id === params.source );
    const targetNode = currentNodes.find( ( n ) => n.id === params.target );
    let sourceTslType = getHandleType( sourceNode?.type, params.sourceHandle, sourceNode?.data );
    if ( sourceNode?.type === 'group' && sourceNode.data?.outHandles?.length && ( sourceTslType == null || sourceTslType === '' ) ) {
      const h = sourceNode.data.outHandles.find( ( x ) => x.id === params.sourceHandle );
      if ( h?.type ) sourceTslType = h.type;
    }
    const targetTslType = getHandleType( targetNode?.type, params.targetHandle, targetNode?.data );
    const typeColor = getTypeColor( sourceTslType );
    const targetTypeColor = getTypeColor( targetTslType );
    setEdges( ( eds ) => {
      // Only one connection per input (target handle). Multiple edges from the same output are allowed.
      const withoutOverlap = eds.filter(
        ( e ) => ! ( e.target === params.target && e.targetHandle === params.targetHandle )
      );
      const next = addEdge( params, withoutOverlap );
      const added = next.find(
        ( e ) =>
          e.source === params.source &&
          e.target === params.target &&
          e.sourceHandle === params.sourceHandle &&
          e.targetHandle === params.targetHandle
      );
      if ( added ) {
        added.type = 'default';
        added.data = { ...( added.data || {} ), typeColor: typeColor || undefined, targetTypeColor: targetTypeColor || undefined };
      }
      return next;
    } );
    setGraphVersion( ( v ) => v + 1 );
  }, [] );

  const onAddNode = useCallback( ( nodeDef ) => {
    addCounterRef.current += 1;
    const isCustom = nodeDef.categoryId === 'custom' && nodeDef.code != null;
    const type = isCustom ? 'customFn' : nodeDef.id;
    const id = `node-${nodeDef.id}-${Date.now()}`;
    const newNode = {
      id,
      type,
      position: { x: 0, y: 0 },
      data: {
        label: nodeDef.label,
        category: isCustom ? 'math' : ( nodeDef.categoryId || 'constants' ),
        ...( isCustom ? { code: nodeDef.code, customId: nodeDef.id, inputs: nodeDef.inputs || parseCustomFnInputs( nodeDef.code ), inputTypes: nodeDef.inputTypes, outputType: nodeDef.outputType } : {} ),
      },
    };
    setNodes( ( nds ) => {
      let next = nds;
      if ( OUTPUT_MATERIAL_TYPES.includes( nodeDef.id ) ) {
        next = nds.filter( ( n ) => ! OUTPUT_MATERIAL_TYPES.includes( n.type ) );
      }
      const center = getViewportCenter( viewportRef, flowContainerRef );
      const position = center.x != null && center.y != null
        ? { x: center.x - NODE_WIDTH / 2, y: center.y - NODE_HEIGHT / 2 }
        : findFreePosition( next, NODE_WIDTH, NODE_HEIGHT, NODE_GAP );
      newNode.position = position;
      const maxZ = next.reduce( ( m, n ) => Math.max( m, n.zIndex ?? 0 ), 0 );
      newNode.zIndex = maxZ + 1;
      return [ ...next, newNode ];
    } );
  }, [] );

  const onCreateCustomNode = useCallback( ( def ) => {
    setCustomNodeDefs( ( prev ) => [ ...prev, def ] );
    onAddNode( { ...def, categoryId: 'custom' } );
  }, [ onAddNode ] );

  const onEdgeClick = useCallback( ( _event, edge ) => {
    setEdges( ( eds ) => eds.filter( ( e ) => e.id !== edge.id ) );
    setGraphVersion( ( v ) => v + 1 );
  }, [] );

  const onNodesDelete = useCallback( ( deleted ) => {
    const ids = new Set( deleted.map( ( n ) => n.id ) );
    setNodes( ( nds ) => nds.filter( ( n ) => !ids.has( n.id ) ) );
  }, [] );

  const onEdgesDelete = useCallback( ( deleted ) => {
    const ids = new Set( deleted.map( ( e ) => e.id ) );
    setEdges( ( eds ) => eds.filter( ( e ) => !ids.has( e.id ) ) );
    setGraphVersion( ( v ) => v + 1 );
  }, [] );

  const onToggleGroupCollapse = useCallback( ( groupId ) => {
    const nds = nodesRef.current;
    const eds = edgesRef.current;
    const group = nds.find( ( n ) => n.id === groupId && n.type === 'group' );
    if ( !group ) return;
    if ( group.data?.collapsed ) {
      const expandedSize = {
        width: group.data.expandedWidth ?? 320,
        height: group.data.expandedHeight ?? 300,
      };
      const { nodes: newNodes, edges: newEdges } = expandGroup( nds, eds, groupId, expandedSize );
      setNodes( newNodes );
      setEdges( newEdges );
    } else {
      const { nodes: newNodes, edges: newEdges } = collapseGroup( nds, eds, groupId );
      setNodes( newNodes );
      setEdges( newEdges );
    }
  }, [] );

  const onGroupSelection = useCallback( () => {
    const selected = nodes.filter( ( n ) => n.selected );
    if ( selected.length < 2 ) return;
    const padding = 8;
    const nodeW = NODE_WIDTH;
    const nodeH = NODE_PLACE_HEIGHT;
    const tightW = 140;
    const tightH = 50;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    selected.forEach( ( n ) => {
      const x = n.position.x ?? 0;
      const y = n.position.y ?? 0;
      const w = n.measured?.width ?? n.style?.width ?? tightW;
      const h = n.measured?.height ?? n.style?.height ?? tightH;
      minX = Math.min( minX, x );
      minY = Math.min( minY, y );
      maxX = Math.max( maxX, x + ( typeof w === 'number' ? w : tightW ) );
      maxY = Math.max( maxY, y + ( typeof h === 'number' ? h : tightH ) );
    } );
    const groupId = 'group-' + Date.now();
    const groupPos = { x: minX - padding, y: minY - padding };
    const groupWidth = maxX - minX + 2 * padding;
    const groupHeight = maxY - minY + 2 * padding + GROUP_HEADER_HEIGHT_EXPANDED;
    const groupNode = {
      id: groupId,
      type: 'group',
      position: groupPos,
      style: { width: groupWidth, height: groupHeight },
      data: {
        label: 'Group',
        groupName: 'Group',
        category: 'advanced',
        expandedWidth: groupWidth,
        expandedHeight: groupHeight,
      },
      zIndex: nodes.reduce( ( m, n ) => Math.max( m, n.zIndex ?? 0 ), 0 ) + 1,
    };
    const selectedIds = new Set( selected.map( ( n ) => n.id ) );
    const nodesWithGroup = nodes.map( ( n ) => {
      if ( !selectedIds.has( n.id ) ) return n;
      return {
        ...n,
        parentId: groupId,
        extent: 'parent',
        position: {
          x: ( n.position.x ?? 0 ) - groupPos.x,
          y: ( n.position.y ?? 0 ) - groupPos.y + GROUP_HEADER_HEIGHT_EXPANDED,
        },
      };
    } );
    const nodesWithGroupAdded = [ ...nodesWithGroup, groupNode ];
    const { nodes: collapsedNodes, edges: collapsedEdges } = collapseGroup( nodesWithGroupAdded, edges, groupId );
    setNodes( collapsedNodes );
    setEdges( collapsedEdges );
    refreshPreviewRef.current?.();
  }, [ nodes, edges ] );

  const onCopyTSL = useCallback( () => {
    const code = generateTSLCode( nodes, edges );
    navigator.clipboard.writeText( code ).catch( () => {} );
  }, [ nodes, edges ] );
  const onCopyJSON = useCallback( () => {
    const json = exportGraphToJSON( nodes, edges );
    navigator.clipboard.writeText( JSON.stringify( json, null, 2 ) ).catch( () => {} );
  }, [ nodes, edges ] );
  const onLoadJSON = useCallback( ( e ) => {
    const file = e.target.files?.[ 0 ];
    if ( !file ) return;
    const reader = new FileReader();
    reader.onload = ( ev ) => {
      try {
        const json = JSON.parse( ev.target.result );
        const { nodes: nextNodes, edges: nextEdges } = importGraphFromJSON( json );
        setNodes( nextNodes );
        setEdges( nextEdges );
      } catch ( err ) {}
    };
    reader.readAsText( file );
    e.target.value = '';
  }, [] );

  const selectedNode = nodes.find( ( n ) => n.selected ) ?? null;
  const onNodeDataChange = useCallback( ( nodeId, key, value ) => {
    setNodes( ( nds ) =>
      nds.map( ( n ) =>
        n.id === nodeId ? { ...n, data: { ...n.data, [ key ]: value } } : n
      )
    );
    setGraphVersion( ( v ) => v + 1 );
  }, [] );

  return (
    <GroupActionsContext.Provider value={{ onToggleGroupCollapse }}>
    <NodeDisplayValuesProvider nodes={nodes} edges={edges}>
    <div style={rootStyle}>
      {/* Full-window nodes area (behind panels) */}
      <div style={nodesAreaStyle}>
        <div style={flowWrapStyle} ref={flowContainerRef}>
          <ReactFlow
            className="dark"
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onEdgeClick={onEdgeClick}
            onNodesDelete={onNodesDelete}
            onEdgesDelete={onEdgesDelete}
            deleteKeyCode={[ 'Backspace', 'Delete' ]}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <ViewportSync viewportRef={viewportRef} />
            <Background />
          </ReactFlow>
        </div>
      </div>
      {/* Panels on top: nodes (left), toolbar (center), preview (right) – same top Y */}
      <NodesPanel
        onAddNode={onAddNode}
        customNodes={customNodeDefs}
        onCreateCustomNode={onCreateCustomNode}
        onOpenCreateFromCode={() => setCreateNodeModalOpen( true )}
      />
      <CreateNodeFromCodeModal
        open={createNodeModalOpen}
        onClose={() => setCreateNodeModalOpen( false )}
        onCreate={( { name, code, inputs, inputTypes, outputType } ) => {
          onCreateCustomNode( { id: 'customFn-' + Date.now(), label: name, code, inputs: inputs || [], inputTypes: inputTypes || {}, outputType: outputType || 'float' } );
          setCreateNodeModalOpen( false );
        }}
      />
      <div style={toolbarStyle}>
        <button type="button" onClick={onGroupSelection} style={exportBtnStyle} title="Group selected nodes (select 2 or more)">Group</button>
        <button type="button" onClick={onCopyTSL} style={exportBtnStyle}>Copy TSL</button>
        <button type="button" onClick={onCopyJSON} style={exportBtnStyle}>Copy JSON</button>
        <label style={exportBtnStyle}>
          Load JSON
          <input type="file" accept=".json" onChange={onLoadJSON} style={{ display: 'none' }} />
        </label>
      </div>
      <LivePreviewPanel nodes={nodes} edges={edges} graphVersion={graphVersion} refreshPreviewRef={refreshPreviewRef} />
      <NodeParametersPanel
        selectedNode={selectedNode}
        edges={edges}
        onNodeDataChange={onNodeDataChange}
        panelTop={PARAMS_PANEL_TOP}
        panelHeight={PARAMS_PANEL_HEIGHT}
      />
    </div>
    </NodeDisplayValuesProvider>
    </GroupActionsContext.Provider>
  );
}
