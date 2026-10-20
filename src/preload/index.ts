import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { IPC, type ShadowAPI } from '@shared/api'

// Wrap each channel individually; the renderer never gets raw ipcRenderer access.
function listener<T>(channel: string) {
  return (cb: (payload: T) => void) => {
    const handler = (_e: IpcRendererEvent, payload: T) => cb(payload)
    ipcRenderer.on(channel, handler)
    return () => {
      ipcRenderer.removeListener(channel, handler)
    }
  }
}

const api: ShadowAPI = {
  ask: (req) => ipcRenderer.invoke(IPC.ask, req),
  takeScreenshot: () => ipcRenderer.invoke(IPC.takeScreenshot),
  removeScreenshot: (id) => ipcRenderer.invoke(IPC.removeScreenshot, id),
  cancel: () => ipcRenderer.send(IPC.cancel),
  reset: () => ipcRenderer.send(IPC.reset),
  copyCode: () => ipcRenderer.send(IPC.copyCode),
  setInteractiveRegions: (rects) => ipcRenderer.send(IPC.setInteractiveRegions, rects),
  hideOverlay: () => ipcRenderer.send(IPC.hideOverlay),
  openSettings: () => ipcRenderer.send(IPC.openSettings),
  openKeyPage: (provider) => ipcRenderer.send(IPC.openKeyPage, provider),
  quit: () => ipcRenderer.send(IPC.quit),

  getSettings: () => ipcRenderer.invoke(IPC.getSettings),
  setSettings: (patch) => ipcRenderer.invoke(IPC.setSettings, patch),
  getKeyStatus: () => ipcRenderer.invoke(IPC.getKeyStatus),
  setKey: (provider, key) => ipcRenderer.invoke(IPC.setKey, provider, key),
  deleteKey: (provider) => ipcRenderer.invoke(IPC.deleteKey, provider),
  testModel: (choice) => ipcRenderer.invoke(IPC.testModel, choice),
  listModels: (provider) => ipcRenderer.invoke(IPC.listModels, provider),

  onAnswerStart: listener(IPC.answerStart),
  onAnswerStatus: listener(IPC.answerStatus),
  onAnswerChunk: listener(IPC.answerChunk),
  onAnswerDone: listener(IPC.answerDone),
  onAnswerError: listener(IPC.answerError),
  onScreenshots: listener(IPC.screenshots),
  onSessionReset: listener(IPC.sessionReset),
  onToast: listener(IPC.toast),
  onSettingsChanged: listener(IPC.settingsChanged)
}

contextBridge.exposeInMainWorld('shadow', api)
