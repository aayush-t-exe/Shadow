import { app } from 'electron'

/** True for Shadow's own pages: the Vite dev server in development, packaged files in production. */
export function isTrustedUrl(url: string): boolean {
  const devUrl = process.env.ELECTRON_RENDERER_URL
  if (!app.isPackaged && devUrl && url.startsWith(devUrl)) return true
  return url.startsWith('file://')
}
