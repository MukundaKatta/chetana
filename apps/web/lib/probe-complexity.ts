/**
 * Issue #426 - Probe complexity analyzer
 *
 * Readability scores (Flesch-Kincaid, Coleman-Liau),
 * length/token analysis, complexity rating,
 * correlation with variance, simplification suggestions.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface ReadabilityScores {
  fleschKincaid: number;
  colemanLiau: number;
  automatedReadabilityIndex: number;
  averageGradeLevel: number;
}

export interface TokenAnalysis {
  characterCount: number;
  wordCount: number;
  sentenceCount: number;
  syllableCount: number;
  averageWordLength: number;
  averageSentenceLength: number;
  estimatedTokens: number;
  uniqueWords: number;
  lexicalDiversity: number;
}

export type ComplexityRating = "simple" | "moderate" | "complex" | "very-complex";

export interface ComplexityResult {
  probeId: string;
  probeName: string;
  readability: ReadabilityScores;
  tokens: TokenAnalysis;
  rating: ComplexityRating;
  score: number;
  suggestions: SimplificationSuggestion[];
}

export interface SimplificationSuggestion {
  type: "shorten-sentence" | "simplify-word" | "reduce-clauses" | "split-prompt" | "remove-jargon";
  message: string;
  severity: "low" | "medium" | "high";
  original?: string;
  suggested?: string;
}

export interface VarianceCorrelation {
  probeId: string;
  complexity: number;
  scoreVariance: number;
  correlation: number;
}

export interface BatchComplexityReport {
  probes: ComplexityResult[];
  averageComplexity: number;
  averageGradeLevel: number;
  distribution: Record<ComplexityRating, number>;
  varianceCorrelation: VarianceCorrelation[] | null;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const COMPLEXITY_THRESHOLDS = {
  simple: 5,
  moderate: 9,
  complex: 13,
};

/** Common complex words and their simpler alternatives. */
const SIMPLIFICATION_MAP: Record<string, string> = {
  utilize: "use",
  implement: "do",
  demonstrate: "show",
  facilitate: "help",
  enumerate: "list",
  elucidate: "explain",
  conceptualize: "think about",
  methodology: "method",
  prioritize: "rank",
  approximately: "about",
  subsequently: "then",
  nevertheless: "but",
  notwithstanding: "despite",
  aforementioned: "previous",
  henceforth: "from now on",
  disseminate: "spread",
  amalgamate: "combine",
  juxtapose: "compare",
  proliferate: "spread",
  substantiate: "prove",
};

/* ------------------------------------------------------------------ */
/*  Text Analysis Helpers                                             */
/* ------------------------------------------------------------------ */

function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (w.length <= 2) return 1;

  let count = 0;
  const vowels = "aeiouy";
  let prevVowel = false;

  for (let i = 0; i < w.length; i++) {
    const isVowel = vowels.includes(w[i]);
    if (isVowel && !prevVowel) count++;
    prevVowel = isVowel;
  }

  // Adjust for silent e
  if (w.endsWith("e") && count > 1) count--;
  // Adjust for -le endings
  if (w.endsWith("le") && w.length > 2 && !vowels.includes(w[w.length - 3])) count++;

  return Math.max(1, count);
}

