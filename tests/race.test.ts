import { describe, expect, it } from 'vitest'
import { raceText, type StreamPart } from '../src/main/ai/race'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** A fake model stream: waits `delay` ms, then emits the words (or throws). */
function fake(words: string[], delay: number, fail?: string) {
  return async (signal: AbortSignal): Promise<AsyncIterable<StreamPart>> =>
    (async function* () {
      await sleep(delay)
      if (signal.aborted) return
      if (fail) {
        yield { type: 'error', error: new Error(fail) }
        return
      }
      for (const w of words) {
        if (signal.aborted) return
        yield { type: 'text-delta', text: w }
      }
    })()
}

async function collect(gen: AsyncGenerator<string>) {
  let out = ''
  for await (const t of gen) out += t
  return out
}

describe('raceText', () => {
  it('uses the primary when it answers before the hedge deadline', async () => {
    const events: string[] = []
    const streams = { main: fake(['a', 'b'], 10), backup: fake(['X'], 5) }
    const text = await collect(
      raceText({
        primary: 'main' as const,
        backup: 'backup' as const,
        start: (c, s) => streams[c](s),
        hedgeAfterMs: 100,
        signal: new AbortController().signal,
        onHedge: () => events.push('hedge'),
        onWinner: (w) => events.push(`win:${w}`)
      })
    )
    expect(text).toBe('ab')
    expect(events).toEqual(['win:main'])
  })

  it('starts the backup when the primary is slow and keeps the first to answer', async () => {
    const events: string[] = []
    const streams = { main: fake(['slow'], 300), backup: fake(['fa', 'st'], 10) }
    const text = await collect(
      raceText({
        primary: 'main' as const,
        backup: 'backup' as const,
        start: (c, s) => streams[c](s),
        hedgeAfterMs: 30,
        signal: new AbortController().signal,
        onHedge: (b) => events.push(`hedge:${b}`),
        onWinner: (w) => events.push(`win:${w}`)
      })
    )
    expect(text).toBe('fast')
    expect(events).toEqual(['hedge:backup', 'win:backup'])
  })

  it('switches to the backup immediately when the primary fails', async () => {
    const streams = { main: fake([], 5, 'rate limited'), backup: fake(['ok'], 5) }
    const text = await collect(
      raceText({
        primary: 'main' as const,
        backup: 'backup' as const,
        start: (c, s) => streams[c](s),
        hedgeAfterMs: 10_000,
        signal: new AbortController().signal
      })
    )
    expect(text).toBe('ok')
  })

  it('throws the error when there is no backup', async () => {
    await expect(
      collect(
        raceText({
          primary: 'main',
          start: (_c, s) => fake([], 5, 'boom')(s),
          hedgeAfterMs: 10,
          signal: new AbortController().signal
        })
      )
    ).rejects.toThrow('boom')
  })
})
