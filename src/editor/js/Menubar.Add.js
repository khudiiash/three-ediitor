import * as THREE from 'three';

import { UIPanel, UIRow } from './libs/ui.js';

import { AddObjectCommand } from './commands/AddObjectCommand.js';

function MenubarAdd( editor ) {

	const strings = editor.strings;

	const container = new UIPanel();
	container.setClass( 'menu' );

	const title = new UIPanel();
	title.setClass( 'title' );
	title.setTextContent( strings.getKey( 'menubar/add' ) );
	container.add( title );

	const options = new UIPanel();
	options.setClass( 'options' );
	container.add( options );

	

	let option = new UIRow();
	option.setClass( 'option' );
	option.setTextContent( strings.getKey( 'menubar/add/group' ) );
	option.onClick( function () {

		const mesh = new THREE.Group();
		mesh.name = 'Group';

		editor.execute( new AddObjectCommand( editor, mesh ) );

	} );
	options.add( option );

	

	const meshSubmenuTitle = new UIRow().setTextContent( strings.getKey( 'menubar/add/mesh' ) ).addClass( 'option' ).addClass( 'submenu-title' );
	meshSubmenuTitle.onMouseOver( function () {

		const { top, right } = meshSubmenuTitle.dom.getBoundingClientRect();
		const { paddingTop } = getComputedStyle( this.dom );
		meshSubmenu.setLeft( right + 'px' );
		meshSubmenu.setTop( top - parseFloat( paddingTop ) + 'px' );
		meshSubmenu.setStyle( 'max-height', [ `calc( 100vh - ${top}px )` ] );
		meshSubmenu.setDisplay( 'block' );
		
		const leftResizer = document.getElementById( 'resizer-left' );
		const rightResizer = document.getElementById( 'resizer' );
		const bottomResizer = document.getElementById( 'resizer-bottom' );
		if ( leftResizer ) leftResizer.style.pointerEvents = 'none';
		if ( rightResizer ) rightResizer.style.pointerEvents = 'none';
		if ( bottomResizer ) bottomResizer.style.pointerEvents = 'none';

	} );
	meshSubmenuTitle.onMouseOut( function ( event ) {

		const relatedTarget = event.relatedTarget || event.toElement;
		if ( relatedTarget && ( meshSubmenu.dom.contains( relatedTarget ) || meshSubmenuTitle.dom.contains( relatedTarget ) ) ) {
			return;
		}

		const elementAtPoint = document.elementFromPoint( event.clientX, event.clientY );
		if ( elementAtPoint && ( elementAtPoint.id === 'resizer-left' || elementAtPoint.id === 'resizer' || elementAtPoint.id === 'resizer-bottom' ) ) {
			return;
		}

		setTimeout( function () {

			const activeElement = document.elementFromPoint( event.clientX, event.clientY );
			if ( activeElement && ( activeElement.id === 'resizer-left' || activeElement.id === 'resizer' || activeElement.id === 'resizer-bottom' ) ) {
				return;
			}
			if ( ! meshSubmenu.dom.contains( activeElement ) && ! meshSubmenuTitle.dom.contains( activeElement ) ) {
				meshSubmenu.setDisplay( 'none' );
				const leftResizer = document.getElementById( 'resizer-left' );
				const rightResizer = document.getElementById( 'resizer' );
				const bottomResizer = document.getElementById( 'resizer-bottom' );
				if ( leftResizer ) leftResizer.style.pointerEvents = 'auto';
				if ( rightResizer ) rightResizer.style.pointerEvents = 'auto';
				if ( bottomResizer ) bottomResizer.style.pointerEvents = 'auto';
			}

		}, 100 );

	} );
	options.add( meshSubmenuTitle );

	const meshSubmenu = new UIPanel().setPosition( 'fixed' ).addClass( 'options submenu' ).setDisplay( 'none' );
	meshSubmenuTitle.add( meshSubmenu );
	
	meshSubmenu.onMouseOver( function () {
		meshSubmenu.setDisplay( 'block' );
	} );
	meshSubmenu.onMouseOut( function ( event ) {
		const relatedTarget = event.relatedTarget || event.toElement;
		if ( relatedTarget && ( meshSubmenuTitle.dom.contains( relatedTarget ) || meshSubmenu.dom.contains( relatedTarget ) ) ) {
			return;
		}
		
		meshSubmenu.setDisplay( 'none' );
		const leftResizer = document.getElementById( 'resizer-left' );
		const rightResizer = document.getElementById( 'resizer' );
		const bottomResizer = document.getElementById( 'resizer-bottom' );
		if ( leftResizer ) leftResizer.style.pointerEvents = 'auto';
		if ( rightResizer ) rightResizer.style.pointerEvents = 'auto';
		if ( bottomResizer ) bottomResizer.style.pointerEvents = 'auto';
	} );

	

	option = new UIRow();
	option.setClass( 'option' );
	option.setTextContent( strings.getKey( 'menubar/add/mesh/box' ) );
	option.onClick( function () {

		const geometry = new THREE.BoxGeometry( 1, 1, 1, 1, 1, 1 );
		const mesh = new THREE.Mesh( geometry, new THREE.MeshStandardMaterial() );
		mesh.name = 'Box';

		editor.execute( new AddObjectCommand( editor, mesh ) );

	} );
	meshSubmenu.add( option );

	

	option = new UIRow();
	option.setClass( 'option' );
	option.setTextContent( strings.getKey( 'menubar/add/mesh/capsule' ) );
	option.onClick( function () {

		const geometry = new THREE.CapsuleGeometry( 1, 1, 4, 8, 1 );
		const mesh = new THREE.Mesh( geometry, new THREE.MeshStandardMaterial() );
		mesh.name = 'Capsule';

		editor.execute( new AddObjectCommand( editor, mesh ) );

	} );
	meshSubmenu.add( option );

	

	option = new UIRow();
	option.setClass( 'option' );
	option.setTextContent( strings.getKey( 'menubar/add/mesh/circle' ) );
	option.onClick( function () {

		const geometry = new THREE.CircleGeometry( 1, 32, 0, Math.PI * 2 );
		const mesh = new THREE.Mesh( geometry, new THREE.MeshStandardMaterial() );
		mesh.name = 'Circle';

		editor.execute( new AddObjectCommand( editor, mesh ) );

	} );
	meshSubmenu.add( option );

	

	option = new UIRow();
	option.setClass( 'option' );
	option.setTextContent( strings.getKey( 'menubar/add/mesh/cylinder' ) );
	option.onClick( function () {

		const geometry = new THREE.CylinderGeometry( 1, 1, 1, 32, 1, false, 0, Math.PI * 2 );
		const mesh = new THREE.Mesh( geometry, new THREE.MeshStandardMaterial() );
		mesh.name = 'Cylinder';

		editor.execute( new AddObjectCommand( editor, mesh ) );

	} );
	meshSubmenu.add( option );

	

	option = new UIRow();
	option.setClass( 'option' );
	option.setTextContent( strings.getKey( 'menubar/add/mesh/dodecahedron' ) );
	option.onClick( function () {

		const geometry = new THREE.DodecahedronGeometry( 1, 0 );
		const mesh = new THREE.Mesh( geometry, new THREE.MeshStandardMaterial() );
		mesh.name = 'Dodecahedron';

		editor.execute( new AddObjectCommand( editor, mesh ) );

	} );
	meshSubmenu.add( option );

	

	option = new UIRow();
	option.setClass( 'option' );
	option.setTextContent( strings.getKey( 'menubar/add/mesh/icosahedron' ) );
	option.onClick( function () {

		const geometry = new THREE.IcosahedronGeometry( 1, 0 );
		const mesh = new THREE.Mesh( geometry, new THREE.MeshStandardMaterial() );
		mesh.name = 'Icosahedron';

		editor.execute( new AddObjectCommand( editor, mesh ) );

	} );
	meshSubmenu.add( option );

	

	option = new UIRow();
	option.setClass( 'option' );
	option.setTextContent( strings.getKey( 'menubar/add/mesh/lathe' ) );
	option.onClick( function () {

		const geometry = new THREE.LatheGeometry();
		const mesh = new THREE.Mesh( geometry, new THREE.MeshStandardMaterial( { side: THREE.DoubleSide } ) );
		mesh.name = 'Lathe';

		editor.execute( new AddObjectCommand( editor, mesh ) );

	} );
	meshSubmenu.add( option );

	

	option = new UIRow();
	option.setClass( 'option' );
	option.setTextContent( strings.getKey( 'menubar/add/mesh/octahedron' ) );
	option.onClick( function () {

		const geometry = new THREE.OctahedronGeometry( 1, 0 );
		const mesh = new THREE.Mesh( geometry, new THREE.MeshStandardMaterial() );
		mesh.name = 'Octahedron';

		editor.execute( new AddObjectCommand( editor, mesh ) );

	} );
	meshSubmenu.add( option );

	

	option = new UIRow();
	option.setClass( 'option' );
	option.setTextContent( strings.getKey( 'menubar/add/mesh/plane' ) );
	option.onClick( function () {

		const geometry = new THREE.PlaneGeometry( 1, 1, 1, 1 );
		const material = new THREE.MeshStandardMaterial();
		const mesh = new THREE.Mesh( geometry, material );
		mesh.name = 'Plane';

		editor.execute( new AddObjectCommand( editor, mesh ) );

	} );
	meshSubmenu.add( option );

	

	option = new UIRow();
	option.setClass( 'option' );
	option.setTextContent( strings.getKey( 'menubar/add/mesh/ring' ) );
	option.onClick( function () {

		const geometry = new THREE.RingGeometry( 0.5, 1, 32, 1, 0, Math.PI * 2 );
		const mesh = new THREE.Mesh( geometry, new THREE.MeshStandardMaterial() );
		mesh.name = 'Ring';

		editor.execute( new AddObjectCommand( editor, mesh ) );

	} );
	meshSubmenu.add( option );

	

	option = new UIRow();
	option.setClass( 'option' );
	option.setTextContent( strings.getKey( 'menubar/add/mesh/sphere' ) );
	option.onClick( function () {

		const geometry = new THREE.SphereGeometry( 1, 32, 16, 0, Math.PI * 2, 0, Math.PI );
		const mesh = new THREE.Mesh( geometry, new THREE.MeshStandardMaterial() );
		mesh.name = 'Sphere';

		editor.execute( new AddObjectCommand( editor, mesh ) );

	} );
	meshSubmenu.add( option );

	

	option = new UIRow();
	option.setClass( 'option' );
	option.setTextContent( strings.getKey( 'menubar/add/mesh/sprite' ) );
	option.onClick( function () {

		const sprite = new THREE.Sprite( new THREE.SpriteMaterial() );
		sprite.name = 'Sprite';

		editor.execute( new AddObjectCommand( editor, sprite ) );

	} );
	meshSubmenu.add( option );

	

	option = new UIRow();
	option.setClass( 'option' );
	option.setTextContent( strings.getKey( 'menubar/add/mesh/tetrahedron' ) );
	option.onClick( function () {

		const geometry = new THREE.TetrahedronGeometry( 1, 0 );
		const mesh = new THREE.Mesh( geometry, new THREE.MeshStandardMaterial() );
		mesh.name = 'Tetrahedron';

		editor.execute( new AddObjectCommand( editor, mesh ) );

	} );
	meshSubmenu.add( option );

	

	option = new UIRow();
	option.setClass( 'option' );
	option.setTextContent( strings.getKey( 'menubar/add/mesh/torus' ) );
	option.onClick( function () {

		const geometry = new THREE.TorusGeometry( 1, 0.4, 12, 48, Math.PI * 2 );
		const mesh = new THREE.Mesh( geometry, new THREE.MeshStandardMaterial() );
		mesh.name = 'Torus';

		editor.execute( new AddObjectCommand( editor, mesh ) );

	} );
	meshSubmenu.add( option );

	

	option = new UIRow();
	option.setClass( 'option' );
	option.setTextContent( strings.getKey( 'menubar/add/mesh/torusknot' ) );
	option.onClick( function () {

		const geometry = new THREE.TorusKnotGeometry( 1, 0.4, 64, 8, 2, 3 );
		const mesh = new THREE.Mesh( geometry, new THREE.MeshStandardMaterial() );
		mesh.name = 'TorusKnot';

		editor.execute( new AddObjectCommand( editor, mesh ) );

	} );
	meshSubmenu.add( option );

	

	option = new UIRow();
	option.setClass( 'option' );
	option.setTextContent( strings.getKey( 'menubar/add/mesh/tube' ) );
	option.onClick( function () {

		const path = new THREE.CatmullRomCurve3( [
			new THREE.Vector3( 2, 2, - 2 ),
			new THREE.Vector3( 2, - 2, - 0.6666666666666667 ),
			new THREE.Vector3( - 2, - 2, 0.6666666666666667 ),
			new THREE.Vector3( - 2, 2, 2 )
		] );

		const geometry = new THREE.TubeGeometry( path, 64, 1, 8, false );
		const mesh = new THREE.Mesh( geometry, new THREE.MeshStandardMaterial() );
		mesh.name = 'Tube';

		editor.execute( new AddObjectCommand( editor, mesh ) );

	} );
	meshSubmenu.add( option );

	

	const lightSubmenuTitle = new UIRow().setTextContent( strings.getKey( 'menubar/add/light' ) ).addClass( 'option' ).addClass( 'submenu-title' );
	lightSubmenuTitle.onMouseOver( function () {

		const { top, right } = lightSubmenuTitle.dom.getBoundingClientRect();
		const { paddingTop } = getComputedStyle( this.dom );

		lightSubmenu.setLeft( right + 'px' );
		lightSubmenu.setTop( top - parseFloat( paddingTop ) + 'px' );
		lightSubmenu.setStyle( 'max-height', [ `calc( 100vh - ${top}px )` ] );
		lightSubmenu.setDisplay( 'block' );
		
		const leftResizer = document.getElementById( 'resizer-left' );
		const rightResizer = document.getElementById( 'resizer' );
		const bottomResizer = document.getElementById( 'resizer-bottom' );
		if ( leftResizer ) leftResizer.style.pointerEvents = 'none';
		if ( rightResizer ) rightResizer.style.pointerEvents = 'none';
		if ( bottomResizer ) bottomResizer.style.pointerEvents = 'none';

	} );
	lightSubmenuTitle.onMouseOut( function ( event ) {

		const relatedTarget = event.relatedTarget || event.toElement;
		if ( relatedTarget && ( lightSubmenu.dom.contains( relatedTarget ) || lightSubmenuTitle.dom.contains( relatedTarget ) ) ) {
			return;
		}

		const elementAtPoint = document.elementFromPoint( event.clientX, event.clientY );
		if ( elementAtPoint && ( elementAtPoint.id === 'resizer-left' || elementAtPoint.id === 'resizer' || elementAtPoint.id === 'resizer-bottom' ) ) {
			return;
		}

		setTimeout( function () {

			const activeElement = document.elementFromPoint( event.clientX, event.clientY );
			if ( activeElement && ( activeElement.id === 'resizer-left' || activeElement.id === 'resizer' || activeElement.id === 'resizer-bottom' ) ) {
				return;
			}
			if ( ! lightSubmenu.dom.contains( activeElement ) && ! lightSubmenuTitle.dom.contains( activeElement ) ) {
				lightSubmenu.setDisplay( 'none' );
				const leftResizer = document.getElementById( 'resizer-left' );
				const rightResizer = document.getElementById( 'resizer' );
				const bottomResizer = document.getElementById( 'resizer-bottom' );
				if ( leftResizer ) leftResizer.style.pointerEvents = 'auto';
				if ( rightResizer ) rightResizer.style.pointerEvents = 'auto';
				if ( bottomResizer ) bottomResizer.style.pointerEvents = 'auto';
			}

		}, 100 );

	} );
	options.add( lightSubmenuTitle );

	const lightSubmenu = new UIPanel().setPosition( 'fixed' ).addClass( 'options submenu' ).setDisplay( 'none' );
	lightSubmenuTitle.add( lightSubmenu );
	
	lightSubmenu.onMouseOver( function () {
		lightSubmenu.setDisplay( 'block' );
	} );
	lightSubmenu.onMouseOut( function ( event ) {
		const relatedTarget = event.relatedTarget || event.toElement;
		if ( relatedTarget && ( lightSubmenuTitle.dom.contains( relatedTarget ) || lightSubmenu.dom.contains( relatedTarget ) ) ) {
			return;
		}
		
		lightSubmenu.setDisplay( 'none' );
		const leftResizer = document.getElementById( 'resizer-left' );
		const rightResizer = document.getElementById( 'resizer' );
		const bottomResizer = document.getElementById( 'resizer-bottom' );
		if ( leftResizer ) leftResizer.style.pointerEvents = 'auto';
		if ( rightResizer ) rightResizer.style.pointerEvents = 'auto';
		if ( bottomResizer ) bottomResizer.style.pointerEvents = 'auto';
	} );

	

	option = new UIRow();
	option.setClass( 'option' );
	option.setTextContent( strings.getKey( 'menubar/add/light/ambient' ) );
	option.onClick( function () {

		const color = 0x222222;

		const light = new THREE.AmbientLight( color );
		light.name = 'AmbientLight';

		editor.execute( new AddObjectCommand( editor, light ) );

	} );
	lightSubmenu.add( option );

	

	option = new UIRow();
	option.setClass( 'option' );
	option.setTextContent( strings.getKey( 'menubar/add/light/directional' ) );
	option.onClick( function () {

		const color = 0xffffff;
		const intensity = 1;

		const light = new THREE.DirectionalLight( color, intensity );
		light.name = 'DirectionalLight';
		light.target.name = 'DirectionalLight Target';
		light.target.userData.skipSerialization = true;

		light.position.set( 5, 10, 7.5 );

		editor.execute( new AddObjectCommand( editor, light ) );

	} );
	lightSubmenu.add( option );

	

	option = new UIRow();
	option.setClass( 'option' );
	option.setTextContent( strings.getKey( 'menubar/add/light/hemisphere' ) );
	option.onClick( function () {

		const skyColor = 0x00aaff;
		const groundColor = 0xffaa00;
		const intensity = 1;

		const light = new THREE.HemisphereLight( skyColor, groundColor, intensity );
		light.name = 'HemisphereLight';

		light.position.set( 0, 10, 0 );

		editor.execute( new AddObjectCommand( editor, light ) );

	} );
	lightSubmenu.add( option );

	

	option = new UIRow();
	option.setClass( 'option' );
	option.setTextContent( strings.getKey( 'menubar/add/light/point' ) );
	option.onClick( function () {

		const color = 0xffffff;
		const intensity = 1;
		const distance = 0;

		const light = new THREE.PointLight( color, intensity, distance );
		light.name = 'PointLight';

		editor.execute( new AddObjectCommand( editor, light ) );

	} );
	lightSubmenu.add( option );

	

	option = new UIRow();
	option.setClass( 'option' );
	option.setTextContent( strings.getKey( 'menubar/add/light/spot' ) );
	option.onClick( function () {

		const color = 0xffffff;
		const intensity = 1;
		const distance = 0;
		const angle = Math.PI * 0.1;
		const penumbra = 0;

		const light = new THREE.SpotLight( color, intensity, distance, angle, penumbra );
		light.name = 'SpotLight';
		light.target.name = 'SpotLight Target';
		light.target.userData.skipSerialization = true;

		light.position.set( 5, 10, 7.5 );

		editor.execute( new AddObjectCommand( editor, light ) );

	} );
	lightSubmenu.add( option );

	

	const cameraSubmenuTitle = new UIRow().setTextContent( strings.getKey( 'menubar/add/camera' ) ).addClass( 'option' ).addClass( 'submenu-title' );
	cameraSubmenuTitle.onMouseOver( function () {

		const { top, right } = cameraSubmenuTitle.dom.getBoundingClientRect();
		const { paddingTop } = getComputedStyle( this.dom );

		cameraSubmenu.setLeft( right + 'px' );
		cameraSubmenu.setTop( top - parseFloat( paddingTop ) + 'px' );
		cameraSubmenu.setStyle( 'max-height', [ `calc( 100vh - ${top}px )` ] );
		cameraSubmenu.setDisplay( 'block' );
		
		const leftResizer = document.getElementById( 'resizer-left' );
		const rightResizer = document.getElementById( 'resizer' );
		const bottomResizer = document.getElementById( 'resizer-bottom' );
		if ( leftResizer ) leftResizer.style.pointerEvents = 'none';
		if ( rightResizer ) rightResizer.style.pointerEvents = 'none';
		if ( bottomResizer ) bottomResizer.style.pointerEvents = 'none';

	} );
	cameraSubmenuTitle.onMouseOut( function ( event ) {

		const relatedTarget = event.relatedTarget || event.toElement;
		if ( relatedTarget && ( cameraSubmenu.dom.contains( relatedTarget ) || cameraSubmenuTitle.dom.contains( relatedTarget ) ) ) {
			return;
		}

		const elementAtPoint = document.elementFromPoint( event.clientX, event.clientY );
		if ( elementAtPoint && ( elementAtPoint.id === 'resizer-left' || elementAtPoint.id === 'resizer' || elementAtPoint.id === 'resizer-bottom' ) ) {
			return;
		}

		setTimeout( function () {

			const activeElement = document.elementFromPoint( event.clientX, event.clientY );
			if ( activeElement && ( activeElement.id === 'resizer-left' || activeElement.id === 'resizer' || activeElement.id === 'resizer-bottom' ) ) {
				return;
			}
			if ( ! cameraSubmenu.dom.contains( activeElement ) && ! cameraSubmenuTitle.dom.contains( activeElement ) ) {
				cameraSubmenu.setDisplay( 'none' );
				const leftResizer = document.getElementById( 'resizer-left' );
				const rightResizer = document.getElementById( 'resizer' );
				const bottomResizer = document.getElementById( 'resizer-bottom' );
				if ( leftResizer ) leftResizer.style.pointerEvents = 'auto';
				if ( rightResizer ) rightResizer.style.pointerEvents = 'auto';
				if ( bottomResizer ) bottomResizer.style.pointerEvents = 'auto';
			}

		}, 100 );

	} );
	options.add( cameraSubmenuTitle );

	const cameraSubmenu = new UIPanel().setPosition( 'fixed' ).addClass( 'options submenu' ).setDisplay( 'none' );
	cameraSubmenuTitle.add( cameraSubmenu );
	
	cameraSubmenu.onMouseOver( function () {
		cameraSubmenu.setDisplay( 'block' );
	} );
	cameraSubmenu.onMouseOut( function ( event ) {
		const relatedTarget = event.relatedTarget || event.toElement;
		if ( relatedTarget && ( cameraSubmenuTitle.dom.contains( relatedTarget ) || cameraSubmenu.dom.contains( relatedTarget ) ) ) {
			return;
		}
		
		cameraSubmenu.setDisplay( 'none' );
		const leftResizer = document.getElementById( 'resizer-left' );
		const rightResizer = document.getElementById( 'resizer' );
		const bottomResizer = document.getElementById( 'resizer-bottom' );
		if ( leftResizer ) leftResizer.style.pointerEvents = 'auto';
		if ( rightResizer ) rightResizer.style.pointerEvents = 'auto';
		if ( bottomResizer ) bottomResizer.style.pointerEvents = 'auto';
	} );

	

	option = new UIRow();
	option.setClass( 'option' );
	option.setTextContent( strings.getKey( 'menubar/add/camera/orthographic' ) );
	option.onClick( function () {

		const aspect = editor.camera.aspect;
		const camera = new THREE.OrthographicCamera( - aspect, aspect );
		camera.name = 'OrthographicCamera';

		editor.execute( new AddObjectCommand( editor, camera ) );

	} );
	cameraSubmenu.add( option );

	

	option = new UIRow();
	option.setClass( 'option' );
	option.setTextContent( strings.getKey( 'menubar/add/camera/perspective' ) );
	option.onClick( function () {

		const camera = new THREE.PerspectiveCamera();
		camera.name = 'PerspectiveCamera';

		editor.execute( new AddObjectCommand( editor, camera ) );

	} );
	cameraSubmenu.add( option );

	

	option = new UIRow();
	option.setClass( 'option' );
	option.setTextContent( 'Particle System' );
	option.onClick( function () {

		const object = new THREE.Object3D();
		object.type = 'ParticleSystem';
		object.name = 'ParticleSystem';
		object.userData.isParticleSystem = true;
		object.userData.particleSystem = {
			maxParticles: 1000,
			emissionRate: 50,
			lifetime: 2,
			startSize: 0.1,
			endSize: 0.05,
			startColor: 0xffffff,
			endColor: 0x888888,
			velocity: [0, 1, 0],
			gravity: [0, -9.8, 0],
			spread: 0.5
		};

		editor.execute( new AddObjectCommand( editor, object ) );

	} );
	options.add( option );

	return container;

}

export { MenubarAdd };
