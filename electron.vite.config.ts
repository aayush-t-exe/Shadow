import { resolve } from 'node:path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const shared = { '@shared': resolve('src/shared') }

export default defineConfig({
  main: {
    resolve: { alias: shared }
  },
  preload: {
    resolve: { alias: shared },
    build: {
      // Sandboxed preload scripts cannot be ES modules, so force CommonJS
      // even though the rest of the project is "type": "module".
      rolldownOptions: {
        output: { format: 'cjs', entryFileNames: '[name].cjs' }
      }
    }
  },
  renderer: {
    resolve: { alias: shared },
    plugins: [react(), tailwindcss()],
    build: {
      rolldownOptions: {
        input: {
          overlay: resolve('src/renderer/overlay.html'),
          settings: resolve('src/renderer/settings.html')
        }
      }
    }
  }
})
