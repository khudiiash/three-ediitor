import { useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { parseCustomFnInputs, validateCustomFnCode, inferCustomFnOutputType } from './parseCustomFnCode.js';
const BACKDROP_STYLE = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.6)',
  zIndex: 100000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 24,
  pointerEvents: 'auto',
};

const MODAL_STYLE = {
  background: '#252525',
  border: '1px solid #444',
  borderRadius: 10,
  minWidth: 420,
  maxWidth: 560,
  maxHeight: '85vh',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
};

const TITLE_STYLE = {
  padding: '14px 18px',
  fontSize: 15,
  fontWeight: 600,
  color: '#eee',
  borderBottom: '1px solid #333',
};

const BODY_STYLE = {
  padding: 18,
  overflow: 'auto',
  flex: 1,
};

const LABEL_STYLE = { display: 'block', marginBottom: 6, fontSize: 12, color: '#bbb' };
const INPUT_STYLE = {
  width: '100%',
  padding: '8px 10px',
  background: '#1e1e1e',
  border: '1px solid #444',
  borderRadius: 4,
  color: '#eee',
  fontSize: 13,
  boxSizing: 'border-box',
  marginBottom: 14,
};
const SELECT_STYLE = {
  ...INPUT_STYLE,
  minHeight: 40,
  padding: '10px 12px',
  cursor: 'pointer',
};
const TEXTAREA_STYLE = {
  ...INPUT_STYLE,
  minHeight: 140,
  fontFamily: 'monospace',
  resize: 'vertical',
};
const VALIDATION_STYLE = { fontSize: 12, color: '#888', marginTop: 8 };
const FOOTER_STYLE = {
  padding: '12px 18px',
  borderTop: '1px solid #333',
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 8,
};
const BTN_STYLE = {
  padding: '8px 16px',
  fontSize: 13,
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
};
const BTN_CANCEL = { ...BTN_STYLE, background: '#333', color: '#ccc' };
const BTN_CREATE = { ...BTN_STYLE, background: '#4a9eff', color: '#fff' };

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

const DEFAULT_CODE = `Fn(([a, b]) => {
  // Your code here. Example: return a.add(b);
})`;

export function CreateNodeFromCodeModal( { open, onClose, onCreate } ) {
  const [nodeName, setNodeName] = useState( 'My Custom Node' );
  const [code, setCode] = useState( DEFAULT_CODE );
  const [inputTypes, setInputTypes] = useState( {} );

  const validation = useMemo( () => validateCustomFnCode( code ), [ code ] );
  const isValid = validation.valid === true;
  const inputs = useMemo( () => ( isValid ? parseCustomFnInputs( code ) : [] ), [ code, isValid ] );

  const inputTypesForArgs = useMemo( () => {
    const next = { ...inputTypes };
    inputs.forEach( ( { id } ) => {
      if ( next[ id ] == null ) next[ id ] = 'float';
    } );
    return next;
  }, [ inputs, inputTypes ] );

  const handleCreate = useCallback( () => {
    if ( !onCreate ) return;
    const name = nodeName.trim();
    if ( !name ) return;
    if ( !isValid ) return;
    const types = {};
    inputs.forEach( ( { id } ) => { types[ id ] = inputTypesForArgs[ id ] || 'float'; } );
    const outputType = inferCustomFnOutputType( code );
    onCreate( { name, code: code.trim(), inputs, inputTypes: types, outputType } );
    setNodeName( 'My Custom Node' );
    setCode( DEFAULT_CODE );
    setInputTypes( {} );
    onClose();
  }, [nodeName, isValid, inputs, inputTypesForArgs, onCreate, onClose] );

  const handleBackdropClick = ( e ) => {
    if ( e.target === e.currentTarget ) onClose();
  };

  if ( !open ) return null;

  let container = document.body;
  if ( typeof document !== 'undefined' ) {
    let root = document.getElementById( 'modal-root' );
    if ( !root ) {
      root = document.createElement( 'div' );
      root.id = 'modal-root';
      root.style.cssText = 'position:fixed;inset:0;z-index:99999;pointer-events:none';
      document.body.appendChild( root );
    }
    container = root;
  }

  const modal = (
    <div style={BACKDROP_STYLE} onClick={handleBackdropClick} role="dialog" aria-modal="true" aria-labelledby="create-node-modal-title">
      <div style={MODAL_STYLE} onClick={( e ) => e.stopPropagation()}>
        <div id="create-node-modal-title" style={TITLE_STYLE}>&lt; &gt; Create Node from Code</div>
        <div style={BODY_STYLE}>
          <p style={{ fontSize: 12, color: '#999', marginBottom: 14 }}>
            Create a reusable node by writing TSL code. Arguments become input handles.
          </p>
          <label style={LABEL_STYLE}>Node Name</label>
          <input
            type="text"
            value={nodeName}
            onChange={( e ) => setNodeName( e.target.value )}
            style={INPUT_STYLE}
            placeholder=""
          />
          <label style={LABEL_STYLE}>TSL Code</label>
          <textarea
            value={code}
            onChange={( e ) => setCode( e.target.value )}
            style={TEXTAREA_STYLE}
            placeholder={DEFAULT_CODE}
            spellCheck={false}
          />
          <div style={{ ...VALIDATION_STYLE, color: isValid ? '#6b9f6b' : ( validation.error ? '#d66' : '#888' ) }}>
            {isValid ? (
              <>✓ Valid code with {inputs.map( ( i ) => i.id ).join( ', ' )}</>
            ) : (
              validation.error || 'Enter code to validate'
            )}
          </div>
          {isValid && inputs.length > 0 && (
            <>
              <label style={{ ...LABEL_STYLE, marginTop: 14 }}>Input Types</label>
              <p style={{ fontSize: 11, color: '#888', marginBottom: 8 }}>
                Configure the type of each input. Use &quot;Any&quot; to accept any value.
              </p>
              {inputs.map( ( { id, label } ) => (
                <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: '#bbb', minWidth: 24 }}>{label}</span>
                  <select
                    value={inputTypesForArgs[ id ] || 'float'}
                    onChange={( e ) => setInputTypes( ( prev ) => ( { ...prev, [ id ]: e.target.value } ) )}
                    style={{ ...SELECT_STYLE, marginBottom: 0, flex: 1 }}
                  >
                    {INPUT_TYPE_OPTIONS.map( ( opt ) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              ))}
            </>
          )}
        </div>
        <div style={FOOTER_STYLE}>
          <button type="button" style={BTN_CANCEL} onClick={onClose}>Cancel</button>
          <button
            type="button"
            style={{ ...BTN_CREATE, opacity: ( isValid && nodeName.trim() ) ? 1 : 0.5, cursor: ( isValid && nodeName.trim() ) ? 'pointer' : 'not-allowed' }}
            onClick={handleCreate}
            disabled={!isValid || !nodeName.trim()}
          >
            Create Node
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal( modal, container );
}
