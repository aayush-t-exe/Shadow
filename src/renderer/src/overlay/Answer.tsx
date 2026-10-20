import { memo } from 'react'
import { Streamdown } from 'streamdown'
import { code } from '@streamdown/code'
import 'streamdown/styles.css'

const plugins = { code }
// The overlay is always dark, so both slots of Shiki's light/dark pair get a dark theme.
const themes: ['github-dark', 'github-dark'] = ['github-dark', 'github-dark']
const controls = { code: { copy: true, download: false }, table: false, mermaid: false } as const

/** Renders streaming markdown. Streamdown repairs half-finished fences and bold text mid-stream. */
export const Answer = memo(function Answer({ text, streaming }: { text: string; streaming: boolean }) {
  return (
    <Streamdown
      className="answer"
      mode={streaming ? 'streaming' : 'static'}
      isAnimating={streaming}
      parseIncompleteMarkdown
      caret={streaming ? 'block' : undefined}
      plugins={plugins}
      shikiTheme={themes}
      controls={controls}
      lineNumbers={false}
      codeBlockMaxHeight={Infinity}
    >
      {text}
    </Streamdown>
  )
})
