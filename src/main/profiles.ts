import { app, dialog, shell } from 'electron'
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { extname, join } from 'node:path'
import type { ResumeImportResult } from '@shared/types'
import {
  PROFILE_ID,
  PROFILE_MAX_CHARS,
  RESUME_MAX_CHARS,
  cleanResumeText,
  parseProfile,
  serializeProfile,
  type InterviewContext,
  type InterviewProfile,
  type ProfileSummary
} from '@shared/profile'
import { getSettings, updateSettings } from './settings'

// The resume and the interview profiles are plain files in Shadow's data folder
// (%APPDATA%\Shadow), not in settings.json: they're long, the user may want to edit
// them in a text editor, and other tools can drop a company brief into profiles\.
// They are read fresh for every answer, so an edit made outside Shadow applies at once.

const dataDir = () => app.getPath('userData')
export const profilesDir = () => join(dataDir(), 'profiles')
const resumePath = () => join(dataDir(), 'resume.md')

function profilePath(id: string): string {
  // Ids come from the renderer and from file names; never let one escape the folder.
  if (!PROFILE_ID.test(id)) throw new Error('Invalid profile id')
  return join(profilesDir(), `${id}.md`)
}

async function readIfExists(path: string): Promise<string | null> {
  try {
    return await readFile(path, 'utf8')
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw err
  }
}

export async function listProfiles(): Promise<ProfileSummary[]> {
  let files: string[]
  try {
    files = await readdir(profilesDir())
  } catch {
    return []
  }
  const ids = files.filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3)).filter((id) => PROFILE_ID.test(id))
  const profiles = await Promise.all(ids.map((id) => readProfile(id)))
  return profiles
    .filter((p): p is InterviewProfile => p !== null)
    .map(({ id, company, role }) => ({ id, company, role }))
    .sort((a, b) => a.company.localeCompare(b.company))
}

export async function readProfile(id: string): Promise<InterviewProfile | null> {
  const text = await readIfExists(profilePath(id))
  return text === null ? null : parseProfile(id, text)
}

export async function saveProfile(profile: InterviewProfile): Promise<void> {
  await mkdir(profilesDir(), { recursive: true })
  await writeFile(profilePath(profile.id), serializeProfile(profile), 'utf8')
}

export async function deleteProfile(id: string): Promise<void> {
  await rm(profilePath(id), { force: true })
  if (getSettings().activeProfile === id) updateSettings({ activeProfile: null })
}

export function openProfilesFolder(): void {
  void mkdir(profilesDir(), { recursive: true }).then(() => shell.openPath(profilesDir()))
}

export async function getResume(): Promise<string> {
  return (await readIfExists(resumePath())) ?? ''
}

export async function saveResume(text: string): Promise<void> {
  await writeFile(resumePath(), text, 'utf8')
}

/** Asks for a PDF, Markdown or text file and saves its text as the resume. null = cancelled. */
export async function importResume(): Promise<ResumeImportResult> {
  const picked = await dialog.showOpenDialog({
    title: 'Import your resume',
    properties: ['openFile'],
    filters: [{ name: 'Resume', extensions: ['pdf', 'txt', 'md'] }]
  })
  const path = picked.filePaths[0]
  if (picked.canceled || !path) return null
  try {
    let text: string
    if (extname(path).toLowerCase() === '.pdf') {
      const { extractText, getDocumentProxy } = await import('unpdf')
      const pdf = await getDocumentProxy(new Uint8Array(await readFile(path)))
      text = (await extractText(pdf, { mergePages: true })).text
    } else {
      text = await readFile(path, 'utf8')
    }
    text = cleanResumeText(text)
    if (text.length < 40) {
      return { ok: false, message: "Couldn't find text in that file. If it's a scanned PDF, paste your resume as text instead." }
    }
    await saveResume(text)
    return { ok: true, text }
  } catch (err) {
    return { ok: false, message: `Couldn't read that file: ${err instanceof Error ? err.message : String(err)}` }
  }
}

/** The resume and the active company brief, trimmed to the prompt budget. */
export async function loadInterviewContext(): Promise<InterviewContext> {
  const { activeProfile } = getSettings()
  const [resume, profile] = await Promise.all([getResume(), activeProfile ? readProfile(activeProfile) : null])
  return {
    resume: resume.trim().slice(0, RESUME_MAX_CHARS),
    profile: profile && { ...profile, body: profile.body.slice(0, PROFILE_MAX_CHARS) }
  }
}
