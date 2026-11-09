import type { CodeLanguage } from './types'

/** How each preferred language is named in Settings and in prompts. */
export const LANGUAGES: Record<CodeLanguage, { label: string; prompt: string }> = {
  auto: { label: 'Match the problem', prompt: 'Python 3' },
  python: { label: 'Python', prompt: 'Python 3' },
  java: { label: 'Java', prompt: 'Java 17' },
  cpp: { label: 'C++', prompt: 'C++17' },
  c: { label: 'C', prompt: 'C (C11)' },
  javascript: { label: 'JavaScript', prompt: 'JavaScript (Node.js)' },
  typescript: { label: 'TypeScript', prompt: 'TypeScript' },
  csharp: { label: 'C#', prompt: 'C#' },
  go: { label: 'Go', prompt: 'Go' },
  kotlin: { label: 'Kotlin', prompt: 'Kotlin' },
  rust: { label: 'Rust', prompt: 'Rust' }
}
