import * as THREE from 'three';
import { World } from './ecs/World';
import { Entity } from './ecs/Entity';
import { Renderer } from './renderer/Renderer';
import { RenderSystem, CameraSystem, LightSystem, GizmoSystem, EditorCameraSystem } from './systems';
import { EditorBridge } from './bridge/EditorBridge';
import { EditorIntegration } from './editor/integration';
import {
  TransformComponent,
  MeshComponent,
  CameraComponent,
  LightComponent,
} from './components';

/**
 * Demo application showcasing the ECS engine.
 */
class DemoApp {
  private world: World;
  private renderer: Renderer;
  private editorBridge: EditorBridge;
  private editorIntegration: EditorIntegration | null = null;
  private lastTime: number = 0;
  private frameCount: number = 0;
  private lastFpsUpdate: number = 0;

  constructor() {
    // Create world
    this.world = new World();
    
    // Create editor bridge
    this.editorBridge = new EditorBridge(this.world, true);

    // Create renderer
    const canvas = document.getElementById('canvas') as HTMLCanvasElement;
    this.renderer = new Renderer(canvas, this.world);
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    // Initialize editor integration (optional - keeps editor separate but integrated)
    // This bridges the Three.js editor with our ECS system
    const scene = this.renderer.getScene();
    this.editorIntegration = new EditorIntegration(scene, this.world, this.editorBridge);

    // Add systems
    const cameraSystem = new CameraSystem();
    this.world.addSystem(cameraSystem);
    
    const lightSystem = new LightSystem(scene);
    this.world.addSystem(lightSystem);
    
    const renderSystem = new RenderSystem(scene);
    this.world.addSystem(renderSystem);
    
    // Gizmo systems will be initialized when editor connects
    (this as any).gizmoSystem = null;

    // Create scene
    this.createScene();
    
    // Setup gizmos when editor connects
    this.setupEditorGizmos();

    // Handle resize
    window.addEventListener('resize', () => this.onResize());

    // Setup click-to-select (only in editor mode)
    this.setupClickToSelect(canvas);

    // Start game loop
    this.lastTime = performance.now();
    this.animate();
  }

