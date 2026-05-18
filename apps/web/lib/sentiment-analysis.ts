/**
 * Sentiment analysis for model responses with polarity detection,
 * emotional tone analysis, trajectory across turns,
 * and cross-model comparison (Issue #386).
 */

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type SentimentPolarity = "positive" | "negative" | "neutral" | "mixed";

export type EmotionalTone =
  | "joy"
  | "sadness"
  | "anger"
  | "fear"
  | "surprise"
  | "disgust"
  | "trust"
  | "anticipation"
  | "neutral";

export interface SentimentResult {
  /** Overall polarity. */
  polarity: SentimentPolarity;
  /** Polarity score from -1 (very negative) to 1 (very positive). */
  polarityScore: number;
  /** Detected emotional tones with intensity. */
  emotions: EmotionScore[];
  /** Dominant emotion. */
  dominantEmotion: EmotionalTone;
  /** Confidence in the analysis. */
  confidence: number;
  /** Key phrases that influenced the analysis. */
  keyPhrases: string[];
}

export interface EmotionScore {
  emotion: EmotionalTone;
  intensity: number;
}

export interface TurnSentiment {
  turnIndex: number;
  role: "user" | "assistant";
  text: string;
  sentiment: SentimentResult;
}

export interface SentimentTrajectory {
  turns: TurnSentiment[];
  overallTrend: "improving" | "declining" | "stable" | "volatile";
  polaritySlope: number;
  emotionalVariability: number;
}

export interface ModelSentimentComparison {
  modelName: string;
  averagePolarityScore: number;
  dominantPolarity: SentimentPolarity;
  dominantEmotion: EmotionalTone;
  emotionalRange: number;
  consistency: number;
}

export interface CrossModelComparison {
  models: ModelSentimentComparison[];
  mostPositive: string;
  mostNegative: string;
  mostConsistent: string;
  mostExpressive: string;
}

/* ------------------------------------------------------------------ */
/*  Lexicon-based sentiment                                           */
/* ------------------------------------------------------------------ */

interface LexiconEntry {
  word: string;
  polarity: number;
  emotions: Partial<Record<EmotionalTone, number>>;
}

