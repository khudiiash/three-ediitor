import { Editor } from './Editor';
import { UIElement } from './libs/UIElement';

/**
 * Resizer class adapted from Three.js Resizer.js
 * Handles viewport resizing
 */
export class Resizer {
  private editor: Editor;
  private signals: any;
  private dom: HTMLElement;

  constructor(editor: Editor) {
    this.editor = editor;
    this.signals = editor.signals;

    this.dom = document.createElement('div');
    this.dom.id = 'resizer';

    this.dom.addEventListener('pointerdown', this.onPointerDown);
  }

  private onPointerDown = (event: PointerEvent): void => {
    if (event.isPrimary === false) return;

    document.addEventListener('pointermove', this.onPointerMove);
    document.addEventListener('pointerup', this.onPointerUp);
  };

  private onPointerUp = (event: PointerEvent): void => {
    if (event.isPrimary === false) return;

    document.removeEventListener('pointermove', this.onPointerMove);
    document.removeEventListener('pointerup', this.onPointerUp);
  };

  private onPointerMove = (event: PointerEvent): void => {
    if (event.isPrimary === false) return;

    const offsetWidth = document.body.offsetWidth;
    const clientX = event.clientX;

    const cX = clientX < 0 ? 0 : clientX > offsetWidth ? offsetWidth : clientX;

    const x = Math.max(335, offsetWidth - cX); // .TabbedPanel min-width: 335px

    this.dom.style.right = x + 'px';

    const sidebar = document.getElementById('sidebar');
    const player = document.getElementById('player');
    const script = document.getElementById('script');
    const viewport = document.getElementById('viewport');

    if (sidebar) sidebar.style.width = x + 'px';
    if (player) player.style.right = x + 'px';
    if (script) script.style.right = x + 'px';
    if (viewport) viewport.style.right = x + 'px';

    if (this.signals.windowResize) {
      this.signals.windowResize.dispatch();
    }
  };

  /**
   * Get the DOM element
   */
  getElement(): UIElement {
    return new UIElement(this.dom);
  }
}

