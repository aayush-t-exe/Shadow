import { describe, expect, it } from 'vitest'
import { CONTINUE_CUT_OFF, ENGLISH_REPLY, TRIAGE_PROMPT, debugPrompt, followupPrompt, livePrompt, solvePrompt, solveUserText } from '../src/main/ai/prompts'
import { keycaps } from '@shared/hotkeys'

describe('prompts', () => {
  it('builds a Python solve prompt with Python rules and fence tag', () => {
    const p = solvePrompt({ language: 'python', style: 'standard' })
    expect(p).toContain('Solve it in Python 3')
    expect(p).toContain('```python')
    expect(p).toContain('PYTHON RULES')
    expect(p).not.toContain('JAVA RULES')
    expect(p).toContain('at most 3 bullets')
  })

  it('tells the model to copy the stub and to detect LeetCode Python 2', () => {
    const p = solvePrompt({ language: 'python', style: 'standard' })
    expect(p).toContain('Add type hints only if the stub has them')
    expect(p).toContain('it is Python 2')
  })

  it('builds a Java solve prompt with Java rules', () => {
    const p = solvePrompt({ language: 'java', style: 'detailed' })
    expect(p).toContain('Solve it in Java 17')
    expect(p).toContain('```java')
    expect(p).toContain('JAVA RULES')
    expect(p).toContain('## Alternative')
  })

  it('keeps the section order the UI relies on', () => {
    const p = solvePrompt({ language: 'python', style: 'standard' })
    const order = ['## Problem', '## Approach', '## Code', '## Complexity', '## Edge Cases', '## Dry Run'].map((h) => p.indexOf(h))
    expect(order.every((i) => i >= 0)).toBe(true)
    expect([...order].sort((a, b) => a - b)).toEqual(order)
  })

  it('marks fixed lines with the right comment syntax in debug mode', () => {
    expect(debugPrompt({ language: 'python', style: 'standard' })).toContain('# FIX')
    expect(debugPrompt({ language: 'java', style: 'standard' })).toContain('// FIX')
  })

  it('uses a general prompt for a first question and a follow-up prompt afterwards', () => {
    expect(followupPrompt({ language: 'java', style: 'standard' }, false)).toContain('programming tutor')
    expect(followupPrompt({ language: 'java', style: 'standard' }, true)).toContain('Continue helping')
  })

  it('forbids LaTeX math in every answer prompt', () => {
    const opts = { language: 'python', style: 'standard' } as const
    for (const p of [solvePrompt(opts), followupPrompt(opts, false), livePrompt(opts)]) {
      expect(p).toContain('Never use LaTeX')
    }
  })

  it('keeps live answers short, spoken and in the language of the question', () => {
    const p = livePrompt({ language: 'java', style: 'standard' })
    expect(p).toContain('**In short:**')
    expect(p).toContain('At most 120 words')
    // The language is decided in code and sent as the last line of the user message.
    expect(p).toContain('The LANGUAGE line at the end')
    expect(p).toContain('Never reply in Devanagari')
    expect(ENGLISH_REPLY).toContain('Write the whole answer in English')
    expect(CONTINUE_CUT_OFF).toContain('do not repeat anything')
    expect(p).toContain('Keep code, identifiers and technical terms')
    // The classifier rewrites the question, and used to translate Hinglish into English.
    expect(TRIAGE_PROMPT).toContain('Never translate it')
    expect(p).not.toContain('## Explanation')
  })

  it('asks the classifier to correct misheard terms', () => {
    expect(TRIAGE_PROMPT).toContain('correct misheard technical terms')
  })

  it('pluralises the screenshot count', () => {
    expect(solveUserText(1, 'python')).toContain('this screenshot')
    expect(solveUserText(3, 'java')).toContain('these 3 screenshots')
  })
})

describe('keycaps', () => {
  it('renders Windows key names', () => {
    expect(keycaps('CommandOrControl+Shift+Enter')).toEqual(['Ctrl', 'Shift', '↵'])
    expect(keycaps('CommandOrControl+Alt+Left')).toEqual(['Ctrl', 'Alt', '←'])
  })
})
