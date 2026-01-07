import * as THREE from 'three';
import { UIPanel } from '../../libs';
import { ViewHelper as ViewHelperBase } from 'three/examples/jsm/helpers/ViewHelper.js';

/**
 * ViewHelper class - IDENTICAL to Three.js Viewport.ViewHelper.js
 * Wraps the Three.js ViewHelper with a UIPanel for proper positioning
 */
export class ViewportViewHelper extends ViewHelperBase {
  private panel: UIPanel;

  constructor(editorCamera: THREE.Camera, container: UIPanel) {
    // Matches original: super(editorCamera, container.dom);
    super(editorCamera, container.dom);

    // Matches original exactly
    this.panel = new UIPanel();
    this.panel.setId('viewHelper');
    this.panel.setPosition('absolute');
    this.panel.setRight('0px');
    this.panel.setBottom('0px');
    this.panel.setHeight('128px');
    this.panel.setWidth('128px');

    this.panel.dom.addEventListener('pointerup', (event) => {
      event.stopPropagation();
      this.handleClick(event);
    });

    this.panel.dom.addEventListener('pointerdown', (event) => {
      event.stopPropagation();
    });

    // Matches original: container.add(panel);
    container.add(this.panel);
  }
}

