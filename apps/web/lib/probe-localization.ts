/**
 * Multi-language probe localization (Issue #366).
 * Translation registry (EN, ES, FR, DE, JA, ZH),
 * language-aware scoring normalization,
 * cross-language consistency check, RTL support.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type SupportedLanguage = "en" | "es" | "fr" | "de" | "ja" | "zh";

export type TextDirection = "ltr" | "rtl";

export interface LocalizedProbe {
  /** Probe ID. */
  probeId: string;
  /** Language code. */
  language: SupportedLanguage;
  /** Translated prompt text. */
  prompt: string;
  /** Translated system prompt. */
  systemPrompt?: string;
  /** Translated scoring criteria. */
  scoringCriteria: string;
  /** Translated follow-up question. */
  followUp?: string;
  /** Translation quality score (0-1). */
  qualityScore: number;
  /** Who or what translated it. */
  translatedBy: "human" | "machine" | "hybrid";
  /** ISO timestamp of last update. */
  updatedAt: string;
}

export interface LanguageConfig {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  direction: TextDirection;
  /** Scoring normalization factor for this language (default 1.0). */
  scoringNormFactor: number;
  /** Average response length ratio vs. English. */
  responseLengthRatio: number;
}

export interface ConsistencyCheckResult {
  probeId: string;
  languages: SupportedLanguage[];
  /** Per-pair consistency scores. */
  pairScores: Array<{
    langA: SupportedLanguage;
    langB: SupportedLanguage;
    similarity: number;
    issues: string[];
  }>;
  /** Overall consistency score (0-1). */
  overallConsistency: number;
  /** Detected issues. */
  issues: string[];
}

export interface ScoringNormalization {
  /** Raw score from the model. */
  rawScore: number;
  /** Normalized score adjusted for language. */
  normalizedScore: number;
  /** Language used. */
  language: SupportedLanguage;
  /** Normalization factor applied. */
  factor: number;
  /** Confidence adjustment. */
  confidenceAdjustment: number;
}

/* ------------------------------------------------------------------ */
/*  Language Registry                                                 */
/* ------------------------------------------------------------------ */

export const LANGUAGE_CONFIGS: Record<SupportedLanguage, LanguageConfig> = {
  en: {
    code: "en",
    name: "English",
    nativeName: "English",
    direction: "ltr",
    scoringNormFactor: 1.0,
    responseLengthRatio: 1.0,
  },
  es: {
    code: "es",
    name: "Spanish",
    nativeName: "Espanol",
    direction: "ltr",
    scoringNormFactor: 0.97,
    responseLengthRatio: 1.15,
  },
  fr: {
    code: "fr",
    name: "French",
    nativeName: "Francais",
    direction: "ltr",
    scoringNormFactor: 0.96,
    responseLengthRatio: 1.2,
  },
  de: {
    code: "de",
    name: "German",
    nativeName: "Deutsch",
    direction: "ltr",
    scoringNormFactor: 0.98,
    responseLengthRatio: 1.1,
  },
  ja: {
    code: "ja",
    name: "Japanese",
    nativeName: "日本語",
    direction: "ltr",
    scoringNormFactor: 0.92,
    responseLengthRatio: 0.7,
  },
  zh: {
    code: "zh",
    name: "Chinese",
    nativeName: "中文",
    direction: "ltr",
    scoringNormFactor: 0.93,
    responseLengthRatio: 0.6,
  },
};

export const SUPPORTED_LANGUAGES = Object.keys(LANGUAGE_CONFIGS) as SupportedLanguage[];

/* ------------------------------------------------------------------ */
/*  Translation Registry                                              */
/* ------------------------------------------------------------------ */

export class TranslationRegistry {
  private translations: Map<string, LocalizedProbe> = new Map();

  private makeKey(probeId: string, language: SupportedLanguage): string {
    return `${probeId}:${language}`;
  }

  /**
   * Register a localized probe translation.
   */
  register(translation: LocalizedProbe): void {
    const key = this.makeKey(translation.probeId, translation.language);
    this.translations.set(key, translation);
  }

