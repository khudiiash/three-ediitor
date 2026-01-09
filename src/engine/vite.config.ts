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
      // Don't bundle three - it will be provided by the editor via importmap
      external: ['three'],
      output: {
        // Preserve the 'three' import so it resolves via importmap
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