  private setupClickToSelect(canvas: HTMLCanvasElement): void {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let mouseDownTime = 0;
    let mouseDownPos = { x: 0, y: 0 };

    // Use pointerdown/pointerup to catch events (works better with OrbitControls)
    canvas.addEventListener('pointerdown', (event) => {
      // Only allow selection in editor mode (connected and not playing)
      if (!this.editorBridge.isConnected() || this.editorBridge.isPlaying()) {
        return;
      }

      // Only handle left mouse button
      if (event.button !== 0) {
        return;
      }

      // Don't select if clicking on gizmo
      const gizmoSystem = (this as any).gizmoSystem as GizmoSystem;
      if (gizmoSystem && gizmoSystem.isDraggingGizmo()) {
        return;
      }

      mouseDownTime = Date.now();
      mouseDownPos.x = event.clientX;
      mouseDownPos.y = event.clientY;
    });

    // Use pointerup to catch events (works better with OrbitControls)
    canvas.addEventListener('pointerup', (event) => {
      // Only allow selection in editor mode (connected and not playing)
      if (!this.editorBridge.isConnected() || this.editorBridge.isPlaying()) {
        return;
      }

      // Only handle left mouse button
      if (event.button !== 0) {
        return;
      }

      // Check if this was a click (not a drag) - if mouse moved too much, it was a drag
      const timeDiff = Date.now() - mouseDownTime;
      const moveX = Math.abs(event.clientX - mouseDownPos.x);
      const moveY = Math.abs(event.clientY - mouseDownPos.y);
      
      // If it was a drag (moved more than 5px or took too long), don't select
      if (timeDiff > 200 || moveX > 5 || moveY > 5) {
        return;
      }

      // Don't select if OrbitControls was just used AND it moved (was a drag, not a click)
      if ((canvas as any).__orbitControlsMoved) {
        return;
      }

      // Don't select if clicking on gizmo
      const gizmoSystem = (this as any).gizmoSystem as GizmoSystem;
      if (gizmoSystem && gizmoSystem.isDraggingGizmo()) {
        return;
      }

      // Calculate mouse position in normalized device coordinates
      const rect = canvas.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      // Get camera - use editor camera if in edit mode
      let camera: THREE.Camera | null = null;
      const editorCameraSystem = (this as any).editorCameraSystem as EditorCameraSystem;
      if (editorCameraSystem && !this.editorBridge.isPlaying()) {
        camera = editorCameraSystem.getCamera();
      }
      
      // Fallback to hierarchy camera
      if (!camera) {
        this.renderer.findMainCamera();
        camera = (this.renderer as any).mainCamera;
      }
      
      if (!camera) {
        return;
      }

      // Update raycaster
      raycaster.setFromCamera(mouse, camera);

      // Get all meshes from the scene (exclude gizmo and grid)
      const scene = this.renderer.getScene();
      const meshes: THREE.Mesh[] = [];
      scene.traverse((object) => {
        // Only include meshes that have an entityId (from RenderSystem)
        // Exclude gizmo controls, grid helpers, and axis gizmo
        if (object instanceof THREE.Mesh && 
            object.userData.entityId !== undefined &&
            !object.userData.isGizmo &&
            !(object.parent && object.parent.type === 'TransformControls') &&
            !(object.parent && object.parent.name === 'AxisGizmo')) {
          meshes.push(object);
        }
      });

      // Find intersections
      const intersects = raycaster.intersectObjects(meshes, true);

      if (intersects.length > 0) {
        // Get the first intersected object
        const intersectedObject = intersects[0].object as THREE.Mesh;
        const entityId = intersectedObject.userData.entityId as number;

        if (entityId !== undefined) {
          const entity = this.world.getEntity(entityId);
          if (entity) {
            // Send selection to editor
            this.editorBridge.selectEntity(entityId);
          }
        }
      } else {
        // Clicked on nothing, deselect
        this.editorBridge.selectEntity(null);
      }
    });
  }

  private setupEditorGizmos(): void {
    // Check connection periodically and initialize gizmos when connected
    const checkConnection = () => {
      if (this.editorBridge.isConnected() && !(this as any).editorCameraSystem) {
        const scene = this.renderer.getScene();
        const canvasElement = document.getElementById('canvas') as HTMLCanvasElement;
        
        // Initialize editor camera system
        const editorCameraSystem = new EditorCameraSystem(scene);
        this.world.addSystem(editorCameraSystem);
        (this as any).editorCameraSystem = editorCameraSystem;
        
        // Get initial camera position from hierarchy camera
        this.renderer.findMainCamera();
        
        // Activate editor camera with proper initial position
        if (canvasElement) {
          // If we have a camera entity, use its transform; otherwise use the camera directly
         editorCameraSystem.activate(canvasElement);
          
          // Set renderer to use editor camera
          const editorCamera = editorCameraSystem.getCamera();
          if (editorCamera) {
            this.renderer.setMainCameraFromEditor(editorCamera);
          }
        }
        
        // Initialize transform gizmo system
        const gizmoSystem = new GizmoSystem(scene);
        this.world.addSystem(gizmoSystem);
        this.editorBridge.setGizmoSystem(gizmoSystem);
        (this as any).gizmoSystem = gizmoSystem;
        
        // Pass EditorCameraSystem reference to GizmoSystem so it can disable OrbitControls during drag
        gizmoSystem.setEditorCameraSystem(editorCameraSystem);
        
        // Setup gizmo camera (use editor camera)
        const editorCamera = editorCameraSystem.getCamera();
        if (editorCamera && canvasElement) {
          gizmoSystem.setCamera(editorCamera, canvasElement);
        }
        
      } else if (!this.editorBridge.isConnected() && (this as any).editorCameraSystem) {
        // Clean up editor systems when disconnected
        const editorCameraSystem = (this as any).editorCameraSystem as EditorCameraSystem;
        const gizmoSystem = (this as any).gizmoSystem as GizmoSystem;
        
        if (editorCameraSystem) {
          editorCameraSystem.deactivate();
          this.world.removeSystem(editorCameraSystem);
          // Switch back to hierarchy camera
          this.renderer.findMainCamera();
        }
        if (gizmoSystem) {
          this.world.removeSystem(gizmoSystem);
          gizmoSystem.onDestroy?.();
        }
        
        (this as any).editorCameraSystem = null;
        (this as any).gizmoSystem = null;
      }
    };
    
    // Check every 500ms
    setInterval(checkConnection, 500);
    checkConnection();
  }