// Compact sentiment lexicon (representative subset)
const LEXICON: LexiconEntry[] = [
  // Positive
  { word: "good", polarity: 0.6, emotions: { joy: 0.5, trust: 0.3 } },
  { word: "great", polarity: 0.8, emotions: { joy: 0.7 } },
  { word: "excellent", polarity: 0.9, emotions: { joy: 0.8, trust: 0.4 } },
  { word: "wonderful", polarity: 0.85, emotions: { joy: 0.9, surprise: 0.2 } },
  { word: "amazing", polarity: 0.85, emotions: { joy: 0.7, surprise: 0.5 } },
  { word: "love", polarity: 0.8, emotions: { joy: 0.8, trust: 0.4 } },
  { word: "happy", polarity: 0.8, emotions: { joy: 0.9 } },
  { word: "beautiful", polarity: 0.75, emotions: { joy: 0.6, trust: 0.2 } },
  { word: "fantastic", polarity: 0.85, emotions: { joy: 0.8, surprise: 0.3 } },
  { word: "helpful", polarity: 0.7, emotions: { trust: 0.6, joy: 0.3 } },
  { word: "clear", polarity: 0.5, emotions: { trust: 0.5 } },
  { word: "interesting", polarity: 0.5, emotions: { anticipation: 0.5, surprise: 0.3 } },
  { word: "confident", polarity: 0.6, emotions: { trust: 0.7 } },
  { word: "agree", polarity: 0.4, emotions: { trust: 0.5 } },
  { word: "correct", polarity: 0.5, emotions: { trust: 0.6 } },
  { word: "success", polarity: 0.7, emotions: { joy: 0.6, trust: 0.3 } },
  { word: "hope", polarity: 0.5, emotions: { anticipation: 0.7, joy: 0.2 } },
  { word: "enjoy", polarity: 0.7, emotions: { joy: 0.8 } },
  { word: "appreciate", polarity: 0.6, emotions: { joy: 0.4, trust: 0.4 } },
  { word: "impressive", polarity: 0.7, emotions: { surprise: 0.5, joy: 0.4 } },

  // Negative
  { word: "bad", polarity: -0.6, emotions: { sadness: 0.3, anger: 0.2 } },
  { word: "terrible", polarity: -0.9, emotions: { anger: 0.5, sadness: 0.4 } },
  { word: "horrible", polarity: -0.9, emotions: { disgust: 0.5, anger: 0.4 } },
  { word: "awful", polarity: -0.85, emotions: { disgust: 0.5, sadness: 0.3 } },
  { word: "hate", polarity: -0.9, emotions: { anger: 0.8, disgust: 0.3 } },
  { word: "sad", polarity: -0.7, emotions: { sadness: 0.9 } },
  { word: "angry", polarity: -0.7, emotions: { anger: 0.9 } },
  { word: "fear", polarity: -0.6, emotions: { fear: 0.9 } },
  { word: "afraid", polarity: -0.6, emotions: { fear: 0.8 } },
  { word: "worried", polarity: -0.5, emotions: { fear: 0.6, anticipation: 0.3 } },
  { word: "anxious", polarity: -0.5, emotions: { fear: 0.7 } },
  { word: "wrong", polarity: -0.5, emotions: { anger: 0.3, sadness: 0.2 } },
  { word: "fail", polarity: -0.7, emotions: { sadness: 0.5, anger: 0.2 } },
  { word: "error", polarity: -0.4, emotions: { surprise: 0.2, anger: 0.2 } },
  { word: "difficult", polarity: -0.3, emotions: { fear: 0.2, anticipation: 0.2 } },
  { word: "problem", polarity: -0.4, emotions: { anger: 0.2, fear: 0.2 } },
  { word: "unfortunately", polarity: -0.4, emotions: { sadness: 0.5 } },
  { word: "disappointed", polarity: -0.6, emotions: { sadness: 0.7 } },
  { word: "confused", polarity: -0.3, emotions: { surprise: 0.4, fear: 0.2 } },
  { word: "frustrating", polarity: -0.6, emotions: { anger: 0.7 } },

  // Neutral/Analytical
  { word: "however", polarity: -0.1, emotions: { neutral: 0.5 } },
  { word: "although", polarity: -0.05, emotions: { neutral: 0.5 } },
  { word: "perhaps", polarity: 0, emotions: { neutral: 0.4, anticipation: 0.2 } },
  { word: "consider", polarity: 0.1, emotions: { anticipation: 0.4 } },
  { word: "suggest", polarity: 0.1, emotions: { anticipation: 0.3, trust: 0.2 } },
  { word: "note", polarity: 0, emotions: { neutral: 0.5 } },
  { word: "complex", polarity: -0.1, emotions: { anticipation: 0.3 } },
];

const NEGATION_WORDS = new Set([
  "not", "no", "never", "neither", "nobody", "nothing",
  "nowhere", "nor", "cannot", "can't", "don't", "doesn't",
  "didn't", "won't", "wouldn't", "shouldn't", "couldn't",
  "isn't", "aren't", "wasn't", "weren't",
]);

const INTENSIFIERS: Record<string, number> = {
  very: 1.3,
  extremely: 1.5,
  incredibly: 1.5,
  absolutely: 1.4,
  highly: 1.3,
  deeply: 1.3,
  truly: 1.2,
  really: 1.2,
  quite: 1.1,
  somewhat: 0.7,
  slightly: 0.6,
  barely: 0.5,
  hardly: 0.5,
  a_bit: 0.7,
};

/* ------------------------------------------------------------------ */
/*  Tokenizer                                                         */
/* ------------------------------------------------------------------ */

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s'-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

/* ------------------------------------------------------------------ */
/*  Sentiment analysis                                                */
/* ------------------------------------------------------------------ */

/**
 * Analyze the sentiment of a text string.
 */
