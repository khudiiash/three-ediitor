import { useEffect, useRef, useState, useCallback, useContext } from 'react';
import { createPortal } from 'react-dom';
import { createLiveMaterialPreview, getMaterialPreviewImage } from '../LiveMaterialPreview.js';
import { NodeDisplayValuesContext } from './NodeDisplayValuesContext.jsx';

const PREVIEW_SIZE = 280;
const PREVIEW_TOP = 12;
const PREVIEW_GAP = 12;
const PREVIEW_RADIUS = 10;

const iconStyle = {
  width: 24,
  height: 24,
  border: 'none',
  background: 'transparent',
  color: '#aaa',
  cursor: 'pointer',
  padding: 4,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

export function LivePreviewPanel( { nodes, edges, graphVersion = 0, refreshPreviewRef } ) {
  const containerRef = useRef( null );
  const previewRef = useRef( null );
  const materialRef = useRef( null );
  const settingsButtonRef = useRef( null );
  const nodesRef = useRef( nodes );
  const edgesRef = useRef( edges );
  const graphVersionRef = useRef( graphVersion );
  nodesRef.current = nodes;
  edgesRef.current = edges;
  graphVersionRef.current = graphVersion;
  const [ settingsOpen, setSettingsOpen ] = useState( false );
  const [ settingsAnchor, setSettingsAnchor ] = useState( null );
  const [ previewReady, setPreviewReady ] = useState( false );
  const [ settings, setSettings ] = useState( {
    geometry: 'sphere',
    // sphere
    radius: 1,
    segmentsW: 32,
    segmentsH: 16,
    // box
    boxSizeW: 1,
    boxSizeH: 1,
    boxSizeD: 1,
    boxSegW: 8,
    boxSegH: 8,
    boxSegD: 8,
    // torusKnot
    torusRadius: 0.6,
    torusTube: 0.3,
    torusSegT: 32,
    torusSegR: 16,
    environment: 'none',
    showGrid: true,
    showBackdrop: false,
    instancing: false,
    instanceCount: 100,
  } );

  // Use refs so the getter always reads current nodes/edges. Pass editor graph so Editor runs TSL code path (nodes → code → run → material).
  const getNodeMaterial = useCallback( () => ( {
    editorGraph: true,
    nodes: nodesRef.current ?? [],
    edges: edgesRef.current ?? [],
    _version: graphVersionRef.current,
  } ), [] );

  const getNodeMaterialRef = useRef( getNodeMaterial );
  getNodeMaterialRef.current = getNodeMaterial;
  const { setPreviewTimeFromPreview } = useContext( NodeDisplayValuesContext );
  const onTimeUpdateRef = useRef( setPreviewTimeFromPreview );
  onTimeUpdateRef.current = setPreviewTimeFromPreview;

  // Single source of truth: panel builds the material from the same nodes/edges as swatches; preview only displays it.
  const getMaterial = useCallback( () => materialRef.current, [] );

  useEffect( () => {
    const editor = typeof window !== 'undefined' && window.editor;
    const generateMaterialFromNodes = editor && editor.generateMaterialFromNodes;
    if ( ! generateMaterialFromNodes || ! containerRef.current ) return;

    let stopped = false;
    const payload = { editorGraph: true, nodes: nodesRef.current ?? [], edges: edgesRef.current ?? [], _version: graphVersionRef.current };
    materialRef.current = generateMaterialFromNodes( payload );
    const stableGetNodeMaterial = () => getNodeMaterialRef.current();
    const onTimeUpdate = ( t ) => { if ( onTimeUpdateRef.current ) onTimeUpdateRef.current( t ); };
    createLiveMaterialPreview( stableGetNodeMaterial(), PREVIEW_SIZE, PREVIEW_SIZE, generateMaterialFromNodes, {
      getNodeMaterial: stableGetNodeMaterial,
      getMaterial,
      onTimeUpdate,
      ...settings,
      showGrid: settings.showGrid,
      showBackdrop: settings.showBackdrop,
      environment: settings.environment,
    } ).then( ( api ) => {
      if ( stopped || ! containerRef.current ) return;
      previewRef.current = api;
      api.updateMaterial();
      if ( refreshPreviewRef ) refreshPreviewRef.current = () => api.updateMaterial?.();
      const wrap = containerRef.current.querySelector( '.live-preview-wrap' );
      if ( wrap ) wrap.appendChild( api.element );
      if ( api.updateOptions ) api.updateOptions( { showGrid: settings.showGrid, showBackdrop: settings.showBackdrop, environment: settings.environment } );
      setPreviewReady( true );
    } ).catch( ( err ) => {
      console.warn( '[LivePreviewPanel] createLiveMaterialPreview failed:', err );
    } );

    return () => {
      stopped = true;
      if ( refreshPreviewRef ) refreshPreviewRef.current = null;
      if ( materialRef.current && materialRef.current.dispose ) materialRef.current.dispose();
      materialRef.current = null;
      if ( previewRef.current ) {
        previewRef.current.stop();
        previewRef.current = null;
      }
      const wrap = containerRef.current?.querySelector( '.live-preview-wrap' );
      if ( wrap ) while ( wrap.firstChild ) wrap.removeChild( wrap.firstChild );
      setPreviewReady( false );
    };
  }, [ refreshPreviewRef, getMaterial ] );

  useEffect( () => {
    if ( ! previewRef.current?.updateOptions ) return;
    previewRef.current.updateOptions( {
      showGrid: settings.showGrid,
      showBackdrop: settings.showBackdrop,
      environment: settings.environment,
    } );
  }, [ settings.showGrid, settings.showBackdrop, settings.environment ] );

  // Rebuild the single material from current graph (same nodes/edges as swatches) and tell preview to apply it.
  useEffect( () => {
    const editor = typeof window !== 'undefined' && window.editor;
    const generateMaterialFromNodes = editor && editor.generateMaterialFromNodes;
    if ( ! generateMaterialFromNodes ) return;
    const payload = {
      editorGraph: true,
      nodes: nodesRef.current ?? [],
      edges: edgesRef.current ?? [],
      _version: graphVersionRef.current,
    };
    const prev = materialRef.current;
    materialRef.current = generateMaterialFromNodes( payload );
    if ( prev && prev !== materialRef.current && prev.dispose ) prev.dispose();
    if ( previewRef.current?.updateMaterial ) previewRef.current.updateMaterial();
  }, [ nodes, edges, graphVersion ] );

  useEffect( () => {
    if ( ! previewRef.current || ! previewRef.current.updateGeometry ) return;
    previewRef.current.updateGeometry( { ...settings } );
  }, [
    settings.geometry,
    settings.radius,
    settings.segmentsW,
    settings.segmentsH,
    settings.boxSizeW,
    settings.boxSizeH,
    settings.boxSizeD,
    settings.boxSegW,
    settings.boxSegH,
    settings.boxSegD,
    settings.torusRadius,
    settings.torusTube,
    settings.torusSegT,
    settings.torusSegR,
  ] );

  const handleFullscreen = useCallback( () => {
    const wrap = containerRef.current?.querySelector( '.live-preview-wrap' );
    if ( ! wrap ) return;
    if ( ! document.fullscreenElement ) {
      wrap.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }, [] );

  useEffect( () => {
    function onFullscreenChange() {
      const wrap = containerRef.current?.querySelector( '.live-preview-wrap' );
      if ( ! previewRef.current?.setSize || ! wrap ) return;
      if ( document.fullscreenElement === wrap ) {
        wrap.style.width = '100vw';
        wrap.style.height = '100vh';
        const w = wrap.clientWidth || window.innerWidth;
        const h = wrap.clientHeight || window.innerHeight;
        previewRef.current.setSize( w, h );
      } else {
        wrap.style.width = PREVIEW_SIZE + 'px';
        wrap.style.height = PREVIEW_SIZE + 'px';
        previewRef.current.setSize( PREVIEW_SIZE, PREVIEW_SIZE );
      }
    }
    document.addEventListener( 'fullscreenchange', onFullscreenChange );
    return () => document.removeEventListener( 'fullscreenchange', onFullscreenChange );
  }, [] );

  const handleDownload = useCallback( async () => {
    const editor = typeof window !== 'undefined' && window.editor;
    const generateMaterialFromNodes = editor && editor.generateMaterialFromNodes;
    if ( ! generateMaterialFromNodes ) return;
    const nodeMaterial = getNodeMaterial();
    const dataUrl = await getMaterialPreviewImage( nodeMaterial, 512, 512, generateMaterialFromNodes );
    if ( ! dataUrl ) return;
    const a = document.createElement( 'a' );
    a.href = dataUrl;
    a.download = 'material-preview.png';
    a.click();
  }, [ getNodeMaterial ] );

  const handleSettingsClick = useCallback( () => {
    if ( settingsButtonRef.current ) {
      const rect = settingsButtonRef.current.getBoundingClientRect();
      setSettingsAnchor( { top: rect.top, right: rect.right } );
    }
    setSettingsOpen( ( v ) => ! v );
  }, [] );

  const updateSetting = useCallback( ( key, value ) => {
    setSettings( ( s ) => ( { ...s, [ key ]: value } ) );
  }, [] );

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        right: PREVIEW_GAP,
        top: PREVIEW_TOP,
        width: PREVIEW_SIZE,
        height: PREVIEW_SIZE,
        zIndex: 10,
        background: 'rgba(30, 30, 30, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(51, 51, 51, 0.6)',
        borderRadius: PREVIEW_RADIUS,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'visible',
      }}
    >
      {/* Preview only – no full-height column */}
      <div style={{ flex: '0 0 auto', position: 'relative', width: PREVIEW_SIZE, height: PREVIEW_SIZE }}>
        <div
          className="live-preview-wrap"
          style={{
            width: PREVIEW_SIZE,
            height: PREVIEW_SIZE,
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#1a1a1a',
            borderRadius: 4,
          }}
        >
          { ! previewReady && (
            <div style={{ color: '#888', fontSize: 12 }}>Loading preview…</div>
          ) }
        </div>
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            display: 'flex',
            gap: 4,
            zIndex: 10,
          }}
        >
          <button
            type="button"
            title="Full screen"
            style={iconStyle}
            onClick={handleFullscreen}
            aria-label="Full screen"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>
          </button>
          <button
            type="button"
            title="Download picture"
            style={iconStyle}
            onClick={handleDownload}
            aria-label="Download picture"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 15c1.66 0 3-1.34 3-3V6h3V4H6v2h3v6c0 1.66 1.34 3 3 3z"/><path d="M19 12h-2v3H7v-3H5v3c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2v-3z"/></svg>
          </button>
          <button
            ref={settingsButtonRef}
            type="button"
            title="Preview settings"
            style={{ ...iconStyle, ...( settingsOpen ? { color: '#fff' } : {} ) }}
            onClick={handleSettingsClick}
            aria-label="Preview settings"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.04.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
          </button>
        </div>
      </div>
      { settingsOpen && settingsAnchor && createPortal(
        <PreviewSettingsModal
          settings={settings}
          onSettingChange={updateSetting}
          onClose={() => setSettingsOpen( false )}
          anchorTop={settingsAnchor.top}
          anchorRight={settingsAnchor.right}
        />,
        document.body
      ) }
    </div>
  );
}

