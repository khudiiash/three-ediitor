import * as THREE from 'three';
import { Component } from '../core/Component';

/**
 * MeshComponent adds a mesh renderer to an entity
 */
export class MeshComponent extends Component {
    private mesh: THREE.Mesh | null = null;

    /**
     * Set the mesh geometry and material
     */
    setMesh(geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[]): void {
        this.removeMesh();

        this.mesh = new THREE.Mesh(geometry, material);
        (this.entity as any)._object3D.add(this.mesh);
    }

    /**
     * Get the mesh
     */
    getMesh(): THREE.Mesh | null {
        return this.mesh;
    }

    /**
     * Remove the mesh
     */
    removeMesh(): void {
        if (this.mesh) {
            (this.entity as any)._object3D.remove(this.mesh);
            
            if (this.mesh.geometry) {
                this.mesh.geometry.dispose();
            }
            if (this.mesh.material) {
                if (Array.isArray(this.mesh.material)) {
                    this.mesh.material.forEach((mat: THREE.Material) => mat.dispose());
                } else {
                    this.mesh.material.dispose();
                }
            }
            
            this.mesh = null;
        }
    }

    /**
     * Set material
     */
    setMaterial(material: THREE.Material | THREE.Material[]): void {
        if (this.mesh) {
            this.mesh.material = material;
        }
    }

    /**
     * Get material
     */
    getMaterial(): THREE.Material | THREE.Material[] | null {
        return this.mesh ? this.mesh.material : null;
    }

    destroy(): void {
        this.removeMesh();
    }
}
