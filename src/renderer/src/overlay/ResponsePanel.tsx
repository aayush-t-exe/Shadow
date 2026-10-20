import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { ArrowUp, Copy, Image, RotateCcw, Square, TriangleAlert, X } from 'lucide-react'
import { hotkeyFor, keycaps } from '@shared/hotkeys'
import { providerInfo } from '@shared/providers'
import { Answer } from './Answer'
import { reportError, useOverlay, type Turn } from './store'

const keysText = (action: Parameters<typeof hotkeyFor>[0]) => keycaps(hotkeyFor(action).accelerator).join('+')
const seconds = (ms: number) => `${(ms / 1000).toFixed(1)}s`

function TurnView({ turn }: { turn: Turn }) {
  const waiting = turn.streaming && turn.answer === ''
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
      {turn.error && (
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
  const bodyRef = useRef<HTMLDivElement>(null)
  const stickToBottom = useRef(true)

  const last = turns.at(-1)
  const streaming = last?.streaming ?? false

  // Follow the stream, unless the user scrolled up to read something.
  const onScroll = () => {
    const el = bodyRef.current
    if (el) stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 32
  }
  useLayoutEffect(() => {
    const el = bodyRef.current
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight
  }, [last?.answer, turns.length])

  let title = 'Ask Shadow'
  let meta = ''
  if (last) {
    title = last.streaming ? (last.answer ? 'Answering…' : 'Thinking…') : last.error ? 'Error' : 'Answer'
    meta = `${providerInfo(last.provider).label} · ${last.modelId}`
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

      {turns.length > 0 && (
        <div className="panel-body" ref={bodyRef} onScroll={onScroll}>
          {turns.map((t) => (
            <TurnView key={t.id} turn={t} />
          ))}
        </div>
      )}

      <footer className="panel-footer">
        <AskInput streaming={streaming} />
      </footer>
    </section>
  )
}
