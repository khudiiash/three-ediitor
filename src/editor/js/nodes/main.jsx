import { createRoot } from 'react-dom/client';
import { Nodes } from './Nodes.jsx';

let mountedRoot = null;

/**
 * Mount the Nodes (React Flow) app into the given container. Idempotent (only mounts once).
 * @param {HTMLElement} [container] - Element to mount into; defaults to document.getElementById('root')
 */
export function mountNodes( container ) {

	if ( mountedRoot ) return mountedRoot;
	const el = container || document.getElementById( 'root' );
	if ( !el ) return null;
	mountedRoot = createRoot( el );
	mountedRoot.render( <Nodes /> );
	return mountedRoot;

}
