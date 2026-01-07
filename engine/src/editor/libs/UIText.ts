import { UIElement } from './UIElement';

/**
 * UIText class adapted from Three.js editor
 */
export class UIText extends UIElement {
  constructor(text?: string) {
    super(document.createElement('span'));
    this.dom.className = 'Text';
    if (text) {
      this.dom.textContent = text;
    }
  }

  setWidth(value: string): this {
    (this.dom.style as any).width = value;
    return this;
  }

  setFontSize(value: string): this {
    (this.dom.style as any).fontSize = value;
    return this;
  }
}

