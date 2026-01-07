/**
 * UIElement class adapted from Three.js editor libs/ui.js
 * Base class for UI elements
 */
export class UIElement {
  public dom: HTMLElement;

  constructor(dom: HTMLElement) {
    this.dom = dom;
  }

  /**
   * Add a child element
   */
  add(element: UIElement | HTMLElement): this {
    if (element instanceof UIElement) {
      this.dom.appendChild(element.dom);
    } else {
      this.dom.appendChild(element);
    }
    return this;
  }

  /**
   * Remove a child element
   */
  remove(element: UIElement | HTMLElement): this {
    if (element instanceof UIElement) {
      this.dom.removeChild(element.dom);
    } else {
      this.dom.removeChild(element);
    }
    return this;
  }

  /**
   * Clear all children
   */
  clear(): this {
    while (this.dom.children.length > 0) {
      this.dom.removeChild(this.dom.firstChild!);
    }
    return this;
  }

  /**
   * Set ID
   */
  setId(id: string): this {
    this.dom.id = id;
    return this;
  }

  /**
   * Set class (replaces existing classes)
   */
  setClass(name: string): this {
    this.dom.className = name;
    return this;
  }

  /**
   * Add class (adds to existing classes)
   */
  addClass(name: string): this {
    if (this.dom.className) {
      this.dom.className += ' ' + name;
    } else {
      this.dom.className = name;
    }
    return this;
  }

  /**
   * Set style
   */
  setStyle(property: string, value: string): this {
    (this.dom.style as any)[property] = value;
    return this;
  }

  /**
   * Set text content
   */
  setTextContent(value: string): this {
    this.dom.textContent = value;
    return this;
  }

  /**
   * Set inner HTML
   */
  setInnerHTML(value: string): this {
    this.dom.innerHTML = value;
    return this;
  }
}

