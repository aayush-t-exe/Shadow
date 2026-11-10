// Fake Gemini, Groq and Deepgram for testing Shadow Cloud with no real keys and no money.
// They answer like the real APIs (same paths, same streaming format, same usage numbers).

import { createServer } from 'node:http'

export const MOCK_KEYS = { gemini: 'test-gemini', groq: 'test-groq', deepgram: 'test-deepgram' }

const sse = (res, events) => {
  res.writeHead(200, { 'content-type': 'text/event-stream' })
  for (const e of events) res.write(typeof e === 'string' ? `data: ${e}\n\n` : `data: ${JSON.stringify(e)}\r\n\r\n`)
  res.end()
}

/** Starts the fake providers. `seen` collects every request (url + headers) for assertions. */
export async function startMockProviders(port, seen = []) {
  const server = createServer((req, res) => {
    let body = ''
    req.on('data', (c) => (body += c))
    req.on('end', () => {
      seen.push({ url: req.url, headers: req.headers })
      if (req.url.startsWith('/v1beta/models/') && req.url.includes(':streamGenerateContent')) {
        if (req.headers['x-goog-api-key'] !== MOCK_KEYS.gemini) return res.writeHead(401).end()
        return sse(res, [
          { candidates: [{ content: { role: 'model', parts: [{ text: '## Approach\nThis answer came from the ' }] } }] },
          {
            candidates: [{ content: { role: 'model', parts: [{ text: 'fake Gemini through Shadow Cloud.' }] }, finishReason: 'STOP' }],
            usageMetadata: { promptTokenCount: 2000, candidatesTokenCount: 1200, thoughtsTokenCount: 300, totalTokenCount: 3500 }
          }
        ])
      }
      if (req.url.startsWith('/v1beta/models/') && req.url.includes(':generateContent')) {
        if (req.headers['x-goog-api-key'] !== MOCK_KEYS.gemini) return res.writeHead(401).end()
        res.writeHead(200, { 'content-type': 'application/json' })
        return res.end(
          JSON.stringify({
            candidates: [
              { content: { role: 'model', parts: [{ text: '{"needsAnswer":true,"question":"What is a heap?"}' }] }, finishReason: 'STOP' }
            ],
            usageMetadata: { promptTokenCount: 300, candidatesTokenCount: 20 }
          })
        )
      }
      if (req.url === '/openai/v1/chat/completions') {
        if (req.headers.authorization !== `Bearer ${MOCK_KEYS.groq}`) return res.writeHead(401).end()
        const base = { id: 'x', object: 'chat.completion.chunk', created: 1, model: JSON.parse(body).model }
        return sse(res, [
          { ...base, choices: [{ index: 0, delta: { role: 'assistant', content: 'Hello from Groq' }, finish_reason: null }] },
          { ...base, choices: [{ index: 0, delta: {}, finish_reason: 'stop' }], x_groq: { usage: { prompt_tokens: 900, completion_tokens: 400 } } },
          '[DONE]'
        ])
      }
      if (req.url === '/v1/auth/grant') {
        if (req.headers.authorization !== `Token ${MOCK_KEYS.deepgram}`) return res.writeHead(401).end()
        res.writeHead(200, { 'content-type': 'application/json' })
        return res.end(JSON.stringify({ access_token: 'temporary-deepgram-token', expires_in: 60 }))
      }
      res.writeHead(404).end()
    })
  })
  await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve))
  return server
}

/** The wrangler --var settings that point Shadow Cloud at the fake providers. */
export function mockVars(port, adminSecret) {
  const base = `http://127.0.0.1:${port}`
  return {
    GEMINI_BASE: base,
    GROQ_BASE: base,
    DEEPGRAM_BASE: base,
    GEMINI_API_KEY: MOCK_KEYS.gemini,
    GROQ_API_KEY: MOCK_KEYS.groq,
    DEEPGRAM_API_KEY: MOCK_KEYS.deepgram,
    ADMIN_SECRET: adminSecret,
    CHECKOUT_MODE: 'test'
  }
}
