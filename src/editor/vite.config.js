import { defineConfig } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const projectRoot = resolve(__dirname, '..');

export default defineConfig({
  root: projectRoot,
  plugins: [
    {
      name: 'resolve-importmap',
      resolveId(id) {
        if (id === 'three') {
          return resolve(projectRoot, 'editor/build/three.module.js');
        }
        if (id.startsWith('three/addons/')) {
          const subpath = id.replace('three/addons/', '');
          return resolve(projectRoot, 'editor/examples/jsm', subpath);
        }
        if (id.startsWith('three/examples/')) {
          const subpath = id.replace('three/examples/', '');
          return resolve(projectRoot, 'editor/examples', subpath);
        }
        if (id === 'three-gpu-pathtracer') {
          return 'https://cdn.jsdelivr.net/npm/three-gpu-pathtracer@0.0.23/build/index.module.js';
        }
        if (id === 'three-mesh-bvh') {
          return 'https://cdn.jsdelivr.net/npm/three-mesh-bvh@0.7.4/build/index.module.js';
        }
        if (id === 'quarks.core') {
          return 'https://cdn.jsdelivr.net/npm/quarks.core@0.16.0/dist/quarks.core.esm.js';
        }
        if (id === 'three.quarks') {
          return 'https://cdn.jsdelivr.net/npm/three.quarks@0.16.0/dist/three.quarks.esm.js';
        }
        if (id.startsWith('@engine/')) {
          const subpath = id.replace('@engine/', '');
          return resolve(projectRoot, 'engine/dist', subpath);
        }
        return null;
      }
    }
  ],
  server: {
    port: 5173,
    cors: true,
    strictPort: true,
    hmr: {
      protocol: 'ws',
      host: 'localhost'
    },
    fs: {
      allow: ['..']
    }
  },
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: false
  },
  publicDir: false
});
