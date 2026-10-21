import type { CreditResult } from '@shared/types'
import { getApiKey } from '../secrets'

// Deepgram Flux list price (Oct 2026): $0.0065 per minute per stream. Listening runs two
// streams at once (You + Them), so an hour of listening costs about $0.78.
const FLUX_USD_PER_MINUTE = 0.0065
const STREAMS = 2

async function deepgram(path: string, apiKey: string): Promise<any> {
  const res = await fetch(`https://api.deepgram.com/v1${path}`, {
    headers: { Authorization: `Token ${apiKey}` },
    signal: AbortSignal.timeout(10_000)
  })
  if (res.status === 401) throw new Error('Deepgram rejected the API key.')
  if (res.status === 403) throw new Error("This key can't read billing. Check your balance at console.deepgram.com → Billing.")
  if (!res.ok) throw new Error(`Deepgram returned ${res.status}.`)
  return res.json()
}

/** Remaining Deepgram credit, summed over the key's projects, plus how much listening it buys. */
export async function checkDeepgramCredit(): Promise<CreditResult> {
  const apiKey = await getApiKey('deepgram')
  if (!apiKey) return { ok: false, message: 'Add a Deepgram key first.' }
  try {
    const { projects } = await deepgram('/projects', apiKey)
    let usd = 0
    for (const { project_id } of projects as { project_id: string }[]) {
      const { balances } = await deepgram(`/projects/${project_id}/balances`, apiKey)
      for (const b of balances as { amount: number; units: string }[]) {
        if (String(b.units).toLowerCase() === 'usd') usd += Number(b.amount) || 0
      }
    }
    const hoursOfListening = usd / (FLUX_USD_PER_MINUTE * STREAMS * 60)
    return { ok: true, usd, hoursOfListening }
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : String(err) }
  }
}
