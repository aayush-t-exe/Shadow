import { describe, expect, it } from 'vitest'
import { lastCodeBlock } from '@shared/markdown'

describe('lastCodeBlock', () => {
  it('returns null when there is no code', () => {
    expect(lastCodeBlock('## Approach\nUse a hash map.')).toBeNull()
  })

  it('returns the body of a single block without the fence or info string', () => {
    const md = 'Intro\n\n```python\nclass Solution:\n    pass\n```\n\nAfter'
    expect(lastCodeBlock(md)).toBe('class Solution:\n    pass')
  })

  it('picks the last of several blocks', () => {
    const md = '```python\nbrute()\n```\ntext\n```java\nclass Solution {}\n```'
    expect(lastCodeBlock(md)).toBe('class Solution {}')
  })

  it('handles an unterminated block mid-stream', () => {
    const md = '## Code\n```python\ndef f(x):\n    return x'
    expect(lastCodeBlock(md)).toBe('def f(x):\n    return x')
  })

  it('does not end a block at a fence-like line inside a string of a different fence', () => {
    const md = '~~~python\ns = "```"\nprint(s)\n~~~'
    expect(lastCodeBlock(md)).toBe('s = "```"\nprint(s)')
  })

  it('handles indented fences inside list items', () => {
    const md = '- step\n  ```java\n  int x = 1;\n  ```\n'
    expect(lastCodeBlock(md)).toBe('  int x = 1;')
  })
})