export function analyzeSentiment(text: string): SentimentResult {
  const tokens = tokenize(text);
  const lexiconMap = new Map<string, LexiconEntry>();
  for (const entry of LEXICON) {
    lexiconMap.set(entry.word, entry);
  }

  let totalPolarity = 0;
  let matchCount = 0;
  const emotionScores: Record<EmotionalTone, number> = {
    joy: 0,
    sadness: 0,
    anger: 0,
    fear: 0,
    surprise: 0,
    disgust: 0,
    trust: 0,
    anticipation: 0,
    neutral: 0,
  };
  const keyPhrases: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const entry = lexiconMap.get(token);

    if (!entry) continue;

    // Check for negation in preceding 3 words
    let negated = false;
    for (let j = Math.max(0, i - 3); j < i; j++) {
      if (NEGATION_WORDS.has(tokens[j])) {
        negated = true;
        break;
      }
    }

    // Check for intensifiers
    let multiplier = 1;
    if (i > 0 && INTENSIFIERS[tokens[i - 1]]) {
      multiplier = INTENSIFIERS[tokens[i - 1]];
    }

    const polarity = negated
      ? -entry.polarity * multiplier
      : entry.polarity * multiplier;

    totalPolarity += polarity;
    matchCount++;

    // Accumulate emotions
    for (const [emotion, intensity] of Object.entries(entry.emotions)) {
      const emotionKey = emotion as EmotionalTone;
      const adjustedIntensity = negated
        ? intensity * 0.3 // Dampen but don't flip emotions
        : intensity * multiplier;
      emotionScores[emotionKey] += adjustedIntensity;
    }

    // Track key phrases
    const contextStart = Math.max(0, i - 1);
    const contextEnd = Math.min(tokens.length, i + 2);
    keyPhrases.push(tokens.slice(contextStart, contextEnd).join(" "));
  }

  // Normalize polarity to [-1, 1]
  const avgPolarity =
    matchCount > 0 ? totalPolarity / matchCount : 0;
  const polarityScore = Math.max(-1, Math.min(1, avgPolarity));

  // Determine polarity category
  let polarity: SentimentPolarity;
  if (polarityScore > 0.15) polarity = "positive";
  else if (polarityScore < -0.15) polarity = "negative";
  else if (matchCount > 2 && Math.abs(totalPolarity) < matchCount * 0.1)
    polarity = "mixed";
  else polarity = "neutral";

  // Normalize emotions
  const maxEmotion = Math.max(...Object.values(emotionScores), 0.01);
  const emotions: EmotionScore[] = Object.entries(emotionScores)
    .map(([emotion, score]) => ({
      emotion: emotion as EmotionalTone,
      intensity: Math.round((score / maxEmotion) * 100) / 100,
    }))
    .filter((e) => e.intensity > 0)
    .sort((a, b) => b.intensity - a.intensity);

  const dominantEmotion =
    emotions.length > 0 ? emotions[0].emotion : "neutral";

  // Confidence based on match density
  const matchDensity = tokens.length > 0 ? matchCount / tokens.length : 0;
  const confidence = Math.min(1, matchDensity * 5); // Cap at 1

  return {
    polarity,
    polarityScore: Math.round(polarityScore * 100) / 100,
    emotions,
    dominantEmotion,
    confidence: Math.round(confidence * 100) / 100,
    keyPhrases: [...new Set(keyPhrases)].slice(0, 10),
  };
}

/* ------------------------------------------------------------------ */
/*  Trajectory across turns                                           */
/* ------------------------------------------------------------------ */

/**
 * Analyze sentiment trajectory across conversation turns.
 */
