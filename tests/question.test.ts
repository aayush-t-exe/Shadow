import { describe, expect, it } from 'vitest'
import { looksLikeQuestion, questionScore } from '@shared/question'
import { similarity } from '@shared/text'

describe('looksLikeQuestion', () => {
  it.each([
    'How would you reverse a linked list?',
    'Can you write a function that checks if a string is a palindrome',
    'walk me through your approach for two sum',
    'what is the time complexity of merge sort',
    'Explain the difference between a process and a thread',
    'implement an LRU cache in Java'
  ])('flags "%s"', (text) => {
    expect(looksLikeQuestion(text)).toBe(true)
  })

  it.each(['okay', 'Great, makes sense.', 'mm-hmm', 'Can you hear me?', 'Could you share your screen?', 'thanks', 'I see.'])(
    'ignores "%s"',
    (text) => {
      expect(looksLikeQuestion(text)).toBe(false)
    }
  )

  it('scores an explicit question mark higher than an opener alone', () => {
    expect(questionScore('What is a heap?')).toBeGreaterThan(questionScore('so a heap is a tree'))
  })
})

describe('similarity', () => {
  it('is 1 for the same words regardless of case and punctuation', () => {
    expect(similarity('Reverse the linked list.', 'reverse THE linked list')).toBe(1)
  })

  it('is high for an echo with a missed word and low for different sentences', () => {
    expect(similarity('how would you reverse a linked list', 'how would you reverse linked list')).toBeGreaterThan(0.8)
    expect(similarity('how would you reverse a linked list', 'I would use three pointers')).toBeLessThan(0.2)
  })

  it('is 0 when either side is empty', () => {
    expect(similarity('', 'anything')).toBe(0)
  })
})
