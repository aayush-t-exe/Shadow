// Draws Shadow's app icon (an indigo crescent on a dark rounded tile) and writes
// build/icon.png (512px) and build/icon.ico (16–256px) with no image tools needed.
// Run: node scripts/make-icons.mjs
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'

const SUPERSAMPLE = 4

function lerp(a, b, t) {
  return a + (b - a) * t
}
function mix(c1, c2, t) {
  return c1.map((v, i) => lerp(v, c2[i], t))
}
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))

const TILE_TOP = hex('#211c3d')
const TILE_BOTTOM = hex('#0c0b14')
const MOON_LIGHT = hex('#c4bdff')
const MOON_DARK = hex('#5b4be8')
const RIM = [255, 255, 255]

/** Signed distance to a rounded square of half-size h and corner radius r, centred at 0. */
function roundedSquare(x, y, h, r) {
  const qx = Math.abs(x) - h + r
  const qy = Math.abs(y) - h + r
  return Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - r
}

/** RGBA pixels for one icon size. Small sizes drop the tile so the crescent stays legible. */
function render(size) {
  const px = new Uint8Array(size * size * 4)
  const withTile = size >= 32
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0
      let g = 0
      let b = 0
      let a = 0
      for (let sy = 0; sy < SUPERSAMPLE; sy++) {
        for (let sx = 0; sx < SUPERSAMPLE; sx++) {
          // normalised coordinates in [-1, 1]
          const u = ((x + (sx + 0.5) / SUPERSAMPLE) / size) * 2 - 1
          const v = ((y + (sy + 0.5) / SUPERSAMPLE) / size) * 2 - 1
          let color = null
          let alpha = 0
          if (withTile) {
            const d = roundedSquare(u, v, 0.94, 0.42)
            if (d <= 0) {
              color = mix(TILE_TOP, TILE_BOTTOM, (v + 1) / 2)
              alpha = 1
              // faint lit rim along the top edge, like the overlay's glass
              if (d > -0.035 && v < 0) color = mix(color, RIM, 0.18 * (-v))
            }
          }
          const scale = withTile ? 0.62 : 0.92
          const inDisc = u * u + v * v <= scale * scale
          const cx = 0.36 * scale
          const cy = -0.27 * scale
          const inCut = (u - cx) ** 2 + (v - cy) ** 2 <= (scale * 0.82) ** 2
          if (inDisc && !inCut) {
            color = mix(MOON_LIGHT, MOON_DARK, Math.min(1, Math.max(0, (u + v) / (2 * scale) + 0.5)))
            alpha = 1
          }
          if (color) {
            r += color[0] * alpha
            g += color[1] * alpha
            b += color[2] * alpha
            a += alpha
          }
        }
      }
      const n = SUPERSAMPLE * SUPERSAMPLE
      const i = (y * size + x) * 4
      px[i] = a ? Math.round(r / a) : 0
      px[i + 1] = a ? Math.round(g / a) : 0
      px[i + 2] = a ? Math.round(b / a) : 0
      px[i + 3] = Math.round((a / n) * 255)
    }
  }
  return px
}

// ---- minimal PNG encoder ----
const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
function crc32(buf) {
  let c = 0xffffffff
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}
function png(size, rgba) {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header[8] = 8 // bit depth
  header[9] = 6 // RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0 // no filter
    Buffer.from(rgba.buffer, y * size * 4, size * 4).copy(raw, y * (size * 4 + 1) + 1)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ])
}

// ---- ICO container holding PNG images (supported since Windows Vista) ----
function ico(images) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(1, 2) // type: icon
  header.writeUInt16LE(images.length, 4)
  let offset = 6 + images.length * 16
  const entries = images.map(({ size, data }) => {
    const e = Buffer.alloc(16)
    e[0] = size >= 256 ? 0 : size
    e[1] = size >= 256 ? 0 : size
    e.writeUInt16LE(1, 4) // colour planes
    e.writeUInt16LE(32, 6) // bits per pixel
    e.writeUInt32LE(data.length, 8)
    e.writeUInt32LE(offset, 12)
    offset += data.length
    return e
  })
  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)])
}

mkdirSync('build', { recursive: true })
mkdirSync('docs/images', { recursive: true })
writeFileSync('build/icon.png', png(512, render(512)))
writeFileSync('docs/images/logo.png', png(256, render(256)))
const sizes = [16, 24, 32, 48, 64, 128, 256]
writeFileSync('build/icon.ico', ico(sizes.map((size) => ({ size, data: png(size, render(size)) }))))
console.log('wrote build/icon.png, build/icon.ico, docs/images/logo.png')
