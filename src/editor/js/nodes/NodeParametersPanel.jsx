import { useMemo, useState, useCallback, useEffect } from 'react';
import { getEditableProperties, getInputHandleForProp } from './nodeEditableProperties.js';
import { parseCustomFnInputs, validateCustomFnCode, inferCustomFnOutputType } from './parseCustomFnCode.js';
const PANEL_GAP = 12;
const PANEL_RADIUS = 10;
const PANEL_WIDTH = 280;

const panelStyle = ( top, height ) => ( {
  position: 'fixed',
  right: PANEL_GAP,
  top,
  width: PANEL_WIDTH,
  height,
  zIndex: 10,
  background: 'rgba(30, 30, 30, 0.85)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(51, 51, 51, 0.6)',
  borderRadius: PANEL_RADIUS,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
} );

const headerStyle = {
  padding: '12px 14px',
  fontSize: 13,
  fontWeight: 600,
  color: '#eee',
  borderBottom: '1px solid #333',
  flexShrink: 0,
};

const subtitleStyle = {
  fontSize: 11,
  fontWeight: 400,
  color: '#888',
  marginTop: 2,
};

const scrollStyle = {
  flex: 1,
  overflow: 'auto',
  padding: '12px 14px',
};

const sectionLabelStyle = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  color: '#aaa',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: 6,
  marginTop: 12,
};

const sectionLabelFirstStyle = { ...sectionLabelStyle, marginTop: 0 };

const inputBaseStyle = {
  width: '100%',
  padding: '8px 10px',
  background: '#2a2a2a',
  border: '1px solid #444',
  borderRadius: 6,
  color: '#eee',
  fontSize: 13,
  boxSizing: 'border-box',
};

const rowStyle = { marginBottom: 10 };

const checkboxRowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginBottom: 10,
};

const checkboxStyle = {
  width: 16,
  height: 16,
  cursor: 'pointer',
  accentColor: '#4a9eff',
};

const emptyMessageStyle = {
  color: '#888',
  fontSize: 13,
  fontStyle: 'italic',
  padding: '20px 0',
};

const CODE_TEXTAREA_STYLE = {
  ...inputBaseStyle,
  minHeight: 140,
  fontFamily: 'monospace',
  fontSize: 12,
  resize: 'vertical',
};

const INPUT_TYPE_OPTIONS = [
  { value: 'any', label: 'Any' },
  { value: 'float', label: 'Float' },
  { value: 'vec2', label: 'Vec2' },
  { value: 'vec3', label: 'Vec3' },
  { value: 'vec4', label: 'Vec4' },
  { value: 'color', label: 'Color' },
  { value: 'int', label: 'Int' },
  { value: 'bool', label: 'Bool' },
];

const selectStyle = {
  ...inputBaseStyle,
  minHeight: 34,
  padding: '10px 32px 10px 10px',
  cursor: 'pointer',
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 10px center',
  paddingRight: 32,
};

const colorRowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginBottom: 10,
};

const colorSwatchStyle = {
  width: 32,
  height: 28,
  border: '1px solid #444',
  borderRadius: 6,
  cursor: 'pointer',
  flexShrink: 0,
  padding: 0,
  background: 'transparent',
};

const colorInputStyle = {
  ...inputBaseStyle,
  flex: 1,
};

function getDisplayValue( node, prop ) {
  const raw = node.data?.[ prop.key ];
  if ( raw === undefined || raw === null ) return prop.default;
  return raw;
}

/** Use slider for number props that have min and max (e.g. roughness 0–1, IOR 1–2.333) */
function isSliderProp( prop ) {
  return (
    prop.type === 'number' &&
    prop.min != null &&
    prop.max != null &&
    Number( prop.min ) < Number( prop.max ) &&
    ( prop.step == null || Number( prop.step ) > 0 )
  );
}

const sliderRowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  marginBottom: 10,
  minHeight: 24,
};

const sliderTrackStyle = {
  flex: 1,
  minWidth: 0,
};

const sliderNumberStyle = {
  width: 52,
  padding: '4px 6px',
  background: '#2a2a2a',
  border: '1px solid #444',
  borderRadius: 4,
  color: '#eee',
  fontSize: 12,
  textAlign: 'right',
  boxSizing: 'border-box',
};

function isInputConnected( nodeId, handleId, edges ) {
  return edges.some( ( e ) => e.target === nodeId && e.targetHandle === handleId );
}

/** Parse numeric input on blur/Enter; allow empty → default, invalid → default, clamp to min/max */
function parseNumberCommit( raw, prop ) {
  const trimmed = raw.trim();
  if ( trimmed === '' ) return prop.default;
  const v = Number( trimmed );
  if ( Number.isNaN( v ) ) return prop.default;
  if ( prop.min != null && v < prop.min ) return prop.min;
  if ( prop.max != null && v > prop.max ) return prop.max;
  return v;
}

