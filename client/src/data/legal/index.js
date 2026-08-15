import en from "./en";
import it from "./it";

/*
 * Legal documents — locale registry
 * ---------------------------------
 * The UI ships in five languages; the legal documents deliberately ship in TWO.
 * A privacy policy or a set of terms is an operative document, not interface
 * copy: a machine-ish translation of a liability clause is worse than none,
 * because a visitor would rely on it. So English and Italian are drafted and
 * maintained by hand, and every other locale is served the English text with an
 * explicit notice saying so (rendered by `pages/Legal/LegalDocument`).
 *
 * That is why this resolver exists instead of the usual `t()` lookup: the i18n
 * fallback is silent by design, and here the fallback is something the reader
 * has to be told about.
 */

const DOCUMENTS = { en, it };

/** The languages the legal documents are actually authored in. */
export const LEGAL_LOCALES = Object.keys(DOCUMENTS);

/** The language served to everyone else — and the one Italian prevails over. */
export const LEGAL_FALLBACK_LOCALE = "en";

/**
 * Resolve a UI locale down to the locale its legal text is written in.
 * @param {string} locale - the active UI locale ("en" | "ka" | "it" | "el" | "ru")
 * @returns {string} "it" for Italian, otherwise "en"
 */
export const resolveLegalLocale = (locale) =>
  LEGAL_LOCALES.includes(locale) ? locale : LEGAL_FALLBACK_LOCALE;

/**
 * Fetch a legal document in the best available language.
 *
 * @param {"privacy"|"terms"} kind - which document
 * @param {string} locale - the active UI locale
 * @returns {{ document: object, documentLocale: string, isFallback: boolean }}
 *   `isFallback` is true when the reader's language isn't one we publish in, so
 *   the page can say which language it is showing them instead.
 */
export function getLegalDocument(kind, locale) {
  const documentLocale = resolveLegalLocale(locale);
  return {
    document: DOCUMENTS[documentLocale][kind],
    documentLocale,
    isFallback: documentLocale !== locale,
  };
}