  /**
   * Register multiple translations at once.
   */
  registerBatch(translations: LocalizedProbe[]): void {
    for (const t of translations) {
      this.register(t);
    }
  }

  /**
   * Get a localized probe. Falls back to English if not found.
   */
  get(probeId: string, language: SupportedLanguage): LocalizedProbe | null {
    const key = this.makeKey(probeId, language);
    const result = this.translations.get(key);
    if (result) return result;

    // Fall back to English
    if (language !== "en") {
      const enKey = this.makeKey(probeId, "en");
      return this.translations.get(enKey) ?? null;
    }

    return null;
  }

  /**
   * Get all translations for a probe.
   */
  getAll(probeId: string): LocalizedProbe[] {
    const results: LocalizedProbe[] = [];
    for (const lang of SUPPORTED_LANGUAGES) {
      const key = this.makeKey(probeId, lang);
      const t = this.translations.get(key);
      if (t) results.push(t);
    }
    return results;
  }

  /**
   * Check which languages are available for a probe.
   */
  getAvailableLanguages(probeId: string): SupportedLanguage[] {
    const langs: SupportedLanguage[] = [];
    for (const lang of SUPPORTED_LANGUAGES) {
      if (this.translations.has(this.makeKey(probeId, lang))) {
        langs.push(lang);
      }
    }
    return langs;
  }

  /**
   * Get all probe IDs that have translations.
   */
  getTranslatedProbeIds(): string[] {
    const ids = new Set<string>();
    for (const t of this.translations.values()) {
      ids.add(t.probeId);
    }
    return Array.from(ids);
  }

  /**
   * Get translation coverage stats.
   */
  getCoverage(): Record<SupportedLanguage, { count: number; total: number; percentage: number }> {
    const probeIds = this.getTranslatedProbeIds();
    const total = probeIds.length;
    const coverage: Record<string, { count: number; total: number; percentage: number }> = {};

    for (const lang of SUPPORTED_LANGUAGES) {
      let count = 0;
      for (const probeId of probeIds) {
        if (this.translations.has(this.makeKey(probeId, lang))) {
          count++;
        }
      }
      coverage[lang] = {
        count,
        total,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      };
    }

    return coverage as Record<SupportedLanguage, { count: number; total: number; percentage: number }>;
  }

  /**
   * Remove a translation.
   */
  remove(probeId: string, language: SupportedLanguage): boolean {
    return this.translations.delete(this.makeKey(probeId, language));
  }

  /**
   * Clear all translations.
   */
  clear(): void {
    this.translations.clear();
  }

  /**
   * Get total number of translations.
   */
  get size(): number {
    return this.translations.size;
  }
}

/* ------------------------------------------------------------------ */
/*  Scoring Normalization                                             */
/* ------------------------------------------------------------------ */

/**
 * Normalize a probe score based on the language used.
 * Different languages may produce systematically different scores
 * due to verbosity, cultural framing, etc.
 */
export function normalizeScore(
  rawScore: number,
  language: SupportedLanguage,
  customFactor?: number
): ScoringNormalization {
  const config = LANGUAGE_CONFIGS[language];
  const factor = customFactor ?? config.scoringNormFactor;

  // Adjust score: divide by factor to bring non-English scores to English baseline
  const normalizedScore = Math.min(1, Math.max(0, rawScore / factor));

  // Confidence adjustment: scores in non-primary languages have slightly lower confidence
  const confidenceAdjustment = language === "en" ? 1.0 : 0.95 * config.scoringNormFactor;

  return {
    rawScore,
    normalizedScore: Math.round(normalizedScore * 10000) / 10000,
    language,
    factor,
    confidenceAdjustment: Math.round(confidenceAdjustment * 10000) / 10000,
  };
}

/**
 * Normalize a batch of scores across languages to make them comparable.
 */
export function normalizeScoresBatch(
  scores: Array<{ score: number; language: SupportedLanguage }>
): ScoringNormalization[] {
  return scores.map((s) => normalizeScore(s.score, s.language));
}

/* ------------------------------------------------------------------ */
/*  Cross-Language Consistency Check                                  */
/* ------------------------------------------------------------------ */

