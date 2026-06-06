/*
 * i18n configuration
 * ------------------
 * The supported locales and their display metadata. Kept dependency-free and
 * declarative so the language switcher, provider and SEO all read from one
 * source. `dir` is included up-front so RTL support is a non-breaking addition.
 */

export const LANGUAGES = [
  { code: "en", label: "English", native: "English", flag: "🇬🇧", dir: "ltr" },
  { code: "ka", label: "Georgian", native: "ქართული", flag: "🇬🇪", dir: "ltr" },
  { code: "it", label: "Italian", native: "Italiano", flag: "🇮🇹", dir: "ltr" },
  { code: "el", label: "Greek", native: "Ελληνικά", flag: "🇬🇷", dir: "ltr" },
  { code: "ru", label: "Russian", native: "Русский", flag: "🇷🇺", dir: "ltr" },
];

export const DEFAULT_LOCALE = "en";
export const FALLBACK_LOCALE = "en";
export const STORAGE_KEY = "casaclean:locale";

export const SUPPORTED_CODES = LANGUAGES.map((l) => l.code);

/** Resolve a stored/browser locale down to one we actually support. */
export function resolveLocale(candidate) {
  if (!candidate) return DEFAULT_LOCALE;
  const short = String(candidate).toLowerCase().split("-")[0];
  return SUPPORTED_CODES.includes(short) ? short : DEFAULT_LOCALE;
}
