class Input {

	constructor( editor ) {

		this.editor = editor;
		this.shortcuts = new Map();
		this.enabled = true;

		document.addEventListener( 'keydown', ( event ) => this.handleKeyDown( event ) );

	}

	register( key, callback, options = {} ) {

		const {
			ctrl = false,
			shift = false,
			alt = false,
			meta = false,
			preventDefault = true,
			ignoreInputs = true
		} = options;

		const specialKeys = [ 'Escape', 'Enter', 'Tab', 'Delete', 'Backspace', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight' ];
		const isSpecialKey = specialKeys.includes( key );
		const isKeyCode = key.startsWith( 'Key' );

		const shortcut = {
			key: isSpecialKey || isKeyCode ? null : key.toLowerCase(),
			code: isSpecialKey || isKeyCode ? key : null,
			ctrl,
			shift,
			alt,
			meta,
			callback,
			preventDefault,
			ignoreInputs
		};

		const keyString = this.getKeyString( shortcut );
		this.shortcuts.set( keyString, shortcut );

	}

	unregister( key, options = {} ) {

		const {
			ctrl = false,
			shift = false,
			alt = false,
			meta = false
		} = options;

		const shortcut = {
			key: key.toLowerCase(),
			code: key.startsWith( 'Key' ) ? key : null,
			ctrl,
			shift,
			alt,
			meta
		};

		const keyString = this.getKeyString( shortcut );
		this.shortcuts.delete( keyString );

	}

	getKeyString( shortcut ) {

		const parts = [];
		if ( shortcut.ctrl ) parts.push( 'ctrl' );
		if ( shortcut.shift ) parts.push( 'shift' );
		if ( shortcut.alt ) parts.push( 'alt' );
		if ( shortcut.meta ) parts.push( 'meta' );
		parts.push( shortcut.code || shortcut.key );
		return parts.join( '+' );

	}

	handleKeyDown( event ) {

		if ( !this.enabled ) return;

		const target = event.target;
		const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

		for ( const [ keyString, shortcut ] of this.shortcuts.entries() ) {

			let keyMatch = false;
			if ( shortcut.code ) {
				keyMatch = event.code === shortcut.code;
			} else if ( shortcut.key ) {
				keyMatch = event.key.toLowerCase() === shortcut.key;
			}
			
			const hasCtrlOrMeta = event.ctrlKey || event.metaKey;
			const ctrlMatch = shortcut.ctrl ? hasCtrlOrMeta : !hasCtrlOrMeta;
			const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
			const altMatch = shortcut.alt ? event.altKey : !event.altKey;

			if ( keyMatch && ctrlMatch && shiftMatch && altMatch ) {

				if ( shortcut.ignoreInputs && isInput ) {
					continue;
				}

				if ( shortcut.preventDefault ) {
					event.preventDefault();
				}

				shortcut.callback( event );
				break;

			}

		}

	}

	setEnabled( enabled ) {

		this.enabled = enabled;

	}

}

export { Input };
