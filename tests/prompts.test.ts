import { describe, expect, it } from 'vitest'
import { debugPrompt, followupPrompt, solvePrompt, solveUserText } from '../src/main/ai/prompts'
import { keycaps } from '@shared/hotkeys'

describe('prompts', () => {
  it('builds a Python solve prompt with Python rules and fence tag', () => {
    const p = solvePrompt({ language: 'python', verbosity: 'concise' })
    expect(p).toContain('Solve it in Python 3')
    expect(p).toContain('```python')
    expect(p).toContain('PYTHON RULES')
    expect(p).not.toContain('JAVA RULES')
    expect(p).toContain('at most 3 bullets')
  })

  it('builds a Java solve prompt with Java rules', () => {
    const p = solvePrompt({ language: 'java', verbosity: 'detailed' })
    expect(p).toContain('Solve it in Java 17')
    expect(p).toContain('```java')
    expect(p).toContain('JAVA RULES')
    expect(p).toContain('## Alternative')
  })

  it('keeps the section order the UI relies on', () => {
    const p = solvePrompt({ language: 'python', verbosity: 'concise' })
    const order = ['## Problem', '## Approach', '## Code', '## Complexity', '## Edge Cases', '## Dry Run'].map((h) => p.indexOf(h))
    expect(order.every((i) => i >= 0)).toBe(true)
    expect([...order].sort((a, b) => a - b)).toEqual(order)
  })

  it('marks fixed lines with the right comment syntax in debug mode', () => {
    expect(debugPrompt({ language: 'python', verbosity: 'concise' })).toContain('# FIX')
    expect(debugPrompt({ language: 'java', verbosity: 'concise' })).toContain('// FIX')
  })

  it('uses a general prompt for a first question and a follow-up prompt afterwards', () => {
    expect(followupPrompt({ language: 'java', verbosity: 'concise' }, false)).toContain('programming tutor')
    expect(followupPrompt({ language: 'java', verbosity: 'concise' }, true)).toContain('Continue helping')
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
