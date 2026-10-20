// Screenshot studio: renders Shadow's real overlay components in fixed states over
// made-up backdrops, for README images. Driven by scripts/showcase/capture.mjs.
import './mock'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import '../styles/base.css'
import '../overlay/overlay.css'
import './showcase.css'
import { Logo } from '../components/Logo'
import { CommandPill } from '../overlay/CommandPill'
import { ResponsePanel } from '../overlay/ResponsePanel'
import { ScreenshotStrip } from '../overlay/ScreenshotStrip'
import { TranscriptPane } from '../overlay/TranscriptPane'
import { Toast } from '../overlay/Toast'
import { Welcome } from '../overlay/Welcome'
import { useOverlay, type Turn } from '../overlay/store'
import { SettingsApp } from '../settings/SettingsApp'
import { demoSettings } from './mock'
import { SOLVE_ANSWER, hindiTranscript, hindiTurn, liveTranscript, liveTurn, solveTurn } from './scenes'

declare global {
  interface Window {
    __frameCount?: number
    /** Puts the demo GIF into frame i; returns how long that frame should stay on screen (ms). */
    __setFrame?: (i: number) => Promise<number>
  }
}

// A small grey screenshot thumbnail for the queue strip (a 16:9 SVG, no real screen).
const THUMB =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="112"><rect width="200" height="112" fill="#16161d"/><rect x="8" y="10" width="80" height="8" rx="2" fill="#f2f2f6" opacity=".8"/><rect x="8" y="26" width="84" height="4" rx="2" fill="#888"/><rect x="8" y="34" width="70" height="4" rx="2" fill="#888"/><rect x="8" y="42" width="78" height="4" rx="2" fill="#888"/><rect x="108" y="10" width="84" height="94" rx="3" fill="#121218"/><rect x="114" y="18" width="50" height="4" rx="2" fill="#c792ea"/><rect x="120" y="28" width="60" height="4" rx="2" fill="#82aaff"/><rect x="120" y="38" width="44" height="4" rx="2" fill="#aaa"/></svg>`
  )

// ---------------- backdrops ----------------

function PracticeBackdrop() {
  const code = [
    ['kw', 'class '],
    ['ty', 'Solution'],
    ['', ':'],
    ['', '\n    '],
    ['kw', 'def '],
    ['fn', 'lengthOfLongestSubstring'],
    ['', '(self, s: '],
    ['ty', 'str'],
    ['', ') -> '],
    ['ty', 'int'],
    ['', ':\n        '],
    ['', '']
  ]
  const lines = code
    .map(([cls, text]) => (cls ? `<span class="${cls}">${text}</span>` : text))
    .join('')
    .split('\n')
    .concat(Array(13).fill('')) // empty lines so the editor looks like a real file
  return (
    <>
      <div className="wallpaper" />
      <div className="appwin">
        <div className="appwin-bar">
          <span className="dots">
            <i />
            <i />
            <i />
          </span>
          <b>Practice</b> · String problems
        </div>
        <div className="practice">
          <div className="problem">
            <h1>Longest Substring Without Repeats</h1>
            <span className="tag">Medium</span>
            <span className="tag topic">Sliding window</span>
            <span className="tag topic">Hash map</span>
            <p>
              Given a string <code>s</code>, find the length of the longest substring that contains no repeated characters.
            </p>
            <p>
              <b>Example 1</b>
            </p>
            <pre>{'Input:  s = "abcabcbb"\nOutput: 3   ("abc")'}</pre>
            <p>
              <b>Example 2</b>
            </p>
            <pre>{'Input:  s = "pwwkew"\nOutput: 3   ("wke")'}</pre>
            <p>
              <b>Constraints:</b> 0 ≤ s.length ≤ 5 × 10⁴
            </p>
          </div>
          <div className="editor">
            <div className="editor-tabs">
              <b>solution.py</b>
              <span>Python 3</span>
            </div>
            <code>
              {lines.map((l, i) => (
                <div key={i}>
                  <span className="ln">{i + 1}</span>
                  <span dangerouslySetInnerHTML={{ __html: l }} />
                </div>
              ))}
            </code>
          </div>
        </div>
      </div>
    </>
  )
}

function CallBackdrop({ mentor, initials }: { mentor: string; initials: string }) {
  return (
    <>
      <div className="wallpaper" />
      <div className="appwin">
        <div className="appwin-bar">
          <span className="dots">
            <i />
            <i />
            <i />
          </span>
          <b>Study session</b> · DSA revision · 34:12
        </div>
        <div className="call">
          <div className="tile speaking">
            <div className="avatar" style={{ background: 'linear-gradient(135deg,#f472b6,#8b5cf6)' }}>
              {initials}
            </div>
            <span className="name">{mentor}</span>
          </div>
          <div className="tile">
            <div className="avatar" style={{ background: 'linear-gradient(135deg,#22d3ee,#6366f1)' }}>
              A
            </div>
            <span className="name">You</span>
          </div>
        </div>
        <div className="call-bar">
          <i />
          <i />
          <i />
          <i className="end" />
        </div>
      </div>
    </>
  )
}

function OverlayLayer() {
  const panelOpen = useOverlay((s) => s.panelOpen)
  const showTranscript = useOverlay((s) => s.transcript.length > 0)
  return (
    <div className="overlay-layer">
      <main className="stage">
        <CommandPill />
        <Toast />
        <Welcome />
        <ScreenshotStrip />
        <div className="workspace">
          {showTranscript && <TranscriptPane />}
          {panelOpen && <ResponsePanel />}
        </div>
      </main>
    </div>
  )
}

// ---------------- scenes ----------------

type SceneId = 'hero' | 'listen' | 'hindi' | 'welcome' | 'settings' | 'social' | 'demo'

const W = 1440
const H = 900

function setOverlay(patch: Partial<ReturnType<typeof useOverlay.getState>>) {
  useOverlay.setState({
    settings: demoSettings,
    keys: { gemini: { last4: 'xQ2k' }, deepgram: { last4: 'a91c' } },
    listen: { state: 'off', startedAt: null, warning: null },
    levels: { mic: 0, system: 0 },
    transcript: [],
    turns: [],
    screenshots: [],
    panelOpen: false,
    toast: null,
    ...patch
  })
}

const live = { state: 'on' as const, startedAt: Date.now() - 222_000, warning: null }

function Scene({ id }: { id: SceneId }) {
  const size = id === 'social' ? { width: 1280, height: 640 } : { width: W, height: H }
  switch (id) {
    case 'hero':
    case 'welcome':
    case 'demo':
      return (
        <div className="scene" style={size}>
          <PracticeBackdrop />
          <OverlayLayer />
        </div>
      )
    case 'listen':
      return (
        <div className="scene" style={size}>
          <CallBackdrop mentor="Priya · Mentor" initials="P" />
          <OverlayLayer />
        </div>
      )
    case 'hindi':
      return (
        <div className="scene" style={size}>
          <CallBackdrop mentor="Rohan · Senior" initials="R" />
          <OverlayLayer />
        </div>
      )
    case 'settings':
      return (
        <div className="scene" style={size}>
          <div className="wallpaper" />
          <div className="settings-frame">
            <div className="appwin-bar">
              <span className="dots">
                <i />
                <i />
                <i />
              </span>
              <b>Shadow Settings</b>
            </div>
            <div className="settings-scroll">
              <SettingsApp />
            </div>
          </div>
        </div>
      )
    case 'social':
      return (
        <div className="scene social" style={size}>
          <div className="wallpaper" />
          <div className="social-copy">
            <div className="brand">
              <Logo size={64} /> Shadow
            </div>
            <p>One hotkey from stuck to understood.</p>
            <div className="chips">
              <span>Free &amp; open source</span>
              <span>Python · Java</span>
            </div>
          </div>
          <div className="social-shot">
            <PracticeBackdrop />
            <OverlayLayer />
          </div>
        </div>
      )
  }
}

function prepare(id: SceneId) {
  switch (id) {
    case 'hero':
    case 'social':
      setOverlay({ turns: [solveTurn], panelOpen: true })
      break
    case 'listen':
      setOverlay({ listen: live, levels: { mic: 0.15, system: 0.7 }, transcript: liveTranscript, turns: [liveTurn], panelOpen: true })
      break
    case 'hindi':
      setOverlay({ listen: live, levels: { mic: 0.1, system: 0.55 }, transcript: hindiTranscript, turns: [hindiTurn], panelOpen: true })
      break
    case 'welcome':
      setOverlay({ keys: {} })
      break
    case 'settings':
    case 'demo':
      setOverlay({})
      break
  }
}

/** Scrolls the answer so a given section heading sits at the top of the panel. */
function scrollAnswerTo(heading: string) {
  const body = document.querySelector<HTMLElement>('.panel-body')
  const h2 = [...document.querySelectorAll('.panel-body h2')].find((h) => h.textContent?.trim() === heading)
  if (body && h2) body.scrollTop += h2.getBoundingClientRect().top - body.getBoundingClientRect().top - 6
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const nextPaint = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))

// ---------------- demo GIF timeline ----------------

const DEMO_ANSWER = SOLVE_ANSWER.split('## Edge Cases')[0].trim()
const STREAM_STEPS = 26

function demoTurn(answer: string, streaming: boolean, status: string | null): Turn {
  return { ...solveTurn, id: 'demo', answer, streaming, status, firstTokenMs: streaming ? null : 820, totalMs: streaming ? null : 3400 }
}

/** Frame plan: idle → screenshot flash → queued shot → thinking → streaming → finished. */
function demoFrame(i: number): { delay: number; flash?: boolean } {
  if (i === 0) {
    setOverlay({})
    return { delay: 1200 }
  }
  if (i === 1) {
    setOverlay({ screenshots: [{ id: 's1', thumb: THUMB }] })
    return { delay: 120, flash: true }
  }
  if (i === 2) {
    setOverlay({ screenshots: [{ id: 's1', thumb: THUMB }] })
    return { delay: 1000 }
  }
  if (i === 3) {
    setOverlay({ turns: [demoTurn('', true, 'Reading screen…')], panelOpen: true })
    return { delay: 900 }
  }
  const step = i - 3
  if (step <= STREAM_STEPS) {
    const cut = Math.round((DEMO_ANSWER.length * step) / STREAM_STEPS)
    setOverlay({ turns: [demoTurn(DEMO_ANSWER.slice(0, cut), step < STREAM_STEPS, null)], panelOpen: true })
    return { delay: 110 }
  }
  setOverlay({ turns: [demoTurn(DEMO_ANSWER, false, null)], panelOpen: true })
  return { delay: 3500 }
}

// ---------------- boot ----------------

const sceneId = (new URLSearchParams(location.search).get('scene') ?? 'hero') as SceneId
document.body.classList.add('showcase')
prepare(sceneId)

const root = createRoot(document.getElementById('root')!)
let flash = false
const render = () =>
  root.render(
    <>
      <Scene id={sceneId} />
      {flash && <div className="flash" />}
    </>
  )
flushSync(render)

if (sceneId === 'demo') {
  window.__frameCount = 3 + STREAM_STEPS + 2
  window.__setFrame = async (i) => {
    const { delay, flash: f } = demoFrame(i)
    flash = !!f
    flushSync(render)
    // give Shiki a moment to colour newly streamed code
    await sleep(140)
    await nextPaint()
    return delay
  }
}

void (async () => {
  await document.fonts.ready
  await sleep(1800) // Shiki loads its grammar and theme asynchronously
  if (sceneId === 'hero' || sceneId === 'social') scrollAnswerTo('Approach')
  await nextPaint()
  document.title = 'ready'
})()
