import { useCallback, useEffect, useMemo, useState } from "react";
import { I18nContext, translate } from "./context";
import { LANGUAGES, DEFAULT_LOCALE, STORAGE_KEY, resolveLocale } from "./config";

/*
 * I18nProvider
 * ------------
 * Owns the active locale: initializes from localStorage → browser language →
 * default, persists changes, and keeps <html lang>/<dir> in sync for a11y and
 * SEO. Exposes a memoized `t` bound to the current locale plus `setLocale`.
 */

export function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_LOCALE;
    return resolveLocale(
      window.localStorage.getItem(STORAGE_KEY) || window.navigator.language
    );
  });

  useEffect(() => {
    const lang = LANGUAGES.find((l) => l.code === locale);
    document.documentElement.lang = locale;
    document.documentElement.dir = lang?.dir || "ltr";
  }, [locale]);

  const setLocale = useCallback((code) => {
    const next = resolveLocale(code);
    setLocaleState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage unavailable — keep in-memory locale only */
    }
  }, []);

  const t = useCallback((key, vars) => translate(locale, key, vars), [locale]);

  const value = useMemo(
    () => ({ locale, setLocale, t, languages: LANGUAGES }),
    [locale, setLocale, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export default I18nProvider;
