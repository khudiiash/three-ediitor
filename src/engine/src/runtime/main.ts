import * as THREE from 'three';
import { pc, App, SceneLoader } from '../index';
import { CameraComponent } from '../components/CameraComponent';
import { LightComponent } from '../components/LightComponent';
import { MeshComponent } from '../components/MeshComponent';
import { ProjectLoader } from './ProjectLoader';

async function main() {
    const canvas = document.getElementById('canvas') as HTMLCanvasElement;
    if (!canvas) {
        console.error('Canvas element not found');
        return;
    }

    pc.init(canvas, {
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance'
    });

    const app = pc.createApp();

    try {
        const projectPath = ProjectLoader.getProjectPath();
        if (projectPath) {
            const sceneData = await ProjectLoader.loadSceneJson(projectPath);

            SceneLoader.loadScene(app, sceneData);

        } else {
            const response = await fetch('./scene.json');
            
            if (response.ok) {
                const sceneData = await response.json();
                SceneLoader.loadScene(app, sceneData);
            } else {
                throw new Error('No project path and default scene.json not found');
            }
        }
    } catch (error) {
        createDefaultScene(app, canvas);
    }

    pc.start();
}

function createDefaultScene(app: App, canvas: HTMLCanvasElement): void {
    const cameraEntity = app.createEntity();
    const cameraComponent = cameraEntity.addComponent(CameraComponent);
    cameraComponent.createPerspective(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    cameraComponent.setAsMainCamera();
    cameraEntity.position.set(0, 0, 5);
    cameraEntity.lookAt(0, 0, 0);

    const lightEntity = app.createEntity();
    const lightComponent = lightEntity.addComponent(LightComponent);
    lightComponent.createDirectional(0xffffff, 1);
    lightEntity.position.set(5, 5, 5);
    lightEntity.lookAt(0, 0, 0);

    const cubeEntity = app.createEntity();
    const meshComponent = cubeEntity.addComponent(MeshComponent);
    meshComponent.setMesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial({ color: 0x00ff00 })
    );
    cubeEntity.position.set(0, 0, 0);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
} else {
    main();
}
