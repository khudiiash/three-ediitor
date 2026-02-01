import { UIPanel, UIRow, UIText, UINumber, UIColor, UIDiv } from './libs/ui.js';
import * as THREE from 'three';

function SidebarParticleSystem( editor ) {

	const container = new UIPanel();
	const strings = editor.strings;
	const signals = editor.signals;

	let currentObject = null;
	let particleData = {};
	let isUpdating = false;

	const panel = new UIPanel();
	panel.setClass( 'Panel' );
	container.add( panel );

	const maxParticlesRow = new UIRow();
	const maxParticles = new UINumber( 1000 ).setRange( 1, 10000 ).onChange( update );
	maxParticlesRow.add( new UIText( 'Max Particles' ).setWidth( '120px' ).setClass( 'Label' ) );
	maxParticlesRow.add( maxParticles );
	panel.add( maxParticlesRow );

	const emissionRateRow = new UIRow();
	const emissionRate = new UINumber( 50 ).setRange( 0, 1000 ).setPrecision( 0 ).onChange( update );
	emissionRateRow.add( new UIText( 'Emission Rate' ).setWidth( '120px' ).setClass( 'Label' ) );
	emissionRateRow.add( emissionRate );
	panel.add( emissionRateRow );

	const lifetimeRow = new UIRow();
	const lifetime = new UINumber( 2 ).setRange( 0.1, 10 ).setPrecision( 2 ).onChange( update );
	lifetimeRow.add( new UIText( 'Lifetime' ).setWidth( '120px' ).setClass( 'Label' ) );
	lifetimeRow.add( lifetime );
	panel.add( lifetimeRow );

	const startSizeRow = new UIRow();
	const startSize = new UINumber( 0.1 ).setRange( 0.01, 10 ).setPrecision( 2 ).onChange( update );
	startSizeRow.add( new UIText( 'Start Size' ).setWidth( '120px' ).setClass( 'Label' ) );
	startSizeRow.add( startSize );
	panel.add( startSizeRow );

	const endSizeRow = new UIRow();
	const endSize = new UINumber( 0.05 ).setRange( 0.01, 10 ).setPrecision( 2 ).onChange( update );
	endSizeRow.add( new UIText( 'End Size' ).setWidth( '120px' ).setClass( 'Label' ) );
	endSizeRow.add( endSize );
	panel.add( endSizeRow );

	const startColorRow = new UIRow();
	const startColor = new UIColor().setValue( '#ffffff' ).onChange( update );
	startColorRow.add( new UIText( 'Start Color' ).setWidth( '120px' ).setClass( 'Label' ) );
	startColorRow.add( startColor );
	panel.add( startColorRow );

	// End Color
	const endColorRow = new UIRow();
	const endColor = new UIColor().setValue( '#888888' ).onChange( update );
	endColorRow.add( new UIText( 'End Color' ).setWidth( '120px' ).setClass( 'Label' ) );
	endColorRow.add( endColor );
	panel.add( endColorRow );

	// Velocity (X Y Z in one row)
	const velocityRow = new UIRow();
	const velocityX = new UINumber( 0 ).setRange( -10, 10 ).setPrecision( 2 ).setWidth( '50px' ).onChange( update );
	const velocityY = new UINumber( 1 ).setRange( -10, 10 ).setPrecision( 2 ).setWidth( '50px' ).onChange( update );
	const velocityZ = new UINumber( 0 ).setRange( -10, 10 ).setPrecision( 2 ).setWidth( '50px' ).onChange( update );
	const velocityContainer = new UIDiv();
	velocityContainer.setClass( 'input-group' );
	velocityContainer.add( velocityX, velocityY, velocityZ );
	velocityRow.add( new UIText( 'Velocity' ).setWidth( '120px' ).setClass( 'Label' ) );
	velocityRow.add( velocityContainer );
	panel.add( velocityRow );

	// Gravity (X Y Z in one row)
	const gravityRow = new UIRow();
	const gravityX = new UINumber( 0 ).setRange( -20, 20 ).setPrecision( 2 ).setWidth( '50px' ).onChange( update );
	const gravityY = new UINumber( -9.8 ).setRange( -20, 20 ).setPrecision( 2 ).setWidth( '50px' ).onChange( update );
	const gravityZ = new UINumber( 0 ).setRange( -20, 20 ).setPrecision( 2 ).setWidth( '50px' ).onChange( update );
	const gravityContainer = new UIDiv();
	gravityContainer.setClass( 'input-group' );
	gravityContainer.add( gravityX, gravityY, gravityZ );
	gravityRow.add( new UIText( 'Gravity' ).setWidth( '120px' ).setClass( 'Label' ) );
	gravityRow.add( gravityContainer );
	panel.add( gravityRow );

	// Spread
	const spreadRow = new UIRow();
	const spread = new UINumber( 0.5 ).setRange( 0, 10 ).setPrecision( 2 ).onChange( update );
	spreadRow.add( new UIText( 'Spread' ).setWidth( '120px' ).setClass( 'Label' ) );
	spreadRow.add( spread );
	panel.add( spreadRow );

	function update() {
		if ( isUpdating ) return; // Prevent recursive updates
		if ( !currentObject || !currentObject.userData || !currentObject.userData.isParticleSystem ) {
			return;
		}

		if ( !currentObject.userData.particleSystem ) {
			currentObject.userData.particleSystem = {};
		}

		particleData = currentObject.userData.particleSystem;

		// Update particle data
		particleData.maxParticles = maxParticles.getValue();
		particleData.emissionRate = emissionRate.getValue();
		particleData.lifetime = lifetime.getValue();
		particleData.startSize = startSize.getValue();
		particleData.endSize = endSize.getValue();
		
		// Colors - properly parse hex values
		const startColorHex = startColor.getValue(); // Returns "#ffffff"
		const endColorHex = endColor.getValue();
		particleData.startColor = parseInt( startColorHex.substring(1), 16 );
		particleData.endColor = parseInt( endColorHex.substring(1), 16 );
		
		console.log('[ParticleSystem] Updated colors:', {
			startHex: startColorHex,
			startInt: particleData.startColor,
			endHex: endColorHex,
			endInt: particleData.endColor
		});
		
		// Velocity as array
		particleData.velocity = [
			velocityX.getValue(),
			velocityY.getValue(),
			velocityZ.getValue()
		];
		
		// Gravity as array
		particleData.gravity = [
			gravityX.getValue(),
			gravityY.getValue(),
			gravityZ.getValue()
		];
		
		particleData.spread = spread.getValue();

		console.log('[ParticleSystem] Parameters updated, dispatching signal');
		// Trigger viewport update immediately
		signals.particleSystemChanged.dispatch( currentObject );
	}

	function updateUI( object ) {
		if ( isUpdating ) return;
		isUpdating = true;

		currentObject = object;

		if ( !object || !object.userData || !object.userData.isParticleSystem ) {
			container.setDisplay( 'none' );
			isUpdating = false;
			return;
		}

		container.setDisplay( 'block' );
		particleData = object.userData.particleSystem || {};

		// Set UI values
		maxParticles.setValue( particleData.maxParticles !== undefined ? particleData.maxParticles : 1000 );
		emissionRate.setValue( particleData.emissionRate !== undefined ? particleData.emissionRate : 50 );
		lifetime.setValue( particleData.lifetime !== undefined ? particleData.lifetime : 2 );
		startSize.setValue( particleData.startSize !== undefined ? particleData.startSize : 0.1 );
		endSize.setValue( particleData.endSize !== undefined ? particleData.endSize : 0.05 );
		
		// Colors - properly format as hex
		if ( particleData.startColor !== undefined ) {
			const startColorHex = '#' + particleData.startColor.toString( 16 ).padStart( 6, '0' );
			startColor.setHexValue( startColorHex );
		} else {
			startColor.setHexValue( '#ffffff' );
		}
		
		if ( particleData.endColor !== undefined ) {
			const endColorHex = '#' + particleData.endColor.toString( 16 ).padStart( 6, '0' );
			endColor.setHexValue( endColorHex );
		} else {
			endColor.setHexValue( '#888888' );
		}
		
		// Velocity
		if ( particleData.velocity && Array.isArray( particleData.velocity ) ) {
			velocityX.setValue( particleData.velocity[0] !== undefined ? particleData.velocity[0] : 0 );
			velocityY.setValue( particleData.velocity[1] !== undefined ? particleData.velocity[1] : 1 );
			velocityZ.setValue( particleData.velocity[2] !== undefined ? particleData.velocity[2] : 0 );
		} else {
			velocityX.setValue( 0 );
			velocityY.setValue( 1 );
			velocityZ.setValue( 0 );
		}
		
		// Gravity
		if ( particleData.gravity && Array.isArray( particleData.gravity ) ) {
			gravityX.setValue( particleData.gravity[0] !== undefined ? particleData.gravity[0] : 0 );
			gravityY.setValue( particleData.gravity[1] !== undefined ? particleData.gravity[1] : -9.8 );
			gravityZ.setValue( particleData.gravity[2] !== undefined ? particleData.gravity[2] : 0 );
		} else {
			gravityX.setValue( 0 );
			gravityY.setValue( -9.8 );
			gravityZ.setValue( 0 );
		}
		
		spread.setValue( particleData.spread !== undefined ? particleData.spread : 0.5 );

		isUpdating = false;
	}

	signals.objectSelected.add( updateUI );

	return container;

}

export { SidebarParticleSystem };
