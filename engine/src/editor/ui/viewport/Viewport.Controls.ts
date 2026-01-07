import { Editor } from '../../Editor';
import { UIPanel, UISelect } from '../../libs';

/**
 * ViewportControls class - IDENTICAL to Three.js Viewport.Controls.js
 * UI panel for camera and shading selection
 */
export class ViewportControls {
  private editor: Editor;
  private container: UIPanel;
  private cameraSelect: UISelect;
  private shadingSelect: UISelect;

  constructor(editor: Editor) {
    this.editor = editor;
    
    this.container = new UIPanel();
    this.container.setPosition('absolute');
    this.container.setRight('10px');
    this.container.setTop('10px');
    this.container.setStyle('color', '#ffffff');
    // Note: original uses setColor, but we use setStyle for consistency

    // Camera select
    this.cameraSelect = new UISelect();
    this.cameraSelect.setMarginLeft('10px');
    this.cameraSelect.setMarginRight('10px');
    this.cameraSelect.onChange(() => {
      this.editor.setViewportCamera(this.cameraSelect.getValue());
    });
    this.container.add(this.cameraSelect);

    // Shading select
    this.shadingSelect = new UISelect();
    this.shadingSelect.setOptions({ 'realistic': 'realistic', 'solid': 'solid', 'normals': 'normals', 'wireframe': 'wireframe' });
    this.shadingSelect.setValue('solid');
    this.shadingSelect.onChange(() => {
      this.editor.setViewportShading(this.shadingSelect.getValue());
    });
    this.container.add(this.shadingSelect);

    // Listen for signals
    this.editor.signals.cameraAdded?.add(() => this.update());
    this.editor.signals.cameraRemoved?.add(() => this.update());
    this.editor.signals.objectChanged?.add((object: any) => {
      if (object.isCamera) {
        this.update();
      }
    });
    this.editor.signals.editorCleared?.add(() => {
      this.editor.setViewportCamera(this.editor.getCamera()?.uuid || '');
      this.shadingSelect.setValue('solid');
      this.editor.setViewportShading(this.shadingSelect.getValue());
    });
    this.editor.signals.cameraResetted?.add(() => this.update());

    this.update();
  }

  private update(): void {
    const options: Record<string, string> = {};
    const cameras = (this.editor as any).cameras || {};

    for (const key in cameras) {
      const camera = cameras[key];
      options[camera.uuid] = camera.name;
    }

    this.cameraSelect.setOptions(options);

    const viewportCamera = this.editor.viewportCamera;
    const selectedCamera = (viewportCamera && viewportCamera.uuid in options)
      ? viewportCamera
      : this.editor.getCamera();

    if (selectedCamera) {
      this.cameraSelect.setValue(selectedCamera.uuid);
      this.editor.setViewportCamera(selectedCamera.uuid);
    }
  }

  getContainer(): UIPanel {
    return this.container;
  }
}
