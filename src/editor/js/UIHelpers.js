/**
 * UI Helper Functions
 * Utility functions for creating UI elements without inline CSS
 */

export class UIHelpers {

	/**
	 * Create a button element with proper classes
	 * @param {string} text - Button text
	 * @param {Object} options - Options {variant, size, icon, className}
	 * @returns {HTMLButtonElement}
	 */
	static createButton( text, options = {} ) {

		const button = document.createElement( 'button' );
		button.className = 'btn';
		
		if ( options.variant ) {
			button.classList.add( `btn-${options.variant}` );
		}
		
		if ( options.size ) {
			button.classList.add( `btn-${options.size}` );
		}
		
		if ( options.icon ) {
			button.classList.add( 'btn-icon' );
		}
		
		if ( options.className ) {
			button.className += ` ${options.className}`;
		}
		
		button.textContent = text;
		
		return button;

	}

	/**
	 * Create an input element with proper classes
	 * @param {string} type - Input type
	 * @param {Object} options - Options {placeholder, value, className}
	 * @returns {HTMLInputElement}
	 */
	static createInput( type = 'text', options = {} ) {

		const input = document.createElement( 'input' );
		input.type = type;
		input.className = 'input';
		
		if ( options.placeholder ) {
			input.placeholder = options.placeholder;
		}
		
		if ( options.value !== undefined ) {
			input.value = options.value;
		}
		
		if ( options.className ) {
			input.className += ` ${options.className}`;
		}
		
		return input;

	}

	/**
	 * Create a select element with proper classes
	 * @param {Array} options - Array of {value, label} objects
	 * @param {Object} config - Configuration {value, className}
	 * @returns {HTMLSelectElement}
	 */
	static createSelect( options = [], config = {} ) {

		const select = document.createElement( 'select' );
		
		options.forEach( opt => {

			const option = document.createElement( 'option' );
			option.value = opt.value;
			option.textContent = opt.label || opt.value;
			select.appendChild( option );

		} );
		
		if ( config.value !== undefined ) {
			select.value = config.value;
		}
		
		if ( config.className ) {
			select.className = config.className;
		}
		
		return select;

	}

	/**
	 * Create a panel with header and content
	 * @param {string} title - Panel title
	 * @param {Object} options - Options {collapsible, className}
	 * @returns {Object} {element, header, content}
	 */
	static createPanel( title, options = {} ) {

		const panel = document.createElement( 'div' );
		panel.className = 'panel';
		
		if ( options.className ) {
			panel.className += ` ${options.className}`;
		}
		
		const header = document.createElement( 'div' );
		header.className = 'panel-header';
		
		const titleElement = document.createElement( 'div' );
		titleElement.className = 'panel-title';
		titleElement.textContent = title;
		header.appendChild( titleElement );
		
		if ( options.collapsible ) {

			const toggle = document.createElement( 'button' );
			toggle.className = 'btn btn-ghost btn-icon btn-sm';
			toggle.textContent = '▼';
			header.appendChild( toggle );
			
			toggle.addEventListener( 'click', () => {

				panel.classList.toggle( 'collapsed' );
				toggle.textContent = panel.classList.contains( 'collapsed' ) ? '▶' : '▼';

			} );

		}
		
		panel.appendChild( header );
		
		const content = document.createElement( 'div' );
		content.className = 'panel-content';
		panel.appendChild( content );
		
		return { element: panel, header, content };

	}

	/**
	 * Create a property row (label + value)
	 * @param {string} label - Label text
	 * @param {HTMLElement} valueElement - Value element
	 * @returns {HTMLElement}
	 */
	static createPropertyRow( label, valueElement ) {

		const row = document.createElement( 'div' );
		row.className = 'property-row';
		
		const labelElement = document.createElement( 'div' );
		labelElement.className = 'property-label';
		labelElement.textContent = label;
		row.appendChild( labelElement );
		
		const valueContainer = document.createElement( 'div' );
		valueContainer.className = 'property-value';
		valueContainer.appendChild( valueElement );
		row.appendChild( valueContainer );
		
		return row;

	}

