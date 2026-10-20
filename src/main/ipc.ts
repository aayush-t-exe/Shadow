import { app, ipcMain, shell, type IpcMainEvent, type IpcMainInvokeEvent } from 'electron'
import { generateText } from 'ai'
import { z } from 'zod'
import { IPC } from '@shared/api'
import { keyUrlFor } from '@shared/providers'
import type { KeyTestResult, ModelChoice } from '@shared/types'
import { isTrustedUrl } from './trust'
import { getListenStatus, pushAudio, setCaptureWarning, startListening, stopListening } from './live/listen'
import { getSettings, updateSettings } from './settings'
import { deleteApiKey, keyStatus, setApiKey } from './secrets'
import { getModel, listModels } from './ai/providers'
import { toUserError } from './ai/errors'
import { ask, cancelAnswer, copyLastCode, removeScreenshot, resetSession, takeScreenshot } from './session'
import { broadcast, hideOverlay, openSettingsWindow, setInteractiveRegions } from './windows'

// Only our own pages may call into main. A page that somehow navigated elsewhere
// (or an injected frame) gets nothing back.
const isTrusted = (event: IpcMainEvent | IpcMainInvokeEvent) => isTrustedUrl(event.senderFrame?.url ?? '')

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
const secretId = z.enum([...providerId.options, 'deepgram'])
const askRequest = z.object({
  mode: z.enum(['solve', 'debug', 'followup', 'live']),
  text: z.string().max(4000).optional(),
  withScreen: z.boolean().optional()
})
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
  handle(IPC.setKey, async (id: unknown, key: unknown) => {
    await setApiKey(secretId.parse(id), z.string().min(1).max(500).parse(key))
    broadcast(IPC.keysChanged, keyStatus())
    return keyStatus()
  })
  handle(IPC.deleteKey, (id: unknown) => {
    deleteApiKey(secretId.parse(id))
    broadcast(IPC.keysChanged, keyStatus())
    return keyStatus()
  })
  handle(IPC.testModel, (choice: unknown) => testModel(modelChoice.parse(choice)))
  handle(IPC.listModels, (provider: unknown) => listModels(providerId.parse(provider), getSettings()))

  on(IPC.cancel, () => cancelAnswer())
  on(IPC.reset, () => resetSession())
  on(IPC.copyCode, () => copyLastCode())
  on(IPC.setInteractiveRegions, (rects: unknown) => setInteractiveRegions(rectList.parse(rects)))
  handle(IPC.startListening, () => startListening())
  handle(IPC.getListenStatus, () => getListenStatus())
  on(IPC.stopListening, () => stopListening())
  on(IPC.pushAudio, (source: unknown, pcm: unknown) => {
    // 80 ms of 16 kHz PCM16 is 2560 bytes; anything far bigger isn't from our worklet.
    if ((source === 'mic' || source === 'system') && pcm instanceof Uint8Array && pcm.byteLength <= 64_000) {
      pushAudio(source, Buffer.from(pcm.buffer, pcm.byteOffset, pcm.byteLength))
    }
  })
  on(IPC.reportCaptureWarning, (warning: unknown) =>
    setCaptureWarning(typeof warning === 'string' ? warning.slice(0, 300) : null)
  )

  on(IPC.hideOverlay, () => hideOverlay())
  on(IPC.openSettings, () => openSettingsWindow())
  on(IPC.quit, () => app.quit())
  // The renderer names a provider, never a URL, so it can only open the known key pages.
  on(IPC.openKeyPage, (id: unknown) => {
    const parsed = secretId.safeParse(id)
    const url = parsed.success ? keyUrlFor(parsed.data) : undefined
    if (url) void shell.openExternal(url)
  })
}
