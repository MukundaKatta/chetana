"use client";

import { useState, useEffect, useCallback } from "react";
import en from "@/lib/i18n/en";
import ja from "@/lib/i18n/ja";
import de from "@/lib/i18n/de";
import fr from "@/lib/i18n/fr";
import es from "@/lib/i18n/es";

export type Locale = "en" | "ja" | "de" | "fr" | "es";

const LOCALE_STORAGE_KEY = "chetana_locale";

const dictionaries: Record<Locale, Record<string, string>> = {
  en,
  ja,
  de,
  fr,
  es,
};

const SUPPORTED_LOCALES: Locale[] = ["en", "ja", "de", "fr", "es"];

/**
 * Translate a key into the given locale.
 * Falls back to English if the key is missing in the target locale,
 * and returns the raw key if not found in any dictionary.
 */
export function t(key: string, locale: Locale = "en"): string {
  const dict = dictionaries[locale];
  if (dict && key in dict) {
    return dict[key];
  }

  // Fallback to English
  if (locale !== "en" && key in en) {
    return en[key];
  }

  // Key not found in any dictionary — return the key itself
  return key;
}

/**
 * Detect the best locale from the browser's language preferences.
 */
function detectBrowserLocale(): Locale {
  if (typeof navigator === "undefined") return "en";

  const languages = navigator.languages ?? [navigator.language];

  for (const lang of languages) {
    const code = lang.toLowerCase().split("-")[0] as Locale;
    if (SUPPORTED_LOCALES.includes(code)) {
      return code;
    }
  }

  return "en";
}

/**
 * React hook that manages the current locale.
 *
 * Reads from localStorage on mount, falling back to the browser language.
 * Returns the current locale and a setter to change it (which also persists).
 */
export function useLocale(): {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  supportedLocales: Locale[];
} {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored && SUPPORTED_LOCALES.includes(stored as Locale)) {
      setLocaleState(stored as Locale);
    } else {
      const detected = detectBrowserLocale();
      setLocaleState(detected);
    }
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
  }, []);

  return { locale, setLocale, supportedLocales: SUPPORTED_LOCALES };
}
