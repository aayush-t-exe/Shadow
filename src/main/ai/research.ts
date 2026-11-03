import { generateText } from 'ai'
import { createGoogle } from '@ai-sdk/google'
import type { ModelChoice, ResearchResult } from '@shared/types'
import { providerInfo } from '@shared/providers'
import { profileId } from '@shared/profile'
import { getSettings } from '../settings'
import { getApiKey } from '../secrets'
import { saveProfile } from '../profiles'
import { speedOptions } from './providers'
import { toUserError } from './errors'

// "Research company": one Gemini call with Google Search grounding writes a short brief
// and saves it as an interview profile. Gemini is used whatever the answer model is,
// because its search tool needs no extra key and the free tier covers it.
// The sections match the /company-brief Claude Code skill, so both kinds of brief look alike.

export function researchPrompt(company: string, role: string): string {
  return `Research the company "${company}"${role ? ` for a candidate interviewing for the role "${role}"` : ''}. Search the web: the company's own site and engineering blog, recent news, job postings, and interview experiences shared on GeeksforGeeks, LeetCode Discuss, Glassdoor and similar sites. If several companies share the name, pick the one hiring software engineers in India and say which one in About.

Write a brief the candidate can glance at during the interview. Markdown, exactly these sections, no preamble, at most 450 words in total:

## About
2–3 sentences: what the company does, main products, size or stage, and one recent piece of news with its month and year.

## Tech stack
One line of languages, frameworks and infrastructure, from the engineering blog or job postings.

## Interview process
The usual rounds for this role, one bullet each (online assessment, DSA, system design, HR…), with what each round focuses on.

## Commonly asked
4–6 bullets of questions or topics candidates report being asked.

## Why this company
3 talking points the candidate can use when asked "why us", tied to things the company actually does.

## Questions to ask them
3 thoughtful questions the candidate can ask the interviewer.

RULES
- Use only facts from your searches. If something isn't found, write "Not found" in that section rather than guessing.
- Plain, spoken English. No marketing words.`
}

export async function researchCompany(company: string, role: string): Promise<ResearchResult> {
  const settings = getSettings()
  const choice: ModelChoice =
    settings.answerModel.provider === 'gemini' && settings.answerModel.modelId ? settings.answerModel : providerInfo('gemini').defaultModel
  const apiKey = await getApiKey('gemini')
  if (!apiKey) {
    return { ok: false, message: "Company research uses Gemini's Google Search. Add a free Gemini key under API keys first." }
  }
  try {
    const google = createGoogle({ apiKey })
    const { text } = await generateText({
      model: google(choice.modelId),
      tools: { google_search: google.tools.googleSearch({}) },
      prompt: researchPrompt(company, role),
      maxOutputTokens: 4096,
      maxRetries: 1,
      timeout: { totalMs: 120_000 },
      providerOptions: speedOptions(choice, 'solve')
    })
    if (!text.trim()) return { ok: false, message: 'Gemini returned an empty brief. Try again in a minute.' }
    const id = profileId(company, role)
    await saveProfile({ id, company, role, body: text.trim() })
    return { ok: true, id }
  } catch (err) {
    return { ok: false, message: toUserError(err, choice).message }
  }
}
