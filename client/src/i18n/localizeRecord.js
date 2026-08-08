import { DEFAULT_LOCALE } from "./config";

/*
 * localizeRecord
 * --------------
 * Resolves the multilingual copy the catalogue records carry (services, cities,
 * add-ons, cleaning tools) for the active language.
 *
 * The API stores the default locale in a record's root fields and the admin's
 * per-language overrides in `translations[locale]`, field by field. Resolution
 * is therefore per field, not per record: a service whose title is translated
 * but whose description isn't shows the translated title next to the original
 * description, rather than dropping the whole language back to the default.
 *
 * Blank counts as "not translated" — the API strips empty values, but a record
 * written before that rule (or by hand) may still carry one.
 */
export function localizedField(record, field, locale) {
  const base = record?.[field];
  if (!locale || locale === DEFAULT_LOCALE) return base;

  const translated = record?.translations?.[locale]?.[field];

  if (Array.isArray(translated)) {
    const items = translated.filter((item) => String(item).trim());
    return items.length ? items : base;
  }

  return String(translated ?? "").trim() ? translated : base;
}

export default localizedField;
