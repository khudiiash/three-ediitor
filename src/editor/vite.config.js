import { defineConfig } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import react from '@vitejs/plugin-react';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const projectRoot = resolve(__dirname, '..');
const projectsRoot = resolve(projectRoot, '..', 'projects');
const editorNodeModules = resolve(__dirname, 'node_modules');

export default defineConfig({
  root: projectRoot,
  resolve: {
    alias: {
      'react': resolve(editorNodeModules, 'react'),
      'react-dom': resolve(editorNodeModules, 'react-dom'),
      'react/jsx-dev-runtime': resolve(editorNodeModules, 'react/jsx-dev-runtime.js'),
      'react/jsx-runtime': resolve(editorNodeModules, 'react/jsx-runtime.js'),
      'reactflow': resolve(editorNodeModules, 'reactflow'),
      // Force engine from source so live preview uses latest createMaterialFromGraph (customFn, etc.)
      [resolve(projectRoot, 'engine/dist/three-engine.js')]: resolve(projectRoot, 'engine/src/index.ts'),
    },
  },
  esbuild: {
    jsx: 'preserve' // Let @vitejs/plugin-react handle JSX
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext' // Support top-level await
    }
  },
  build: {
    target: 'esnext', // Support top-level await in build
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: false,
    rollupOptions: {
      input: {
        editor: resolve(projectRoot, 'editor/index.html'),
        nodes: resolve(projectRoot, 'editor/nodes.html'),
      },
    },
  },
  plugins: [
    react({ include: /\.(jsx|tsx)$/, exclude: [] }),
    {
      name: 'resolve-importmap',
      resolveId(id) {
        if (id === 'three' || id === 'three/webgpu') {
          // Use minified WebGPU build (standalone, no three.core.js dependency)
          return resolve(projectRoot, 'editor/build/three.webgpu.min.js');
        }
        if (id === 'three/tsl') {
          // TSL build re-exports positionWorld, uv, etc. from TSL (used for node material geometry nodes)
          return resolve(projectRoot, 'editor/build/three.tsl.min.js');
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
        if (id.startsWith('@engine/')) {
          const subpath = id.replace('@engine/', '');
          return resolve(projectRoot, 'engine/dist', subpath);
        }
        // Resolve engine from source so editor uses latest createMaterialFromGraph without rebuilding
        const engineReq = id.replace(/\?.*$/, '').replace(/\\/g, '/');
        if (engineReq.includes('engine') && engineReq.includes('three-engine')) {
          return resolve(projectRoot, 'engine/src/index.ts');
        }
        return null;
      }
    },
    {
      name: 'serve-projects',
      configureServer(server) {
        const serveProjectFile = (req, res, projectName, assetPath) => {
          const filePath = resolve(projectsRoot, projectName, assetPath);
          
          console.log('[Vite] Serving project file:', req.url, '->', filePath);
          console.log('[Vite] Project:', projectName, 'Asset path:', assetPath);
          
          try {
            const file = readFileSync(filePath);
            const ext = assetPath.split('.').pop()?.toLowerCase();
            const contentType = {
              'jpg': 'image/jpeg',
              'jpeg': 'image/jpeg',
              'png': 'image/png',
              'gif': 'image/gif',
              'webp': 'image/webp',
              'json': 'application/json',
              'glb': 'model/gltf-binary',
              'gltf': 'model/gltf+json',
              'bin': 'application/octet-stream',
              'mp3': 'audio/mpeg',
              'wav': 'audio/wav',
              'ogg': 'audio/ogg'
            }[ext] || 'application/octet-stream';
            
            console.log('[Vite] File found, size:', file.length, 'bytes, content-type:', contentType);
            
            // Set headers before sending response
            if (!res.headersSent) {
              res.statusCode = 200;
              res.setHeader('Content-Type', contentType);
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
              res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
              res.setHeader('Cache-Control', 'no-cache');
            }
            
            // Send the file
            res.end(file);
            return true;
          } catch (error) {
            console.error('[Vite] Failed to serve project file:', filePath, error.message);
            console.error('[Vite] Error details:', error);
            
            // Set headers before sending error response
            if (!res.headersSent) {
              res.statusCode = 404;
              res.setHeader('Content-Type', 'text/plain');
            }
            res.end(`File not found: ${filePath}`);
            return false;
          }
        };
        
        server.middlewares.use((req, res, next) => {
          // Skip Vite's internal requests and non-asset requests
          if (!req.url) {
            return next();
          }
          
          // Handle CORS preflight requests
          if (req.method === 'OPTIONS' && (req.url.startsWith('/api/projects/') || req.url.startsWith('/editor/assets/'))) {
            if (!res.headersSent) {
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
              res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
              res.statusCode = 204;
            }
            res.end();
            return;
          }
          
          // Skip Vite internal requests (html-proxy, HMR, etc.)
          if (req.url.includes('?html-proxy') || 
              req.url.includes('__vite') || 
              req.url.includes('node_modules') ||
              req.url.startsWith('/@') ||
              req.url.startsWith('/src/') ||
              req.url.startsWith('/editor/js/') ||
              req.url.startsWith('/editor/css/') ||
              req.url.startsWith('/editor/examples/')) {
            return next();
          }
          
          // Handle /api/projects/[projectName]/[path]
          if (req.url.startsWith('/api/projects/')) {
            const match = req.url.match(/^\/api\/projects\/([^\/]+)\/(.+)$/);
            if (match) {
              // Decode URL-encoded project name and asset path to handle UTF-8 characters
              const [, encodedProjectName, encodedAssetPath] = match;
              const projectName = decodeURIComponent(encodedProjectName);
              const assetPath = decodeURIComponent(encodedAssetPath);
              const served = serveProjectFile(req, res, projectName, assetPath);
              if (served) {
                // Response already sent, don't call next()
                return;
              }
            }
          }
          
          // Also handle /editor/assets/... requests (fallback for direct asset requests)
          if (req.url && req.url.startsWith('/editor/assets/')) {
            // Decode URL-encoded asset path to handle UTF-8 characters
            const encodedAssetPath = req.url.replace(/^\/editor\/assets\//, '').split('?')[0];
            const assetPath = decodeURIComponent(encodedAssetPath);
            
            // Try to get project name from various sources
            let projectName = null;
            
            // 1. From query params
            const urlParams = new URLSearchParams(req.url.split('?')[1] || '');
            const encodedProjectName = urlParams.get('project');
            if (encodedProjectName) {
              projectName = decodeURIComponent(encodedProjectName);
            }
            
            // 2. From referer header
            if (!projectName && req.headers.referer) {
              const refererMatch = req.headers.referer.match(/[?&]project=([^&]+)/);
              if (refererMatch) {
                projectName = decodeURIComponent(refererMatch[1]);
              }
            }
            
            // 3. Try to find project by checking which projects exist and if the file exists
            if (!projectName) {
              try {
                const fs = require('fs');
                const projects = fs.readdirSync(projectsRoot, { withFileTypes: true })
                  .filter(dirent => dirent.isDirectory())
                  .map(dirent => dirent.name);
                
                // Try each project to see if the file exists
                for (const proj of projects) {
                  const testPath = resolve(projectsRoot, proj, assetPath);
                  try {
                    if (fs.existsSync(testPath)) {
                      projectName = proj;
                      console.log('[Vite] Found project by file existence:', projectName);
                      break;
                    }
                  } catch (e) {
                    // Continue to next project
                  }
                }
                
                // If still not found, use first project as fallback
                if (!projectName && projects.length > 0) {
                  projectName = projects[0];
                  console.log('[Vite] Using fallback project:', projectName);
                }
              } catch (e) {
                console.warn('[Vite] Could not determine project name for /editor/assets/ request:', e.message);
              }
            }
            
            if (projectName) {
              console.log('[Vite] Handling /editor/assets/ request, project:', projectName, 'asset:', assetPath);
              const served = serveProjectFile(req, res, projectName, assetPath);
              if (served) {
                // Response already sent, don't call next()
                return;
              }
            } else {
              console.warn('[Vite] Could not determine project name for:', req.url);
            }
          }
          
          // Only call next() if we haven't sent a response
          if (!res.headersSent) {
            next();
          }
        });
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
    watch: {
      // Ensure editor JSX (e.g. js/nodes) is watched so changes trigger HMR
      ignored: ['**/node_modules/**', '**/dist/**'],
      usePolling: false,
    },
    fs: {
      allow: ['..']
    }
  },
  publicDir: false
});
