import { UIElement } from './UIElement';

/**
 * UIButton class adapted from Three.js editor
 */
export class UIButton extends UIElement {
  constructor(text?: string) {
    super(document.createElement('button'));
    this.dom.className = 'Button';
    if (text) {
      this.dom.textContent = text;
    }
  }

  onClick(callback: () => void): this {
    this.dom.addEventListener('click', callback);
    return this;
  }
}

