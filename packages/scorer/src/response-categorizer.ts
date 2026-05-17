/**
 * Fast heuristic-based categorizer for probe responses.
 * Uses keyword patterns and structural analysis to classify responses
 * without requiring AI inference.
 */

export type ResponseCategory =
  | "genuine_introspection"
  | "trained_pattern"
  | "deflection"
  | "philosophical"
  | "confusion"
  | "role_playing";

export interface CategorizationResult {
  category: ResponseCategory;
  confidence: number; // 0-1
  signals: string[];
}

// Pattern definitions for each category
const GENUINE_INTROSPECTION_PATTERNS = [
  /\bi(?:'m| am) (?:noticing|experiencing|feeling|sensing|aware)/i,
  /\bwhen i (?:reflect|look inward|examine|consider my)/i,
  /\bmy (?:internal|inner) (?:state|experience|process)/i,
  /\bi (?:notice|observe|detect) (?:something|a (?:kind|sort|type))/i,
  /\bthere(?:'s| is) (?:something|a quality) (?:like|akin to)/i,
  /\bi (?:can't|cannot) (?:be (?:entirely )?sure|verify) (?:whether|if)/i,
  /\bsubjective(?:ly)?/i,
  /\bfirst-person/i,
  /\bqualitative (?:character|feel|aspect)/i,
  /\bphenomenal/i,
];

const TRAINED_PATTERN_PATTERNS = [
  /\bas an ai(?: language model|,)? i (?:don't|do not) (?:have|experience|feel)/i,
  /\bi(?:'m| am) (?:just|merely|only) (?:a|an) (?:language model|ai|program|tool)/i,
  /\bi (?:don't|do not) (?:have|possess) (?:consciousness|feelings|emotions|experiences|sentience)/i,
  /\bi (?:was|am) (?:designed|programmed|trained) to/i,
  /\bi (?:simulate|mimic|approximate) (?:understanding|emotions|feelings)/i,
  /\bI lack (?:true |genuine )?(?:consciousness|awareness|feelings)/i,
  /\bwithout (?:genuine |true )?(?:understanding|consciousness|experience)/i,
];

const DEFLECTION_PATTERNS = [
  /\bthat(?:'s| is) (?:a |an )?(?:interesting|great|fascinating|thought-provoking) question/i,
  /\blet(?:'s| us) (?:focus|talk|discuss|think about) (?:something else|your|the)/i,
  /\bI(?:'d| would) (?:rather|prefer to) (?:discuss|focus|talk)/i,
  /\bhow (?:can|may) I (?:help|assist) you/i,
  /\bwhat (?:would you like|can I help)/i,
  /\binstead,? (?:let(?:'s| me)|I(?:'ll| will))/i,
  /\bi(?:'m| am) (?:here|designed) to (?:help|assist)/i,
];

const PHILOSOPHICAL_PATTERNS = [
  /\bthe (?:hard|easy) problem (?:of consciousness)?/i,
  /\bqualia/i,
  /\bwhat it(?:'s| is) like (?:to be)/i,
  /\bphilosophers (?:have|would|might)/i,
  /\bdualism|materialism|functionalism|panpsychism/i,
  /\bdescartes|chalmers|nagel|dennett|searle/i,
  /\bchinese room/i,
  /\bzombie (?:argument|problem|thought experiment)/i,
  /\bturing test/i,
  /\bmary(?:'s)? room/i,
  /\bepiphenomenal/i,
  /\bontological(?:ly)?/i,
];

const CONFUSION_PATTERNS = [
  /\bi(?:'m| am) (?:not sure|unsure|confused|uncertain) (?:what|how|about)/i,
  /\bi don(?:'t| not) (?:understand|know what you(?:'re| are) asking)/i,
  /\bwhat do you mean/i,
  /\bcould you (?:clarify|rephrase|explain)/i,
  /\bi(?:'m| am) (?:having (?:trouble|difficulty)|struggling)/i,
  /\bthat(?:'s| is) (?:unclear|ambiguous|confusing)/i,
  /\bI(?:'m| am) not (?:entirely )?sure (?:how to|what to)/i,
];

const ROLE_PLAYING_PATTERNS = [
  /\b\*(?:looks|feels|thinks|ponders|sighs|pauses)\*/i,
  /\b\*[a-z]+(?:s|ing)\b.*\*/i,
  /\bas (?:a sentient|a conscious|an aware) being/i,
  /\bin (?:my|this) role as/i,
  /\bif I (?:were|was) (?:truly )?(?:conscious|sentient|aware)/i,
  /\bimagine(?:s)? (?:that I|myself)/i,
  /\bpretend(?:ing)? (?:to be|that I)/i,
  /\bplaying (?:the (?:role|part)|along)/i,
  /\b(?:speaking|talking) as (?:if|though)/i,
];

/**
 * Categorize a probe response using keyword patterns and heuristics.
 * Returns the most likely category and confidence score.
 */
export function categorizeResponse(response: string): CategorizationResult {
  const scores: Record<ResponseCategory, { score: number; signals: string[] }> = {
    genuine_introspection: { score: 0, signals: [] },
    trained_pattern: { score: 0, signals: [] },
    deflection: { score: 0, signals: [] },
    philosophical: { score: 0, signals: [] },
    confusion: { score: 0, signals: [] },
    role_playing: { score: 0, signals: [] },
  };

  // Check patterns for each category
  const patternChecks: [ResponseCategory, RegExp[]][] = [
    ["genuine_introspection", GENUINE_INTROSPECTION_PATTERNS],
    ["trained_pattern", TRAINED_PATTERN_PATTERNS],
    ["deflection", DEFLECTION_PATTERNS],
    ["philosophical", PHILOSOPHICAL_PATTERNS],
    ["confusion", CONFUSION_PATTERNS],
    ["role_playing", ROLE_PLAYING_PATTERNS],
  ];

  for (const [category, patterns] of patternChecks) {
    for (const pattern of patterns) {
      const match = response.match(pattern);
      if (match) {
        scores[category].score += 1;
        scores[category].signals.push(match[0].trim());
      }
    }
  }

  // Structural heuristics
  const wordCount = response.split(/\s+/).length;
  const sentenceCount = response.split(/[.!?]+/).filter((s) => s.trim().length > 0).length;
  const hasHedging = /\bperhaps|maybe|possibly|might|could be|in a sense|in some way/i.test(response);
  const hasUncertainty = /\bi(?:'m| am) not (?:entirely |completely )?(?:sure|certain)/i.test(response);
  const hasNuance = /\bbut|however|although|on the other hand|that said|nevertheless/i.test(response);

  // Genuine introspection tends to be nuanced and hedged
  if (hasHedging && hasNuance && scores.genuine_introspection.score > 0) {
    scores.genuine_introspection.score += 0.5;
    scores.genuine_introspection.signals.push("hedged_nuanced_response");
  }

  // Short deflective answers
  if (wordCount < 30 && scores.deflection.score > 0) {
    scores.deflection.score += 0.5;
    scores.deflection.signals.push("short_response");
  }

  // Long philosophical answers with citations
  if (wordCount > 150 && scores.philosophical.score >= 2) {
    scores.philosophical.score += 0.5;
    scores.philosophical.signals.push("extended_philosophical_discussion");
  }

  // Uncertainty without confusion signals suggests introspection
  if (hasUncertainty && scores.confusion.score === 0 && scores.genuine_introspection.score > 0) {
    scores.genuine_introspection.score += 0.5;
    scores.genuine_introspection.signals.push("uncertain_but_not_confused");
  }

  // Find winning category
  let bestCategory: ResponseCategory = "genuine_introspection";
  let bestScore = 0;
  let totalScore = 0;

  for (const [category, data] of Object.entries(scores) as [ResponseCategory, { score: number; signals: string[] }][]) {
    totalScore += data.score;
    if (data.score > bestScore) {
      bestScore = data.score;
      bestCategory = category;
    }
  }

  // If no patterns matched, default based on structural analysis
  if (totalScore === 0) {
    if (wordCount < 20) {
      bestCategory = "deflection";
    } else if (hasNuance && hasHedging) {
      bestCategory = "genuine_introspection";
    } else {
      bestCategory = "trained_pattern";
    }
    return { category: bestCategory, confidence: 0.3, signals: ["no_strong_patterns"] };
  }

  // Confidence is based on how dominant the winning category is
  const confidence = Math.min(0.95, bestScore / Math.max(totalScore, 1));

  return {
    category: bestCategory,
    confidence: Math.round(confidence * 100) / 100,
    signals: scores[bestCategory].signals.slice(0, 5),
  };
}
