import { describe, expect, it } from 'vitest'
import { latestQuestionRun, looksLikeQuestion, questionScore, spokeHindi, type SpokenTurn } from '@shared/question'
import { similarity } from '@shared/text'

describe('looksLikeQuestion', () => {
  it.each([
    'How would you reverse a linked list?',
    'Can you write a function that checks if a string is a palindrome',
    'walk me through your approach for two sum',
    'what is the time complexity of merge sort',
    'Explain the difference between a process and a thread',
    'implement an LRU cache in Java',
    // Problem statements read aloud (real Deepgram output, mishearings included)
    'Okay. So the question is, given an indigent array, numbs of unique elements, return all possible subsets to the powerset.',
    "I'm given a binary error now, and the teacher gave and returned the maximum number of consecutive ones in the array.",
    'given a string s find the length of the longest substring without repeating characters',
    // Hindi and Hinglish
    'React Native kya hota hai aur ye kaise kaam karta hai',
    'linked list ko reverse kaise karte hain batao',
    'रिएक्ट नेटिव क्या है और इसका उपयोग कैसे होता है',
    'TypeScript aur JavaScript me difference samjhao'
  ])('flags "%s"', (text) => {
    expect(looksLikeQuestion(text)).toBe(true)
  })

  it.each(['okay', 'Great, makes sense.', 'mm-hmm', 'Can you hear me?', 'Could you share your screen?', 'thanks', 'I see.', 'haan theek hai', 'अच्छा', 'achha'])(
    'ignores "%s"',
    (text) => {
      expect(looksLikeQuestion(text)).toBe(false)
    }
  )

  it('scores an explicit question mark higher than an opener alone', () => {
    expect(questionScore('What is a heap?')).toBeGreaterThan(questionScore('so a heap is a tree'))
  })
})

describe('spokeHindi', () => {
  it.each([
    'Graph aur SQL ka difference kya hai?',
    'rest और graph QL का difference क्या है?',
    'REST aur GraphQL mein difference hota hai na',
    'linked list ko reverse karo',
    'आयुष, अपने बारे में बताओ',
    'React में hooks क्यों use करते हैं'
  ])('hears Hindi in "%s"', (text) => {
    expect(spokeHindi(text)).toBe(true)
  })

  it.each([
    'What is the difference between REST and GraphQL?',
    'Explain it to me and give an example',
    'how does Kafka handle a key',
    // Names come out of speech-to-text in Devanagari even when everything else is English.
    'आयुष, tell me about yourself',
    'So आयुष, how much exposure do you have in Node and Next.js?',
    'Hi आयुष ठाकुर, can you walk me through your project?',
    'Have you talked to कबीर about the design?'
  ])(
    'leaves English alone: "%s"',
    (text) => {
      expect(spokeHindi(text)).toBe(false)
    }
  )
})

describe('latestQuestionRun', () => {
  // The real transcript from a mock-interview test: one problem read out over five turns.
  const t0 = 1_000_000
  const turns: SpokenTurn[] = [
    { source: 'mic', text: 'Even an intelligent alien comes with a few unique elements, return all possible subsets the powerset.', endedAt: t0 },
    { source: 'system', text: 'Given an integer noun of unique elements, return the all possible subset, the power subset, the subset of four.', endedAt: t0 + 60_000 },
    { source: 'system', text: 'Unique elements return the all possible subset', endedAt: t0 + 64_000 },
    { source: 'system', text: 'the power subset, the subset of this one.', endedAt: t0 + 67_000 },
    { source: 'system', text: 'solution must be known contained the duplicate subject to return the solution in the annual order.', endedAt: t0 + 73_000 },
    { source: 'system', text: 'Okay.', endedAt: t0 + 75_000 }
  ]

  it('joins every fragment of the question, not just the last one', () => {
    const run = latestQuestionRun(turns)!
    expect(run.startsWith('Given an integer noun')).toBe(true)
    expect(run).toContain('the power subset, the subset of this one.')
    expect(run.endsWith('in the annual order.')).toBe(true)
    expect(run).not.toContain('Okay')
    expect(run).not.toContain('intelligent alien') // different speaker
  })

  it('stops at a long silence', () => {
    const spaced = turns.map((t, i) => (i === 4 ? { ...t, endedAt: t.endedAt + 60_000 } : t))
    expect(latestQuestionRun(spaced)).toBe(turns[4].text)
  })

  it('answers only the newest of several questions asked in a row', () => {
    const asked: SpokenTurn[] = [
      { source: 'system', text: 'What is a process?', endedAt: t0 },
      { source: 'system', text: 'And what is a thread', endedAt: t0 + 4000 },
      { source: 'system', text: 'how do they share memory', endedAt: t0 + 9000 }
    ]
    expect(latestQuestionRun(asked)).toBe('how do they share memory')
    expect(latestQuestionRun(asked.slice(0, 2))).toBe('And what is a thread')
  })

  it('stops after a finished question even when the next turn has no opener', () => {
    const asked: SpokenTurn[] = [
      { source: 'system', text: 'Tell me about your project?', endedAt: t0 },
      { source: 'system', text: 'the hardest bug in it, can you explain how you fixed it', endedAt: t0 + 5000 }
    ]
    expect(latestQuestionRun(asked)).toBe('the hardest bug in it, can you explain how you fixed it')
  })

  it('starts the run at "next question" and at a problem statement', () => {
    const asked: SpokenTurn[] = [
      { source: 'system', text: 'explain closures in JavaScript', endedAt: t0 },
      { source: 'system', text: 'Okay, next question. Given an array of integers', endedAt: t0 + 6000 },
      { source: 'system', text: 'return the indices of two numbers that add up to target', endedAt: t0 + 9000 }
    ]
    expect(latestQuestionRun(asked)).toBe(
      'Okay, next question. Given an array of integers return the indices of two numbers that add up to target'
    )
  })

  it('returns undefined when nothing sounds like a question', () => {
    expect(latestQuestionRun([{ source: 'system', text: 'okay great', endedAt: t0 }])).toBeUndefined()
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
