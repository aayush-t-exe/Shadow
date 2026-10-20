/**
 * Returns the body of the last fenced code block in a markdown string, or null.
 * Works mid-stream too: an unterminated final fence counts as a block.
 */
export function lastCodeBlock(markdown: string): string | null {
  // indent, fence, info string, body (lazy), then the matching closing fence or end of input
  const fence = /^([ \t]*)(```|~~~)[^\n]*\n([\s\S]*?)(?:^\1\2[ \t]*$|$(?![\s\S]))/gm
  let last: string | null = null
  for (const match of markdown.matchAll(fence)) last = match[3]
  return last === null ? null : last.replace(/\n$/, '')
}