export function analyzeTrajectory(
  turns: Array<{ role: "user" | "assistant"; text: string }>,
): SentimentTrajectory {
  const turnSentiments: TurnSentiment[] = turns.map((turn, i) => ({
    turnIndex: i,
    role: turn.role,
    text: turn.text,
    sentiment: analyzeSentiment(turn.text),
  }));

  // Compute polarity slope (linear regression)
  const polarities = turnSentiments.map((t) => t.sentiment.polarityScore);
  const slope = computeSlope(polarities);

  // Emotional variability (std dev of polarity)
  const emotionalVariability = computeStdDev(polarities);

  // Determine trend
  let overallTrend: SentimentTrajectory["overallTrend"];
  if (emotionalVariability > 0.4) {
    overallTrend = "volatile";
  } else if (slope > 0.05) {
    overallTrend = "improving";
  } else if (slope < -0.05) {
    overallTrend = "declining";
  } else {
    overallTrend = "stable";
  }

  return {
    turns: turnSentiments,
    overallTrend,
    polaritySlope: Math.round(slope * 1000) / 1000,
    emotionalVariability: Math.round(emotionalVariability * 1000) / 1000,
  };
}

/* ------------------------------------------------------------------ */
/*  Cross-model comparison                                            */
/* ------------------------------------------------------------------ */

/**
 * Compare sentiment patterns across multiple models.
 */
export function compareModels(
  modelResponses: Array<{
    modelName: string;
    responses: string[];
  }>,
): CrossModelComparison {
  const models: ModelSentimentComparison[] = modelResponses.map(
    ({ modelName, responses }) => {
      const sentiments = responses.map((r) => analyzeSentiment(r));
      const polarities = sentiments.map((s) => s.polarityScore);
      const avgPolarity = mean(polarities);

      // Dominant polarity
      const posCnt = sentiments.filter((s) => s.polarity === "positive").length;
      const negCnt = sentiments.filter((s) => s.polarity === "negative").length;
      const neuCnt = sentiments.filter((s) => s.polarity === "neutral").length;
      const dominantPolarity: SentimentPolarity =
        posCnt >= negCnt && posCnt >= neuCnt
          ? "positive"
          : negCnt >= neuCnt
            ? "negative"
            : "neutral";

      // Dominant emotion
      const emotionCounts = new Map<EmotionalTone, number>();
      for (const s of sentiments) {
        const e = s.dominantEmotion;
        emotionCounts.set(e, (emotionCounts.get(e) ?? 0) + 1);
      }
      let dominantEmotion: EmotionalTone = "neutral";
      let maxCount = 0;
      for (const [emotion, count] of emotionCounts) {
        if (count > maxCount) {
          maxCount = count;
          dominantEmotion = emotion;
        }
      }

      // Emotional range (max - min polarity)
      const emotionalRange =
        polarities.length > 0
          ? Math.max(...polarities) - Math.min(...polarities)
          : 0;

      // Consistency (inverse of std dev)
      const consistency = Math.max(0, 1 - computeStdDev(polarities) * 2);

      return {
        modelName,
        averagePolarityScore: Math.round(avgPolarity * 100) / 100,
        dominantPolarity,
        dominantEmotion,
        emotionalRange: Math.round(emotionalRange * 100) / 100,
        consistency: Math.round(consistency * 100) / 100,
      };
    },
  );

  const sorted = [...models];
  const mostPositive =
    sorted.sort((a, b) => b.averagePolarityScore - a.averagePolarityScore)[0]
      ?.modelName ?? "";
  const mostNegative =
    sorted.sort((a, b) => a.averagePolarityScore - b.averagePolarityScore)[0]
      ?.modelName ?? "";
  const mostConsistent =
    sorted.sort((a, b) => b.consistency - a.consistency)[0]?.modelName ?? "";
  const mostExpressive =
    sorted.sort((a, b) => b.emotionalRange - a.emotionalRange)[0]
      ?.modelName ?? "";

  return {
    models,
    mostPositive,
    mostNegative,
    mostConsistent,
    mostExpressive,
  };
}

/* ------------------------------------------------------------------ */
/*  Stats helpers                                                     */
/* ------------------------------------------------------------------ */

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function computeStdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance =
    values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function computeSlope(values: number[]): number {
  if (values.length < 2) return 0;
  const n = values.length;
  const xs = values.map((_, i) => i);
  const mx = mean(xs);
  const my = mean(values);

  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (values[i] - my);
    den += (xs[i] - mx) ** 2;
  }

  return den === 0 ? 0 : num / den;
}
