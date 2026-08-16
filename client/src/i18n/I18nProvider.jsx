import { useCallback, useEffect, useMemo, useState } from "react";
import { I18nContext, translate, loadLocale, isLocaleLoaded } from "./context";
import { LANGUAGES, DEFAULT_LOCALE, STORAGE_KEY, resolveLocale } from "./config";

/*
 * I18nProvider
 * ------------
 * Owns the active locale: initializes from localStorage → browser language →
 * default, persists changes, and keeps <html lang>/<dir> in sync for a11y and
 * SEO. Exposes a memoized `t` bound to the current locale plus `setLocale`.
 *
 * Locale bundles load on demand (see ./context), so the provider also owns the
 * one moment that can't be helped: on a first visit in a non-default language
 * the messages aren't in memory yet. It holds the first paint until they are,
 * rather than rendering English that would swap under the reader a beat later.
 * A language *switch* is handled the other way round — the current language
 * stays on screen while the next one loads — so only a cold start ever waits.
 */

export function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_LOCALE;

    const initial = resolveLocale(
      window.localStorage.getItem(STORAGE_KEY) || window.navigator.language
    );
    // Start the fetch here rather than waiting for the effect below: this runs
    // during the first render pass, so the request is in flight a paint earlier.
    // `loadLocale` caches by locale, so the effect's call joins this one and a
    // StrictMode double-invoke costs nothing.
    loadLocale(initial).catch(() => {});
    return initial;
  });

  const [ready, setReady] = useState(() => isLocaleLoaded(locale));

  useEffect(() => {
    if (ready) return undefined;

    let cancelled = false;
    // A failed import isn't fatal: `translate` reads through the English
    // fallback, so releasing the paint is better than holding a blank screen.
    loadLocale(locale)
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [locale, ready]);

  useEffect(() => {
    const lang = LANGUAGES.find((l) => l.code === locale);
    document.documentElement.lang = locale;
    document.documentElement.dir = lang?.dir || "ltr";
  }, [locale]);

  const setLocale = useCallback((code) => {
    const next = resolveLocale(code);

    // Commit only once the messages are in hand, so switching language never
    // flashes English between the click and the bundle landing.
    loadLocale(next)
      .catch(() => {})
      .finally(() => {
        setLocaleState(next);
        setReady(true);
        try {
          window.localStorage.setItem(STORAGE_KEY, next);
        } catch {
          /* storage unavailable — keep in-memory locale only */
        }
      });
  }, []);

  const t = useCallback((key, vars) => translate(locale, key, vars), [locale]);

  const value = useMemo(
    () => ({ locale, setLocale, t, languages: LANGUAGES }),
    [locale, setLocale, t]
  );

  if (!ready) return null;

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export default I18nProvider;
