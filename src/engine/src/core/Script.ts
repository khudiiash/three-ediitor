import * as THREE from 'three';
import { Entity } from './Entity';

export interface ScriptAttribute {
    name: string;
    type: 'number' | 'string' | 'boolean' | 'vector3' | 'color' | 'texture' | 'entity' | 'enum';
    default?: any;
    title?: string;
    description?: string;
    min?: number;
    max?: number;
    step?: number;
    enum?: { [key: string]: any };
}

import { App } from './App';

export abstract class Script {
    protected entity: Entity;
    public app: App | null = null;
    public enabled: boolean = true;
    private started: boolean = false;
    private attributes: Map<string, ScriptAttribute> = new Map();
    private attributeValues: Map<string, any> = new Map();

    constructor(entity: Entity) {
        this.entity = entity;
        this.app = entity.app;
        this.initializeAttributes();
    }

    getEntity(): Entity {
        return this.entity;
    }

    private initializeAttributes(): void {
        const constructor = this.constructor as any;
        if (constructor.__attributes) {
            constructor.__attributes.forEach((attr: ScriptAttribute) => {
                this.attributes.set(attr.name, attr);
                const defaultValue = attr.default !== undefined ? attr.default : this.getDefaultValue(attr.type);
                this.attributeValues.set(attr.name, defaultValue);
                const self = this as any;
                try {
                    Object.defineProperty(self, attr.name, {
                        value: defaultValue,
                        writable: true,
                        enumerable: true,
                        configurable: true
                    });
                } catch (e) {
                    self[attr.name] = defaultValue;
                }
            });
        }
    }

    private getDefaultValue(type: string): any {
        switch (type) {
            case 'number': return 0;
            case 'string': return '';
            case 'boolean': return false;
            case 'vector3': return new THREE.Vector3();
            case 'color': return new THREE.Color();
            default: return null;
        }
    }

    getAttribute(name: string): any {
        return this.attributeValues.get(name);
    }

    setAttribute(name: string, value: any): void {
        const self = this as any;
        this.attributeValues.set(name, value);
        try {
            const descriptor = Object.getOwnPropertyDescriptor(self, name);
            if (descriptor && (!descriptor.writable || !descriptor.configurable)) {
                delete self[name];
            }
        } catch (e) {
        }
        self[name] = value;
        try {
            Object.defineProperty(self, name, {
                value: value,
                writable: true,
                enumerable: true,
                configurable: true
            });
        } catch (e) {
        }
    }

    getAttributes(): Map<string, ScriptAttribute> {
        return new Map(this.attributes);
    }

    getAttributeValues(): Map<string, any> {
        return new Map(this.attributeValues);
    }

    start(): void {
        if (this.started) return;
        this.started = true;
        this.awake();
        this.onStart();
    }

    protected awake(): void {
    }

    protected onStart(): void {
    }

    update(): void {
        if (!this.started) {
            this.start();
        }
        this.onUpdate();
    }

    protected onUpdate(): void {
    }

    destroy(): void {
        this.onDestroy();
    }

    protected onDestroy(): void {
    }

    enable(): void {
        this.enabled = true;
    }

    disable(): void {
        this.enabled = false;
    }
}

export type ScriptConstructor = new (entity: Entity) => Script;
