// Runs electron-vite with ELECTRON_RUN_AS_NODE removed from the environment.
// Tools built on Electron (VS Code, its terminals and extensions) export
// ELECTRON_RUN_AS_NODE=1, which makes Electron start as plain Node and crash
// with "electron does not provide an export named BrowserWindow".
//
// It also picks the edition (src/shared/edition.ts):
//   dev                → owner edition (your own keys and every provider, plus Shadow Cloud)
//   build              → public edition (Shadow Cloud only), unless --owner is passed
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const cli = fileURLToPath(new URL('../node_modules/electron-vite/bin/electron-vite.js', import.meta.url))

const args = process.argv.slice(2)
const ownerFlag = args.includes('--owner')
const passThrough = args.filter((a) => a !== '--owner')

const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE
env.SHADOW_EDITION ??= ownerFlag || passThrough[0] === 'dev' ? 'owner' : 'public'

if (passThrough[0] === 'build' && env.SHADOW_EDITION === 'public' && !env.SHADOW_CLOUD_URL) {
  console.warn(
    '\n⚠  Building the public edition without SHADOW_CLOUD_URL: it will look for Shadow Cloud at http://127.0.0.1:8787.\n' +
      '   Set SHADOW_CLOUD_URL to your deployed server (https://shadow-cloud.<you>.workers.dev) before releasing.\n'
  )
}
console.log(`Shadow edition: ${env.SHADOW_EDITION} · Shadow Cloud: ${env.SHADOW_CLOUD_URL || 'http://127.0.0.1:8787'}`)

const child = spawn(process.execPath, [cli, ...passThrough], { stdio: 'inherit', env })
child.on('exit', (code) => process.exit(code ?? 1))
