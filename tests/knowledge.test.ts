import { describe, expect, it } from 'vitest'
import { parseCard, pickCards, projectIndex, termPattern } from '../src/shared/knowledge'
import { contextBlock, livePrompt } from '../src/main/ai/prompts'

const card = (id: string, front: string, body = 'One line about it.\n\n## What I did\nStuff.') =>
  parseCard(id, `---\n${front}\n---\n${body}`)

const zenz = card(
  'zen-z',
  'name: Zen-Z\naliases: zenz, zen z, startup, payments\nstack: React Native, Expo, Next.js, Supabase, PostgreSQL\nfeatured: true\nwhen: Jul 2026 – present',
  'A campus app that puts strangers at one table.\n\n## What I did\nEverything.'
)
const shadow = card(
  'shadow',
  'name: Shadow\naliases: overlay, desktop app, transcription\nstack: Electron, React, TypeScript, Node.js, Deepgram\nfeatured: true\nwhen: Oct 2026'
)
const gallery = card('celebrare', 'name: Celebrare gallery\naliases: celebrare, gallery\nstack: React, Vite, Tailwind CSS\nfeatured: false')
const cards = [gallery, shadow, zenz]

describe('parseCard', () => {
  it('reads front matter, summary and trims the body', () => {
    expect(zenz.name).toBe('Zen-Z')
    expect(zenz.aliases).toContain('zen z')
    expect(zenz.stack).toEqual(['React Native', 'Expo', 'Next.js', 'Supabase', 'PostgreSQL'])
    expect(zenz.featured).toBe(true)
    expect(zenz.summary).toBe('A campus app that puts strangers at one table.')
    expect(gallery.featured).toBe(false)
  })

  it('works without front matter and with Windows line endings', () => {
    const c = parseCard('x', 'Just a note.\r\nMore.')
    expect(c.name).toBe('x')
    expect(c.summary).toBe('Just a note.')
  })
})

describe('termPattern', () => {
  it('forgives how tech names are written or transcribed', () => {
    const next = termPattern('Next.js')!
    for (const s of ['next.js', 'NextJS', 'next js', 'your Next experience']) expect(next.test(s)).toBe(true)
    expect(termPattern('Node.js')!.test('exposure to node')).toBe(true)
    expect(termPattern('React Native')!.test('react-native apps')).toBe(true)
  })

  it('matches whole words only', () => {
    expect(termPattern('React')!.test('reactive streams')).toBe(false)
    expect(termPattern('Expo')!.test('exposure')).toBe(false)
    expect(termPattern('Go')!.test('google')).toBe(false)
  })
})

describe('pickCards', () => {
  it('picks the projects that used the tech asked about', () => {
    const picked = pickCards(cards, "What's your exposure to Node and Next.js?").map((c) => c.name)
    expect(picked).toEqual(expect.arrayContaining(['Shadow', 'Zen-Z']))
    expect(picked).toHaveLength(2)
  })

  it('a project named outright beats a shared stack', () => {
    expect(pickCards(cards, 'Tell me about the Celebrare gallery, it used React')[0].name).toBe('Celebrare gallery')
  })

  it('falls back to featured projects for personal questions that name none', () => {
    expect(pickCards(cards, 'Tell me about yourself').map((c) => c.name).sort()).toEqual(['Shadow', 'Zen-Z'])
    expect(pickCards(cards, 'What was the hardest bug you fixed?')).toHaveLength(2)
  })

  it('adds nothing to plain technical questions, so they stay fast', () => {
    expect(pickCards(cards, 'What is a closure in JavaScript?')).toEqual([])
    expect(pickCards(cards, '')).toEqual([])
  })

  it('counts "React Native" as React Native only, not also as React', () => {
    const prelims = card('prelims', 'name: PrelimsDaily\nstack: React Native, React, Expo')
    expect(pickCards([prelims, shadow, zenz], 'Have you built anything with React Native?')[0].name).toBe('Zen-Z')
  })

  it("ignores languages every project uses, so a JS concept question pulls nothing", () => {
    const js = card('js', 'name: Gallery\nstack: React, JavaScript, HTML')
    expect(pickCards([js], 'What is a closure in JavaScript?')).toEqual([])
  })

  it('caps the number of cards', () => {
    expect(pickCards(cards, 'React React Native Node Next.js celebrare zenz shadow', 2)).toHaveLength(2)
  })
})

describe('knowledge in the prompt', () => {
  const context = {
    resume: 'AAYUSH THAKUR',
    profile: null,
    about: 'I am a third-year CS student.',
    projectIndex: projectIndex(cards),
    cards: [zenz]
  }

  it('lists every project in one line each, featured first', () => {
    const lines = projectIndex(cards).split('\n')
    expect(lines).toHaveLength(3)
    expect(lines[2]).toContain('Celebrare gallery')
    expect(lines[0]).toMatch(/Shadow|Zen-Z/)
  })

  it('fences the notes and puts the per-question cards last', () => {
    const block = contextBlock(context)
    expect(block).toContain('<about_me>')
    expect(block).toContain('<all_projects>')
    expect(block.trimEnd().endsWith('</project>')).toBe(true)
    expect(block.indexOf('<project name="Zen-Z">')).toBeGreaterThan(block.indexOf('USING THE CONTEXT'))
  })

  it('keeps everything before the cards identical between questions (prompt caching)', () => {
    const a = livePrompt({ language: 'python', style: 'standard', context: { ...context, cards: [zenz] } })
    const b = livePrompt({ language: 'python', style: 'standard', context: { ...context, cards: [shadow] } })
    const cut = a.indexOf('<project name=')
    expect(b.slice(0, cut)).toBe(a.slice(0, cut))
  })

  it('answers exposure questions honestly and keeps AI tools to one mention', () => {
    const block = contextBlock(context)
    expect(block).toContain("What's your exposure to")
    expect(block).toContain('Never stretch it')
    expect(block).toContain('Never name an AI tool more than once')
  })

  it('uses the notes for behavioral answers even without a resume', () => {
    expect(livePrompt({ language: 'python', style: 'standard', context: { ...context, resume: '' } })).toContain('real project or experience in the notes')
  })
})
