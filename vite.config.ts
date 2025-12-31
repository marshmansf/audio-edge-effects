import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  root: 'src/renderer',
  base: './',
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/renderer/index.html'),
        settings: resolve(__dirname, 'src/renderer/settings.html')
      }
    }
  },
  server: {
    port: 5173
  }
})
