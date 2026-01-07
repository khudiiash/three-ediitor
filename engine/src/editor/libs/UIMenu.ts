import { UIElement } from './UIElement';

/**
 * UIMenu class adapted from Three.js editor
 */
export class UIMenu extends UIElement {
  constructor() {
    super(document.createElement('div'));
    this.dom.className = 'Menu';
  }

  addItem(item: UIElement): this {
    this.add(item);
    return this;
  }
}

