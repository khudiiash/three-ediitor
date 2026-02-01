import * as THREE from 'three';

class AssetPreviewRenderer {
	constructor() {
		this.renderers = new Map();
		this.scenes = new Map();
		this.cameras = new Map();
		this.animationFrameId = null;
		this.isRendering = false;
	}

	getRenderer(width, height) {
		const key = `${width}x${height}`;
		if (!this.renderers.has(key)) {
			const renderer = new THREE.WebGLRenderer({ 
				antialias: true, 
				alpha: true,
				preserveDrawingBuffer: true
			});
			renderer.setSize(width, height);
			renderer.setPixelRatio(window.devicePixelRatio || 1);
			renderer.setClearColor(0x000000, 0);
			this.renderers.set(key, renderer);
		}
		return this.renderers.get(key);
	}

	getCamera(width, height) {
		const key = `${width}x${height}`;
		if (!this.cameras.has(key)) {
			const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
			camera.position.set(0, 0, 3);
			camera.lookAt(0, 0, 0);
			this.cameras.set(key, camera);
		}
		return this.cameras.get(key);
	}

	async renderMaterialPreview(material, width = 128, height = 128) {
		console.log('[AssetPreviewRenderer] renderMaterialPreview called, material type:', typeof material, material instanceof THREE.Material);
		const renderer = this.getRenderer(width, height);
		const camera = this.getCamera(width, height);
		
		const scene = new THREE.Scene();
		scene.background = null;
		
		const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
		scene.add(ambientLight);
		
		const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
		directionalLight1.position.set(1, 1, 1);
		scene.add(directionalLight1);
		
		const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
		directionalLight2.position.set(-1, -1, -1);
		scene.add(directionalLight2);
		
		const geometry = new THREE.SphereGeometry(1, 32, 32);
		let materialInstance;
		
		if (typeof material === 'string') {
			try {
				const materialData = JSON.parse(material);
				
				// Handle NodeMaterial - use default preview material
				if (materialData.type === 'NodeMaterial') {
					console.log('[AssetPreviewRenderer] NodeMaterial detected, using default preview');
					materialInstance = new THREE.MeshStandardMaterial({ 
						color: materialData.color || 0xffffff,
						roughness: materialData.roughness !== undefined ? materialData.roughness : 1,
						metalness: materialData.metalness !== undefined ? materialData.metalness : 0
					});
				} else {
					const loader = new THREE.MaterialLoader();
					loader.setTextures({});
					materialInstance = loader.parse(materialData);
				}
			} catch (e) {
				try {
					const materialData = JSON.parse(material);
					const materialType = materialData.type || 'MeshStandardMaterial';
					const MaterialClass = THREE[materialType] || THREE.MeshStandardMaterial;
					materialInstance = new MaterialClass();
					
					if (materialData.color !== undefined) {
						materialInstance.color.setHex(materialData.color);
					}
					if (materialData.roughness !== undefined) {
						materialInstance.roughness = materialData.roughness;
					}
					if (materialData.metalness !== undefined) {
						materialInstance.metalness = materialData.metalness;
					}
					if (materialData.emissive !== undefined) {
						materialInstance.emissive.setHex(materialData.emissive);
					}
				} catch (e2) {
					materialInstance = new THREE.MeshStandardMaterial({ color: 0x888888 });
				}
			}
		} else if (material instanceof THREE.Material || material.isNodeMaterial) {
			// Handle both standard materials and node materials
			if (material.isNodeMaterial) {
				// Create preview material from node material data
				materialInstance = new THREE.MeshStandardMaterial({ 
					color: material.color || 0xffffff,
					roughness: material.roughness !== undefined ? material.roughness : 1,
					metalness: material.metalness !== undefined ? material.metalness : 0
				});
			} else {
				materialInstance = material;
			}
		} else {
			materialInstance = new THREE.MeshStandardMaterial({ color: 0x888888 });
		}
		
		const mesh = new THREE.Mesh(geometry, materialInstance);
		scene.add(mesh);
		
		mesh.rotation.y = Math.PI / 4;
		
		renderer.render(scene, camera);
		
		geometry.dispose();
		if (typeof material === 'string' && materialInstance !== material) {
			materialInstance.dispose();
		}
		
		return renderer.domElement.toDataURL('image/png');
	}

	
	async renderGeometryPreview(geometry, width = 128, height = 128) {
		console.log('[AssetPreviewRenderer] renderGeometryPreview called, geometry type:', typeof geometry, geometry instanceof THREE.BufferGeometry);
		const renderer = this.getRenderer(width, height);
		const camera = this.getCamera(width, height);
		
		const scene = new THREE.Scene();
		scene.background = null;
		
		const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
		scene.add(ambientLight);
		
		const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
		directionalLight1.position.set(1, 1, 1);
		scene.add(directionalLight1);
		
		const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
		directionalLight2.position.set(-1, -1, -1);
		scene.add(directionalLight2);
		
		const material = new THREE.MeshStandardMaterial({ 
			color: 0x888888,
			wireframe: false,
			side: THREE.DoubleSide
		});
		
		let geometryInstance;
		if (typeof geometry === 'string') {
			try {
				const geometryData = JSON.parse(geometry);
				const loader = new THREE.BufferGeometryLoader();
				geometryInstance = loader.parse(geometryData);
			} catch (e) {
				geometryInstance = new THREE.BoxGeometry(1, 1, 1);
			}
		} else if (geometry instanceof THREE.BufferGeometry) {
			geometryInstance = geometry;
		} else if (geometry instanceof THREE.Geometry) {
			geometryInstance = new THREE.BufferGeometry().fromGeometry(geometry);
		} else {
			geometryInstance = new THREE.BoxGeometry(1, 1, 1);
		}
		
		const mesh = new THREE.Mesh(geometryInstance, material);
		scene.add(mesh);
		
		const box = new THREE.Box3().setFromObject(mesh);
		const center = box.getCenter(new THREE.Vector3());
		const size = box.getSize(new THREE.Vector3());
		const maxDim = Math.max(size.x, size.y, size.z);
		const distance = maxDim * 2;
		
		camera.position.set(center.x, center.y, center.z + distance);
		camera.lookAt(center);
		
		renderer.render(scene, camera);
		
		
		
		if (typeof geometry === 'string' && geometryInstance !== geometry) {
			geometryInstance.dispose();
		}
		material.dispose();
		
		return renderer.domElement.toDataURL('image/png');
	}

