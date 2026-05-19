/**
 * i18n system (Issue #547).
 * Translation key registry with pluralization, language detection,
 * dynamic switching without reload, RTL support, completeness reporting.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type TextDirection = "ltr" | "rtl";

export type PluralCategory = "zero" | "one" | "two" | "few" | "many" | "other";

export interface PluralRules {
  [key: string]: string | Record<PluralCategory, string>;
}

export interface TranslationSet {
  locale: string;
  direction: TextDirection;
  translations: Record<string, string | Record<PluralCategory, string>>;
}

export interface LanguageConfig {
  locale: string;
  displayName: string;
  direction: TextDirection;
  /** Whether to lazy-load this language's translations. */
  lazyLoad?: boolean;
}

export interface I18nConfig {
  defaultLocale: string;
  fallbackLocale: string;
  supportedLocales: LanguageConfig[];
  /** Function to detect the user's preferred locale. */
  detectLocale?: () => string | null;
  /** Function to persist the chosen locale. */
  persistLocale?: (locale: string) => void;
  /** Lazy loader for translation sets. */
  loadTranslations?: (locale: string) => Promise<TranslationSet>;
}

export interface CompletenessReport {
  locale: string;
  totalKeys: number;
  translatedKeys: number;
  missingKeys: string[];
  completenessPercent: number;
}

export type I18nListener = (locale: string, direction: TextDirection) => void;

/* ------------------------------------------------------------------ */
/*  RTL locales                                                       */
/* ------------------------------------------------------------------ */

const RTL_LOCALES = new Set([
  "ar", "he", "fa", "ur", "ps", "sd", "yi", "dv", "ku", "ug",
]);

export function isRTL(locale: string): boolean {
  const lang = locale.split("-")[0].toLowerCase();
  return RTL_LOCALES.has(lang);
}

/* ------------------------------------------------------------------ */
/*  Pluralization rules (simplified CLDR)                             */
/* ------------------------------------------------------------------ */

type PluralResolver = (count: number) => PluralCategory;

const pluralResolvers: Record<string, PluralResolver> = {
  en: (n) => (n === 1 ? "one" : "other"),
  fr: (n) => (n === 0 || n === 1 ? "one" : "other"),
  ar: (n) => {
    if (n === 0) return "zero";
    if (n === 1) return "one";
    if (n === 2) return "two";
    if (n % 100 >= 3 && n % 100 <= 10) return "few";
    if (n % 100 >= 11 && n % 100 <= 99) return "many";
    return "other";
  },
  ja: () => "other",
  zh: () => "other",
  ko: () => "other",
  ru: (n) => {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return "one";
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "few";
    return "other";
  },
  de: (n) => (n === 1 ? "one" : "other"),
  es: (n) => (n === 1 ? "one" : "other"),
  pt: (n) => (n === 1 ? "one" : "other"),
};

function getPluralCategory(locale: string, count: number): PluralCategory {
  const lang = locale.split("-")[0].toLowerCase();
  const resolver = pluralResolvers[lang] ?? pluralResolvers.en!;
  return resolver(count);
}

/* ------------------------------------------------------------------ */
/*  Language detection                                                */
/* ------------------------------------------------------------------ */

export function detectBrowserLocale(supportedLocales: string[]): string | null {
  if (typeof navigator === "undefined") return null;

  const browserLocales = navigator.languages ?? [navigator.language];
  for (const browserLocale of browserLocales) {
    // Exact match
    if (supportedLocales.includes(browserLocale)) return browserLocale;
    // Language-only match (e.g., "en" matches "en-US")
    const lang = browserLocale.split("-")[0];
    const match = supportedLocales.find((l) => l.startsWith(lang));
    if (match) return match;
  }

  return null;
}

/* ------------------------------------------------------------------ */
/*  Interpolation                                                     */
/* ------------------------------------------------------------------ */

function interpolate(
  template: string,
  params: Record<string, string | number>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    return params[key] !== undefined ? String(params[key]) : `{{${key}}}`;
  });
}

/* ------------------------------------------------------------------ */
/*  I18n Manager                                                      */
/* ------------------------------------------------------------------ */

export class I18nManager {
  private config: I18nConfig;
  private translations: Map<string, TranslationSet> = new Map();
  private currentLocale: string;
  private listeners: Set<I18nListener> = new Set();
  private allKnownKeys: Set<string> = new Set();

  constructor(config: I18nConfig) {
    this.config = config;
    this.currentLocale = config.defaultLocale;
  }

  /** Register a translation set for a locale. */
  addTranslations(set: TranslationSet): void {
    this.translations.set(set.locale, set);
    for (const key of Object.keys(set.translations)) {
      this.allKnownKeys.add(key);
    }
  }

  /** Get the current locale. */
  getLocale(): string {
    return this.currentLocale;
  }

