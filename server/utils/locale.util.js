/**
 * Supported content locales — the single source of truth on the API side.
 *
 * Mirrors `client/src/i18n/config.js` (LANGUAGES / DEFAULT_LOCALE). The two
 * lists must stay in sync: the admin panel offers a translation slot per locale
 * listed here, and the strict Zod schema rejects any other key.
 *
 * Translatable content is stored in two places on a document:
 *   - the root fields (name/subtitle/description/includes) hold the DEFAULT
 *     locale, which is always authored and is what every non-localized consumer
 *     (booking records, admin table, uniqueness index, slugs) reads;
 *   - `translations[locale]` holds an optional override per other locale, with
 *     per-field fallback to the root when a field is missing.
 *
 * Adding a language is therefore one entry here plus one in the client config.
 */
const SUPPORTED_LOCALES = ["en", "ka", "it", "el", "ru"];

const DEFAULT_LOCALE = "en";

// The locales an admin may fill in the `translations` map. The default locale is
// deliberately excluded: it already lives in the root fields, and accepting it
// twice would leave two competing sources of truth for the same text.
const TRANSLATABLE_LOCALES = SUPPORTED_LOCALES.filter((code) => code !== DEFAULT_LOCALE);

const isTranslatableLocale = (code) => TRANSLATABLE_LOCALES.includes(code);

module.exports = {
    SUPPORTED_LOCALES,
    DEFAULT_LOCALE,
    TRANSLATABLE_LOCALES,
    isTranslatableLocale
};
