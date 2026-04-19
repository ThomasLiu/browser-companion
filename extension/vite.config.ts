import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        background: resolve(__dirname, 'background.ts'),
        content: resolve(__dirname, 'content/content.ts'),
        sidepanel: resolve(__dirname, 'sidepanel/sidepanel.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        format: 'es',
      },
    },
  },
  // 开发模式
  server: {
    port: 9223,
  },
});
