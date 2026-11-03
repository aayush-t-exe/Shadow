import type { AnswerStyle } from './types'

// Interview profiles are plain markdown files, one per company, so they can be
// written by hand, by Shadow's "Research company" button, or by any outside tool:
//
//   ---
//   company: Razorpay
//   role: SDE Intern
//   ---
//   ## About
//   …

export interface InterviewProfile {
  /** File name without ".md"; also the value stored in settings.activeProfile. */
  id: string
  company: string
  role: string
  /** Everything after the front matter: the brief, a pasted job description, notes. */
  body: string
}

export type ProfileSummary = Pick<InterviewProfile, 'id' | 'company' | 'role'>

/** What live and follow-up answers get to know about the user and the interview. */
export interface InterviewContext {
  resume: string
  profile: InterviewProfile | null
}

// Prompt budget: a resume is ~1k tokens, a brief ~600. Anything far longer is
// usually a pasted web page, which costs speed and free-tier quota on every answer.
export const RESUME_MAX_CHARS = 8000
export const PROFILE_MAX_CHARS = 6000

export const PROFILE_ID = /^[a-z0-9][a-z0-9-]{0,79}$/

export const ANSWER_STYLES: { id: AnswerStyle; label: string; hint: string }[] = [
  { id: 'standard', label: 'Standard', hint: 'Short spoken answer with an example' },
  { id: 'concise', label: 'Concise', hint: 'One or two sentences' },
  { id: 'bullets', label: 'Bullets', hint: 'Three to five short bullet points' },
  { id: 'star', label: 'STAR', hint: 'Situation, Task, Action, Result from your resume' },
  { id: 'detailed', label: 'Detailed', hint: 'Fuller answer with trade-offs' }
]

/** "Razorpay", "SDE Intern" → "razorpay-sde-intern" */
export function profileId(company: string, role = ''): string {
  const slug = `${company} ${role}`
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '')
  return slug || 'profile'
}

export function parseProfile(id: string, text: string): InterviewProfile {
  const normalized = text.replace(/^﻿/, '').replace(/\r\n/g, '\n')
  const match = /^---\n([\s\S]*?)\n---\n?/.exec(normalized)
  const fields: Record<string, string> = {}
  if (match) {
    for (const line of match[1].split('\n')) {
      const kv = /^\s*([A-Za-z]+)\s*:\s*(.*?)\s*$/.exec(line)
      if (kv) fields[kv[1].toLowerCase()] = kv[2].replace(/^["']|["']$/g, '')
    }
  }
  return {
    id,
    company: fields.company || id,
    role: fields.role ?? '',
    body: (match ? normalized.slice(match[0].length) : normalized).trim()
  }
}

export function serializeProfile({ company, role, body }: Omit<InterviewProfile, 'id'>): string {
  const clean = (s: string) => s.replace(/[\r\n]+/g, ' ').trim()
  return `---\ncompany: ${clean(company)}\nrole: ${clean(role)}\n---\n\n${body.trim()}\n`
}

/** Normalises extracted resume text: PDFs come out with ragged spacing and blank runs. */
export function cleanResumeText(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// How the question is worded beats the saved style: "in one line" wants one line
// whatever the setting, and "tell me about a time" always wants a story.
const STYLE_CUES: [AnswerStyle, RegExp][] = [
  ['star', /\b(tell me about a time|describe a (time|situation)|give (me )?an example of (a time|when)|walk me through a (time|situation))\b/i],
  ['concise', /\b(in (one|1|a single) (line|sentence|word)|one[- ]liner|briefly|in short|quickly tell|ek line mein)\b/i],
  ['bullets', /\b(in (bullet points|bullets|points)|list (out )?the|key points)\b/i],
  ['detailed', /\b(in detail|elaborate|explain (it )?(in depth|deeply|thoroughly)|deep dive|detail mein)\b/i]
]

export function styleFromQuestion(question: string): AnswerStyle | null {
  return STYLE_CUES.find(([, cue]) => cue.test(question))?.[0] ?? null
}
