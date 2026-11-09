import { resolve } from 'node:path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const shared = { '@shared': resolve('src/shared') }

// scripts/electron-vite.mjs sets SHADOW_EDITION: "owner" for `npm run dev` / `dist:owner`,
// "public" for the installer everyone else downloads (src/shared/edition.ts).
const owner = process.env.SHADOW_EDITION === 'owner'
const cloudUrl = process.env.SHADOW_CLOUD_URL || 'http://127.0.0.1:8787'
const define = {
  __SHADOW_OWNER__: JSON.stringify(owner),
  __SHADOW_CLOUD_URL__: JSON.stringify(cloudUrl)
}

export default defineConfig({
  main: {
    define,
    resolve: { alias: shared }
  },
  preload: {
    define,
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
    define,
    resolve: { alias: shared },
    plugins: [react(), tailwindcss()],
    build: {
      rolldownOptions: {
        input: {
          overlay: resolve('src/renderer/overlay.html'),
          settings: resolve('src/renderer/settings.html'),
          // The README screenshot studio is only built by `npm run showcase`.
          ...(process.env.SHADOW_SHOWCASE ? { showcase: resolve('src/renderer/showcase.html') } : {})
        }
      }
    }
  }
})