	async renderModelPreview(modelData, width = 128, height = 128) {
		const renderer = this.getRenderer(width, height);
		const camera = this.getCamera(width, height);
		
		const scene = new THREE.Scene();
		scene.background = null;
		
		const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
		scene.add(ambientLight);
		
		const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
		directionalLight1.position.set(1, 1, 1);
		scene.add(directionalLight1);
		
		const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
		directionalLight2.position.set(-1, -1, -1);
		scene.add(directionalLight2);
		
		let model;
		if (typeof modelData === 'string') {
			try {
				const loader = new THREE.ObjectLoader();
				const json = JSON.parse(modelData);
				model = loader.parse(json);
			} catch (e) {
				const gltfLoader = new THREE.GLTFLoader();
				return new Promise((resolve, reject) => {
					gltfLoader.load(modelData, (gltf) => {
						model = gltf.scene;
						this.finishModelRender(model, scene, camera, renderer, width, height, resolve);
					}, undefined, reject);
				});
			}
		} else if (modelData instanceof THREE.Object3D) {
			model = modelData;
		} else {
			const geometry = new THREE.BoxGeometry(1, 1, 1);
			const material = new THREE.MeshStandardMaterial({ color: 0x888888 });
			model = new THREE.Mesh(geometry, material);
		}
		
		scene.add(model);
		
		const box = new THREE.Box3().setFromObject(model);
		const center = box.getCenter(new THREE.Vector3());
		const size = box.getSize(new THREE.Vector3());
		const maxDim = Math.max(size.x, size.y, size.z);
		const distance = maxDim * 2;
		
		camera.position.set(center.x, center.y, center.z + distance);
		camera.lookAt(center);
		
		renderer.render(scene, camera);
		
		return renderer.domElement.toDataURL('image/png');
	}

	finishModelRender(model, scene, camera, renderer, width, height, resolve) {
		const box = new THREE.Box3().setFromObject(model);
		const center = box.getCenter(new THREE.Vector3());
		const size = box.getSize(new THREE.Vector3());
		const maxDim = Math.max(size.x, size.y, size.z);
		const distance = maxDim * 2;
		
		camera.position.set(center.x, center.y, center.z + distance);
		camera.lookAt(center);
		
		renderer.render(scene, camera);
		
		resolve(renderer.domElement.toDataURL('image/png'));
	}

	async createPreviewCanvas(asset, width = 128, height = 128) {
		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		canvas.style.cssText = `
			width: 100%;
			height: 100%;
			object-fit: contain;
			background: #1e1e1e;
		`;
		
		try {
			let dataUrl;
			
			if (asset.type === 'material') {
				dataUrl = await this.renderMaterialPreview(asset.content || asset.data, width, height);
			} else if (asset.type === 'geometry') {
				dataUrl = await this.renderGeometryPreview(asset.content || asset.data, width, height);
			} else if (asset.type === 'model') {
				dataUrl = await this.renderModelPreview(asset.content || asset.url || asset.data, width, height);
			} else {
				return null;
			}
			
			if (dataUrl) {
				const img = new Image();
				img.src = dataUrl;
				img.onload = () => {
					const ctx = canvas.getContext('2d');
					ctx.drawImage(img, 0, 0, width, height);
				};
			}
		} catch (error) {
			console.warn('[Preview] Failed to render preview:', error);
			return null;
		}
		
		return canvas;
	}

	dispose() {
		this.renderers.forEach(renderer => renderer.dispose());
		this.renderers.clear();
		this.scenes.clear();
		this.cameras.clear();
	}
}

let previewRendererInstance = null;

export function getAssetPreviewRenderer() {
	if (!previewRendererInstance) {
		previewRendererInstance = new AssetPreviewRenderer();
	}
	return previewRendererInstance;
}

export { AssetPreviewRenderer };
