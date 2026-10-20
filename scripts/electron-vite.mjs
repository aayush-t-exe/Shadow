// Runs electron-vite with ELECTRON_RUN_AS_NODE removed from the environment.
// Tools built on Electron (VS Code, its terminals and extensions) export
// ELECTRON_RUN_AS_NODE=1, which makes Electron start as plain Node and crash
// with "electron does not provide an export named BrowserWindow".
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const cli = fileURLToPath(new URL('../node_modules/electron-vite/bin/electron-vite.js', import.meta.url))

const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE

const child = spawn(process.execPath, [cli, ...process.argv.slice(2)], { stdio: 'inherit', env })
child.on('exit', (code) => process.exit(code ?? 1))
