/**
 * EnginePlayer - Wrapper to integrate our engine with editor's Player system
 * This replaces APP.Player and uses our engine instead
 */

import * as THREE from 'three';
import { pc, App, SceneLoader } from '../index';

export class EnginePlayer {
    private canvas: HTMLCanvasElement;
    private dom: HTMLDivElement;
    private app: App | null = null;
    private isPlaying: boolean = false;
    private width: number = 500;
    private height: number = 500;

    constructor() {
        // Create canvas and container
        this.canvas = document.createElement('canvas');
        this.dom = document.createElement('div');
        this.dom.appendChild(this.canvas);
        
        // Set initial size
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        // Ensure canvas fills the container
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
    }

    /**
     * Load scene from editor JSON (same format as APP.Player)
     */
    load(json: any): void {
        if (!this.app) {
            pc.init(this.canvas, {
                antialias: true,
                alpha: false,
                powerPreference: 'high-performance'
            });

            this.app = pc.createApp();
        }

        SceneLoader.loadScene(this.app, json);

        if (json.project) {
            const renderer = pc.renderer;
            if (renderer) {
                if (json.project.shadows !== undefined) {
                    renderer.shadowMap.enabled = json.project.shadows;
                }
                if (json.project.shadowType !== undefined) {
                    renderer.shadowMap.type = json.project.shadowType;
                }
                if (json.project.toneMapping !== undefined) {
                    renderer.toneMapping = json.project.toneMapping;
                }
                if (json.project.toneMappingExposure !== undefined) {
                    renderer.toneMappingExposure = json.project.toneMappingExposure;
                }
            }
        }
    }

    /**
     * Set canvas size
     */
    setSize(width: number, height: number): void {
        this.width = width;
        this.height = height;
        this.canvas.width = width;
        this.canvas.height = height;
        this.canvas.style.width = width + 'px';
        this.canvas.style.height = height + 'px';
        
        // Update renderer size
        const renderer = pc.renderer;
        if (renderer) {
            renderer.setSize(width, height, false);
        }

        // Update camera aspect ratio
        if (this.app) {
            const camera = this.app.camera;
            if (camera) {
                if (camera instanceof THREE.PerspectiveCamera) {
                    camera.aspect = width / height;
                    camera.updateProjectionMatrix();
                } else if (camera instanceof THREE.OrthographicCamera) {
                    const aspect = width / height;
                    camera.left = -aspect;
                    camera.right = aspect;
                    camera.updateProjectionMatrix();
                }
            }
        }
    }

    /**
     * Start playing (start engine loop)
     */
    play(): void {
        if (!this.app) {
            return;
        }

        this.isPlaying = true;
        pc.start();
    }

    /**
     * Stop playing (stop engine loop)
     */
    stop(): void {
        this.isPlaying = false;
        pc.stop();
    }

    /**
     * Dispose and cleanup
     */
    dispose(): void {
        this.stop();
        
        if (this.app) {
            this.app.destroy();
            this.app = null;
        }

        // Clean up engine
        pc.destroy();
    }
}
