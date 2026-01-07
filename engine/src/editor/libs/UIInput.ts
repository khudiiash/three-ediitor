import { UIElement } from './UIElement';

/**
 * UIInput class adapted from Three.js editor
 */
export class UIInput extends UIElement {
  private input: HTMLInputElement;

  constructor(type: string = 'text') {
    const input = document.createElement('input');
    input.type = type;
    
    super(document.createElement('div'));
    this.dom.className = 'Input';
    this.dom.appendChild(input);
    this.input = input;
  }

  getValue(): string {
    return this.input.value;
  }

  setValue(value: string): this {
    this.input.value = value;
    return this;
  }

  onChange(callback: (value: string) => void): this {
    this.input.addEventListener('change', () => {
      callback(this.input.value);
    });
    return this;
  }

  onInput(callback: (value: string) => void): this {
    this.input.addEventListener('input', () => {
      callback(this.input.value);
    });
    return this;
  }
}

