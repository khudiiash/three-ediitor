import { Entity } from './Entity';

export abstract class Component {
    protected entity: Entity;
    public enabled: boolean = true;

    constructor(entity: Entity) {
        this.entity = entity;
    }

    getEntity(): Entity {
        return this.entity;
    }

    initialize(): void {
    }

    update(deltaTime: number): void {
    }

    destroy(): void {
    }

    enable(): void {
        this.enabled = true;
    }

    disable(): void {
        this.enabled = false;
    }
}

export type ComponentConstructor = new (entity: Entity) => Component;
