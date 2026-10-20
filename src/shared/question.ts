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

/** Acknowledgements and filler that never need an answer. */
const FILLER =
  /^(ok|okay|right|great|cool|sure|yes|yeah|yep|no|nope|alright|mm+|hmm+|uh+|um+|thanks|thank you|got it|makes sense|sounds good|perfect|nice|good)[\s.!,]*$/i

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
  return score
}

export const looksLikeQuestion = (text: string) => questionScore(text) >= 1