export function NodeParametersPanel( { selectedNode, edges = [], onNodeDataChange, panelTop, panelHeight } ) {
  const [ editingField, setEditingField ] = useState( null );
  const [ editingText, setEditingText ] = useState( '' );

  const fields = useMemo( () => {
    if ( ! selectedNode ) return [];
    const all = getEditableProperties( selectedNode.type );
    return all.filter( ( prop ) => {
      const handleId = getInputHandleForProp( selectedNode.type, prop.key );
      if ( handleId == null ) return true;
      return ! isInputConnected( selectedNode.id, handleId, edges );
    } );
  }, [ selectedNode, edges ] );

  const commitNumberEdit = useCallback( ( propKey, rawText ) => {
    const prop = fields.find( ( p ) => p.key === propKey );
    if ( ! prop || ! selectedNode ) return;
    const v = parseNumberCommit( rawText, prop );
    onNodeDataChange( selectedNode.id, prop.key, v );
    setEditingField( null );
  }, [ fields, selectedNode, onNodeDataChange ] );

  useEffect( () => { setEditingField( null ); }, [ selectedNode?.id ] );

  const hasEditableProps = fields.length > 0;
  const isCustomFn = selectedNode?.type === 'customFn' || selectedNode?.type === 'customfn';
  const customFnCode = isCustomFn ? ( selectedNode.data?.code ?? 'Fn(([a]) => TSL.vec3(0.5, 0, 0.5))' ) : '';
  const customFnValidation = useMemo( () => ( isCustomFn ? validateCustomFnCode( customFnCode ) : { valid: false } ), [ isCustomFn, customFnCode ] );
  const customFnInputs = useMemo( () => ( isCustomFn && customFnValidation.valid ? parseCustomFnInputs( customFnCode ) : ( selectedNode?.data?.inputs ?? [] ) ), [ isCustomFn, customFnValidation.valid, customFnCode, selectedNode?.data?.inputs ] );
  const customFnInputTypes = selectedNode?.data?.inputTypes ?? {};
  const commitCustomFnCode = useCallback( () => {
    if ( ! selectedNode || ! isCustomFn ) return;
    const code = selectedNode.data?.code ?? '';
    if ( validateCustomFnCode( code ).valid ) {
      onNodeDataChange( selectedNode.id, 'inputs', parseCustomFnInputs( code ) );
      onNodeDataChange( selectedNode.id, 'outputType', inferCustomFnOutputType( code ) );
    }
  }, [ selectedNode, isCustomFn, onNodeDataChange ] );

  if ( ! selectedNode ) {
    return (
      <div style={panelStyle( panelTop, panelHeight )}>
        <div style={headerStyle}>Node parameters</div>
        <div style={scrollStyle}>
          <span style={emptyMessageStyle}>Select a node to edit its properties.</span>
        </div>
      </div>
    );
  }

  const title = selectedNode.data?.label || selectedNode.type || 'Node';
  const subtitle = `${selectedNode.type}/${selectedNode.id}`;

  return (
    <div style={panelStyle( panelTop, panelHeight )}>
      <div style={headerStyle}>
        <div>{title}</div>
        <div style={subtitleStyle}>{subtitle}</div>
      </div>
      <div style={scrollStyle}>
        {( isCustomFn ? (
          <>
            <label style={sectionLabelFirstStyle}>CODE</label>
            <textarea
              style={CODE_TEXTAREA_STYLE}
              value={customFnCode}
              onChange={( e ) => onNodeDataChange( selectedNode.id, 'code', e.target.value )}
              onBlur={commitCustomFnCode}
              spellCheck={false}
              placeholder="Fn(([a, b]) => { return a.add(b); })"
            />
            <div style={{ fontSize: 12, marginTop: 6, color: customFnValidation.valid ? '#6b9f6b' : ( customFnValidation.error ? '#d66' : '#888' ) }}>
              {customFnValidation.valid ? (
                <>✓ Valid · {customFnInputs.map( ( i ) => i.id ).join( ', ' ) || 'no args'}</>
              ) : (
                customFnValidation.error || 'Edit code to validate'
              )}
            </div>
            {customFnValidation.valid && customFnInputs.length > 0 ? (
              <>
                <label style={sectionLabelStyle}>Input types</label>
                {customFnInputs.map( ( { id, label } ) => (
                  <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: '#bbb', minWidth: 24 }}>{label}</span>
                    <select
                      style={{ ...inputBaseStyle, flex: 1, marginBottom: 0, minHeight: 32 }}
                      value={customFnInputTypes[ id ] || 'float'}
                      onChange={( e ) => onNodeDataChange( selectedNode.id, 'inputTypes', { ...customFnInputTypes, [ id ]: e.target.value } )}
                    >
                      {INPUT_TYPE_OPTIONS.map( ( opt ) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ) )}
                    </select>
                  </div>
                ) )}
              </>
            ) : null}
          </>
        ) : ! hasEditableProps ? (
          <span style={emptyMessageStyle}>This node has no editable properties.</span>
        ) : (
          fields.map( ( prop, i ) => (
            <div key={prop.key} style={rowStyle}>
              <label style={i === 0 ? sectionLabelFirstStyle : sectionLabelStyle}>{prop.label}</label>
              {prop.type === 'number' && isSliderProp( prop ) && ( ( function () {
                const fieldKey = `${selectedNode.id}:${prop.key}`;
                const isEditing = editingField === fieldKey;
                return (
                  <div style={sliderRowStyle}>
                    <input
                      type="range"
                      className="node-params-slider"
                      style={sliderTrackStyle}
                      min={prop.min}
                      max={prop.max}
                      step={prop.step ?? 0.01}
                      value={Number( getDisplayValue( selectedNode, prop ) )}
                      onChange={( e ) => onNodeDataChange( selectedNode.id, prop.key, Number( e.target.value ) )}
                    />
                    <input
                      type="text"
                      inputMode="decimal"
                      style={sliderNumberStyle}
                      value={isEditing ? editingText : String( getDisplayValue( selectedNode, prop ) )}
                      onFocus={() => { setEditingField( fieldKey ); setEditingText( String( getDisplayValue( selectedNode, prop ) ) ); }}
                      onChange={( e ) => setEditingText( e.target.value )}
                      onBlur={( e ) => commitNumberEdit( prop.key, e.target.value )}
                      onKeyDown={( e ) => {
                        if ( e.key === 'Enter' ) { e.preventDefault(); commitNumberEdit( prop.key, e.target.value ); e.target.blur(); }
                      }}
                    />
                  </div>
                );
              } )() )}
              {prop.type === 'number' && ! isSliderProp( prop ) && ( ( function () {
                const fieldKey = `${selectedNode.id}:${prop.key}`;
                const isEditing = editingField === fieldKey;
                return (
                  <input
                    type="text"
                    inputMode="decimal"
                    style={inputBaseStyle}
                    value={isEditing ? editingText : String( getDisplayValue( selectedNode, prop ) )}
                    onFocus={() => { setEditingField( fieldKey ); setEditingText( String( getDisplayValue( selectedNode, prop ) ) ); }}
                    onChange={( e ) => setEditingText( e.target.value )}
                    onBlur={( e ) => commitNumberEdit( prop.key, e.target.value )}
                    onKeyDown={( e ) => {
                      if ( e.key === 'Enter' ) { e.preventDefault(); commitNumberEdit( prop.key, e.target.value ); e.target.blur(); }
                    }}
                  />
                );
              } )() )}
              {prop.type === 'color' && (
                <div style={colorRowStyle}>
                  <input
                    type="color"
                    style={colorSwatchStyle}
                    value={getDisplayValue( selectedNode, prop )}
                    onChange={( e ) => onNodeDataChange( selectedNode.id, prop.key, e.target.value )}
                  />
                  <input
                    type="text"
                    style={colorInputStyle}
                    value={getDisplayValue( selectedNode, prop )}
                    onChange={( e ) => onNodeDataChange( selectedNode.id, prop.key, e.target.value )}
                  />
                </div>
              )}
              {prop.type === 'text' && (
                <input
                  type="text"
                  style={inputBaseStyle}
                  value={getDisplayValue( selectedNode, prop ) ?? ''}
                  onChange={( e ) => onNodeDataChange( selectedNode.id, prop.key, e.target.value )}
                />
              )}
              {prop.type === 'checkbox' && (
                <div style={checkboxRowStyle}>
                  <input
                    type="checkbox"
                    style={checkboxStyle}
                    checked={!! getDisplayValue( selectedNode, prop )}
                    onChange={( e ) => onNodeDataChange( selectedNode.id, prop.key, e.target.checked )}
                  />
                  <span style={{ color: '#ccc', fontSize: 13 }}>
                    {getDisplayValue( selectedNode, prop ) ? 'True' : 'False'}
                  </span>
                </div>
              )}
              {prop.type === 'select' && (
                <select
                  style={selectStyle}
                  value={getDisplayValue( selectedNode, prop )}
                  onChange={( e ) => {
                    const v = prop.options?.some( ( o ) => typeof o.value === 'number' )
                      ? Number( e.target.value )
                      : e.target.value;
                    onNodeDataChange( selectedNode.id, prop.key, v );
                  }}
                >
                  {( prop.options || [] ).map( ( opt ) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ) )}
                </select>
              )}
            </div>
          ) )
        ) )}
      </div>
    </div>
  );
}
