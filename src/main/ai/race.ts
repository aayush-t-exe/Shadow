// "Hedged" streaming: start the main model; if it hasn't produced any text after a few
// seconds (free tiers are sometimes slow or rate-limited) or it fails before answering,
// also start the backup model, keep whichever produces text first, and cancel the other.

export type StreamPart = { type: string; text?: string; error?: unknown }

export interface RaceOptions<C> {
  primary: C
  backup?: C
  /** Starts a model's stream; must stop when `signal` aborts. */
  start: (choice: C, signal: AbortSignal) => Promise<AsyncIterable<StreamPart>>
  hedgeAfterMs: number
  signal: AbortSignal
  /** The backup was started alongside the primary. */
  onHedge?: (backup: C) => void
  /** This model produced the first text and is the one being streamed. */
  onWinner?: (winner: C) => void
}

interface Run<C> {
  choice: C
  controller: AbortController
  iterator: AsyncIterator<StreamPart>
}

type Outcome<C> = { run: Run<C>; text: string | null } | { run: Run<C>; error: unknown }

/** Reads a run until its next piece of text; null when the stream ends. */
async function nextText<C>(run: Run<C>): Promise<string | null> {
  for (;;) {
    const { value, done } = await run.iterator.next()
    if (done) return null
    if (value.type === 'text-delta' && value.text) return value.text
    if (value.type === 'error') throw value.error
  }
}

export async function* raceText<C>(opts: RaceOptions<C>): AsyncGenerator<string> {
  const launch = (choice: C): Run<C> => {
    const controller = new AbortController()
    opts.signal.addEventListener('abort', () => controller.abort(), { once: true })
    const iterator = (async function* () {
      yield* await opts.start(choice, controller.signal)
    })()
    return { choice, controller, iterator }
  }

  const pending = new Map<Run<C>, Promise<Outcome<C>>>()
  const watch = (run: Run<C>) =>
    pending.set(
      run,
      nextText(run).then(
        (text) => ({ run, text }),
        (error) => ({ run, error })
      )
    )

  let backupStarted = !opts.backup
  const startBackup = () => {
    if (backupStarted) return
    backupStarted = true
    opts.onHedge?.(opts.backup!)
    watch(launch(opts.backup!))
  }

  watch(launch(opts.primary))
  let hedgeTimer: ReturnType<typeof setTimeout> | undefined
  const hedgeDue = new Promise<'hedge'>((resolve) => (hedgeTimer = setTimeout(() => resolve('hedge'), opts.hedgeAfterMs)))

  let winner: Run<C> | undefined
  let first: string | undefined
  let firstError: unknown
  try {
    while (!winner) {
      const contenders: Promise<Outcome<C> | 'hedge'>[] = [...pending.values()]
      if (!backupStarted) contenders.push(hedgeDue)
      if (contenders.length === 0) throw firstError ?? new Error('The model returned an empty answer')
      const outcome = await Promise.race(contenders)
      if (outcome === 'hedge') {
        startBackup()
        continue
      }
      pending.delete(outcome.run)
      if ('error' in outcome) {
        if (opts.signal.aborted) throw outcome.error
        firstError ??= outcome.error
        startBackup() // the main model failed before answering: try the backup right away
        continue
      }
      if (outcome.text === null) continue // finished without text; let any other run win
      winner = outcome.run
      first = outcome.text
    }
  } finally {
    clearTimeout(hedgeTimer)
    for (const run of pending.keys()) if (run !== winner) run.controller.abort()
  }

  const won = winner! // the loop only exits with a winner (or by throwing)
  opts.onWinner?.(won.choice)
  yield first!
  for (;;) {
    const text = await nextText(won)
    if (text === null) return
    yield text
  }
}
