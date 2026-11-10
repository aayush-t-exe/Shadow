import { useCallback, useEffect, useState } from 'react'
import { Check, Copy, ExternalLink, FileUp, FolderOpen, Globe, KeyRound, LoaderCircle, Plus, RefreshCw, Trash2, X, Zap } from 'lucide-react'
import '../styles/base.css'
import '../overlay/overlay.css'
import './settings.css'
import { HOTKEYS } from '@shared/hotkeys'
import { PROVIDERS, SPEECH_PROVIDERS, providerInfo } from '@shared/providers'
import { IS_OWNER_EDITION } from '@shared/edition'
import { LANGUAGES } from '@shared/languages'
import {
  ANSWER_STYLES,
  PROFILE_MAX_CHARS,
  RESUME_MAX_CHARS,
  profileId,
  type InterviewProfile,
  type ProfileSummary
} from '@shared/profile'
import { CODE_LANGUAGES } from '@shared/types'
import type { CloudStatus, CodeLanguage, CreditResult, KeyStatus, KeyTestResult, KnowledgeSummary, ModelChoice, ProviderId, SecretId, Settings } from '@shared/types'
import { Keycaps } from '../components/Keycaps'
import { Logo } from '../components/Logo'


// ---------- model picker ----------

function ModelPicker({ value, onChange }: { value: ModelChoice; onChange: (next: ModelChoice) => void }) {
  const [modelId, setModelId] = useState(value.modelId)
  const [models, setModels] = useState<string[]>([])
  const [fetching, setFetching] = useState(false)
  const [fetchError, setFetchError] = useState('')
  const [testing, setTesting] = useState(false)
  const [test, setTest] = useState<KeyTestResult | null>(null)

  useEffect(() => setModelId(value.modelId), [value.modelId])
  useEffect(() => {
    setModels([])
    setFetchError('')
    setTest(null)
  }, [value.provider])

  const listId = `models-${value.provider}`

  const changeProvider = (provider: ProviderId) => onChange(providerInfo(provider).defaultModel)
  const commitModel = () => {
    if (modelId.trim() !== value.modelId) onChange({ ...value, modelId: modelId.trim() })
  }
  const fetchModels = async () => {
    setFetching(true)
    setFetchError('')
    const result = await window.shadow.listModels(value.provider)
    setFetching(false)
    if (result.ok) setModels(result.models)
    else setFetchError(result.message)
  }
  const runTest = async () => {
    setTesting(true)
    setTest(null)
    setTest(await window.shadow.testModel({ ...value, modelId: modelId.trim() }))
    setTesting(false)
  }

  return (
    <>
      <div className="row">
        <span className="label">Provider</span>
        <select className="select" value={value.provider} onChange={(e) => changeProvider(e.target.value as ProviderId)}>
          {PROVIDERS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <span className="hint" style={{ margin: 0 }}>
          {providerInfo(value.provider).note}
        </span>
      </div>
      <div className="row">
        <span className="label">Model</span>
        <input
          className="input mono"
          list={listId}
          value={modelId}
          placeholder="model id"
          onChange={(e) => setModelId(e.target.value)}
          onBlur={commitModel}
          onKeyDown={(e) => e.key === 'Enter' && commitModel()}
        />
        <datalist id={listId}>
          {models.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
        <button className="sbtn" onClick={fetchModels} disabled={fetching}>
          {fetching ? <LoaderCircle className="animate-spin" /> : <RefreshCw />} Fetch models
        </button>
      </div>
      {(fetchError || models.length > 0) && (
        <div className="row">
          <span className="label" />
          {fetchError ? (
            <span className="result-bad">Couldn't list models: {fetchError}</span>
          ) : (
            <span className="hint" style={{ margin: 0 }}>
              {models.length} models found. Click the model box to pick one.
            </span>
          )}
        </div>
      )}
      <div className="row">
        <span className="label" />
        <label className="check">
          <input type="checkbox" checked={value.vision} onChange={(e) => onChange({ ...value, vision: e.target.checked })} />
          This model can read images
        </label>
        <span style={{ flex: 1 }} />
        <button className="sbtn" onClick={runTest} disabled={testing || !modelId.trim()}>
          {testing ? <LoaderCircle className="animate-spin" /> : <Zap />} Test
        </button>
        {test &&
          (test.ok ? (
            <span className="result-ok">
              <Check size={12} style={{ display: 'inline' }} /> Works ({test.ms} ms)
            </span>
          ) : (
            <span className="result-bad">{test.message}</span>
          ))}
      </div>
    </>
  )
}

// ---------- API keys ----------

interface KeyRowProps {
  id: SecretId
  label: string
  hasKeyPage: boolean
  status: KeyStatus
  onStatus: (s: KeyStatus) => void
}

function KeyRow({ id: provider, label, hasKeyPage, status, onStatus }: KeyRowProps) {
  const saved = status[provider]
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')

  const save = async () => {
    setError('')
    try {
      onStatus(await window.shadow.setKey(provider, draft))
      setDraft('')
    } catch (err) {
      setError(err instanceof Error ? err.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, '') : String(err))
    }
  }

  return (
    <div className="key-row">
      <div>
        <span className="key-name">{label}</span>
        <span className={`key-status ${saved ? 'saved' : ''}`}>{saved ? `Saved ••••${saved.last4}` : 'Not set'}</span>
        {hasKeyPage && (
          <button className="link" onClick={() => window.shadow.openKeyPage(provider)}>
            Get a key <ExternalLink size={10} style={{ display: 'inline' }} />
          </button>
        )}
      </div>
      <div>
        <input
          className="input mono"
          style={{ width: '100%' }}
          type="password"
          autoComplete="off"
          value={draft}
          placeholder={saved ? 'Paste a new key to replace' : 'Paste API key'}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && draft && save()}
        />
        {error && <span className="result-bad">{error}</span>}
      </div>
      <div className="row" style={{ flexWrap: 'nowrap' }}>
        <button className="sbtn primary" disabled={!draft.trim()} onClick={save}>
          <KeyRound /> Save
        </button>
        {saved && (
          <button className="sbtn danger" title="Delete key" onClick={async () => onStatus(await window.shadow.deleteKey(provider))}>
            <X />
          </button>
        )}
      </div>
    </div>
  )
}

