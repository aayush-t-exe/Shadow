// Sample content for README screenshots. Written for Shadow; no real people or products.
import type { TranscriptLine } from '@shared/live'
import type { Turn } from '../overlay/store'

export const SOLVE_ANSWER = `## Problem
Given a string \`s\`, return the length of the longest substring with no repeated characters. \`s\` can be up to 5 × 10^4 characters.

## Approach
- **Sliding window** plus a map of where each character was last seen.
- Grow the window with \`right\`; when a character repeats inside it, jump \`left\` just past the earlier copy.
- Every index enters and leaves the window once, so a single pass is enough.

## Code
\`\`\`python
class Solution:
    def lengthOfLongestSubstring(self, s: str) -> int:
        last = {}
        left = best = 0
        for right, ch in enumerate(s):
            if last.get(ch, -1) >= left:
                left = last[ch] + 1  # jump past the repeat
            last[ch] = right
            best = max(best, right - left + 1)
        return best
\`\`\`

## Complexity
- **Time:** O(n), each character is visited once.
- **Space:** O(k), where k is the size of the alphabet.

## Edge Cases
- Empty string returns 0.
- All characters equal, e.g. \`"bbbb"\`, returns 1.
- A repeat sitting before \`left\` must not move the window backwards.

## Dry Run
1. \`s = "abcabcbb"\`: the window grows to \`"abc"\`, best = 3.
2. The second \`a\` moves \`left\` to 1, window \`"bca"\`, best stays 3.
3. The same pattern repeats, so the answer is **3** ✓
`

export const LIVE_ANSWER = `**In short:** A process is a running program with its own memory. A thread is a smaller unit of work inside a process, and all threads of one process share that memory. So threads are cheaper to start and switch between, but they need locks so they don't overwrite each other's data.

**Example:** A browser runs each tab as its own process, so one crashed tab doesn't take the others down, while each tab uses several threads for rendering and networking.

**If asked more:**
- Processes talk through IPC; threads just share variables.
- One crashing thread can bring down the whole process.
`

export const HINGLISH_ANSWER = `**In short:** React Native ek framework hai jisse aap JavaScript aur React likh ke real Android aur iOS apps bana sakte ho. Ek hi code dono platforms pe chalta hai, aur screen pe asli native components dikhte hain, isliye app smooth lagta hai.

**Example:** Aap \`<View>\` aur \`<Text>\` likhte ho, aur phone pe web page nahi, native view aur text render hota hai.

**If asked more:**
- Meta ne banaya hai.
- Flutter iska sabse bada alternative hai.
`

const base = {
  provider: 'gemini' as const,
  modelId: 'gemini-3.5-flash-lite',
  status: null,
  aborted: false,
  error: null
}

export const solveTurn: Turn = {
  ...base,
  id: 'solve',
  mode: 'solve',
  prompt: 'Solve this problem',
  screenshotCount: 1,
  answer: SOLVE_ANSWER,
  streaming: false,
  firstTokenMs: 820,
  totalMs: 3400
}

export const liveTurn: Turn = {
  ...base,
  id: 'live',
  mode: 'live',
  prompt: "🎙 What's the difference between a process and a thread?",
  screenshotCount: 0,
  answer: LIVE_ANSWER,
  streaming: false,
  firstTokenMs: 640,
  totalMs: 1900
}

export const hindiTurn: Turn = {
  ...base,
  id: 'hindi',
  mode: 'live',
  prompt: '🎙 React Native kya hota hai? Simple words me samjhao.',
  screenshotCount: 0,
  answer: HINGLISH_ANSWER,
  streaming: false,
  firstTokenMs: 710,
  totalMs: 2100
}

const line = (id: string, source: 'mic' | 'system', text: string, at: number): TranscriptLine => ({ id, source, text, final: true, at })

export const liveTranscript: TranscriptLine[] = [
  line('1', 'system', "Nice work on the linked list one. Let's switch to some theory for a bit.", 182_000),
  line('2', 'mic', 'Sure, go ahead.', 186_000),
  line('3', 'system', "What's the difference between a process and a thread?", 191_000)
]

export const hindiTranscript: TranscriptLine[] = [
  line('1', 'system', 'Chalo ab thoda mobile development pe baat karte hain.', 95_000),
  line('2', 'mic', 'Haan, theek hai.', 98_000),
  line('3', 'system', 'React Native kya hota hai? Simple words me samjhao.', 103_000)
]
