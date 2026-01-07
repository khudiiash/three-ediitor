import { UIElement } from './UIElement';

/**
 * UISelect class adapted from Three.js editor
 */
export class UISelect extends UIElement {
  private select: HTMLSelectElement;

  constructor() {
    const select = document.createElement('select');
    super(document.createElement('div'));
    this.dom.className = 'Select';
    this.dom.appendChild(select);
    this.select = select;
  }

  setOptions(options: string[] | { value: string; text: string }[] | Record<string, string>): this {
    this.select.innerHTML = '';
    
    if (Array.isArray(options)) {
      for (const option of options) {
        const optionElement = document.createElement('option');
        if (typeof option === 'string') {
          optionElement.value = option;
          optionElement.textContent = option;
        } else {
          optionElement.value = option.value;
          optionElement.textContent = option.text;
        }
        this.select.appendChild(optionElement);
      }
    } else {
      // Record<string, string> format
      for (const [value, text] of Object.entries(options)) {
        const optionElement = document.createElement('option');
        optionElement.value = value;
        optionElement.textContent = text;
        this.select.appendChild(optionElement);
      }
    }
    
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

  getValue(): string {
    return this.select.value;
  }

  setValue(value: string): this {
    this.select.value = value;
    return this;
  }

  onChange(callback: (value: string) => void): this {
    this.select.addEventListener('change', () => {
      callback(this.select.value);
    });
    return this;
  }
}