// ---------- page ----------

/** "Check credit": Deepgram balance and roughly how much listening it still buys. */
function CreditRow() {
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<CreditResult | null>(null)
  const check = async () => {
    setChecking(true)
    setResult(await window.shadow.checkSpeechCredit())
    setChecking(false)
  }
  return (
    <div className="row">
      <span className="label">Credit left</span>
      <button className="sbtn" onClick={check} disabled={checking}>
        {checking ? <LoaderCircle className="animate-spin" /> : <RefreshCw />} Check credit
      </button>
      {result &&
        (result.ok ? (
          <span className="result-ok">
            ${result.usd.toFixed(2)} left · about {Math.floor(result.hoursOfListening)} hours of listening
          </span>
        ) : (
          <span className="result-bad">{result.message}</span>
        ))}
    </div>
  )
}

/** Shadow Cloud: credits left, the Shadow ID (for support and buying credits), and a refresh. */
function CloudCard() {
  const [cloud, setCloud] = useState<CloudStatus | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    void window.shadow.refreshCloud().then(setCloud)
    return window.shadow.onCloudStatus(setCloud)
  }, [])

  const refresh = async () => {
    setRefreshing(true)
    setCloud(await window.shadow.refreshCloud())
    setRefreshing(false)
  }
  const copyId = async () => {
    if (!cloud?.deviceId) return
    try {
      await navigator.clipboard.writeText(cloud.deviceId)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard blocked: the ID is selectable text, so it can still be copied by hand.
    }
  }

  const balance = cloud?.balance
  return (
    <section className="card">
      <h2>Shadow Cloud</h2>
      <p className="hint">
        Answers come from Shadow Cloud, so you don't need an API key. Each answer uses {cloud?.creditsPerAnswer ?? 1} credit, and
        follow-up questions count as answers. Listening uses {cloud?.creditsPerListenMinute ?? 3} credits a minute.
      </p>
      <div className="row">
        <span className="label">Credits left</span>
        <span className="cloud-balance">{balance === null || balance === undefined ? '…' : balance}</span>
        <button className="sbtn" onClick={refresh} disabled={refreshing}>
          {refreshing ? <LoaderCircle className="animate-spin" /> : <RefreshCw />} Refresh
        </button>
        <button className="sbtn primary" onClick={() => window.shadow.openPaywall()}>
          <Zap /> Add credits
        </button>
      </div>
      <div className="row">
        <span className="label">Your Shadow ID</span>
        <span className="mono cloud-id">{cloud?.deviceId ?? '…'}</span>
        {cloud?.deviceId && (
          <button className="sbtn" onClick={copyId}>
            {copied ? <Check /> : <Copy />} {copied ? 'Copied' : 'Copy'}
          </button>
        )}
      </div>
      {cloud?.error && (
        <div className="row">
          <span className="label" />
          <span className="result-bad">{cloud.error}</span>
        </div>
      )}
    </section>
  )
}

