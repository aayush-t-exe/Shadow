import { useLayoutEffect, useRef } from 'react'
import { Sparkles, TriangleAlert } from 'lucide-react'
import { SPEAKER } from '@shared/live'
import { reportError, useOverlay } from './store'

/** Live two-speaker transcript ("Them" = system audio, "You" = microphone). */
export function TranscriptPane() {
  const lines = useOverlay((s) => s.transcript)
  const listen = useOverlay((s) => s.listen)
  const bodyRef = useRef<HTMLDivElement>(null)
  const stickToBottom = useRef(true)

  useLayoutEffect(() => {
    const el = bodyRef.current
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight
  }, [lines])

  const onScroll = () => {
    const el = bodyRef.current
    if (el) stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 32
  }

  return (
    <section className="transcript glass" data-interactive>
      <header className="panel-header">
        <span className="panel-title">Transcript</span>
        <span className="panel-meta">{listen.state === 'on' ? 'listening' : 'paused'}</span>
      </header>
      {listen.warning && (
        <div className="error" style={{ margin: '8px 10px 0' }}>
          <TriangleAlert size={14} style={{ flexShrink: 0 }} />
          <span>{listen.warning}</span>
        </div>
      )}
      <div className="transcript-body" ref={bodyRef} onScroll={onScroll}>
        {lines.length === 0 && <p className="note">Waiting for speech… Play a video or join a call to see “Them”, and talk to see “You”.</p>}
        {lines.map((line) => (
          <div key={line.id} className={`line line-${line.source}${line.final ? '' : ' line-partial'}`}>
            <span className="speaker">{SPEAKER[line.source]}</span>
            {line.source === 'system' && line.final && (
              <button
                className="answer-this"
                title="Answer this"
                onClick={() => window.shadow.ask({ mode: 'live', text: line.text }).catch(reportError)}
              >
                <Sparkles size={11} /> Answer
              </button>
            )}
            <p>{line.text}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
