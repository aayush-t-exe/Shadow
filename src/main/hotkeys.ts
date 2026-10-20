import { globalShortcut } from 'electron'
import { HOTKEYS, type HotkeyAction } from '@shared/hotkeys'
import { IPC } from '@shared/api'
import { copyLastCode, resetSession, smartAnswer, takeScreenshot, ask } from './session'
import { broadcast, moveOverlay, showOverlay, toggleOverlay } from './windows'

const reportError = (err: unknown) => broadcast(IPC.toast, err instanceof Error ? err.message : String(err))

const ACTIONS: Record<HotkeyAction, () => void> = {
  toggle: toggleOverlay,
  screenshot: () => {
    showOverlay()
    takeScreenshot().catch(reportError)
  },
  solve: () => {
    showOverlay()
    smartAnswer().catch(reportError)
  },
  debug: () => {
    showOverlay()
    ask({ mode: 'debug' }).catch(reportError)
  },
  copyCode: copyLastCode,
  reset: resetSession,
  moveUp: () => moveOverlay(0, -1),
  moveDown: () => moveOverlay(0, 1),
  moveLeft: () => moveOverlay(-1, 0),
  moveRight: () => moveOverlay(1, 0)
}

/** Registers every global hotkey. Returns the ones another app already owns. */
export function registerHotkeys(): string[] {
  const failed: string[] = []
  for (const { action, accelerator } of HOTKEYS) {
    // register() returns false (it doesn't throw) when another app holds the shortcut.
    if (!globalShortcut.register(accelerator, ACTIONS[action])) failed.push(accelerator)
  }
  return failed
}
