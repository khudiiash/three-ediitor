import * as THREE from 'three';
import { Editor } from '../Editor';

/**
 * Player class adapted from Three.js Player.js
 * Manages play/pause functionality for the editor
 */
export class Player {
  private editor: Editor;
  private isPlaying: boolean = false;
  private clock: THREE.Clock;
  private mixer: THREE.AnimationMixer | null = null;

  constructor(editor: Editor) {
    this.editor = editor;
    this.clock = new THREE.Clock();
  }

  /**
   * Start playing
   */
  play(): void {
    if (this.isPlaying) return;

    this.isPlaying = true;
    this.clock.start();
    
    // Setup animation mixer
    const scene = this.editor.getScene();
    this.mixer = new THREE.AnimationMixer(scene);
    
    // Get all animations from scene
    const animations: THREE.AnimationClip[] = [];
    scene.traverse((object) => {
      animations.push(...object.animations);
    });

    // Play all animations
    animations.forEach((clip) => {
      if (this.mixer) {
        this.mixer.clipAction(clip).play();
      }
    });

    this.editor.signals.startPlayer?.dispatch();
    this.animate();
  }

  /**
   * Stop playing
   */
  stop(): void {
    if (!this.isPlaying) return;

    this.isPlaying = false;
    this.clock.stop();

    if (this.mixer) {
      this.mixer.stopAllAction();
      this.mixer = null;
    }

    this.editor.signals.stopPlayer?.dispatch();
  }

  /**
   * Toggle play/pause
   */
  toggle(): void {
    if (this.isPlaying) {
      this.stop();
    } else {
      this.play();
    }
  }

  /**
   * Check if playing
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Animation loop
   */
  private animate = (): void => {
    if (!this.isPlaying) return;

    requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();

    if (this.mixer) {
      this.mixer.update(delta);
    }

    // Update scene rendering
    this.editor.signals.sceneRendered?.dispatch();
  };
}