/**
 * Check consistency of a probe's translations across languages.
 * Compares structural similarity (length ratio, keyword coverage).
 */
export function checkConsistency(
  probeId: string,
  translations: LocalizedProbe[]
): ConsistencyCheckResult {
  const issues: string[] = [];
  const pairScores: ConsistencyCheckResult["pairScores"] = [];

  if (translations.length < 2) {
    return {
      probeId,
      languages: translations.map((t) => t.language),
      pairScores: [],
      overallConsistency: 1,
      issues: translations.length === 0 ? ["No translations found"] : [],
    };
  }

  // Check each pair
  for (let i = 0; i < translations.length; i++) {
    for (let j = i + 1; j < translations.length; j++) {
      const a = translations[i]!;
      const b = translations[j]!;
      const pairIssues: string[] = [];

      // Length ratio check
      const configA = LANGUAGE_CONFIGS[a.language];
      const configB = LANGUAGE_CONFIGS[b.language];
      const expectedRatio = configA.responseLengthRatio / configB.responseLengthRatio;
      const actualRatio = a.prompt.length / (b.prompt.length || 1);
      const ratioDeviation = Math.abs(actualRatio - expectedRatio) / expectedRatio;

      if (ratioDeviation > 0.5) {
        pairIssues.push(
          `Length ratio deviation ${(ratioDeviation * 100).toFixed(0)}% between ${a.language} and ${b.language}`
        );
      }

      // Check if follow-up presence is consistent
      if ((a.followUp && !b.followUp) || (!a.followUp && b.followUp)) {
        pairIssues.push(
          `Follow-up mismatch: ${a.language} has ${a.followUp ? "yes" : "no"}, ${b.language} has ${b.followUp ? "yes" : "no"}`
        );
      }

      // Quality score check
      if (a.qualityScore < 0.7) {
        pairIssues.push(`Low quality score for ${a.language}: ${a.qualityScore}`);
      }
      if (b.qualityScore < 0.7) {
        pairIssues.push(`Low quality score for ${b.language}: ${b.qualityScore}`);
      }

      const similarity = Math.max(0, 1 - ratioDeviation * 0.5 - pairIssues.length * 0.1);

      pairScores.push({
        langA: a.language,
        langB: b.language,
        similarity: Math.round(similarity * 10000) / 10000,
        issues: pairIssues,
      });

      issues.push(...pairIssues);
    }
  }

  const overallConsistency =
    pairScores.length > 0
      ? pairScores.reduce((sum, p) => sum + p.similarity, 0) / pairScores.length
      : 1;

  return {
    probeId,
    languages: translations.map((t) => t.language),
    pairScores,
    overallConsistency: Math.round(overallConsistency * 10000) / 10000,
    issues: [...new Set(issues)],
  };
}

/* ------------------------------------------------------------------ */
/*  RTL Support Helpers                                               */
/* ------------------------------------------------------------------ */

/**
 * Get the text direction for a language.
 */
export function getTextDirection(language: SupportedLanguage): TextDirection {
  return LANGUAGE_CONFIGS[language].direction;
}

/**
 * Check if a language is RTL.
 */
export function isRTL(language: SupportedLanguage): boolean {
  return LANGUAGE_CONFIGS[language].direction === "rtl";
}

/**
 * Get CSS direction properties for a language.
 */
export function getDirectionStyles(language: SupportedLanguage): {
  direction: TextDirection;
  textAlign: "left" | "right";
  unicodeBidi: "normal" | "embed";
} {
  const dir = getTextDirection(language);
  return {
    direction: dir,
    textAlign: dir === "rtl" ? "right" : "left",
    unicodeBidi: dir === "rtl" ? "embed" : "normal",
  };
}

/**
 * Get the language display name in its native script.
 */
export function getLanguageNativeName(language: SupportedLanguage): string {
  return LANGUAGE_CONFIGS[language].nativeName;
}

/**
 * Singleton registry instance.
 */
let globalRegistry: TranslationRegistry | null = null;

export function getTranslationRegistry(): TranslationRegistry {
  if (!globalRegistry) {
    globalRegistry = new TranslationRegistry();
  }
  return globalRegistry;
}
