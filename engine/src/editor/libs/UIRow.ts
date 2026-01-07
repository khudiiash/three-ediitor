import { UIElement } from './UIElement';

/**
 * UIRow class adapted from Three.js editor
 */
export class UIRow extends UIElement {
  constructor() {
    super(document.createElement('div'));
    this.dom.className = 'Row';
  }

  addClass(className: string): this {
    this.dom.classList.add(className);
    return this;
  }

  removeClass(className: string): this {
    this.dom.classList.remove(className);
    return this;
  }

  onMouseOver(callback: () => void): this {
    this.dom.addEventListener('mouseover', callback);
    return this;
  }

  onMouseOut(callback: () => void): this {
    this.dom.addEventListener('mouseout', callback);
    return this;
  }

  onClick(callback: () => void): this {
    this.dom.addEventListener('click', callback);
    return this;
  }

  setLeft(value: string): this {
    (this.dom.style as any).left = value;
    return this;
  }

  setTop(value: string): this {
    (this.dom.style as any).top = value;
    return this;
  }

  setDisplay(value: string): this {
    (this.dom.style as any).display = value;
    return this;
  }

  setPosition(value: string): this {
    (this.dom.style as any).position = value;
    return this;
  }
}

