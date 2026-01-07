import { UIElement } from './UIElement';

/**
 * UICheckbox class adapted from Three.js editor
 */
export class UICheckbox extends UIElement {
  private input: HTMLInputElement;

  constructor(value: boolean = false) {
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = value;
    
    super(document.createElement('div'));
    this.dom.className = 'Checkbox';
    this.dom.appendChild(input);
    this.input = input;
  }

  getValue(): boolean {
    return this.input.checked;
  }

  setValue(value: boolean): this {
    this.input.checked = value;
    return this;
  }

  onChange(callback: (value: boolean) => void): this {
    this.input.addEventListener('change', () => {
      callback(this.input.checked);
    });
    return this;
  }
}

