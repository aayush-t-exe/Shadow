import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Check, ExternalLink, KeyRound, LoaderCircle, RefreshCw, X, Zap } from 'lucide-react'
import '../styles/base.css'
import '../overlay/overlay.css'
import './settings.css'
import { HOTKEYS } from '@shared/hotkeys'
import { PROVIDERS, SPEECH_PROVIDERS, providerInfo } from '@shared/providers'
import type { KeyStatus, KeyTestResult, ModelChoice, ProviderId, SecretId, Settings } from '@shared/types'
import { Keycaps } from '../components/Keycaps'
import { Logo } from '../components/Logo'

const api = window.shadow

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
    const result = await api.listModels(value.provider)
    setFetching(false)
    if (result.ok) setModels(result.models)
    else setFetchError(result.message)
  }
  const runTest = async () => {
    setTesting(true)
    setTest(null)
    setTest(await api.testModel({ ...value, modelId: modelId.trim() }))
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
      onStatus(await api.setKey(provider, draft))
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
          <button className="link" onClick={() => api.openKeyPage(provider)}>
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
          <button className="sbtn danger" title="Delete key" onClick={async () => onStatus(await api.deleteKey(provider))}>
            <X />
          </button>
        )}
      </div>
    </div>
  )
}

// ---------- page ----------

function SettingsApp() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [keys, setKeys] = useState<KeyStatus>({})

  useEffect(() => {
    void api.getSettings().then(setSettings)
    void api.getKeyStatus().then(setKeys)
    return api.onSettingsChanged(setSettings)
  }, [])

  if (!settings) return null
  const save = async (patch: Partial<Settings>) => setSettings(await api.setSettings(patch))

  return (
    <div className="settings-page">
      <h1>
        <Logo size={26} /> Shadow Settings
      </h1>
      <p className="lede">Changes save automatically. API keys are encrypted with Windows' built-in protection and never leave this computer except to call the provider.</p>

      <section className="card">
        <h2>Answer model</h2>
        <p className="hint">Writes the solutions. Gemini's free tier is the recommended start.</p>
        <ModelPicker value={settings.answerModel} onChange={(answerModel) => save({ answerModel })} />
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

      <section className="card">
        <h2>Live listening</h2>
        <p className="hint">
          Transcribes your microphone (“You”) and your PC's sound (“Them”) with Deepgram. Use headphones on calls so the other
          person's voice doesn't leak into your mic.
        </p>
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
            Answer automatically when “Them” finishes asking a question
          </label>
        </div>
      </section>

      <section className="card">
        <h2>Answers</h2>
        <div className="row">
          <span className="label">Language</span>
          <span className="segmented">
            {(['python', 'java'] as const).map((language) => (
              <button key={language} aria-pressed={settings.language === language} onClick={() => save({ language })}>
                {language === 'python' ? 'Python' : 'Java'}
              </button>
            ))}
          </span>
        </div>
        <div className="row">
          <span className="label">Detail</span>
          <span className="segmented">
            {(['concise', 'detailed'] as const).map((verbosity) => (
              <button key={verbosity} aria-pressed={settings.verbosity === verbosity} onClick={() => save({ verbosity })}>
                {verbosity === 'concise' ? 'Concise' : 'Detailed'}
              </button>
            ))}
          </span>
        </div>
      </section>

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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsApp />
  </StrictMode>
)
