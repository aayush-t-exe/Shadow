import { safeStorage } from 'electron'
import Store from 'electron-store'
import type { KeyStatus, SecretId } from '@shared/types'

// API keys are encrypted with Windows DPAPI (via safeStorage) and stored as base64.
// Threat model: protects keys from other Windows users and from anyone copying the
// config file to another machine; it does NOT protect against other programs running
// as the same user. That is the same guarantee browsers give saved passwords.

interface Vault {
  keys: Partial<Record<SecretId, { cipher: string; last4: string }>>
}

let vault: Store<Vault> | undefined
const getVault = () => (vault ??= new Store<Vault>({ name: 'vault', defaults: { keys: {} } }))

export async function setApiKey(provider: SecretId, key: string): Promise<void> {
  const clean = key.trim()
  if (!clean) throw new Error('Key is empty')
  if (!(await safeStorage.isAsyncEncryptionAvailable())) {
    throw new Error('Windows encryption is unavailable, so the key was not saved')
  }
  const cipher = (await safeStorage.encryptStringAsync(clean)).toString('base64')
  getVault().set(`keys.${provider}`, { cipher, last4: clean.slice(-4) })
}

export async function getApiKey(provider: SecretId): Promise<string | undefined> {
  const entry = getVault().get('keys')[provider]
  if (!entry) return undefined
  const { result, shouldReEncrypt } = await safeStorage.decryptStringAsync(Buffer.from(entry.cipher, 'base64'))
  if (shouldReEncrypt) await setApiKey(provider, result)
  return result
}

export function deleteApiKey(provider: SecretId): void {
  const keys = { ...getVault().get('keys') }
  delete keys[provider]
  getVault().set('keys', keys)
}

/** The only key information that ever leaves the main process. */
export function keyStatus(): KeyStatus {
  const keys = getVault().get('keys')
  return Object.fromEntries(Object.entries(keys).map(([p, v]) => [p, { last4: v!.last4 }]))
}
