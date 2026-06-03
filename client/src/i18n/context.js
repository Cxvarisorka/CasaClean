import { createContext } from "react";
import en from "./locales/en";
import ka from "./locales/ka";
import it from "./locales/it";
import { FALLBACK_LOCALE } from "./config";

/*
 * i18n context + translator
 * -------------------------
 * The context lives here (not in the provider file) so the provider and the
 * useTranslation hook can each be single-export modules. `translate` is a pure
 * function: nested-key lookup with English fallback and {var} interpolation,
 * returning the raw value (string OR array) so feature lists work too.
 */

export const MESSAGES = { en, ka, it };

export const I18nContext = createContext(null);

const getPath = (obj, path) =>
  path.split(".").reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);

export function translate(locale, key, vars) {
  const primary = getPath(MESSAGES[locale], key);
  const value =
    primary !== undefined ? primary : getPath(MESSAGES[FALLBACK_LOCALE], key);

  if (value === undefined) return key; // last-resort: surface the key itself

  if (typeof value === "string" && vars) {
    return value.replace(/\{(\w+)\}/g, (_, name) =>
      vars[name] != null ? vars[name] : `{${name}}`
    );
  }
  return value;
}