function PreviewSettingsModal( { settings, onSettingChange, onClose, anchorTop, anchorRight } ) {
  const [ editingField, setEditingField ] = useState( null );
  const [ editingText, setEditingText ] = useState( '' );

  const modalWidth = 300;
  const rowStyle = { marginBottom: 8 };
  const labelStyle = { display: 'block', marginBottom: 4, color: '#aaa' };
  const inputStyle = {
    width: '100%',
    boxSizing: 'border-box',
    padding: 6,
    background: '#1a1a1a',
    border: '1px solid #444',
    borderRadius: 4,
    color: '#eee',
  };
  const selectStyle = {
    ...inputStyle,
    minHeight: 28,
    paddingTop: 6,
    paddingBottom: 6,
  };

  /** Commit numeric field: parse on blur/Enter; empty or invalid → default, then clamp to min */
  const commitNum = ( key, raw, def, min, isInt = false ) => {
    const t = String( raw ).trim();
    let v = t === '' ? def : ( isInt ? parseInt( t, 10 ) : parseFloat( t ) );
    if ( ( t !== '' && Number.isNaN( v ) ) ) v = def;
    if ( min != null && v < min ) v = min;
    onSettingChange( key, v );
    setEditingField( null );
  };

  const numInput = ( key, currentVal, def, min, isInt = false, inputMode = 'decimal' ) => {
    const isEditing = editingField === key;
    return {
      type: 'text',
      inputMode,
      style: inputStyle,
      value: isEditing ? editingText : String( currentVal ),
      onFocus: () => { setEditingField( key ); setEditingText( String( currentVal ) ); },
      onChange: ( e ) => setEditingText( e.target.value ),
      onBlur: ( e ) => commitNum( key, e.target.value, def, min, isInt ),
      onKeyDown: ( e ) => {
        if ( e.key === 'Enter' ) { e.preventDefault(); commitNum( key, e.target.value, def, min, isInt ); e.target.blur(); }
      },
    };
  };

  return (
    <>
      <div
        role="presentation"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9998,
        }}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-label="Preview Settings"
        style={{
          position: 'fixed',
          top: anchorTop + 32,
          right: typeof window !== 'undefined' ? window.innerWidth - anchorRight + 60 : 0,
          width: modalWidth,
          zIndex: 9999,
          padding: 12,
          background: '#252525',
          border: '1px solid #444',
          borderRadius: 8,
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          fontSize: 12,
          color: '#e0e0e0',
        }}
        onClick={( e ) => e.stopPropagation()}
      >
        <div style={{ marginBottom: 8, fontWeight: 600 }}>Preview Settings</div>
        <p style={{ marginBottom: 12, color: '#888', fontSize: 11 }}>
          Configure the preview geometry and instancing.
        </p>
        <div style={rowStyle}>
          <label style={labelStyle}>Geometry</label>
          <select
            style={selectStyle}
            value={settings.geometry === 'plane' ? 'torusKnot' : settings.geometry}
            onChange={( e ) => onSettingChange( 'geometry', e.target.value )}
          >
            <option value="sphere">Sphere</option>
            <option value="box">Box</option>
            <option value="torusKnot">Torus Knot</option>
          </select>
        </div>
        { settings.geometry === 'sphere' && (
          <>
            <div style={rowStyle}>
              <label style={labelStyle}>Radius</label>
              <input {...numInput( 'radius', settings.radius, 1, 0.1, false, 'decimal' )} />
            </div>
            <div style={rowStyle}>
              <label style={labelStyle}>Segments (W / H)</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input {...numInput( 'segmentsW', settings.segmentsW, 32, 2, true, 'numeric' )} />
                <input {...numInput( 'segmentsH', settings.segmentsH, 16, 2, true, 'numeric' )} />
              </div>
            </div>
          </>
        ) }
        { settings.geometry === 'box' && (
          <>
            <div style={rowStyle}>
              <label style={labelStyle}>Size (W / H / D)</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input {...numInput( 'boxSizeW', settings.boxSizeW, 1, 0.1, false, 'decimal' )} />
                <input {...numInput( 'boxSizeH', settings.boxSizeH, 1, 0.1, false, 'decimal' )} />
                <input {...numInput( 'boxSizeD', settings.boxSizeD, 1, 0.1, false, 'decimal' )} />
              </div>
            </div>
            <div style={rowStyle}>
              <label style={labelStyle}>Segments (W / H / D)</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input {...numInput( 'boxSegW', settings.boxSegW, 8, 1, true, 'numeric' )} />
                <input {...numInput( 'boxSegH', settings.boxSegH, 8, 1, true, 'numeric' )} />
                <input {...numInput( 'boxSegD', settings.boxSegD, 8, 1, true, 'numeric' )} />
              </div>
            </div>
          </>
        ) }
        { settings.geometry === 'torusKnot' && (
          <>
            <div style={rowStyle}>
              <label style={labelStyle}>Radius</label>
              <input {...numInput( 'torusRadius', settings.torusRadius, 0.6, 0.1, false, 'decimal' )} />
            </div>
            <div style={rowStyle}>
              <label style={labelStyle}>Tube</label>
              <input {...numInput( 'torusTube', settings.torusTube, 0.3, 0.01, false, 'decimal' )} />
            </div>
            <div style={rowStyle}>
              <label style={labelStyle}>Segments (T / R)</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input {...numInput( 'torusSegT', settings.torusSegT, 32, 2, true, 'numeric' )} />
                <input {...numInput( 'torusSegR', settings.torusSegR, 16, 2, true, 'numeric' )} />
              </div>
            </div>
          </>
        ) }
        <div style={{ borderTop: '1px solid #444', margin: '8px 0' }} />
        <div style={rowStyle}>
          <label style={labelStyle}>Environment</label>
          <select
            style={selectStyle}
            value={settings.environment}
            onChange={( e ) => onSettingChange( 'environment', e.target.value )}
          >
            <option value="none">None</option>
            <option value="night">Night</option>
            <option value="spring">Spring</option>
            <option value="studio">Studio</option>
          </select>
        </div>
        <div style={rowStyle}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={settings.showGrid}
              onChange={( e ) => onSettingChange( 'showGrid', e.target.checked )}
            />
            Show Grid
          </label>
        </div>
        <div style={rowStyle}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={settings.showBackdrop}
              onChange={( e ) => onSettingChange( 'showBackdrop', e.target.checked )}
            />
            Show Backdrop
          </label>
        </div>
        <div style={rowStyle}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={settings.instancing}
              onChange={( e ) => onSettingChange( 'instancing', e.target.checked )}
            />
            Instancing
          </label>
        </div>
        { settings.instancing && (
          <div style={{ ...rowStyle, marginLeft: 24 }}>
            <label style={labelStyle}>Instances count</label>
            <input {...numInput( 'instanceCount', settings.instanceCount ?? 100, 100, 1, true, 'numeric' )} />
          </div>
        ) }
      </div>
    </>
  );
}
