import { createContext, useContext, useMemo, useState } from 'react';
import { computeNodeDisplayValues } from './nodeDisplayValues.js';

export const NodeDisplayValuesContext = createContext( {
  getDisplayValue: () => null,
  getDisplayValueForInput: () => null,
  previewTime: 0,
  setPreviewTimeFromPreview: null,
} );

export function useNodeDisplayValue( nodeId ) {
  const { getDisplayValue } = useContext( NodeDisplayValuesContext );
  return getDisplayValue ? getDisplayValue( nodeId ) : null;
}

/** Value for a specific input handle (e.g. Vec3 Z when TIME is connected). */
export function useNodeDisplayValueForInput( nodeId, targetHandle ) {
  const { getDisplayValueForInput } = useContext( NodeDisplayValuesContext );
  return getDisplayValueForInput ? getDisplayValueForInput( nodeId, targetHandle ) : null;
}

/** Remap a float (e.g. sin output in [-1,1]) to 0..1 and return hex for swatch. Use for generic float display. */
export function displayValueToHex( value ) {
  if ( value == null || typeof value !== 'number' || ! isFinite( value ) ) return null;
  const t = Math.max( 0, Math.min( 1, ( value + 1 ) * 0.5 ) );
  const v = Math.round( t * 255 );
  const hex = v.toString( 16 ).padStart( 2, '0' );
  return '#' + hex + hex + hex;
}

/** For color/emissive inputs: float 0 → #000, 1 → #fff (no [-1,1] remap). Use for material color swatches. */
export function displayValueToColorInputSwatchHex( value ) {
  if ( value == null ) return null;
  if ( typeof value === 'number' && isFinite( value ) ) {
    const t = Math.max( 0, Math.min( 1, value ) );
    const v = Math.round( t * 255 );
    const hex = v.toString( 16 ).padStart( 2, '0' );
    return '#' + hex + hex + hex;
  }
  if ( typeof value === 'object' && ( 'r' in value || 'g' in value || 'b' in value ) ) return rgbToHex( value );
  return null;
}

/** Convert { r, g, b } in 0..1 to hex for swatch. */
export function rgbToHex( rgb ) {
  if ( ! rgb || typeof rgb !== 'object' ) return null;
  const r = Math.max( 0, Math.min( 1, rgb.r ?? 0 ) );
  const g = Math.max( 0, Math.min( 1, rgb.g ?? 0 ) );
  const b = Math.max( 0, Math.min( 1, rgb.b ?? 0 ) );
  const hr = Math.round( r * 255 ).toString( 16 ).padStart( 2, '0' );
  const hg = Math.round( g * 255 ).toString( 16 ).padStart( 2, '0' );
  const hb = Math.round( b * 255 ).toString( 16 ).padStart( 2, '0' );
  return '#' + hr + hg + hb;
}

/** Get swatch color (hex) from display value: number (float) or { r, g, b } (vec3/color). */
export function displayValueToSwatchHex( value ) {
  if ( value == null ) return null;
  if ( typeof value === 'number' ) return displayValueToHex( value );
  if ( typeof value === 'object' && ( 'r' in value || 'g' in value || 'b' in value ) ) return rgbToHex( value );
  return null;
}

export function NodeDisplayValuesProvider( { nodes, edges, children } ) {
  // Use the actual time the material uses: the preview calls setPreviewTimeFromPreview(t)
  // with the exact nodeFrame.time it set before rendering, so we display that value (no local accumulation).
  const [ previewTime, setPreviewTime ] = useState( 0 );

  const { valueMap, colorMap } = useMemo(
    () => computeNodeDisplayValues( nodes, edges, previewTime ),
    [ nodes, edges, previewTime ]
  );
  const getDisplayValue = useMemo(
    () => ( nodeId ) => {
      if ( colorMap.has( nodeId ) ) return colorMap.get( nodeId );
      if ( valueMap.has( nodeId ) ) return valueMap.get( nodeId );
      return null;
    },
    [ valueMap, colorMap ]
  );
  const getDisplayValueForInput = useMemo( () => {
    return ( nodeId, targetHandle ) => {
      const edge = edges.find( ( e ) => e.target === nodeId && ( e.targetHandle === targetHandle || e.targetHandle === targetHandle?.toUpperCase?.() ) );
      if ( ! edge ) return null;
      let src = edge.source;
      const sourceNode = nodes.find( ( n ) => n.id === src );
      if ( sourceNode?.type === 'group' && sourceNode.data?.outHandles?.length ) {
        const h = sourceNode.data.outHandles.find( ( x ) => x.id === edge.sourceHandle );
        if ( h?.source != null ) src = h.source;
      }
      if ( colorMap.has( src ) ) return colorMap.get( src );
      if ( valueMap.has( src ) ) return valueMap.get( src );
      return null;
    };
  }, [ nodes, edges, valueMap, colorMap ] );
  const setPreviewTimeFromPreview = useMemo( () => ( t ) => {
    if ( typeof t === 'number' && isFinite( t ) ) setPreviewTime( t );
  }, [] );
  const value = useMemo(
    () => ( { getDisplayValue, getDisplayValueForInput, previewTime, setPreviewTimeFromPreview } ),
    [ getDisplayValue, getDisplayValueForInput, previewTime, setPreviewTimeFromPreview ]
  );
  return (
    <NodeDisplayValuesContext.Provider value={ value }>
      { children }
    </NodeDisplayValuesContext.Provider>
  );
}
