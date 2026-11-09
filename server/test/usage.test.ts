import { describe, expect, it } from 'vitest'
import { Tail, costMicroUsd, extractUsage } from '../src/usage'

describe('extractUsage', () => {
  it('reads Gemini SSE usage, counting thinking tokens as output', () => {
    const tail = [
      'data: {"candidates":[{"content":{"parts":[{"text":"hi"}]}}]}',
      '',
      'data: {"candidates":[{"content":{"parts":[{"text":"!"}]}}],"usageMetadata":{"promptTokenCount":1500,"candidatesTokenCount":900,"thoughtsTokenCount":300,"totalTokenCount":2700}}',
      ''
    ].join('\r\n')
    expect(extractUsage('gemini', tail)).toEqual({ input: 1500, output: 1200 })
  })

  it('reads a non-streaming Gemini body', () => {
    const body = JSON.stringify({ candidates: [], usageMetadata: { promptTokenCount: 40, candidatesTokenCount: 12 } })
    expect(extractUsage('gemini', body)).toEqual({ input: 40, output: 12 })
  })

  it('ignores a half line at the start of a tail', () => {
    const tail = 'ens":3}}\n\ndata: {"usageMetadata":{"promptTokenCount":5,"candidatesTokenCount":7}}\n'
    expect(extractUsage('gemini', tail)).toEqual({ input: 5, output: 7 })
  })

  it('reads Groq usage from x_groq or usage, and skips [DONE]', () => {
    const xgroq = 'data: {"choices":[],"x_groq":{"usage":{"prompt_tokens":100,"completion_tokens":50}}}\n\ndata: [DONE]\n'
    expect(extractUsage('groq', xgroq)).toEqual({ input: 100, output: 50 })
    const plain = 'data: {"choices":[],"usage":{"prompt_tokens":8,"completion_tokens":2}}\n\ndata: [DONE]\n'
    expect(extractUsage('groq', plain)).toEqual({ input: 8, output: 2 })
  })

  it('returns null when there is no usage', () => {
    expect(extractUsage('gemini', 'data: {"candidates":[]}\n')).toBeNull()
    expect(extractUsage('groq', '')).toBeNull()
  })
})

describe('costMicroUsd', () => {
  const prices = { 'gemini-3.5-flash-lite': [0.3, 2.5] as [number, number] }
  it('prices tokens per million', () => {
    // 2,000 in × $0.30/M + 1,500 out × $2.50/M = $0.0006 + $0.00375 = $0.00435
    expect(costMicroUsd('gemini-3.5-flash-lite', { input: 2000, output: 1500 }, prices)).toBe(4350)
  })
  it('charges unknown models at a high rate so they stand out', () => {
    expect(costMicroUsd('mystery', { input: 1_000_000, output: 0 }, prices)).toBe(1_000_000)
  })
})

describe('Tail', () => {
  it('keeps only the newest characters', () => {
    const t = new Tail(5)
    t.push('abc')
    t.push('defg')
    expect(t.toString()).toBe('cdefg')
  })
})