  private createScene(): void {
    // Create camera
    const cameraEntity = new Entity('MainCamera');
    const cameraTransform = new TransformComponent(
      new THREE.Vector3(0, 2, 5),
      new THREE.Euler(0, 0, 0),
      new THREE.Vector3(1, 1, 1)
    );
    const camera = new CameraComponent();
    camera.isMainCamera = true;
    camera.fov = 75;
    
    cameraEntity.addComponent(cameraTransform);
    cameraEntity.addComponent(camera);
    this.world.addEntity(cameraEntity);

    // Create ambient light
    const ambientLightEntity = new Entity('AmbientLight');
    const ambientLight = new LightComponent();
    ambientLight.lightType = 'ambient';
    ambientLight.intensity = 0.5;
    ambientLightEntity.addComponent(ambientLight);
    this.world.addEntity(ambientLightEntity);

    // Add light to scene
    const lightObj = ambientLight.createLight();
    this.renderer.getScene().add(lightObj);

    // Create directional light
    const dirLightEntity = new Entity('DirectionalLight');
    const dirLightTransform = new TransformComponent(
      new THREE.Vector3(5, 10, 5),
      new THREE.Euler(0, 0, 0),
      new THREE.Vector3(1, 1, 1)
    );
    const dirLight = new LightComponent();
    dirLight.lightType = 'directional';
    dirLight.intensity = 0.8;
    
    dirLightEntity.addComponent(dirLightTransform);
    dirLightEntity.addComponent(dirLight);
    this.world.addEntity(dirLightEntity);

    // Add directional light to scene
    const dirLightObj = dirLight.createLight();
    dirLightObj.position.copy(dirLightTransform.position);
    this.renderer.getScene().add(dirLightObj);

    // Create a rotating cube
    const cubeEntity = new Entity('Cube');
    const cubeTransform = new TransformComponent(
      new THREE.Vector3(0, 0, 0),
      new THREE.Euler(0, 0, 0),
      new THREE.Vector3(1, 1, 1)
    );
    const cubeMesh = new MeshComponent();
    cubeMesh.geometryType = 'box';
    cubeMesh.materialType = 'standard';
    cubeMesh.materialParams = { color: 0x00ff88 };
    
    cubeEntity.addComponent(cubeTransform);
    cubeEntity.addComponent(cubeMesh);
    this.world.addEntity(cubeEntity);

    // Create ground plane
    const groundEntity = new Entity('Ground');
    const groundTransform = new TransformComponent(
      new THREE.Vector3(0, -1, 0),
      new THREE.Euler(-Math.PI / 2, 0, 0),
      new THREE.Vector3(10, 10, 1)
    );
    const groundMesh = new MeshComponent();
    groundMesh.geometryType = 'plane';
    groundMesh.materialType = 'standard';
    groundMesh.materialParams = { color: 0x808080 };
    groundMesh.geometryParams = { width: 1, height: 1 };
    
    groundEntity.addComponent(groundTransform);
    groundEntity.addComponent(groundMesh);
    this.world.addEntity(groundEntity);

    // Create a sphere
    const sphereEntity = new Entity('Sphere');
    const sphereTransform = new TransformComponent(
      new THREE.Vector3(2, 0.5, 0),
      new THREE.Euler(0, 0, 0),
      new THREE.Vector3(0.5, 0.5, 0.5)
    );
    const sphereMesh = new MeshComponent();
    sphereMesh.geometryType = 'sphere';
    sphereMesh.materialType = 'standard';
    sphereMesh.materialParams = { color: 0xff4444 };
    sphereMesh.geometryParams = { radius: 1 };
    
    sphereEntity.addComponent(sphereTransform);
    sphereEntity.addComponent(sphereMesh);
    this.world.addEntity(sphereEntity);
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastTime) / 1000; // Convert to seconds
    this.lastTime = currentTime;

