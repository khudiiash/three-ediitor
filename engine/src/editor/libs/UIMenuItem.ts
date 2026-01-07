import { UIElement } from './UIElement';

/**
 * UIMenuItem class adapted from Three.js editor
 */
export class UIMenuItem extends UIElement {
  constructor(text: string) {
    super(document.createElement('div'));
    this.dom.className = 'MenuItem';
    this.dom.textContent = text;
  }

  onClick(callback: () => void): this {
    this.dom.addEventListener('click', callback);
    return this;
  }
}

