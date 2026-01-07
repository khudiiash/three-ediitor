import { UIElement } from './UIElement';

/**
 * UIPanel class adapted from Three.js editor
 */
export class UIPanel extends UIElement {
  constructor() {
    super(document.createElement('div'));
    this.dom.className = 'Panel';
  }

  setPosition(value: string): this {
    (this.dom.style as any).position = value;
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

  setRight(value: string): this {
    (this.dom.style as any).right = value;
    return this;
  }

  setBottom(value: string): this {
    (this.dom.style as any).bottom = value;
    return this;
  }

  setWidth(value: string): this {
    (this.dom.style as any).width = value;
    return this;
  }

  setHeight(value: string): this {
    (this.dom.style as any).height = value;
    return this;
  }

  setMarginLeft(value: string): this {
    (this.dom.style as any).marginLeft = value;
    return this;
  }

  setMarginRight(value: string): this {
    (this.dom.style as any).marginRight = value;
    return this;
  }

  setDisplay(value: string): this {
    (this.dom.style as any).display = value;
    return this;
  }
}

