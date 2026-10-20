// Electron entry that renders the screenshot studio in a hidden window and saves images
// to docs/images. Run through scripts/showcase/run.mjs (which builds the studio first).
//   electron capture.mjs stills   → 2x PNG screenshots
//   electron capture.mjs gif      → docs/images/demo.gif
import { app, BrowserWindow } from 'electron'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import gifenc from 'gifenc'

const { GIFEncoder, quantize, applyPalette } = gifenc
const root = fileURLToPath(new URL('../..', import.meta.url))
const page = pathToFileURL(join(root, 'out/renderer/showcase.html')).href
const outDir = join(root, 'docs/images')
const mode = process.argv.includes('gif') ? 'gif' : 'stills'

// Stills are captured at 2x for sharp README images; the GIF at 1x to keep it small.
app.commandLine.appendSwitch('force-device-scale-factor', mode === 'gif' ? '1' : '2')
app.commandLine.appendSwitch('disable-gpu-vsync')

const STILLS = [
  { scene: 'hero', file: 'hero.png', width: 1440, height: 900 },
  { scene: 'listen', file: 'listen.png', width: 1440, height: 900 },
  { scene: 'hindi', file: 'hindi.png', width: 1440, height: 900 },
  { scene: 'welcome', file: 'welcome.png', width: 1440, height: 560 },
  { scene: 'settings', file: 'settings.png', width: 1440, height: 900 },
  { scene: 'social', file: 'social-preview.png', width: 1280, height: 640 }
]

// The GIF only needs the overlay and some backdrop around it.
const GIF_CROP = { x: 200, y: 0, width: 1040, height: 760 }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function waitForReady(win) {
  for (let i = 0; i < 200; i++) {
    if (win.webContents.getTitle() === 'ready') return
    await sleep(100)
  }
  throw new Error('scene never became ready')
}

async function load(win, scene, width, height) {
  win.setContentSize(width, height)
  await win.loadURL(`${page}?scene=${scene}`)
  await waitForReady(win)
}

async function stills(win) {
  // SHOWCASE_ONLY=settings,hero re-captures just those scenes
  const only = process.env.SHOWCASE_ONLY?.split(',')
  for (const { scene, file, width, height } of STILLS.filter((s) => !only || only.includes(s.scene))) {
    await load(win, scene, width, height)
    const image = await win.webContents.capturePage({ x: 0, y: 0, width, height })
    writeFileSync(join(outDir, file), image.toPNG())
    console.log(`  ${file}  ${image.getSize().width}×${image.getSize().height}`)
  }
}

async function gif(win) {
  await load(win, 'demo', 1440, 900)
  const count = await win.webContents.executeJavaScript('window.__frameCount')
  const encoder = GIFEncoder()
  for (let i = 0; i < count; i++) {
    const delay = await win.webContents.executeJavaScript(`window.__setFrame(${i})`)
    const image = await win.webContents.capturePage(GIF_CROP)
    // SHOWCASE_FRAMES=<dir> also saves every frame as PNG, for checking the animation by eye
    if (process.env.SHOWCASE_FRAMES) writeFileSync(join(process.env.SHOWCASE_FRAMES, `frame-${String(i).padStart(2, '0')}.png`), image.toPNG())
    const { width, height } = image.getSize()
    // capturePage gives BGRA; gifenc wants RGBA
    const bgra = image.toBitmap()
    const rgba = new Uint8Array(bgra.length)
    for (let p = 0; p < bgra.length; p += 4) {
      rgba[p] = bgra[p + 2]
      rgba[p + 1] = bgra[p + 1]
      rgba[p + 2] = bgra[p]
      rgba[p + 3] = 255
    }
    const palette = quantize(rgba, 256)
    encoder.writeFrame(applyPalette(rgba, palette), width, height, { palette, delay })
  }
  encoder.finish()
  const bytes = encoder.bytes()
  writeFileSync(join(outDir, 'demo.gif'), bytes)
  console.log(`  demo.gif  ${count} frames, ${(bytes.length / 1024 / 1024).toFixed(1)} MB`)
}

app.whenReady().then(async () => {
  mkdirSync(outDir, { recursive: true })
  const win = new BrowserWindow({
    show: false,
    paintWhenInitiallyHidden: true,
    useContentSize: true,
    width: 1440,
    height: 900,
    webPreferences: { sandbox: true, contextIsolation: true, backgroundThrottling: false }
  })
  win.webContents.on('console-message', ({ level, message }) => {
    if (level === 'error' || level === 'warning') console.log(`  [page ${level}] ${message}`)
  })
  try {
    if (mode === 'gif') await gif(win)
    else await stills(win)
  } catch (err) {
    console.error(err)
    process.exitCode = 1
  }
  app.quit()
})
