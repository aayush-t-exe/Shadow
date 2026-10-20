import type { ShadowAPI } from '../shared/api'

declare global {
  interface Window {
    shadow: ShadowAPI
  }
}