// ---------- interview prep ----------

const errorText = (err: unknown) =>
  err instanceof Error ? err.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, '') : String(err)

/** Character count that warns once the text is past what answers will use. */
function CharCount({ length, max }: { length: number; max: number }) {
  return (
    <span className={length > max ? 'result-bad' : 'hint'} style={{ margin: 0 }}>
      {length.toLocaleString()} / {max.toLocaleString()} characters{length > max ? ' (the rest is cut off)' : ''}
    </span>
  )
}

function ResumeEditor() {
  const [saved, setSaved] = useState('')
  const [draft, setDraft] = useState('')
  const [importing, setImporting] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    void window.shadow.getResume().then((text) => {
      setSaved(text)
      setDraft(text)
    })
  }, [])

  const commit = async () => {
    if (draft === saved) return
    await window.shadow.saveResume(draft)
    setSaved(draft)
  }
  const importFile = async () => {
    setImporting(true)
    setMessage(null)
    const result = await window.shadow.importResume()
    setImporting(false)
    if (!result) return
    if (result.ok) {
      setSaved(result.text)
      setDraft(result.text)
      setMessage({ ok: true, text: 'Imported. Check the text below and fix anything the PDF mangled.' })
    } else {
      setMessage({ ok: false, text: result.message })
    }
  }

  return (
    <>
      <div className="row">
        <span className="label">Resume</span>
        <button className="sbtn" onClick={importFile} disabled={importing}>
          {importing ? <LoaderCircle className="animate-spin" /> : <FileUp />} Import PDF or text
        </button>
        <CharCount length={draft.length} max={RESUME_MAX_CHARS} />
      </div>
      {message && (
        <div className="row">
          <span className="label" />
          <span className={message.ok ? 'result-ok' : 'result-bad'}>{message.text}</span>
        </div>
      )}
      <textarea
        className="textarea"
        rows={8}
        value={draft}
        placeholder="Import your resume, or paste it here. Answers to “tell me about yourself” and “tell me about a project” will use it."
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
      />
    </>
  )
}

/** Read-only view of %APPDATA%\Shadow\knowledge; the notes are edited as files. */
function ProjectNotes() {
  const [summary, setSummary] = useState<KnowledgeSummary | null>(null)

  useEffect(() => {
    const load = () => void window.shadow.getKnowledgeSummary().then(setSummary)
    load()
    window.addEventListener('focus', load)
    return () => window.removeEventListener('focus', load)
  }, [])

  const count = summary?.projects.length ?? 0
  return (
    <>
      <h3 className="subhead">Your projects</h3>
      <div className="row">
        <span className="label">Notes</span>
        <span className="hint" title={summary?.projects.join(', ')}>
          {summary === null
            ? 'Loading…'
            : count === 0 && !summary.hasAbout
              ? 'None yet. Add an about-me.md and one file per project to the folder.'
              : `${count} project${count === 1 ? '' : 's'}${summary.hasAbout ? ' + about me' : ''}: ${summary.projects.join(', ')}`}
        </span>
        <button className="sbtn" title="Open the folder with your project notes" onClick={() => window.shadow.openKnowledgeFolder()}>
          <FolderOpen /> Folder
        </button>
      </div>
    </>
  )
}

