// npm run showcase: builds the screenshot studio and captures every README image.
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const root = fileURLToPath(new URL('../..', import.meta.url))
const electron = require('electron') // the path to the Electron binary
const env = { ...process.env, SHADOW_SHOWCASE: '1' }
delete env.ELECTRON_RUN_AS_NODE // see scripts/electron-vite.mjs

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, env, stdio: 'inherit' })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

console.log('Building the studio…')
run(process.execPath, ['scripts/electron-vite.mjs', 'build'])
console.log('Capturing screenshots…')
run(electron, ['scripts/showcase/capture.mjs', 'stills'])
console.log('Recording the demo GIF…')
run(electron, ['scripts/showcase/capture.mjs', 'gif'])
