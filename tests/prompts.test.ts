import { describe, expect, it } from 'vitest'
import { TRIAGE_PROMPT, debugPrompt, followupPrompt, livePrompt, solvePrompt, solveUserText } from '../src/main/ai/prompts'
import { keycaps } from '@shared/hotkeys'

describe('prompts', () => {
  it('answers in any language: what the user asks for, then the problem, then the preference', () => {
    const p = solvePrompt({ language: 'auto', verbosity: 'concise' })
    const askFor = p.indexOf('A language the user asks for')
    const problem = p.indexOf('The language the problem fixes')
    const fallback = p.indexOf('Otherwise Python 3.')
    expect(askFor).toBeGreaterThan(0)
    expect(problem).toBeGreaterThan(askFor)
    expect(fallback).toBeGreaterThan(problem)
    expect(p).toContain('Any programming language is fine')
    expect(p).toContain('at most 3 bullets')
  })

  it('treats a preferred language as a fallback only', () => {
    const p = solvePrompt({ language: 'java', verbosity: 'detailed' })
    expect(p).toContain("Otherwise Java 17 (the user's preferred language)")
    expect(p).toContain("never switch away from the language the problem uses just because it isn't the preferred one")
    expect(p).not.toContain('Solve it in Java')
    expect(p).toContain('## Alternative')
  })

  it('includes rules for the common languages whatever the preference', () => {
    const p = solvePrompt({ language: 'java', verbosity: 'concise' })
    for (const block of ['IF WRITING PYTHON', 'IF WRITING JAVA', 'IF WRITING C++', 'ANY OTHER LANGUAGE']) expect(p).toContain(block)
  })

  it('tells the model to copy the stub and to detect LeetCode Python 2', () => {
    const p = solvePrompt({ language: 'auto', verbosity: 'concise' })
    expect(p).toContain('Add type hints only if the stub has them')
    expect(p).toContain('it is Python 2')
  })

  it('keeps the section order the UI relies on', () => {
    const p = solvePrompt({ language: 'python', verbosity: 'concise' })
    const order = ['## Problem', '## Approach', '## Code', '## Complexity', '## Edge Cases', '## Dry Run'].map((h) => p.indexOf(h))
    expect(order.every((i) => i >= 0)).toBe(true)
    expect([...order].sort((a, b) => a - b)).toEqual(order)
  })

  it('debugs in the language of the code being run, with that language’s FIX comment', () => {
    const p = debugPrompt({ language: 'python', verbosity: 'concise' })
    expect(p).toContain('in the same language as the code being run')
    expect(p).toContain('# FIX')
    expect(p).toContain('// FIX')
  })

  it('uses a general prompt for a first question and a follow-up prompt afterwards', () => {
    expect(followupPrompt({ language: 'java', verbosity: 'concise' }, false)).toContain('programming tutor')
    expect(followupPrompt({ language: 'java', verbosity: 'concise' }, false)).toContain('a JavaScript question gets JavaScript')
    expect(followupPrompt({ language: 'java', verbosity: 'concise' }, true)).toContain('Continue helping')
    expect(followupPrompt({ language: 'java', verbosity: 'concise' }, true)).toContain('same language as the code above')
  })

  it('forbids LaTeX math in every answer prompt', () => {
    const opts = { language: 'python', verbosity: 'concise' } as const
    for (const p of [solvePrompt(opts), followupPrompt(opts, false), livePrompt(opts)]) {
      expect(p).toContain('Never use LaTeX')
    }
  })

  it('keeps live answers short, spoken and in the language of the question', () => {
    const p = livePrompt({ language: 'java', verbosity: 'concise' })
    expect(p).toContain('**In short:**')
    expect(p).toContain('At most 120 words')
    expect(p).toContain('Hinglish')
    expect(p).toContain('Keep code, identifiers and technical terms')
    expect(p).toContain('the programming language the question names or the screen shows; otherwise Java 17')
    expect(p).not.toContain('## Explanation')
  })

  it('asks the classifier to correct misheard terms', () => {
    expect(TRIAGE_PROMPT).toContain('correct misheard technical terms')
  })

  it('pluralises the screenshot count and names no language', () => {
    expect(solveUserText(1)).toBe('Solve the problem in this screenshot.')
    expect(solveUserText(3)).toContain('these 3 screenshots')
  })
})

describe('keycaps', () => {
  it('renders Windows key names', () => {
    expect(keycaps('CommandOrControl+Shift+Enter')).toEqual(['Ctrl', 'Shift', '↵'])
    expect(keycaps('CommandOrControl+Alt+Left')).toEqual(['Ctrl', 'Alt', '←'])
  })
})