function ProfileEditor({ id, onChanged }: { id: string; onChanged: () => void }) {
  const [saved, setSaved] = useState<InterviewProfile | null>(null)
  const [draft, setDraft] = useState<InterviewProfile | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    void window.shadow.getProfile(id).then((p) => {
      setSaved(p)
      setDraft(p)
    })
  }, [id])

  if (!draft || !saved) return null
  const commit = async () => {
    if (draft.company === saved.company && draft.role === saved.role && draft.body === saved.body) return
    try {
      setError('')
      await window.shadow.saveProfile(draft)
      setSaved(draft)
      onChanged()
    } catch (err) {
      setError(errorText(err))
    }
  }
  const remove = async () => {
    if (!window.confirm(`Delete the brief for ${saved.company}?`)) return
    await window.shadow.deleteProfile(id) // also clears it as the active brief
    onChanged()
  }

  return (
    <>
      <div className="row">
        <span className="label">Name and role</span>
        <input className="input" value={draft.company} onChange={(e) => setDraft({ ...draft, company: e.target.value })} onBlur={commit} />
        <input
          className="input"
          value={draft.role}
          placeholder="Role, e.g. SDE Intern"
          onChange={(e) => setDraft({ ...draft, role: e.target.value })}
          onBlur={commit}
        />
        <button className="sbtn danger" title="Delete this brief" onClick={remove}>
          <Trash2 />
        </button>
      </div>
      <div className="row">
        <span className="label" />
        <CharCount length={draft.body.length} max={PROFILE_MAX_CHARS} />
        {error && <span className="result-bad">{error}</span>}
      </div>
      <textarea
        className="textarea"
        rows={12}
        value={draft.body}
        placeholder="What the company does, the job description, the interview rounds, your notes…"
        onChange={(e) => setDraft({ ...draft, body: e.target.value })}
        onBlur={commit}
      />
    </>
  )
}

function InterviewPrep({ activeProfile, onActivate }: { activeProfile: string | null; onActivate: (id: string | null) => Promise<void> }) {
  const [profiles, setProfiles] = useState<ProfileSummary[]>([])
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [researching, setResearching] = useState(false)
  const [error, setError] = useState('')

  // Briefs can arrive from outside Shadow (e.g. the /company-brief skill), so re-read the folder on focus.
  const refresh = useCallback(() => void window.shadow.listProfiles().then(setProfiles), [])
  useEffect(() => {
    refresh()
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [refresh])

  const confirmReplace = (id: string) =>
    !profiles.some((p) => p.id === id) || window.confirm(`There's already a brief for ${company.trim()}. Replace it?`)

  const activate = async (id: string) => {
    setCompany('')
    setRole('')
    refresh()
    await onActivate(id)
  }
  const createBlank = async () => {
    const id = profileId(company, role)
    if (!confirmReplace(id)) return
    try {
      setError('')
      await window.shadow.saveProfile({ id, company: company.trim(), role: role.trim(), body: '' })
      await activate(id)
    } catch (err) {
      setError(errorText(err))
    }
  }
  const research = async () => {
    if (!confirmReplace(profileId(company, role))) return
    setResearching(true)
    setError('')
    const result = await window.shadow.researchCompany(company.trim(), role.trim())
    setResearching(false)
    if (result.ok) await activate(result.id)
    else setError(result.message)
  }

  return (
    <section className="card">
      <h2>Interview prep</h2>
      <p className="hint">
        Spoken and typed answers use your resume, your project notes and the company you pick, so “tell me about yourself” or
        “what's your experience with Next.js” get answers about you. Each answer only gets the notes for the projects it's
        about, so it stays fast. Screenshot solutions don't use them. All of it is saved as files in Shadow's data folder.
      </p>

      <ResumeEditor />
      <ProjectNotes />

      <h3 className="subhead">Company</h3>
      <div className="row">
        <span className="label">Use brief</span>
        <select className="select" value={activeProfile ?? ''} onChange={(e) => void onActivate(e.target.value || null)}>
          <option value="">None</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.role ? `${p.company} · ${p.role}` : p.company}
            </option>
          ))}
        </select>
        <button className="sbtn" title="Open the folder with the brief files" onClick={() => window.shadow.openProfilesFolder()}>
          <FolderOpen /> Folder
        </button>
      </div>

      <div className="row">
        <span className="label">New brief</span>
        <input className="input" value={company} placeholder="Company, e.g. Razorpay" onChange={(e) => setCompany(e.target.value)} />
        <input className="input" value={role} placeholder="Role (optional)" onChange={(e) => setRole(e.target.value)} />
      </div>
      <div className="row">
        <span className="label" />
        <button className="sbtn primary" disabled={!company.trim() || researching} onClick={research}>
          {researching ? <LoaderCircle className="animate-spin" /> : <Globe />} {researching ? 'Researching…' : 'Research with Gemini'}
        </button>
        <button className="sbtn" disabled={!company.trim() || researching} onClick={createBlank}>
          <Plus /> Blank
        </button>
        {error && <span className="result-bad">{error}</span>}
      </div>
      <p className="hint" style={{ marginTop: 8 }}>
        Research uses Gemini with Google Search (your free Gemini key) and takes about half a minute. You can also paste a job
        description into a blank brief, or drop any markdown file into the folder.
      </p>

      {activeProfile && profiles.some((p) => p.id === activeProfile) && (
        <ProfileEditor key={activeProfile} id={activeProfile} onChanged={refresh} />
      )}
    </section>
  )
}

