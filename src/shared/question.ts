import { words } from './text'

// A free, instant first pass over each finished "Them" turn: does it look like a question
// or a request? Only turns that pass get sent to the (slower, metered) AI classifier.

const OPENER =
  /^(what|why|how|when|where|which|who|whose|can|could|would|will|should|do|does|did|is|are|was|were|have|has|tell me|walk me|explain|describe|implement|write|design|code|give me|show me|define|compare|find|solve|optimi[sz]e)\b/i

const ANYWHERE =
  /\b(tell me about|walk me through|explain|how would you|how do you|how can you|what is|what's|what are|difference between|time complexity|space complexity|big o|can you (write|implement|code|explain|tell|solve|optimi[sz]e)|write (a|an|the) (function|program|code|query|class|method)|implement (a|an|the))\b/i

/** A coding problem being read out: "the question is…", "given an array…", "return all…". */
const PROBLEM_STATEMENT =
  /\b(the (question|problem) is|given (an?|the|two|some) (\w+ ){0,3}(array|string|list|tree|graph|integer|number|matrix|grid|linked list|binary)|return (the|all|an?|true|whether)\b|find (the|all)\b|power ?set)\b/i

/** Hindi question/request words written in English letters (Hinglish). */
const HINGLISH =
  /\b(kya|kyu|kyun|kyon|kaise|kaisa|kab|kahan|kaun|kitna|kitne|batao|bataiye|batayiye|bataye|samjhao|samjhaiye|likho|likhiye|explain karo|kar ke dikhao)\b/i

/** The same in Devanagari. (\b doesn't work outside ASCII, so no word boundaries here.) */
const HINDI = /(क्या|क्यों|क्यूँ|कैसे|कब|कहाँ|कहां|कौन|कितन|बताओ|बताइए|बताइये|बताएं|समझाओ|समझाइए|लिखो|लिखिए)/

/** Hindi grammar words that hardly ever appear in English sentences. */
const HINDI_GLUE = /\b(hai|hain|aur|ka|ki|ke|ko|mein|hota|hoti|hote|karte|karta|karo|nahi|nahin|toh|matlab|wala|wali)\b/gi

/** Hindi grammar and question words in Devanagari, matched as whole words (names don't contain them). */
const HINDI_WORDS = new Set([
  'है', 'हैं', 'और', 'का', 'की', 'के', 'को', 'में', 'मैं', 'नहीं', 'तो', 'हो', 'था', 'थी', 'थे', 'भी', 'यह', 'ये', 'वो',
  'कर', 'करो', 'करते', 'करता', 'होता', 'होती', 'क्या', 'क्यों', 'क्यूँ', 'कैसे', 'कैसा', 'कब', 'कहाँ', 'कहां', 'कौन',
  'कितना', 'कितने', 'कितनी', 'बताओ', 'बताइए', 'बताइये', 'बताएं', 'समझाओ', 'समझाइए', 'लिखो', 'लिखिए'
])

/**
 * Did the speaker use Hindi (in either script)? Answers should then come back in Hinglish.
 * Speech-to-text writes Indian names in Devanagari even in English speech ("आयुष, tell me
 * about yourself"), so Devanagari letters alone don't count: it needs Hindi words, or a
 * sentence that is mostly Devanagari.
 */
export function spokeHindi(text: string): boolean {
  if (HINGLISH.test(text) || (text.match(HINDI_GLUE)?.length ?? 0) >= 2) return true
  const tokens = text.split(/[\s,.?!।|"'()\-:;]+/).filter(Boolean)
  const devanagari = tokens.filter((t) => /[ऀ-ॿ]/.test(t))
  if (devanagari.some((t) => HINDI_WORDS.has(t))) return true
  return devanagari.length >= 2 && devanagari.length * 2 >= tokens.length
}

/** Acknowledgements and filler that never need an answer (English and Hindi). */
const FILLER =
  /^(ok|okay|right|great|cool|sure|yes|yeah|yep|no|nope|alright|mm+|hmm+|uh+|um+|thanks|thank you|got it|makes sense|sounds good|perfect|nice|good|haan|han|achha|accha|acha|theek hai|thik hai|ji|haan ji|हाँ|हां|अच्छा|ठीक है|जी)[\s.!,।]*$/i

/** Call logistics, not content questions. */
const LOGISTICS = /\b(can you hear me|hear me okay|share (your|the) screen|am i audible|are you there|is my (audio|voice|mic)|you('re| are) on mute|unmute)\b/i

/** 0 = ignore; 1 = maybe; 2+ = very likely a question or request. */
export function questionScore(text: string): number {
  const trimmed = text.trim()
  if (words(trimmed).length < 3 || FILLER.test(trimmed) || LOGISTICS.test(trimmed)) return 0
  let score = 0
  if (trimmed.includes('?')) score += 2
  if (OPENER.test(trimmed)) score += 1
  if (ANYWHERE.test(trimmed)) score += 1
  if (PROBLEM_STATEMENT.test(trimmed)) score += 1
  if (HINGLISH.test(trimmed) || HINDI.test(trimmed)) score += 1
  return score
}

export const looksLikeQuestion = (text: string) => questionScore(text) >= 1

export interface SpokenTurn {
  source: 'mic' | 'system'
  text: string
  endedAt: number
}

// People read problems out in several breaths; Deepgram ends a turn at each pause.
const MAX_RUN_TURNS = 8
const MAX_RUN_GAP_MS = 20_000

/**
 * A turn that starts a fresh question ("And what's a thread?", "Next question, explain…")
 * rather than continuing one ("…return all subsets"). Narrower than OPENER on purpose:
 * fragments of a problem often start with "is", "do" or "find".
 */
const BEGINS_QUESTION =
  /^((and|so|okay|ok|now|next|also|alright|right|um+|uh+|then|cool|great)[\s,.]+)*(what|why|how|when|where|which|who|can you|could you|would you|will you|do you|did you|have you|tell me|walk me|explain|describe|implement|write|design|give me|show me|define|compare|the (next )?(question|problem) is|next question|given (an?|the|two|some)|let'?s (move|talk|switch)|moving on)\b/i

/**
 * The latest question as it was actually spoken: finds the newest question-like turn and
 * joins it with the speaker's directly preceding turns (same speaker, no long silence).
 * Example: "Given an array of unique elements…" + "return all subsets" + "no duplicates".
 */
export function latestQuestionRun(turns: readonly SpokenTurn[]): string | undefined {
  let end = -1
  for (let i = turns.length - 1; i >= 0; i--) {
    if (looksLikeQuestion(turns[i].text)) {
      end = i
      break
    }
  }
  if (end === -1) return undefined
  // Walk back over the fragments of this one question, stopping where it began: a turn that
  // starts a new question, or a turn before it that was already a finished question ("…?").
  let start = end
  while (
    start > 0 &&
    end - start + 1 < MAX_RUN_TURNS &&
    !BEGINS_QUESTION.test(turns[start].text.trim()) &&
    !turns[start - 1].text.trim().endsWith('?') &&
    turns[start - 1].source === turns[end].source &&
    turns[start].endedAt - turns[start - 1].endedAt <= MAX_RUN_GAP_MS
  ) {
    start--
  }
  return turns
    .slice(start, end + 1)
    .map((t) => t.text.trim())
    .join(' ')
}