	/**
	 * Create a row with flexible layout
	 * @param {Array} elements - Array of elements to add
	 * @param {Object} options - Options {gap, className}
	 * @returns {HTMLElement}
	 */
	static createRow( elements = [], options = {} ) {

		const row = document.createElement( 'div' );
		row.className = 'row';
		
		if ( options.gap ) {
			row.classList.add( `gap-${options.gap}` );
		}
		
		if ( options.className ) {
			row.className += ` ${options.className}`;
		}
		
		elements.forEach( el => row.appendChild( el ) );
		
		return row;

	}

	/**
	 * Create a divider
	 * @param {boolean} vertical - Whether the divider is vertical
	 * @returns {HTMLElement}
	 */
	static createDivider( vertical = false ) {

		const divider = document.createElement( 'div' );
		divider.className = vertical ? 'divider-vertical' : 'divider';
		return divider;

	}

	/**
	 * Create a modal dialog
	 * @param {string} title - Modal title
	 * @param {Object} options - Options {width, height, className}
	 * @returns {Object} {overlay, modal, header, body, footer, close}
	 */
	static createModal( title, options = {} ) {

		const overlay = document.createElement( 'div' );
		overlay.className = 'modal-overlay';
		
		const modal = document.createElement( 'div' );
		modal.className = 'modal';
		
		if ( options.width ) {
			modal.style.width = options.width;
		}
		
		if ( options.height ) {
			modal.style.height = options.height;
		}
		
		if ( options.className ) {
			modal.className += ` ${options.className}`;
		}
		
		// Header
		const header = document.createElement( 'div' );
		header.className = 'modal-header';
		
		const titleElement = document.createElement( 'div' );
		titleElement.className = 'modal-title';
		titleElement.textContent = title;
		header.appendChild( titleElement );
		
		const closeBtn = document.createElement( 'button' );
		closeBtn.className = 'modal-close';
		closeBtn.textContent = '×';
		closeBtn.addEventListener( 'click', () => {

			overlay.style.display = 'none';

		} );
		header.appendChild( closeBtn );
		
		modal.appendChild( header );
		
		// Body
		const body = document.createElement( 'div' );
		body.className = 'modal-body';
		modal.appendChild( body );
		
		// Footer
		const footer = document.createElement( 'div' );
		footer.className = 'modal-footer';
		modal.appendChild( footer );
		
		overlay.appendChild( modal );
		
		return {
			overlay,
			modal,
			header,
			body,
			footer,
			close: closeBtn,
			show: () => { overlay.style.display = 'flex'; },
			hide: () => { overlay.style.display = 'none'; }
		};

	}

	/**
	 * Create a badge
	 * @param {string} text - Badge text
	 * @param {string} variant - Badge variant (primary, success, warning, error)
	 * @returns {HTMLElement}
	 */
	static createBadge( text, variant = null ) {

		const badge = document.createElement( 'span' );
		badge.className = 'badge';
		
		if ( variant ) {
			badge.classList.add( `badge-${variant}` );
		}
		
		badge.textContent = text;
		return badge;

	}

	/**
	 * Create a spinner/loading indicator
	 * @returns {HTMLElement}
	 */
	static createSpinner() {

		const spinner = document.createElement( 'div' );
		spinner.className = 'spinner';
		return spinner;

	}

	/**
	 * Show a notification
	 * @param {string} message - Notification message
	 * @param {Object} options - Options {title, type, duration}
	 */
	static showNotification( message, options = {} ) {

		const notification = document.createElement( 'div' );
		notification.className = 'notification';
		
		if ( options.type ) {
			notification.classList.add( `notification-${options.type}` );
		}
		
		if ( options.title ) {

			const title = document.createElement( 'div' );
			title.className = 'notification-title';
			title.textContent = options.title;
			notification.appendChild( title );

		}
		
		const messageElement = document.createElement( 'div' );
		messageElement.className = 'notification-message';
		messageElement.textContent = message;
		notification.appendChild( messageElement );
		
		document.body.appendChild( notification );
		
		const duration = options.duration || 3000;
		setTimeout( () => {

			notification.style.animation = 'slideIn 0.3s ease reverse';
			setTimeout( () => notification.remove(), 300 );

		}, duration );

	}

}
