import { createContext } from "react";
import en from "./locales/en";
import { FALLBACK_LOCALE } from "./config";

/*
 * i18n context + translator
 * -------------------------
 * The context lives here (not in the provider file) so the provider and the
 * useTranslation hook can each be single-export modules. `translate` is a pure
 * function: nested-key lookup with English fallback and {var} interpolation,
 * returning the raw value (string OR array) so feature lists work too.
 *
 * Only the fallback locale is bundled eagerly — it is the backstop every other
 * language resolves through, so it has to be there before anything renders. The
 * remaining four are ~400 KB of text a given reader will never look at, so they
 * are fetched on demand through `loadLocale`. `MESSAGES` is therefore filled in
 * over time rather than being complete at module scope.
 */

export const MESSAGES = { [FALLBACK_LOCALE]: en };

/*
 * Explicit loaders (not a template literal) so the bundler can see every target
 * statically and emit one chunk per language.
 */
const LOADERS = {
  ka: () => import("./locales/ka"),
  it: () => import("./locales/it"),
  el: () => import("./locales/el"),
  ru: () => import("./locales/ru"),
};

/** In-flight imports, so concurrent callers share one request per locale. */
const pending = new Map();

/** Resolved lookups per locale — see `lookup` for why they can be cached. */
const caches = new Map();

export const I18nContext = createContext(null);

export const isLocaleLoaded = (locale) => Boolean(MESSAGES[locale]);

/**
 * Fetch a locale's messages and register them in MESSAGES.
 * Resolves immediately for an already-loaded locale and for anything we have no
 * loader for (which then simply keeps reading through the English fallback).
 * @param {string} locale
 * @returns {Promise<object>}
 */
export function loadLocale(locale) {
  if (MESSAGES[locale]) return Promise.resolve(MESSAGES[locale]);

  const load = LOADERS[locale];
  if (!load) return Promise.resolve(MESSAGES[FALLBACK_LOCALE]);

  let inFlight = pending.get(locale);
  if (!inFlight) {
    inFlight = load()
      .then((mod) => {
        MESSAGES[locale] = mod.default;
        // Anything cached before now resolved through English — drop it so the
        // newly arrived translations are what the next render reads.
        caches.delete(locale);
        return MESSAGES[locale];
      })
      .catch((err) => {
        // Forget the rejection so a later attempt can retry rather than
        // permanently serving English for this locale.
        pending.delete(locale);
        throw err;
      });
    pending.set(locale, inFlight);
  }
  return inFlight;
}

const getPath = (obj, path) =>
  path.split(".").reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);

/*
 * `t()` is called dozens of times per render (the navbar alone ~10, a service
 * card ~6 × N cards), and every call used to re-walk the key path. Loaded
 * message bundles never change, so the resolved value can be memoized per
 * locale. A locale whose bundle is still in flight is deliberately NOT cached:
 * its lookups resolve through English right now and must not outlive the import.
 */
function lookup(locale, key) {
  const messages = MESSAGES[locale];
  const cacheable = Boolean(messages);

  let cache;
  if (cacheable) {
    cache = caches.get(locale);
    if (!cache) {
      cache = new Map();
      caches.set(locale, cache);
    }
    // `has` rather than a truthy check: a missing key caches as undefined too.
    if (cache.has(key)) return cache.get(key);
  }

  const primary = messages ? getPath(messages, key) : undefined;
  const value =
    primary !== undefined ? primary : getPath(MESSAGES[FALLBACK_LOCALE], key);

  if (cacheable) cache.set(key, value);
  return value;
}

export function translate(locale, key, vars) {
  const value = lookup(locale, key);

  if (value === undefined) return key; // last-resort: surface the key itself

  if (typeof value === "string" && vars) {
    return value.replace(/\{(\w+)\}/g, (_, name) =>
      vars[name] != null ? vars[name] : `{${name}}`
    );
  }
  return value;
}
