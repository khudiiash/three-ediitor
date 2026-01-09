import * as THREE from 'three';
import { Component } from './Component';
import { Script } from './Script';
import { ScriptAsset } from '../assets/ScriptAsset';
import { SuperEvents } from '@khudiiash/super-events';
import { App } from './App';

export class Entity {
    private _object3D: THREE.Object3D;
    private components: Map<string, Component> = new Map();
    public scripts: Script[] = [];
    private scriptsStarted: boolean = false;
    private events: SuperEvents;

    public position: THREE.Vector3;
    public rotation: THREE.Euler;
    public scale: THREE.Vector3;
    public quaternion: THREE.Quaternion;
    public matrix: THREE.Matrix4;
    public matrixWorld: THREE.Matrix4;

    constructor(object3D?: THREE.Object3D, name?: string) {
        this._object3D = object3D || new THREE.Object3D();
        if (name) {
            this._object3D.name = name;
        }
        this.events = new SuperEvents();
        (this._object3D as any).__entity = this;
        
        this.position = this._object3D.position;
        this.rotation = this._object3D.rotation;
        this.scale = this._object3D.scale;
        this.quaternion = this._object3D.quaternion;
        this.matrix = this._object3D.matrix;
        this.matrixWorld = this._object3D.matrixWorld;
    }
    
    get app(): App | null {
        let current: THREE.Object3D | null = this._object3D;
        while (current) {
            if (current.parent === null && (current as any).__app) {
                return (current as any).__app as App;
            }
            current = current.parent;
        }
        return null;
    }

    get object3D(): THREE.Object3D {
        return this._object3D;
    }

    get mesh(): THREE.Mesh | null {
        return this._object3D instanceof THREE.Mesh ? this._object3D : null;
    }

    get light(): THREE.Light | null {
        return this._object3D instanceof THREE.Light ? this._object3D : null;
    }

    get camera(): THREE.Camera | null {
        return this._object3D instanceof THREE.Camera ? this._object3D : null;
    }

    get name(): string {
        return this._object3D.name;
    }

    set name(value: string) {
        this._object3D.name = value;
    }

    get parent(): THREE.Object3D | null {
        return this._object3D.parent;
    }

    get children(): THREE.Object3D[] {
        return this._object3D.children;
    }

    get visible(): boolean {
        return this._object3D.visible;
    }

    set visible(value: boolean) {
        this._object3D.visible = value;
    }

    get userData(): any {
        return this._object3D.userData;
    }

    get uuid(): string {
        return this._object3D.uuid;
    }

    add(child: THREE.Object3D): this {
        this._object3D.add(child);
        return this;
    }

    remove(child: THREE.Object3D): this {
        this._object3D.remove(child);
        return this;
    }

    traverse(callback: (object: THREE.Object3D) => void): void {
        this._object3D.traverse(callback);
    }

    lookAt(x: number | THREE.Vector3, y?: number, z?: number): this {
        if (typeof x === 'number') {
            this._object3D.lookAt(x, y!, z!);
        } else {
            this._object3D.lookAt(x);
        }
        return this;
    }

    updateMatrix(): void {
        this._object3D.updateMatrix();
    }

    updateMatrixWorld(force?: boolean): void {
        this._object3D.updateMatrixWorld(force);
    }

    translateX(distance: number): this {
        this._object3D.translateX(distance);
        return this;
    }

    translateY(distance: number): this {
        this._object3D.translateY(distance);
        return this;
    }

    translateZ(distance: number): this {
        this._object3D.translateZ(distance);
        return this;
    }

    rotateX(angle: number): this {
        this._object3D.rotateX(angle);
        return this;
    }

    rotateY(angle: number): this {
        this._object3D.rotateY(angle);
        return this;
    }

    rotateZ(angle: number): this {
        this._object3D.rotateZ(angle);
        return this;
    }

    clone(recursive?: boolean): Entity {
        const clonedObject3D = this._object3D.clone(recursive);
        const cloned = new Entity(clonedObject3D);
        return cloned;
    }

    copy(source: Entity | THREE.Object3D, recursive?: boolean): this {
        if (source instanceof Entity) {
            this._object3D.copy(source._object3D, recursive);
        } else {
            this._object3D.copy(source, recursive);
        }
        return this;
    }

    addComponent<T extends Component>(ComponentClass: new (entity: Entity) => T): T {
        const componentName = ComponentClass.name;
        
        if (this.components.has(componentName)) {
            throw new Error(`Component ${componentName} already exists on entity ${this.name}`);
        }

        const component = new ComponentClass(this);
        this.components.set(componentName, component);
        
        component.initialize();

        return component as T;
    }

    getComponent<T extends Component>(ComponentClass: new (entity: Entity) => T): T | null {
        const componentName = ComponentClass.name;
        return (this.components.get(componentName) as T) || null;
    }

    hasComponent<T extends Component>(ComponentClass: new (entity: Entity) => T): boolean {
        const componentName = ComponentClass.name;
        return this.components.has(componentName);
    }

    removeComponent(ComponentClass: new (entity: Entity) => Component): void {
        const componentName = ComponentClass.name;
        const component = this.components.get(componentName);
        
        if (component) {
            component.destroy();
            this.components.delete(componentName);
        }
    }

    getComponents(): Component[] {
        return Array.from(this.components.values());
    }

    addScript<T extends Script>(ScriptClass: new (entity: Entity) => T): T {
        const script = new ScriptClass(this);
        (script as any).app = this.app;
        this.scripts.push(script);
        
        if (this.scriptsStarted) {
            script.start();
        }

        return script as T;
    }

    addScriptFromAsset(scriptAsset: ScriptAsset): Script | null {
        if (!scriptAsset || !scriptAsset.scriptClass) {
            return null;
        }

        const script = new scriptAsset.scriptClass(this);
        (script as any).app = this.app;
        this.scripts.push(script);
        
        if (this.scriptsStarted) {
            script.start();
        }

        return script;
    }

    getScript<T extends Script>(ScriptClass: new (entity: Entity) => T): T | null {
        return this.scripts.find(s => s instanceof ScriptClass) as T || null;
    }

    removeScript(ScriptClass: new (entity: Entity) => Script): void {
        const index = this.scripts.findIndex(s => s instanceof ScriptClass);
        if (index !== -1) {
            this.scripts[index].destroy();
            this.scripts.splice(index, 1);
        }
    }

    update(deltaTime: number): void {
        if (!this.scriptsStarted) {
            this.scriptsStarted = true;
            this.scripts.forEach(script => script.start());
        }

        this.components.forEach(component => {
            if (component.enabled) {
                component.update(deltaTime);
            }
        });

        this.scripts.forEach(script => {
            if (script.enabled) {
                script.update();
            }
        });
    }

    dispose(): void {
        this.scripts.forEach(script => script.destroy());
        this.scripts = [];

        this.components.forEach(component => component.destroy());
        this.components.clear();

        this.events.clear();

        if (this._object3D.parent) {
            this._object3D.parent.remove(this._object3D);
        }

        this.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                if (child.geometry) {
                    child.geometry.dispose();
                }
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => mat.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            }
        });
    }

    static fromObject3D(object3D: THREE.Object3D): Entity {
        return new Entity(object3D);
    }
}
