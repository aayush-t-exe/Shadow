import { app, ipcMain, shell, type IpcMainEvent, type IpcMainInvokeEvent } from 'electron'
import { generateText } from 'ai'
import { z } from 'zod'
import { IPC } from '@shared/api'
import { providerInfo } from '@shared/providers'
import type { KeyTestResult, ModelChoice, ProviderId } from '@shared/types'
import { getSettings, updateSettings } from './settings'
import { deleteApiKey, keyStatus, setApiKey } from './secrets'
import { getModel, listModels } from './ai/providers'
import { toUserError } from './ai/errors'
import { ask, cancelAnswer, copyLastCode, removeScreenshot, resetSession, takeScreenshot } from './session'
import { broadcast, hideOverlay, openSettingsWindow, setInteractiveRegions } from './windows'

// Only our own pages may call into main. A page that somehow navigated elsewhere
// (or an injected frame) gets nothing back.
function isTrusted(event: IpcMainEvent | IpcMainInvokeEvent): boolean {
  const url = event.senderFrame?.url ?? ''
  const devUrl = process.env.ELECTRON_RENDERER_URL
  if (!app.isPackaged && devUrl && url.startsWith(devUrl)) return true
  return url.startsWith('file://')
}

function handle<A extends unknown[], R>(channel: string, fn: (...args: A) => R) {
  ipcMain.handle(channel, (event, ...args) => {
    if (!isTrusted(event)) throw new Error('Untrusted sender')
    return fn(...(args as A))
  })
}

function on<A extends unknown[]>(channel: string, fn: (...args: A) => void) {
  ipcMain.on(channel, (event, ...args) => {
    if (isTrusted(event)) fn(...(args as A))
  })
}

const providerId = z.enum(['gemini', 'groq', 'openai', 'anthropic', 'openrouter', 'ollama', 'custom'])
const askRequest = z.object({ mode: z.enum(['solve', 'debug', 'followup']), text: z.string().max(4000).optional() })
const modelChoice = z.object({ provider: providerId, modelId: z.string().min(1).max(200), vision: z.boolean() })
const rectList = z.array(z.object({ x: z.number(), y: z.number(), width: z.number(), height: z.number() })).max(50)

async function testModel(choice: ModelChoice): Promise<KeyTestResult> {
  const settings = getSettings()
  const started = performance.now()
  try {
    await generateText({
      model: await getModel(choice, settings),
      prompt: 'Reply with the single word OK.',
      maxOutputTokens: 32,
      maxRetries: 0,
      timeout: { totalMs: 30_000 }
    })
    return { ok: true, ms: Math.round(performance.now() - started) }
  } catch (err) {
    return { ok: false, message: toUserError(err, choice).message }
  }
}

export function registerIpc() {
  handle(IPC.ask, (req: unknown) => ask(askRequest.parse(req)))
  handle(IPC.takeScreenshot, () => takeScreenshot())
  handle(IPC.removeScreenshot, (id: unknown) => removeScreenshot(z.string().parse(id)))

  handle(IPC.getSettings, () => getSettings())
  handle(IPC.setSettings, (patch: unknown) => {
    const next = updateSettings(patch)
    broadcast(IPC.settingsChanged, next)
    return next
  })
  handle(IPC.getKeyStatus, () => keyStatus())
  handle(IPC.setKey, async (provider: unknown, key: unknown) => {
    await setApiKey(providerId.parse(provider), z.string().min(1).max(500).parse(key))
    return keyStatus()
  })
  handle(IPC.deleteKey, (provider: unknown) => {
    deleteApiKey(providerId.parse(provider))
    return keyStatus()
  })
  handle(IPC.testModel, (choice: unknown) => testModel(modelChoice.parse(choice)))
  handle(IPC.listModels, (provider: unknown) => listModels(providerId.parse(provider), getSettings()))

  on(IPC.cancel, () => cancelAnswer())
  on(IPC.reset, () => resetSession())
  on(IPC.copyCode, () => copyLastCode())
  on(IPC.setInteractiveRegions, (rects: unknown) => setInteractiveRegions(rectList.parse(rects)))
  on(IPC.hideOverlay, () => hideOverlay())
  on(IPC.openSettings, () => openSettingsWindow())
  on(IPC.quit, () => app.quit())
  // The renderer names a provider, never a URL, so it can only open the known key pages.
  on(IPC.openKeyPage, (provider: unknown) => {
    const parsed = providerId.safeParse(provider)
    const url = parsed.success ? providerInfo(parsed.data as ProviderId).keyUrl : undefined
    if (url) void shell.openExternal(url)
  })
}
