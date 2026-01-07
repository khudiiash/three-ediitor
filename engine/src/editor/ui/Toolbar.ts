import { Editor } from '../Editor';
import { UIPanel, UIButton, UICheckbox } from '../libs';

/**
 * Toolbar class adapted from Three.js Toolbar.js
 * Creates the editor toolbar with transform mode buttons
 */
export class Toolbar {
  private editor: Editor;
  private signals: any;
  private strings: any;
  private container: UIPanel;

  constructor(editor: Editor) {
    this.editor = editor;
    this.signals = editor.signals;
    this.strings = editor.strings;

    this.container = new UIPanel();
    this.container.setId('toolbar');

    this.createTransformButtons();
  }

  private createTransformButtons(): void {
    // Translate button
    const translateIcon = document.createElement('img');
    translateIcon.title = this.strings.getKey('toolbar/translate') || 'Translate';
    translateIcon.src = 'images/translate.svg';

    const translate = new UIButton();
    translate.dom.className = 'Button selected';
    translate.dom.appendChild(translateIcon);
    translate.onClick(() => {
      if (this.signals.transformModeChanged) {
        this.signals.transformModeChanged.dispatch('translate');
      }
    });
    this.container.add(translate);

    // Rotate button
    const rotateIcon = document.createElement('img');
    rotateIcon.title = this.strings.getKey('toolbar/rotate') || 'Rotate';
    rotateIcon.src = 'images/rotate.svg';

    const rotate = new UIButton();
    rotate.dom.appendChild(rotateIcon);
    rotate.onClick(() => {
      if (this.signals.transformModeChanged) {
        this.signals.transformModeChanged.dispatch('rotate');
      }
    });
    this.container.add(rotate);

    // Scale button
    const scaleIcon = document.createElement('img');
    scaleIcon.title = this.strings.getKey('toolbar/scale') || 'Scale';
    scaleIcon.src = 'images/scale.svg';

    const scale = new UIButton();
    scale.dom.appendChild(scaleIcon);
    scale.onClick(() => {
      if (this.signals.transformModeChanged) {
        this.signals.transformModeChanged.dispatch('scale');
      }
    });
    this.container.add(scale);

    // Local/World space checkbox
    const local = new UICheckbox(false);
    local.dom.title = this.strings.getKey('toolbar/local') || 'Local';
    local.onChange((value) => {
      if (this.signals.spaceChanged) {
        this.signals.spaceChanged.dispatch(value ? 'local' : 'world');
      }
    });
    this.container.add(local);

    // Listen for transform mode changes to update button states
    if (this.signals.transformModeChanged) {
      this.signals.transformModeChanged.add((mode: string) => {
        translate.dom.classList.remove('selected');
        rotate.dom.classList.remove('selected');
        scale.dom.classList.remove('selected');

        switch (mode) {
          case 'translate':
            translate.dom.classList.add('selected');
            break;
          case 'rotate':
            rotate.dom.classList.add('selected');
            break;
          case 'scale':
            scale.dom.classList.add('selected');
            break;
        }
      });
    }
  }

  getContainer(): UIPanel {
    return this.container;
  }
}

