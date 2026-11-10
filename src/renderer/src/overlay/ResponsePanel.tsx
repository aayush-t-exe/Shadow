import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { ArrowUp, Copy, Image, RotateCcw, Square, TriangleAlert, X } from 'lucide-react'
import { hotkeyFor, keycaps } from '@shared/hotkeys'
import { providerInfo } from '@shared/providers'
import { Keycaps } from '../components/Keycaps'
import { Answer } from './Answer'
import { Paywall } from './Paywall'
import { reportError, useOverlay, type Turn } from './store'

/** Credits at or below this show the "N left · Top up" chip in the header. */
const LOW_CREDITS = 5

const keysText = (action: Parameters<typeof hotkeyFor>[0]) => keycaps(hotkeyFor(action).accelerator).join('+')
const seconds = (ms: number) => `${(ms / 1000).toFixed(1)}s`

function TurnView({ turn, latest }: { turn: Turn; latest: boolean }) {
  const waiting = turn.streaming && turn.answer === ''
  const outOfCredits = turn.error?.code === 'NO_CREDITS'
  return (
    <div className="turn">
      <div className="bubble-row">
        <div className="bubble">{turn.prompt}</div>
        {turn.screenshotCount > 0 && (
          <span className="bubble-meta">
            <Image size={11} /> with {turn.screenshotCount} screenshot{turn.screenshotCount > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {waiting && (
        <>
          <div className="status">
            <span className="dots">
              <i />
              <i />
              <i />
            </span>
            {turn.status ?? 'Thinking…'}
          </div>
          <div className="skeleton" style={{ width: '82%' }} />
          <div className="skeleton" style={{ width: '58%' }} />
        </>
      )}

      {turn.answer && <Answer text={turn.answer} streaming={turn.streaming} />}
      {turn.aborted && <div className="note">Stopped.</div>}
      {/* Out of credits isn't an error: the paywall takes the answer's place, and the question waits. */}
      {outOfCredits && <Paywall reason="answer" active={latest} />}
      {turn.error && !outOfCredits && (
        <div className="error">
          <TriangleAlert size={14} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1 }}>{turn.error.message}</span>
          {(turn.error.code === 'NO_KEY' || turn.error.code === 'AUTH') && (
            <button className="btn btn-sm" onClick={() => window.shadow.openSettings()}>
              Open settings
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function AskInput({ streaming }: { streaming: boolean }) {
  const [text, setText] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => ref.current?.focus(), [])
  // Grow with content up to the CSS max-height.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [text])

  const send = () => {
    const question = text.trim()
    if (!question || streaming) return
    setText('')
    window.shadow.ask({ mode: 'followup', text: question }).catch(reportError)
  }
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="ask">
      <textarea
        ref={ref}
        rows={1}
        value={text}
        placeholder="Ask a follow-up, e.g. “why O(n)?” or “optimize the space”"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
      />
      {streaming ? (
        <button className="btn btn-icon btn-raised" title="Stop" onClick={() => window.shadow.cancel()}>
          <Square fill="currentColor" style={{ width: 11, height: 11 }} />
        </button>
      ) : (
        <button className="btn btn-icon btn-primary" title="Send (Enter)" disabled={!text.trim()} onClick={send}>
          <ArrowUp />
        </button>
      )}
    </div>
  )
}

export function ResponsePanel() {
  const turns = useOverlay((s) => s.turns)
  const closePanel = useOverlay((s) => s.closePanel)
  const balance = useOverlay((s) => s.cloud?.balance ?? null)
  const usingCloud = useOverlay((s) => s.settings?.source === 'cloud')
  const paywall = useOverlay((s) => s.paywall)
  const openPaywall = useOverlay((s) => s.openPaywall)
  const closePaywall = useOverlay((s) => s.closePaywall)
  const bodyRef = useRef<HTMLDivElement>(null)

  const last = turns.at(-1)
  const streaming = last?.streaming ?? false
  // A paywall opened by Listen or "Add credits" shows after the turns, unless an answer's paywall is already there.
  const answerPaywallShowing = last?.error?.code === 'NO_CREDITS'
  const standalonePaywall = paywall && !answerPaywallShowing ? paywall : null
  const lowCredits = usingCloud && balance !== null && balance > 0 && balance <= LOW_CREDITS

  // A new answer is read from its first line: bring the new turn to the top of the panel
  // and leave it there while it streams, instead of following the newest text.
  useLayoutEffect(() => {
    const el = bodyRef.current
    const turn = el?.lastElementChild
    if (el && turn) el.scrollTop += turn.getBoundingClientRect().top - el.getBoundingClientRect().top - 8
  }, [last?.id, standalonePaywall])

  // Ctrl+Shift+Up/Down scroll from any app, since the overlay usually doesn't have focus.
  useEffect(
    () =>
      window.shadow.onScrollAnswer((direction) =>
        bodyRef.current?.scrollBy({ top: direction * bodyRef.current.clientHeight * 0.6, behavior: 'smooth' })
      ),
    []
  )

  let title = 'Ask Shadow'
  let meta = ''
  if (standalonePaywall) {
    title = standalonePaywall === 'topup' ? 'Add credits' : 'Out of credits'
    meta = `Shadow Cloud${balance === null ? '' : ` · ${balance} credit${balance === 1 ? '' : 's'} left`}`
  } else if (last) {
    title = last.streaming
      ? last.answer
        ? 'Answering…'
        : 'Thinking…'
      : last.error
        ? last.error.code === 'NO_CREDITS'
          ? 'Out of credits'
          : 'Error'
        : 'Answer'
    meta = last.cloud
      ? `Shadow Cloud${balance === null ? '' : ` · ${balance} credit${balance === 1 ? '' : 's'} left`}`
      : `${providerInfo(last.provider).label} · ${last.modelId}`
    if (last.firstTokenMs !== null) meta += ` · first token ${seconds(last.firstTokenMs)}`
    if (last.totalMs !== null && !last.streaming) meta += ` · total ${seconds(last.totalMs)}`
  }

  return (
    <section className="panel glass" data-interactive>
      <header className="panel-header">
        <span className="panel-title">{title}</span>
        <span className="panel-meta" title={meta}>
          {meta}
        </span>
        {lowCredits && !standalonePaywall && (
          <button className="pw-low" title="Add Shadow Cloud credits" onClick={() => openPaywall('topup')}>
            <i /> {balance} left <b>Top up</b>
          </button>
        )}
        <button className="btn btn-sm btn-icon" title={`Copy last code (${keysText('copyCode')})`} onClick={() => window.shadow.copyCode()}>
          <Copy />
        </button>
        <button className="btn btn-sm btn-icon" title={`New session (${keysText('reset')})`} onClick={() => window.shadow.reset()}>
          <RotateCcw />
        </button>
        <button className="btn btn-sm btn-icon" title="Close panel" onClick={closePanel}>
          <X />
        </button>
      </header>

      {turns.length > 0 || standalonePaywall ? (
        <div className="panel-body" ref={bodyRef}>
          {turns.map((t, i) => (
            <TurnView key={t.id} turn={t} latest={i === turns.length - 1 && !standalonePaywall} />
          ))}
          {standalonePaywall && (
            <div className="turn">
              <Paywall key={standalonePaywall} reason={standalonePaywall} active onDismiss={closePaywall} />
            </div>
          )}
        </div>
      ) : (
        <ul className="empty-hints">
          <li>
            <Keycaps accelerator={hotkeyFor('solve').accelerator} /> Solve the coding problem on your screen
          </li>
          <li>
            <Keycaps accelerator={hotkeyFor('listen').accelerator} /> Listen and answer questions as they're asked
          </li>
          <li>
            <span className="key">↓</span> Or type any programming question below
          </li>
        </ul>
      )}

      <footer className="panel-footer">
        <AskInput streaming={streaming} />
      </footer>
    </section>
  )
}
