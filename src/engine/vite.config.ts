import { defineConfig } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const projectRoot = resolve(__dirname, '../..');

export default defineConfig({
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext' // Support top-level await
    }
  },
  build: {
    target: 'esnext', // Support top-level await and modern features
    lib: {
      entry: resolve(process.cwd(), 'src/index.ts'),
      name: 'ThreeEngine',
      fileName: 'three-engine',
      formats: ['es']
    },
    rollupOptions: {
      
      external: ['three', 'three/webgpu', 'three/examples/jsm/capabilities/WebGPU.js'],
      output: {
        
        preserveModules: false,
        format: 'es'
      }
    }
  },
  server: {
    port: 9000,
    cors: true,
    fs: {
      allow: ['..', '../..']
    },
    // Proxy API requests to serve projects folder
    proxy: {
      '/api/projects': {
        target: 'http://localhost:9000',
        changeOrigin: true,
        rewrite: (path) => {
          // Rewrite /api/projects/[projectName]/assets/[path] to ../../projects/[projectName]/assets/[path]
          const match = path.match(/^\/api\/projects\/([^\/]+)\/(.+)$/);
          if (match) {
            const [, projectName, assetPath] = match;
            return `../../projects/${projectName}/${assetPath}`;
          }
          return path;
        }
      }
    }
  }
});
