import { useEffect, useRef, useState } from 'react'
import { Check, ExternalLink, Lock } from 'lucide-react'
import type { PaywallInfo, PaywallPack, PaywallReason } from '@shared/types'
import { useOverlay } from './store'

// Shadow Cloud's paywall (design "K"): what your credits already got you, three glass orbs
// to pick a pack (each saying what it buys in answers and in Listen minutes), then one button.
// Paying happens in the browser; this card waits, then the orb lights up when the money lands.

const rupees = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN')}`
const listenTime = (minutes: number) => (minutes >= 90 ? `≈ ${Math.round((minutes / 60) * 10) / 10} h` : `≈ ${minutes} min`)
const cleanError = (err: unknown) =>
  (err instanceof Error ? err.message : String(err)).replace(/^Error invoking remote method '[^']+': (Error: )?/, '')
const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const ORB_SIZES = [50, 76, 98]

const COPY: Record<PaywallReason, { title: string; sub: (info: PaywallInfo) => string }> = {
  answer: {
    title: 'Keep going with Shadow Cloud',
    sub: () => 'Your problem is saved and gets answered as soon as you top up.'
  },
  listen: {
    title: 'Listen needs credits',
    sub: (info) => `Listening uses ${info.creditsPerListenMinute} credits a minute. Top up and start again; the transcript so far stays.`
  },
  topup: {
    title: 'Add credits',
    sub: (info) => `You have ${info.balance} credit${info.balance === 1 ? '' : 's'} left. Credits don't expire.`
  }
}

/**
 * @param active only the newest paywall is interactive; older ones collapse to one line.
 */
