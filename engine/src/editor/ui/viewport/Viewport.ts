import * as THREE from 'three';
import { Editor } from '../../Editor';
import { UIPanel } from '../../libs';
import { ViewportControls } from './Viewport.Controls';
import { ViewportInfo } from './Viewport.Info';
import { ViewportViewHelper } from './Viewport.ViewHelper';
import { EditorControls } from '../../EditorControls';

/**
 * Viewport class - IDENTICAL to Three.js Viewport.js
 * Main viewport container for 3D scene rendering
 */
export class Viewport {
  private editor: Editor;
  private container: UIPanel;
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene;
  private sceneHelpers: THREE.Scene;
  private camera: THREE.Camera;
  private viewHelper: ViewportViewHelper | null = null;
  private grid: THREE.Group | null = null;
  private clock: THREE.Clock = new THREE.Clock();
  private controls: EditorControls | null = null;

  constructor(editor: Editor) {
    this.editor = editor;
    this.scene = editor.getScene();
    this.sceneHelpers = editor.getSceneHelpers();
    // Use editor.camera (default camera) - matches original: const camera = editor.camera;
    this.camera = editor.getCamera() || editor.viewportCamera;

    this.container = new UIPanel();
    this.container.setId('viewport');
    this.container.setPosition('absolute');

    this.createViewport();
  }

  private createViewport(): void {
    // Add controls and info - matches original: container.add(new ViewportControls(editor));
    this.container.add(new ViewportControls(this.editor).getContainer());
    this.container.add(new ViewportInfo(this.editor).getContainer());

    // Create grid - matches original implementation
    const GRID_COLORS_LIGHT = [0x999999, 0x777777];
    
    this.grid = new THREE.Group();

    const grid1 = new THREE.GridHelper(30, 30);
    const grid1Material = grid1.material as THREE.LineBasicMaterial;
    grid1Material.color.setHex(GRID_COLORS_LIGHT[0]);
    grid1Material.vertexColors = false;
    this.grid.add(grid1);

    const grid2 = new THREE.GridHelper(30, 6);
    const grid2Material = grid2.material as THREE.LineBasicMaterial;
    grid2Material.color.setHex(GRID_COLORS_LIGHT[1]);
    grid2Material.vertexColors = false;
    this.grid.add(grid2);

    // Create view helper - matches original: const viewHelper = new ViewHelper(camera, container);
    // The ViewHelper constructor adds its panel to the container automatically
    this.viewHelper = new ViewportViewHelper(this.camera, this.container);

    // Clock is already initialized as a property - matches original pattern

    // Create renderer - will be set up via signals.rendererCreated
    // For now, create it directly to match our simpler setup
    this.createRenderer();

    // Create controls - matches original: const controls = new EditorControls(camera);
    // Controls need to be added *after* main logic, otherwise controls.enabled doesn't work
    this.controls = new EditorControls(this.camera);
    this.controls.addEventListener('change', () => {
      this.editor.signals.cameraChanged.dispatch(this.camera);
      this.editor.signals.refreshSidebarObject3D?.dispatch(this.camera);
    });
    
    // Set viewHelper center - matches original: viewHelper.center = controls.center;
    if (this.viewHelper) {
      (this.viewHelper as any).center = this.controls.center;
    }
    
    // Set editor controls - matches original: editor.controls = controls;
    (this.editor as any).controls = this.controls;

    // Start animation loop
    this.animate();
  }

  private createRenderer(): void {
    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.style.display = 'block';
    this.container.dom.appendChild(canvas);

    // Create renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: true
    });

    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(this.container.dom.offsetWidth, this.container.dom.offsetHeight);
    this.renderer.setClearColor(0xaaaaaa);

    // Connect controls to renderer - matches original: controls.connect(newRenderer.domElement);
    if (this.controls && this.renderer.domElement) {
      this.controls.connect(this.renderer.domElement);
    }

    // Listen for window resize
    this.editor.signals.windowResize?.add(() => {
      if (this.renderer) {
        this.renderer.setSize(this.container.dom.offsetWidth, this.container.dom.offsetHeight);
        this.render();
      }
    });
  }

  private render(): void {
    if (!this.renderer) return;

    const viewportCamera = this.editor.viewportCamera;
    if (!viewportCamera) return;

    // Matches original render function exactly
    this.renderer.setViewport(0, 0, this.container.dom.offsetWidth, this.container.dom.offsetHeight);
    this.renderer.render(this.scene, viewportCamera);

    // Only render helpers if using viewport camera - matches original: if (camera === editor.viewportCamera)
    if (this.camera === viewportCamera) {
      this.renderer.autoClear = false;
      if (this.grid && this.grid.visible !== false) {
        this.renderer.render(this.grid, this.camera);
      }
      if (this.sceneHelpers.visible !== false) {
        this.renderer.render(this.sceneHelpers, this.camera);
      }
      if (this.viewHelper && this.renderer.xr.isPresenting !== true) {
        this.viewHelper.render(this.renderer);
      }
      this.renderer.autoClear = true;
    }
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    if (!this.renderer) return;

    // Matches original animate function exactly
    const mixer = this.editor.mixer;
    const delta = this.clock.getDelta();
    
    if (mixer) {
      mixer.update(delta);
    }

    // Update view helper animation - matches original
    // In original: if (viewHelper.animating === true) { viewHelper.update(delta); needsUpdate = true; }
    if (this.viewHelper && this.viewHelper.animating === true) {
      this.viewHelper.update(delta);
    }

    // Always render - matches original
    this.render();

    // Update info
    const info = this.container.dom.querySelector('#viewport-info');
    if (info) {
      // Info updates are handled by ViewportInfo component
    }
  };

  getContainer(): UIPanel {
    return this.container;
  }

  getRenderer(): THREE.WebGLRenderer | null {
    return this.renderer;
  }

  getCanvas(): HTMLCanvasElement | null {
    return this.renderer?.domElement || null;
  }
}