  /** Get the current text direction. */
  getDirection(): TextDirection {
    const config = this.config.supportedLocales.find(
      (l) => l.locale === this.currentLocale
    );
    return config?.direction ?? (isRTL(this.currentLocale) ? "rtl" : "ltr");
  }

  /** Detect the best locale from browser/user settings. */
  detectLocale(): string {
    if (this.config.detectLocale) {
      const detected = this.config.detectLocale();
      if (detected && this.isSupported(detected)) return detected;
    }

    const browserLocale = detectBrowserLocale(
      this.config.supportedLocales.map((l) => l.locale)
    );
    if (browserLocale) return browserLocale;

    return this.config.defaultLocale;
  }

  /** Switch to a new locale (dynamic, no reload needed). */
  async switchLocale(locale: string): Promise<void> {
    if (!this.isSupported(locale)) {
      throw new Error(`Locale "${locale}" is not in the supported locales list`);
    }

    // Lazy-load if needed
    if (!this.translations.has(locale) && this.config.loadTranslations) {
      const set = await this.config.loadTranslations(locale);
      this.addTranslations(set);
    }

    this.currentLocale = locale;
    this.config.persistLocale?.(locale);

    // Notify listeners
    const direction = this.getDirection();
    for (const listener of this.listeners) {
      listener(locale, direction);
    }
  }

  /** Translate a key. */
  t(
    key: string,
    params?: Record<string, string | number>
  ): string {
    const value = this.resolveKey(key, this.currentLocale);
    if (value === null) {
      // Fallback locale
      if (this.currentLocale !== this.config.fallbackLocale) {
        const fallback = this.resolveKey(key, this.config.fallbackLocale);
        if (fallback !== null) {
          return params ? interpolate(fallback, params) : fallback;
        }
      }
      return key; // Return the key itself as last resort
    }
    return params ? interpolate(value, params) : value;
  }

  /** Translate with pluralization. */
  tp(
    key: string,
    count: number,
    params?: Record<string, string | number>
  ): string {
    const allParams = { ...params, count };
    const set = this.translations.get(this.currentLocale);
    const entry = set?.translations[key];

    if (typeof entry === "object" && entry !== null) {
      const category = getPluralCategory(this.currentLocale, count);
      const template = entry[category] ?? entry.other ?? key;
      return interpolate(template, allParams);
    }

    // Fallback
    if (this.currentLocale !== this.config.fallbackLocale) {
      const fallbackSet = this.translations.get(this.config.fallbackLocale);
      const fallbackEntry = fallbackSet?.translations[key];
      if (typeof fallbackEntry === "object" && fallbackEntry !== null) {
        const category = getPluralCategory(this.config.fallbackLocale, count);
        const template = fallbackEntry[category] ?? fallbackEntry.other ?? key;
        return interpolate(template, allParams);
      }
    }

    // Simple string fallback
    return this.t(key, allParams);
  }

  /** Check if a locale is supported. */
  isSupported(locale: string): boolean {
    return this.config.supportedLocales.some((l) => l.locale === locale);
  }

  /** Get the list of supported languages. */
  getSupportedLocales(): LanguageConfig[] {
    return [...this.config.supportedLocales];
  }

  /** Subscribe to locale changes. Returns an unsubscribe function. */
  onLocaleChange(listener: I18nListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Generate completeness reports for all loaded locales. */
  getCompletenessReport(): CompletenessReport[] {
    const referenceKeys = this.allKnownKeys;
    const reports: CompletenessReport[] = [];

    for (const localeConfig of this.config.supportedLocales) {
      const set = this.translations.get(localeConfig.locale);
      const translatedKeys = set ? Object.keys(set.translations) : [];
      const missing = [...referenceKeys].filter(
        (key) => !translatedKeys.includes(key)
      );

      reports.push({
        locale: localeConfig.locale,
        totalKeys: referenceKeys.size,
        translatedKeys: translatedKeys.length,
        missingKeys: missing,
        completenessPercent:
          referenceKeys.size > 0
            ? Math.round((translatedKeys.length / referenceKeys.size) * 100)
            : 100,
      });
    }

    return reports;
  }

  /** Check if a key exists in the current locale. */
  has(key: string): boolean {
    return this.resolveKey(key, this.currentLocale) !== null;
  }

  /* ---------------------------------------------------------------- */
  /*  Internal                                                        */
  /* ---------------------------------------------------------------- */

  private resolveKey(key: string, locale: string): string | null {
    const set = this.translations.get(locale);
    if (!set) return null;

    const entry = set.translations[key];
    if (entry === undefined) return null;

    if (typeof entry === "string") return entry;

    // For plural entries, return the "other" form as default
    if (typeof entry === "object") return entry.other ?? null;

    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Factory helper                                                    */
/* ------------------------------------------------------------------ */

export function createI18n(config: I18nConfig): I18nManager {
  return new I18nManager(config);
}