export function SettingsApp() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [keys, setKeys] = useState<KeyStatus>({})

  useEffect(() => {
    void window.shadow.getSettings().then(setSettings)
    void window.shadow.getKeyStatus().then(setKeys)
    return window.shadow.onSettingsChanged(setSettings)
  }, [])

  if (!settings) return null
  const save = async (patch: Partial<Settings>) => setSettings(await window.shadow.setSettings(patch))
  const ownKeys = settings.source === 'keys'

  return (
    <div className="settings-page">
      <h1>
        <Logo size={26} /> Shadow Settings
      </h1>
      <p className="lede">
        {ownKeys
          ? "Changes save automatically. API keys are encrypted with Windows' built-in protection and never leave this computer except to call the provider."
          : 'Changes save automatically.'}
      </p>

      {IS_OWNER_EDITION && (
        <section className="card">
          <h2>Answer with</h2>
          <p className="hint">Only your own build has this switch. The public installer always uses Shadow Cloud.</p>
          <div className="row">
            <span className="label">Source</span>
            <span className="segmented">
              {(
                [
                  ['cloud', 'Shadow Cloud'],
                  ['keys', 'My own API keys']
                ] as const
              ).map(([value, text]) => (
                <button key={value} aria-pressed={settings.source === value} onClick={() => save({ source: value })}>
                  {text}
                </button>
              ))}
            </span>
          </div>
        </section>
      )}

      {!ownKeys && <CloudCard />}

      {ownKeys && (
        <>
          <section className="card">
            <h2>Answer model</h2>
            <p className="hint">Writes the solutions. Gemini's free tier is the recommended start.</p>
            <ModelPicker value={settings.answerModel} onChange={(answerModel) => save({ answerModel })} />
          </section>

          <section className="card">
            <h2>Backup model</h2>
            <p className="hint">
              Free tiers are sometimes slow or busy. If the answer model hasn't started replying within 5 seconds, Shadow asks this
              model too and shows whichever answers first. It also decides which spoken sentences are questions, which keeps your
              answer model's free quota for answers. Groq's free tier is very fast and a good choice.
            </p>
            <div className="row">
              <span className="label">Use a backup</span>
              <label className="check">
                <input
                  type="checkbox"
                  checked={!!settings.backupModel}
                  onChange={(e) => save({ backupModel: e.target.checked ? providerInfo('groq').defaultModel : null })}
                />
                Race a second model when the first one is slow
              </label>
            </div>
            {settings.backupModel && <ModelPicker value={settings.backupModel} onChange={(backupModel) => save({ backupModel })} />}
          </section>

          {!settings.answerModel.vision && (
            <section className="card">
              <h2>Screenshot reader</h2>
              <p className="hint">Your answer model can't see images, so this vision model first turns screenshots into text.</p>
              <ModelPicker value={settings.visionModel} onChange={(visionModel) => save({ visionModel })} />
            </section>
          )}

          <section className="card">
            <h2>API keys</h2>
            <p className="hint">You only need a key for the providers you actually use.</p>
            {PROVIDERS.filter((p) => p.needsKey).map((p) => (
              <KeyRow key={p.id} id={p.id} label={p.label} hasKeyPage={!!p.keyUrl} status={keys} onStatus={setKeys} />
            ))}
            {SPEECH_PROVIDERS.map((p) => (
              <KeyRow key={p.id} id={p.id} label={p.label} hasKeyPage status={keys} onStatus={setKeys} />
            ))}
          </section>
        </>
      )}

      <section className="card">
        <h2>Live listening</h2>
        <p className="hint">
          Transcribes your microphone (“You”) and your PC's sound (“Them”) with Deepgram. Use headphones on calls so the other
          person's voice doesn't leak into your mic.
        </p>
        {ownKeys && keys.deepgram && <CreditRow />}
        <div className="row">
          <span className="label">Language</span>
          <span className="segmented">
            {(
              [
                ['en', 'English'],
                ['multi', 'English + Hindi']
              ] as const
            ).map(([value, text]) => (
              <button key={value} aria-pressed={settings.sttLanguage === value} onClick={() => save({ sttLanguage: value })}>
                {text}
              </button>
            ))}
          </span>
        </div>
        <div className="row">
          <span className="label">Auto-answer</span>
          <label className="check">
            <input type="checkbox" checked={settings.autoAnswer} onChange={(e) => save({ autoAnswer: e.target.checked })} />
            Answer automatically when a question is asked
          </label>
        </div>
        <div className="row">
          <span className="label">Answer questions from</span>
          <span className="segmented">
            {(
              [
                ['anyone', 'Anyone, including me'],
                ['them', 'Only “Them”']
              ] as const
            ).map(([value, text]) => (
              <button key={value} aria-pressed={settings.answerFrom === value} onClick={() => save({ answerFrom: value })}>
                {text}
              </button>
            ))}
          </span>
        </div>
        <p className="hint" style={{ marginTop: 8 }}>
          “Anyone” suits studying alone, e.g. reading a problem aloud. In a call, “Only Them” stops your own questions from
          triggering answers. Either way, <b>Ctrl+Shift+Enter</b> answers the latest question right away.
        </p>
      </section>

      <section className="card">
        <h2>Answers</h2>
        <p className="hint">
          Shadow answers in any programming language. It always uses the language you ask for or the one the problem's starter
          code is in; your preferred language is only used when neither says.
        </p>
        <div className="row">
          <span className="label">Preferred language</span>
          <select className="select" value={settings.language} onChange={(e) => save({ language: e.target.value as CodeLanguage })}>
            {CODE_LANGUAGES.map((language) => (
              <option key={language} value={language}>
                {LANGUAGES[language].label}
              </option>
            ))}
          </select>
        </div>
        <div className="row">
          <span className="label">Style</span>
          <span className="segmented">
            {ANSWER_STYLES.map((s) => (
              <button key={s.id} title={s.hint} aria-pressed={settings.answerStyle === s.id} onClick={() => save({ answerStyle: s.id })}>
                {s.label}
              </button>
            ))}
          </span>
        </div>
        <p className="hint" style={{ marginTop: 8 }}>
          {ANSWER_STYLES.find((s) => s.id === settings.answerStyle)?.hint}. Shapes spoken and typed answers; for screenshot
          solutions it only changes the length. Asking “in one line” or “tell me about a time…” picks the matching style for
          that answer.
        </p>
      </section>

      <InterviewPrep activeProfile={settings.activeProfile} onActivate={(activeProfile) => save({ activeProfile })} />

      {ownKeys && (
        <section className="card">
          <h2>Local and custom servers</h2>
          <UrlRow label="Ollama URL" value={settings.ollamaBaseURL} onSave={(ollamaBaseURL) => save({ ollamaBaseURL })} />
          <UrlRow
            label="Custom base URL"
            value={settings.customBaseURL}
            placeholder="https://host/v1"
            onSave={(customBaseURL) => save({ customBaseURL })}
          />
        </section>
      )}

      <section className="card">
        <h2>Hotkeys</h2>
        <p className="hint">These work in any app, even when Shadow isn't focused.</p>
        <table className="hotkeys">
          <tbody>
            {HOTKEYS.map((h) => (
              <tr key={h.action}>
                <td>{h.label}</td>
                <td>
                  <Keycaps accelerator={h.accelerator} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}

function UrlRow({ label, value, placeholder, onSave }: { label: string; value: string; placeholder?: string; onSave: (v: string) => Promise<void> }) {
  const [draft, setDraft] = useState(value)
  const [error, setError] = useState('')
  useEffect(() => setDraft(value), [value])
  const commit = async () => {
    if (draft.trim() === value) return
    try {
      setError('')
      await onSave(draft.trim())
    } catch {
      setError('Not a valid URL')
    }
  }
  return (
    <div className="row">
      <span className="label">{label}</span>
      <input className="input mono" value={draft} placeholder={placeholder} onChange={(e) => setDraft(e.target.value)} onBlur={commit} />
      {error && <span className="result-bad">{error}</span>}
    </div>
  )
}

