import { Component } from '../core/Component';
import { Entity } from '../core/Entity';

/**
 * TransformComponent provides convenient methods for transform operations
 * Since Entity extends Object3D, position/rotation/scale are already available
 * This component just provides helper methods
 */
export class TransformComponent extends Component {
    /**
     * Get position (convenience method)
     */
    getPosition() {
        return this.entity.position.clone();
    }

    /**
     * Set position
     */
    setPosition(x: number, y: number, z: number): void;
    setPosition(position: { x: number; y: number; z: number }): void;
    setPosition(xOrVec: number | { x: number; y: number; z: number }, y?: number, z?: number): void {
        if (typeof xOrVec === 'number') {
            this.entity.position.set(xOrVec, y!, z!);
        } else {
            this.entity.position.set(xOrVec.x, xOrVec.y, xOrVec.z);
        }
    }

    /**
     * Get rotation (convenience method)
     */
    getRotation() {
        return this.entity.rotation.clone();
    }

    /**
     * Set rotation (Euler angles in radians)
     */
    setRotation(x: number, y: number, z: number): void;
    setRotation(rotation: { x: number; y: number; z: number }): void;
    setRotation(xOrEuler: number | { x: number; y: number; z: number }, y?: number, z?: number): void {
        if (typeof xOrEuler === 'number') {
            this.entity.rotation.set(xOrEuler, y!, z!);
        } else {
            this.entity.rotation.set(xOrEuler.x, xOrEuler.y, xOrEuler.z);
        }
    }

    /**
     * Get scale (convenience method)
     */
    getScale() {
        return this.entity.scale.clone();
    }

    /**
     * Set scale
     */
    setScale(x: number, y: number, z: number): void;
    setScale(scale: { x: number; y: number; z: number }): void;
    setScale(xOrVec: number | { x: number; y: number; z: number }, y?: number, z?: number): void {
        if (typeof xOrVec === 'number') {
            this.entity.scale.set(xOrVec, y!, z!);
        } else {
            this.entity.scale.set(xOrVec.x, xOrVec.y, xOrVec.z);
        }
    }

    /**
     * Translate (move relative to current position)
     */
    translate(x: number, y: number, z: number): void {
        this.entity.translateX(x);
        this.entity.translateY(y);
        this.entity.translateZ(z);
    }

    /**
     * Rotate (relative to current rotation)
     */
    rotate(x: number, y: number, z: number): void {
        this.entity.rotateX(x);
        this.entity.rotateY(y);
        this.entity.rotateZ(z);
    }

    /**
     * Look at a point (uses Object3D's lookAt)
     */
    lookAt(target: { x: number; y: number; z: number }): void;
    lookAt(x: number, y: number, z: number): void;
    lookAt(xOrVec: number | { x: number; y: number; z: number }, y?: number, z?: number): void {
        if (typeof xOrVec === 'number') {
            this.entity.lookAt(xOrVec, y!, z!);
        } else {
            this.entity.lookAt(xOrVec.x, xOrVec.y, xOrVec.z);
        }
    }
}
