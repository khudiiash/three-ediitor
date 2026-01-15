import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(process.cwd(), 'src/index.ts'),
      name: 'ThreeEngine',
      fileName: 'three-engine',
      formats: ['es']
    },
    rollupOptions: {
      
      external: ['three'],
      output: {
        
        preserveModules: false,
        format: 'es'
      }
    }
  },
  server: {
    port: 9000,
    cors: true
  }
});