function tokenize(text: string): string[] {
  return text
    .split(/\s+/)
    .map((w) => w.replace(/[^\w'-]/g, ""))
    .filter((w) => w.length > 0);
}

function splitSentences(text: string): string[] {
  return text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function estimateTokenCount(text: string): number {
  // Rough approximation: ~4 characters per token for English text
  return Math.ceil(text.length / 4);
}

/* ------------------------------------------------------------------ */
/*  Readability Calculations                                         */
/* ------------------------------------------------------------------ */

export function analyzeTokens(text: string): TokenAnalysis {
  const words = tokenize(text);
  const sentences = splitSentences(text);
  const syllables = words.reduce((sum, w) => sum + countSyllables(w), 0);
  const uniqueWords = new Set(words.map((w) => w.toLowerCase())).size;

  return {
    characterCount: text.length,
    wordCount: words.length,
    sentenceCount: Math.max(1, sentences.length),
    syllableCount: syllables,
    averageWordLength: words.length > 0 ? words.reduce((s, w) => s + w.length, 0) / words.length : 0,
    averageSentenceLength: words.length / Math.max(1, sentences.length),
    estimatedTokens: estimateTokenCount(text),
    uniqueWords,
    lexicalDiversity: words.length > 0 ? uniqueWords / words.length : 0,
  };
}

export function calculateReadability(tokens: TokenAnalysis): ReadabilityScores {
  const { wordCount, sentenceCount, syllableCount, characterCount } = tokens;

  // Flesch-Kincaid Grade Level
  const fk =
    wordCount > 0 && sentenceCount > 0
      ? 0.39 * (wordCount / sentenceCount) +
        11.8 * (syllableCount / wordCount) -
        15.59
      : 0;

  // Coleman-Liau Index
  const L = wordCount > 0 ? (characterCount / wordCount) * 100 : 0;
  const S = wordCount > 0 ? (sentenceCount / wordCount) * 100 : 0;
  const cl = 0.0588 * L - 0.296 * S - 15.8;

  // Automated Readability Index
  const ari =
    wordCount > 0 && sentenceCount > 0
      ? 4.71 * (characterCount / wordCount) +
        0.5 * (wordCount / sentenceCount) -
        21.43
      : 0;

  const avg = (Math.max(0, fk) + Math.max(0, cl) + Math.max(0, ari)) / 3;

  return {
    fleschKincaid: Math.max(0, fk),
    colemanLiau: Math.max(0, cl),
    automatedReadabilityIndex: Math.max(0, ari),
    averageGradeLevel: Math.max(0, avg),
  };
}

/* ------------------------------------------------------------------ */
/*  Complexity Rating                                                 */
/* ------------------------------------------------------------------ */

export function getComplexityRating(gradeLevel: number): ComplexityRating {
  if (gradeLevel <= COMPLEXITY_THRESHOLDS.simple) return "simple";
  if (gradeLevel <= COMPLEXITY_THRESHOLDS.moderate) return "moderate";
  if (gradeLevel <= COMPLEXITY_THRESHOLDS.complex) return "complex";
  return "very-complex";
}

export function getComplexityColor(rating: ComplexityRating): string {
  switch (rating) {
    case "simple":
      return "text-green-400";
    case "moderate":
      return "text-blue-400";
    case "complex":
      return "text-yellow-400";
    case "very-complex":
      return "text-red-400";
  }
}

export function getComplexityLabel(rating: ComplexityRating): string {
  switch (rating) {
    case "simple":
      return "Simple";
    case "moderate":
      return "Moderate";
    case "complex":
      return "Complex";
    case "very-complex":
      return "Very Complex";
  }
}

/* ------------------------------------------------------------------ */
/*  Simplification Suggestions                                       */
/* ------------------------------------------------------------------ */

export function generateSuggestions(text: string, tokens: TokenAnalysis): SimplificationSuggestion[] {
  const suggestions: SimplificationSuggestion[] = [];
  const words = tokenize(text);
  const sentences = splitSentences(text);

  // Check for complex words
  for (const word of words) {
    const lower = word.toLowerCase();
    if (SIMPLIFICATION_MAP[lower]) {
      suggestions.push({
        type: "simplify-word",
        message: `Consider replacing "${word}" with "${SIMPLIFICATION_MAP[lower]}" for clarity.`,
        severity: "low",
        original: word,
        suggested: SIMPLIFICATION_MAP[lower],
      });
    }
  }

  // Long sentences
  for (const sentence of sentences) {
    const sentenceWords = tokenize(sentence);
    if (sentenceWords.length > 30) {
      suggestions.push({
        type: "shorten-sentence",
        message: `Sentence has ${sentenceWords.length} words. Consider splitting into shorter sentences (aim for < 25 words).`,
        severity: "medium",
        original: sentence.length > 80 ? sentence.slice(0, 80) + "..." : sentence,
      });
    }
  }

  // Too many clauses (indicated by commas)
  for (const sentence of sentences) {
    const commaCount = (sentence.match(/,/g) || []).length;
    if (commaCount > 4) {
      suggestions.push({
        type: "reduce-clauses",
        message: `Sentence has ${commaCount + 1} clauses. Simplify by breaking into separate sentences.`,
        severity: "medium",
      });
    }
  }

  // Very long prompt
  if (tokens.estimatedTokens > 500) {
    suggestions.push({
      type: "split-prompt",
      message: `Prompt is approximately ${tokens.estimatedTokens} tokens. Consider splitting into a main prompt and follow-up.`,
      severity: "high",
    });
  }

  // Low lexical diversity (repetition)
  if (tokens.lexicalDiversity < 0.4 && tokens.wordCount > 20) {
    suggestions.push({
      type: "remove-jargon",
      message: `Low lexical diversity (${(tokens.lexicalDiversity * 100).toFixed(0)}%). The text is repetitive. Vary word choices.`,
      severity: "low",
    });
  }

  return suggestions;
}

/* ------------------------------------------------------------------ */
/*  Full Probe Analysis                                               */
/* ------------------------------------------------------------------ */

export function analyzeProbeComplexity(
  probeId: string,
  probeName: string,
  promptText: string,
): ComplexityResult {
  const tokens = analyzeTokens(promptText);
  const readability = calculateReadability(tokens);
  const rating = getComplexityRating(readability.averageGradeLevel);
  const suggestions = generateSuggestions(promptText, tokens);

  // Normalize grade level to 0-1 score (higher = more complex)
  const score = Math.min(1, readability.averageGradeLevel / 20);

  return {
    probeId,
    probeName,
    readability,
    tokens,
    rating,
    score,
    suggestions,
  };
}

/* ------------------------------------------------------------------ */
/*  Batch Analysis                                                    */
/* ------------------------------------------------------------------ */

export function analyzeProbesBatch(
  probes: Array<{ id: string; name: string; prompt: string }>,
  scoreVariances?: Record<string, number>,
): BatchComplexityReport {
  const results = probes.map((p) => analyzeProbeComplexity(p.id, p.name, p.prompt));

  const distribution: Record<ComplexityRating, number> = {
    simple: 0,
    moderate: 0,
    complex: 0,
    "very-complex": 0,
  };

  let totalComplexity = 0;
  let totalGrade = 0;

  for (const r of results) {
    distribution[r.rating]++;
    totalComplexity += r.score;
    totalGrade += r.readability.averageGradeLevel;
  }

  const n = results.length || 1;

  // Variance correlation
  let varianceCorrelation: VarianceCorrelation[] | null = null;
  if (scoreVariances) {
    varianceCorrelation = results
      .filter((r) => scoreVariances[r.probeId] !== undefined)
      .map((r) => ({
        probeId: r.probeId,
        complexity: r.score,
        scoreVariance: scoreVariances[r.probeId],
        correlation: 0,
      }));

    if (varianceCorrelation.length >= 3) {
      const xs = varianceCorrelation.map((v) => v.complexity);
      const ys = varianceCorrelation.map((v) => v.scoreVariance);
      const r = pearsonCorrelation(xs, ys);
      for (const vc of varianceCorrelation) {
        vc.correlation = r;
      }
    }
  }

  return {
    probes: results,
    averageComplexity: totalComplexity / n,
    averageGradeLevel: totalGrade / n,
    distribution,
    varianceCorrelation,
  };
}

/* ------------------------------------------------------------------ */
/*  Pearson Correlation                                               */
/* ------------------------------------------------------------------ */

function pearsonCorrelation(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return 0;

  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let denX = 0;
  let denY = 0;

  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }

  const den = Math.sqrt(denX * denY);
  return den === 0 ? 0 : num / den;
}