    // Update editor bridge
    this.editorBridge.update();

    // Switch camera based on play mode
    const editorCameraSystem = (this as any).editorCameraSystem as EditorCameraSystem;
    if (this.editorBridge.isConnected() && editorCameraSystem) {
      if (this.editorBridge.isPlaying()) {
        // Play mode: use hierarchy camera
        this.renderer.findMainCamera();
      } else {
        // Edit mode: use editor camera - ensure it's set every frame
        const editorCamera = editorCameraSystem.getCamera();
        if (editorCamera) {
          // Force update the camera in renderer
          (this.renderer as any).mainCamera = editorCamera;
          // Debug: log camera position occasionally
          if (Math.random() < 0.01) { // Log 1% of frames
            console.log('[Demo] Editor camera position:', editorCamera.position.x, editorCamera.position.y, editorCamera.position.z);
          }
        }
      }
    }

    // Only update game logic if in play mode or not connected to editor
    if (!this.editorBridge.isConnected() || this.editorBridge.isPlaying()) {
      // Update world (all systems)
      this.world.update(deltaTime);

      // Simple rotation animation for the cube
      const cubeEntity = this.world.getAllEntities().find(e => e.name === 'Cube');
      if (cubeEntity) {
        const transform = cubeEntity.getComponent(TransformComponent);
        if (transform) {
          transform.rotation.y += deltaTime;
          transform.rotation.x += deltaTime * 0.5;
        }
      }
    } else {
      // In edit mode, still update render system to show changes
      // Update editor camera system first (it's in the world but needs explicit update)
      if (editorCameraSystem) {
        editorCameraSystem.update(null, deltaTime);
      }
      
      // Then update all other systems (render, gizmos, etc.)
      // Use actual deltaTime for smooth animations
      this.world.update(deltaTime);
    }

    // Render
    this.renderer.render();

    // Update FPS counter
    this.frameCount++;
    if (currentTime - this.lastFpsUpdate >= 1000) {
      const fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastFpsUpdate));
      document.getElementById('fps')!.textContent = fps.toString();
      this.frameCount = 0;
      this.lastFpsUpdate = currentTime;
    }

    // Update stats
    const entityCount = this.world.getAllEntities().length;
    const systemCount = this.world.getSystems().length;
    const connectionStatus = this.editorBridge.isConnected() ? 'Connected' : 'Disconnected';
    const playStatus = this.editorBridge.isPlaying() ? 'Playing' : 'Paused';
    
    document.getElementById('entities')!.textContent = entityCount.toString();
    document.getElementById('systems')!.textContent = systemCount.toString();
    
    // Add connection status to info panel
    let statusEl = document.getElementById('connection-status');
    if (!statusEl) {
      statusEl = document.createElement('p');
      statusEl.id = 'connection-status';
      document.getElementById('info')!.appendChild(statusEl);
    }
    statusEl.textContent = `Editor: ${connectionStatus} ${this.editorBridge.isConnected() ? `(${playStatus})` : ''}`;
  };

  private onResize(): void {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

// Singleton pattern - prevent multiple instances
declare global {
  interface Window {
    __DEMO_APP_INSTANCE__?: DemoApp;
  }
}

// Start the demo (only once)
if (!window.__DEMO_APP_INSTANCE__) {
  console.log('%c[DemoApp] Starting application...', 'background: #3b82f6; color: white; font-weight: bold; padding: 4px;');
  window.__DEMO_APP_INSTANCE__ = new DemoApp();
} else {
  console.warn('%c[DemoApp] Application already running! Ignoring duplicate initialization.', 'background: #ef4444; color: white; font-weight: bold; padding: 4px;');
}

