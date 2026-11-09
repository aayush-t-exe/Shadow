import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { alias: { '@shared': resolve('src/shared') } },
  define: { __SHADOW_OWNER__: 'true', __SHADOW_CLOUD_URL__: JSON.stringify('http://127.0.0.1:8787') },
  test: { include: ['tests/**/*.test.ts'] }
})
