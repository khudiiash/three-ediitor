import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: '.',
    rollupOptions: {
      input: {
        'editor-main': resolve(__dirname, 'editor-main.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        format: 'iife',
        name: 'Editor',
        globals: {
          'three': 'THREE'
        }
      },
    },
  },
  resolve: {
    alias: {
      '@engine': resolve(__dirname, '../engine/src'),
    },
  },
  server: {
    port: 3001,
  },
  optimizeDeps: {
    include: ['three']
  }
});

