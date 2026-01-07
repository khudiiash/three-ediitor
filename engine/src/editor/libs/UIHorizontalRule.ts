import { UIElement } from './UIElement';

/**
 * UIHorizontalRule class adapted from Three.js editor
 */
export class UIHorizontalRule extends UIElement {
  constructor() {
    super(document.createElement('hr'));
    this.dom.className = 'HorizontalRule';
  }
}

