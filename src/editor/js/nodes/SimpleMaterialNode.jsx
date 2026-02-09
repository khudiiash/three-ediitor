import { useMemo } from 'react';
import { Handle, Position, useEdges, useNodes } from 'reactflow';
import { getDefinition } from './nodeDefinitions.js';
import { useNodeDisplayValueForInput, displayValueToColorInputSwatchHex } from './NodeDisplayValuesContext.jsx';

const TITLE_BY_TYPE = {
	meshSSSMaterial: 'MESH SSS MATERIAL',
	meshToonMaterial: 'MESH TOON MATERIAL',
	meshLambertMaterial: 'MESH LAMBERT MATERIAL',
	meshNormalMaterial: 'MESH NORMAL MATERIAL',
	pointsMaterial: 'POINTS MATERIAL',
};

const SIDE_LABELS = [ 'Front', 'Back', 'Double' ];

const COLOR_INPUTS = new Set( [ 'color', 'emissive', 'sheen' ] );

export function SimpleMaterialNode( { id, data } ) {
	const edges = useEdges();
	const nodes = useNodes();
	const nodeType = data?.nodeType || 'meshToonMaterial';
	const category = data?.category || 'material';
	const def = getDefinition( nodeType );
	const inputs = def.inputs || [];

	const connectedTargets = useMemo(
		() =>
			new Set(
				edges.filter( ( e ) => e.target === id ).map( ( e ) => e.targetHandle ).filter( Boolean )
			),
		[ edges, id ]
	);

	const colorDisplayValue = useNodeDisplayValueForInput( id, 'color' );
	const emissiveDisplayValue = useNodeDisplayValueForInput( id, 'emissive' );

	const resolvedColor = useMemo( () => {
		const edge = edges.find( ( e ) => e.target === id && e.targetHandle === 'color' );
		if ( ! edge ) return data?.color;
		const hex = displayValueToColorInputSwatchHex( colorDisplayValue );
		if ( hex ) return hex;
		const sourceNode = nodes.find( ( n ) => n.id === edge.source );
		return sourceNode?.data?.color ?? data?.color;
	}, [ edges, nodes, id, data?.color, colorDisplayValue ] );

	const resolvedEmissive = useMemo( () => {
		const edge = edges.find( ( e ) => e.target === id && e.targetHandle === 'emissive' );
		if ( ! edge ) return data?.emissive;
		const hex = displayValueToColorInputSwatchHex( emissiveDisplayValue );
		if ( hex ) return hex;
		const sourceNode = nodes.find( ( n ) => n.id === edge.source );
		return sourceNode?.data?.color ?? data?.emissive;
	}, [ edges, nodes, id, data?.emissive, emissiveDisplayValue ] );

	const getDisplayValue = ( input ) => {
		if ( input.id === 'color' ) return resolvedColor ?? data?.color ?? '#ffffff';
		if ( input.id === 'emissive' ) return resolvedEmissive ?? data?.emissive ?? '#000000';
		const v = data?.[ input.id ];
		if ( v === undefined || v === null ) return null;
		return v;
	};

	const title = TITLE_BY_TYPE[ nodeType ] || nodeType.toUpperCase().replace( /([A-Z])/g, ' $1' ).trim();

	return (
		<div className={ `tsl-node tsl-node--category-${ category } simple-material-node` }>
			<div className="tsl-node__header">
				<div className="tsl-node__title">{ title }</div>
			</div>
			<div className="tsl-node__divider" />
			<div className="tsl-node__body">
				{ inputs.map( ( input ) => {
					const connected = connectedTargets.has( input.id );
					const displayVal = getDisplayValue( input );
					const isColorInput = COLOR_INPUTS.has( input.id );
					const showSwatch = isColorInput;
					const swatchColor = isColorInput ? ( displayVal || ( input.id === 'emissive' ? '#000000' : '#ffffff' ) ) : null;
					return (
						<div key={ input.id } className="tsl-node__row">
							<Handle
								type="target"
								position={ Position.Left }
								id={ input.id }
								className={ `type-${ input.type || 'float' } ${ connected ? 'connected' : '' }` }
							/>
							<span className={ `tsl-node__label ${ connected ? '' : 'tsl-node__label--dimmed' }` }>
								{ input.label }
							</span>
							{ ! connected && displayVal != null && ! showSwatch && (
								<span className="tsl-node__value">
									{ typeof displayVal === 'number' ? displayVal.toFixed( 2 ) : String( displayVal ) }
								</span>
							) }
							{ showSwatch && (
								<span
									className="tsl-node__value-swatch"
									title={ swatchColor || 'Color' }
									style={ swatchColor ? { background: swatchColor } : undefined }
								/>
							) }
						</div>
					);
				} ) }
				{ data && ( 'side' in data || 'transparent' in data || 'depthWrite' in data ) && (
					<>
						{ data.side !== undefined && (
							<div className="tsl-node__row tsl-node__row--no-handle">
								<span className="tsl-node__label tsl-node__label--dimmed">SIDE</span>
								<span className="tsl-node__value">{ SIDE_LABELS[ data.side ] ?? 'Front' }</span>
							</div>
						) }
						<div className="tsl-node__row tsl-node__row--no-handle">
							<span className="tsl-node__label tsl-node__label--dimmed">TRANSPARENT</span>
							<span className="tsl-node__value">{ data.transparent ? 'True' : 'False' }</span>
						</div>
						<div className="tsl-node__row tsl-node__row--no-handle">
							<span className="tsl-node__label tsl-node__label--dimmed">DEPTH WRITE</span>
							<span className="tsl-node__value">{ data.depthWrite !== false ? 'True' : 'False' }</span>
						</div>
					</>
				) }
			</div>
		</div>
	);
}