export function Paywall({ reason, active, onDismiss }: { reason: PaywallReason; active: boolean; onDismiss?: () => void }) {
  const purchase = useOverlay((s) => s.purchase)
  const [info, setInfo] = useState<PaywallInfo | null>(null)
  const [loadError, setLoadError] = useState('')
  const [picked, setPicked] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [paid, setPaid] = useState<{ credits: number; resuming: boolean } | null>(null)
  // True once this paywall started the purchase in progress, so an older card never claims it.
  const mine = useRef(false)
  const rootRef = useRef<HTMLDivElement>(null)

  // The paywall is tall and loads its packs after it appears: bring the whole card (button
  // included) into view whenever it changes shape, unless it's an old, inactive one.
  const shape = paid ? 'paid' : mine.current ? purchase.state : info ? 'offer' : 'loading'
  useEffect(() => {
    if (!active && !paid) return
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    rootRef.current?.scrollIntoView({ block: 'end', behavior: reduce ? 'auto' : 'smooth' })
  }, [shape, active, paid])

  useEffect(() => {
    window.shadow.getPaywall().then(
      (next) => {
        setInfo(next)
        setPicked((p) => p ?? (next.packs.find((x) => x.default) ?? next.packs[0])?.id ?? null)
      },
      (err) => setLoadError(cleanError(err))
    )
  }, [])

  useEffect(() => {
    if (mine.current && purchase.state === 'paid' && !paid) setPaid({ credits: purchase.credits ?? 0, resuming: !!purchase.resuming })
    if (purchase.state === 'idle' || purchase.state === 'error') mine.current = mine.current && purchase.state === 'error'
  }, [purchase, paid])

  if (paid) return (
    <div ref={rootRef}>
      <PaidCard credits={paid.credits} resuming={paid.resuming} info={info} />
    </div>
  )

  const reopen = () => setDismissed(false)
  if (!active || dismissed) {
    return (
      <div className="pw-note">
        Out of credits.{' '}
        {active && (
          <button className="pw-link" onClick={reopen}>
            Add credits
          </button>
        )}
      </div>
    )
  }

  if (mine.current && (purchase.state === 'opening' || purchase.state === 'waiting')) {
    return (
      <div ref={rootRef}>
        <WaitingCard credits={purchase.credits} pricePaise={purchase.pricePaise} slow={!!purchase.slow} opening={purchase.state === 'opening'} />
      </div>
    )
  }

  if (!info) {
    return <div className="pw-note">{loadError || 'Loading packs…'}</div>
  }

  const packs = [...info.packs].sort((a, b) => a.credits - b.credits)
  const chosen = packs.find((p) => p.id === picked) ?? packs[0]
  const copy = COPY[reason]
  const buy = () => {
    if (!chosen) return
    mine.current = true
    window.shadow.buyPack(chosen.id).catch(() => {})
  }
  const dismiss = () => {
    setDismissed(true)
    onDismiss?.()
  }
  const purchaseError = mine.current && purchase.state === 'error' ? purchase.message : null

  return (
    <div className="pw" ref={rootRef}>
      <UsageCard info={info} />
      <h3 className="pw-title">{copy.title}</h3>
      <p className="pw-sub">{copy.sub(info)}</p>
      <div className="pw-orbs" role="radiogroup" aria-label="Credit packs">
        <div className="pw-glow" />
        {packs.map((pack, i) => (
          <OrbOption
            key={pack.id}
            pack={pack}
            size={ORB_SIZES[Math.min(i, ORB_SIZES.length - 1)]}
            perAnswer={info.creditsPerAnswer}
            on={pack.id === chosen?.id}
            onPick={() => setPicked(pack.id)}
          />
        ))}
      </div>
      {purchaseError && <p className="pw-error">{purchaseError}</p>}
      <button className="pw-cta" disabled={!info.canBuy || !chosen} onClick={buy}>
        {chosen ? `Add ${chosen.credits} credits · ${rupees(chosen.pricePaise)}` : 'Add credits'}
      </button>
      {!info.canBuy && <p className="pw-fine">Payments aren't switched on yet.</p>}
      <button className="pw-later" onClick={dismiss}>
        Not now
      </button>
      <div className="pw-secure">
        <Lock /> Paid securely through Razorpay with UPI or card. Pay once, nothing renews. Price includes GST.
      </div>
    </div>
  )
}

function UsageCard({ info }: { info: PaywallInfo }) {
  const { usage } = info
  if (usage.problems + usage.followups + usage.listenMinutes === 0) return null
  const max = Math.max(1, ...usage.days.map((d) => d.answers))
  const busiest = usage.days.reduce((best, d, i) => (d.answers > (usage.days[best]?.answers ?? 0) ? i : best), 0)
  // Lead with problems solved; someone who only typed questions gets "questions answered" instead of "0 problems".
  const big =
    usage.problems > 0
      ? { n: usage.problems, label: `problem${usage.problems === 1 ? '' : 's'} solved` }
      : { n: usage.followups, label: `question${usage.followups === 1 ? '' : 's'} answered` }
  return (
    <div className="pw-usage">
      <div>
        <div className="pw-kicker">{usage.purchased ? 'Your Shadow so far' : 'Your free credits, used well'}</div>
        <div className="pw-big">
          {big.n} <small>{big.label}</small>
        </div>
        <div className="pw-stats">
          {usage.problems > 0 && usage.followups > 0 && (
            <span>
              <b>{usage.followups}</b> follow-up{usage.followups === 1 ? '' : 's'}
            </span>
          )}
          {usage.listenMinutes > 0 && (
            <span>
              <b>{usage.listenMinutes} min</b> of Listen
            </span>
          )}
          {usage.avgFirstTokenMs !== null && (
            <span>
              <b>{(usage.avgFirstTokenMs / 1000).toFixed(1)} s</b> avg. first word
            </span>
          )}
        </div>
      </div>
      <div className="pw-bars" aria-hidden>
        {usage.days.map((d, i) => (
          <div key={d.day} className={`pw-bar ${d.answers > 0 && i === busiest ? 'hi' : ''}`}>
            <i style={{ height: `${Math.max(12, (d.answers / max) * 100)}%` }} />
            <span>{DAY_LETTERS[new Date(`${d.day}T00:00:00Z`).getUTCDay()]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function OrbOption({ pack, size, perAnswer, on, onPick }: { pack: PaywallPack; size: number; perAnswer: number; on: boolean; onPick: () => void }) {
  return (
    <button className={`pw-opt ${on ? 'on' : ''}`} role="radio" aria-checked={on} onClick={onPick}>
      <span className="pw-stage">
        <span className={`pw-orb ${on ? 'lit' : ''}`} style={{ width: size, height: size }} />
        {on && <span className="pw-ring" />}
      </span>
      <span className="pw-cred">{pack.credits} credits</span>
      <span className="pw-meta">≈ {Math.floor(pack.credits / perAnswer)} answers</span>
      <span className="pw-meta">or {listenTime(pack.listenMinutes)} of Listen</span>
      <span className="pw-price">{rupees(pack.pricePaise)}</span>
    </button>
  )
}

function WaitingCard({ credits, pricePaise, slow, opening }: { credits?: number; pricePaise?: number; slow: boolean; opening: boolean }) {
  const what = credits && pricePaise ? `${credits} credits for ${rupees(pricePaise)}. ` : ''
  return (
    <div className="pw pw-wait">
      <span className="pw-stage small">
        <span className="pw-glow small" />
        <span className="pw-orb lit" style={{ width: 86, height: 86 }} />
        <span className="pw-ring" />
      </span>
      <div className="pw-wait-text">
        <h3 className="pw-title left">{opening ? 'Opening checkout…' : 'Finish paying in your browser'}</h3>
        <p className="pw-sub left">
          {slow
            ? "We haven't seen a payment yet. If money left your account, it will show up here within a few minutes."
            : `${what}This card updates on its own once the payment goes through. UPI can take a minute.`}
        </p>
        <div className="pw-shimmer">
          <i />
        </div>
        <div className="pw-actions">
          <button className="pw-btn" disabled={opening} onClick={() => window.shadow.checkoutAction('check')}>
            <Check /> I've paid
          </button>
          <button className="pw-btn ghost" disabled={opening} onClick={() => window.shadow.checkoutAction('reopen')}>
            <ExternalLink /> Reopen checkout
          </button>
          <button className="pw-later inline" disabled={opening} onClick={() => window.shadow.checkoutAction('cancel')}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// The count-up runs alongside the CSS animation (paywall.css): 2.8 s after a 0.6 s delay.
const COUNT_DELAY_MS = 600
const COUNT_MS = 2800
const easeOut = (t: number) => 1 - Math.pow(1 - t, 4)

function PaidCard({ credits, resuming, info }: { credits: number; resuming: boolean; info: PaywallInfo | null }) {
  const [shown, setShown] = useState(0)
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(credits)
      return
    }
    let frame = 0
    const start = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, Math.max(0, now - start - COUNT_DELAY_MS) / COUNT_MS)
      setShown(Math.round(credits * easeOut(t)))
      if (t < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [credits])

  const perAnswer = info?.creditsPerAnswer ?? 1
  const perMinute = info?.creditsPerListenMinute ?? 3
  return (
    <div className="pw pw-paid">
      <div className="pw-paid-stage" aria-hidden>
        <div className="pw-halo" />
        <div className="pw-burst" />
        <div className="pw-paid-orb">
          <i className="off" />
          <i className="lit" />
        </div>
        <div className="pw-paid-ring" />
        <div className="pw-num">{shown}</div>
      </div>
      <div className="pw-badge pw-reveal d1">
        <Check /> Payment received
      </div>
      <h3 className="pw-title pw-reveal d2">{credits} credits added</h3>
      <p className="pw-sub pw-reveal d3">
        That's ≈ {Math.floor(credits / perAnswer)} answers or {listenTime(Math.floor(credits / perMinute))} of Listen.
        {resuming ? ' Answering your saved problem now.' : ''}
      </p>
    </div>
  )
}
