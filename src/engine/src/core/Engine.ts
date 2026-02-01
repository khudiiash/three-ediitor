import * as THREE from 'three';
import { WebGPURenderer } from 'three/webgpu';
import { App } from './App';
import { Script } from './Script';
import { registerComponent, attribute } from './decorators';

export class Engine {
    private static instance: Engine | null = null;
    public app: App | null = null;
    public renderer: WebGPURenderer | null = null;
    private isRunning: boolean = false;

    private constructor() {
    }

    static getInstance(): Engine {
        if (!Engine.instance) {
            Engine.instance = new Engine();
            if (typeof window !== 'undefined') {
                (window as any).pc = Engine.instance;
            }
        }
        return Engine.instance;
    }

    async init(canvas: HTMLCanvasElement, options?: {
        antialias?: boolean;
        alpha?: boolean;
        powerPreference?: 'high-performance' | 'low-power';
    }): Promise<void> {
        const opts = {
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance' as 'high-performance' | 'low-power',
            ...options
        };

        // WebGPURenderer automatically falls back to WebGL if WebGPU not available
        this.renderer = new WebGPURenderer({
            canvas,
            antialias: opts.antialias,
            alpha: opts.alpha,
            powerPreference: opts.powerPreference
        });
        
        await this.renderer.init();
        
        this.renderer.setPixelRatio(window.devicePixelRatio);
        
        let clearColor = 0xaaaaaa;
        if (typeof window !== 'undefined' && window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            clearColor = mediaQuery.matches ? 0x333333 : 0xaaaaaa;
        }
        this.renderer.setClearColor(clearColor, 1);

        this.updateSize();
        window.addEventListener('resize', () => this.updateSize());

        this.initializeEngineExports();
    }

    private initializeEngineExports(): void {
        if (typeof window === 'undefined') return;

        if (!(window as any).__engineExports) {
            (window as any).__engineExports = {};
        }

        const engineExports = (window as any).__engineExports;

        if (!engineExports.Script) {
            engineExports.Script = Script;
        }

        if (!engineExports.registerComponent) {
            engineExports.registerComponent = registerComponent;
            engineExports.attribute = attribute;
        }
    }

    private updateSize(): void {
        if (!this.renderer) return;
        
        const canvas = this.renderer.domElement;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        
        if (canvas.width !== width || canvas.height !== height) {
            this.renderer.setSize(width, height, false);
            
            if (this.app) {
                this.app.onResize(width, height);
            }
        }
    }

    createApp(): App {
        const app = new App(this);

        if (!this.app) {
            this.app = app;
        }

        return app;
    }


    start(): void {
        if (this.isRunning) {
            return;
        }
        
        this.isRunning = true;
        this.lastTime = performance.now();
        
        if (this.renderer) {
            this.renderer.setAnimationLoop(this.tick);
        }
    }

    stop(): void {
        this.isRunning = false;
        if (this.renderer) {
            this.renderer.setAnimationLoop(null);
        }
    }

    private tick = (time: number): void => {
        if (!this.isRunning || !this.renderer) return;

        const deltaTime = this.getDeltaTime();
        
        if (this.app) {
            this.app.update(deltaTime);
            
            if (this.app.getCamera()) {
                const scene = this.app.scene;
                const camera = this.app.getCamera();
                this.renderer.render(scene, camera);
            } else {
                if (!this.hasLoggedNoCamera) {
                    console.error('[Engine] No camera available');
                    this.hasLoggedNoCamera = true;
                }
            }
        } else {
            if (!this.hasLoggedNoApp) {
                console.warn('[Engine] No app to render');
                this.hasLoggedNoApp = true;
            }
        }
    };
    
    private hasLoggedNoApp = false;
    private hasLoggedNoCamera = false;

    private lastTime: number = performance.now();
    
    private getDeltaTime(): number {
        const now = performance.now();
        const delta = (now - this.lastTime) / 1000;
        this.lastTime = now;
        return delta;
    }


    destroy(): void {
        this.stop();
        
        this.app = null;

        if (this.renderer) {
            this.renderer.dispose();
            this.renderer = null;
        }

        Engine.instance = null;
    }
}

export const pc = Engine.getInstance();
