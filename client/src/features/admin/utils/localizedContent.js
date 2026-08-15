import { DEFAULT_LOCALE, LANGUAGES } from "@/i18n/config";

/*
 * Localized content ↔ form value
 * ------------------------------
 * The catalogue resources (services, cities, add-ons, cleaning tools) all carry
 * their customer-facing copy in every language: the default locale in the
 * record's root fields, the rest in `translations`.
 *
 * The admin dialog edits that as one "i18n" field whose value is keyed by locale
 * — `{ en: { name, … }, ka: { name, … } }` — so the form shows one language at a
 * time instead of every field times five. These two functions convert between
 * the two shapes; `subfields` is the same array the field config declares, so a
 * page describes its translatable fields exactly once.
 */

/** A subfield's empty value: a list field holds an array, everything else text. */
const emptyValue = (subfield) => (subfield.type === "list" ? [] : "");

/** Trim a value the way the API will, so "  " never counts as translated. */
const cleanValue = (subfield, value) =>
  subfield.type === "list"
    ? (Array.isArray(value) ? value : [])
        .map((item) => String(item).trim())
        .filter(Boolean)
    : String(value ?? "").trim();

/** Has the admin actually put something in this subfield? */
const isFilled = (subfield, value) =>
  subfield.type === "list"
    ? cleanValue(subfield, value).length > 0
    : cleanValue(subfield, value) !== "";

/** API record -> the { locale: { …copy } } value the i18n field edits. */
export function toContentValue(record, subfields) {
  const base = {};
  for (const subfield of subfields) {
    base[subfield.name] = record?.[subfield.name] ?? emptyValue(subfield);
  }

  return { [DEFAULT_LOCALE]: base, ...(record?.translations ?? {}) };
}

/**
 * The reverse: the root fields for the default locale, `translations` for the
 * rest. Blank fields are dropped and a language with nothing filled in is left
 * out entirely — which is what tells the API to remove a translation stored
 * earlier (the map is replaced, not merged).
 */
export function fromContentValue(content, subfields) {
  const source = content ?? {};
  const base = source[DEFAULT_LOCALE] ?? {};

  const payload = {};
  for (const subfield of subfields) {
    payload[subfield.name] = cleanValue(subfield, base[subfield.name]);
  }

  const translations = {};
  for (const { code } of LANGUAGES) {
    if (code === DEFAULT_LOCALE) continue;

    const entry = source[code] ?? {};
    const cleaned = {};

    for (const subfield of subfields) {
      if (isFilled(subfield, entry[subfield.name])) {
        cleaned[subfield.name] = cleanValue(subfield, entry[subfield.name]);
      }
    }

    if (Object.keys(cleaned).length) translations[code] = cleaned;
  }

  return { ...payload, translations };
}

/**
 * The field config for the localized group. Pages pass their translatable
 * subfields and get back the one `fields` entry that edits them in every
 * language.
 */
export function contentField(label, subfields) {
  return {
    name: "content",
    type: "i18n",
    label,
    locales: LANGUAGES,
    baseLocale: DEFAULT_LOCALE,
    full: true,
    subfields,
  };
}
