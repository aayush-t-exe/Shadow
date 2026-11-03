// What Shadow knows about the user beyond the resume: an "about me" note with an honest
// map of every skill, and one short card per project. They are markdown files in
// %APPDATA%\Shadow\knowledge, written once (by hand or by an outside tool) and read
// fresh for every answer.
//
//   ---
//   name: Zen-Z
//   aliases: zenz, startup, campus app, payments
//   stack: React Native, Expo, Next.js, Supabase
//   featured: true
//   when: Jul 2026 – present
//   ---
//   One sentence on what it is.
//   ## Why I built it …
//
// Speed matters more than recall: every card in every answer would cost seconds of
// prompt on free tiers. So each answer gets the one-line index of all projects, and
// the full card only for the (at most two) projects the question is about, picked here
// by plain keyword matching. No extra model call, about a millisecond.

export interface ProjectCard {
  /** File name without ".md". */
  id: string
  name: string
  /** Lowercase words or phrases that should pull this card in: nicknames, domain words. */
  aliases: string[]
  stack: string[]
  /** Used for "tell me about yourself / a project" when no project is named. */
  featured: boolean
  /** "featured: 1" leads; lower comes first. "featured: true" counts as 1. */
  rank: number
  when: string
  /** First line of the body: what the project is, in one sentence. */
  summary: string
  body: string
}

export const CARD_ID = /^[a-z0-9][a-z0-9-]{0,79}$/
export const ABOUT_MAX_CHARS = 6000
export const CARD_MAX_CHARS = 3200
export const MAX_PICKED_CARDS = 2

const list = (s = '') =>
  s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)

export function parseCard(id: string, text: string): ProjectCard {
  const normalized = text.replace(/^﻿/, '').replace(/\r\n/g, '\n')
  const match = /^---\n([\s\S]*?)\n---\n?/.exec(normalized)
  const fields: Record<string, string> = {}
  if (match) {
    for (const line of match[1].split('\n')) {
      const kv = /^\s*([A-Za-z]+)\s*:\s*(.*?)\s*$/.exec(line)
      if (kv) fields[kv[1].toLowerCase()] = kv[2]
    }
  }
  const body = (match ? normalized.slice(match[0].length) : normalized).trim()
  const featured = (fields.featured ?? '').toLowerCase()
  const rank = /^(true|yes)$/.test(featured) ? 1 : /^[1-9]\d*$/.test(featured) ? Number(featured) : 0
  return {
    id,
    name: fields.name || id,
    aliases: list(fields.aliases).map((a) => a.toLowerCase()),
    stack: list(fields.stack),
    featured: rank > 0,
    rank: rank || 999, // not Infinity: Infinity - Infinity is NaN in a sort comparator
    when: fields.when ?? '',
    summary: body.split('\n').find((l) => l.trim() && !l.startsWith('#'))?.trim() ?? '',
    body: body.slice(0, CARD_MAX_CHARS)
  }
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * A whole-word pattern that forgives how speech-to-text and people write tech names:
 * "Next.js" matches "nextjs", "next js" and "Next"; "React Native" matches "react-native".
 */
export function termPattern(term: string): RegExp | null {
  const words = term.toLowerCase().match(/[a-z0-9+#]+/g)
  if (!words) return null
  const variants: string[][] = [[...words]]
  // "node.js" → also plain "node"; "next.js" → "next". Not for short names ("d3.js").
  const last = words.at(-1)
  if (words.length > 1 && last === 'js' && words.slice(0, -1).join('').length >= 4) variants.push(words.slice(0, -1))
  const alternatives = variants.map((w) => w.map(escape).join('[\\s.\\-_]*'))
  return new RegExp(`(?<![a-z0-9])(?:${alternatives.join('|')})(?![a-z0-9])`, 'i')
}

// "Tell me about yourself / a project / a challenge" names no project: use the flagship ones.
const PERSONAL =
  /\b(yourself|your (projects?|experience|work|startup|background|journey|internship)|projects?( you| that you|s you)?|have you (built|made|worked|used|done)|you('ve| have) (built|made|worked|used)|tell me about a time|challeng\w*|proud|hardest|difficult|mistake|fail\w*|conflict|team\w*|lead\w*|built|apne|aapne|tumne)\b/i

// In nearly every project, so they say nothing about which one a question is about.
const TOO_COMMON = new Set(['javascript', 'typescript', 'html', 'css', 'git', 'github', 'json'])

const key = (term: string) => term.toLowerCase().trim()

/**
 * Which of `terms` the query mentions. Longest match wins: "React Native" in the query
 * counts as React Native, not also as React.
 */
function mentioned(terms: string[], query: string): Set<string> {
  const found: { term: string; start: number; end: number }[] = []
  for (const term of new Set(terms.map(key))) {
    const pattern = termPattern(term)
    if (!pattern) continue
    for (const m of query.matchAll(new RegExp(pattern.source, 'gi'))) found.push({ term, start: m.index, end: m.index + m[0].length })
  }
  found.sort((a, b) => b.end - b.start - (a.end - a.start))
  const kept: typeof found = []
  for (const f of found) {
    const covered = kept.some((k) => k.start <= f.start && f.end <= k.end && k.end - k.start > f.end - f.start)
    if (!covered) kept.push(f)
  }
  return new Set(kept.map((k) => k.term))
}

const INTRO = /\b(tell me about yourself|introduce yourself|introduction|walk me through your (resume|background)|apne baare mein|about yourself)\b/i

/** The cards this question is about, best first, at most `max`. Pure and fast. */
export function pickCards(cards: ProjectCard[], query: string, max = MAX_PICKED_CARDS): ProjectCard[] {
  if (!query.trim() || cards.length === 0) return []
  const said = mentioned(
    cards.flatMap((c) => [c.name, ...c.aliases, ...c.stack]),
    query
  )
  const scored = cards.map((card) => {
    let score = 0
    for (const term of [card.name, ...card.aliases]) if (said.has(key(term))) score += 5
    for (const tech of card.stack) if (said.has(key(tech)) && !TOO_COMMON.has(key(tech))) score += 1
    return { card, score }
  })
  const hits = scored.filter((s) => s.score > 0)
  if (hits.length > 0) {
    return hits
      .sort((a, b) => b.score - a.score || a.card.rank - b.card.rank)
      .slice(0, max)
      .map((s) => s.card)
  }
  const featured = cards.filter((c) => c.featured).sort((a, b) => a.rank - b.rank)
  // An introduction tells one story well: only the lead project.
  if (INTRO.test(query)) return featured.slice(0, 1)
  return PERSONAL.test(query) ? featured.slice(0, max) : []
}

const INDEX_STACK_ITEMS = 6

/** One line per project, featured first: enough to name the right one, cheap enough for every answer. */
export function projectIndex(cards: ProjectCard[]): string {
  return [...cards]
    .sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name))
    .map((c) => {
      const stack = c.stack.slice(0, INDEX_STACK_ITEMS).join(', ')
      return `- ${c.name}${c.when ? ` (${c.when})` : ''}: ${c.summary}${stack ? ` Stack: ${stack}.` : ''}`
    })
    .join('\n')
}
