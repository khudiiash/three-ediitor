/**
 * UI utilities adapted from Three.js Editor
 * TypeScript version of common UI helper functions
 */

export class UI {
  /**
   * Create a number input field
   */
  static createNumberInput(
    label: string,
    value: number,
    min?: number,
    max?: number,
    step?: number,
    onChange?: (value: number) => void
  ): HTMLDivElement {
    const container = document.createElement('div');
    container.className = 'ui-number-input';

    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    container.appendChild(labelEl);

    const input = document.createElement('input');
    input.type = 'number';
    input.value = value.toString();
    if (min !== undefined) input.min = min.toString();
    if (max !== undefined) input.max = max.toString();
    if (step !== undefined) input.step = step.toString();

    if (onChange) {
      input.addEventListener('change', () => {
        const numValue = parseFloat(input.value);
        if (!isNaN(numValue)) {
          onChange(numValue);
        }
      });
    }

    container.appendChild(input);
    return container;
  }

  /**
   * Create a range slider
   */
  static createRangeInput(
    label: string,
    value: number,
    min: number,
    max: number,
    step?: number,
    onChange?: (value: number) => void
  ): HTMLDivElement {
    const container = document.createElement('div');
    container.className = 'ui-range-input';

    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    container.appendChild(labelEl);

    const input = document.createElement('input');
    input.type = 'range';
    input.min = min.toString();
    input.max = max.toString();
    input.value = value.toString();
    if (step !== undefined) input.step = step.toString();

    const valueDisplay = document.createElement('span');
    valueDisplay.textContent = value.toFixed(2);
    valueDisplay.className = 'ui-value-display';

    if (onChange) {
      input.addEventListener('input', () => {
        const numValue = parseFloat(input.value);
        valueDisplay.textContent = numValue.toFixed(2);
        onChange(numValue);
      });
    }

    container.appendChild(input);
    container.appendChild(valueDisplay);
    return container;
  }

  /**
   * Create a color picker
   */
  static createColorInput(
    label: string,
    value: string,
    onChange?: (value: string) => void
  ): HTMLDivElement {
    const container = document.createElement('div');
    container.className = 'ui-color-input';

    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    container.appendChild(labelEl);

    const input = document.createElement('input');
    input.type = 'color';
    input.value = value;

    if (onChange) {
      input.addEventListener('change', () => {
        onChange(input.value);
      });
    }

    container.appendChild(input);
    return container;
  }

  /**
   * Create a button
   */
  static createButton(
    label: string,
    onClick?: () => void
  ): HTMLButtonElement {
    const button = document.createElement('button');
    button.textContent = label;
    button.className = 'ui-button';

    if (onClick) {
      button.addEventListener('click', () => {
        onClick();
      });
    }

    return button;
  }

  /**
   * Create a checkbox
   */
  static createCheckbox(
    label: string,
    checked: boolean,
    onChange?: (checked: boolean) => void
  ): HTMLDivElement {
    const container = document.createElement('div');
    container.className = 'ui-checkbox';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = checked;

    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    labelEl.appendChild(input);

    if (onChange) {
      input.addEventListener('change', () => {
        onChange(input.checked);
      });
    }

    container.appendChild(labelEl);
    return container;
  }
}

