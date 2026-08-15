/*
 * Phone numbers
 * -------------
 * The client half of server/utils/phone.util.js: the same canonical form ("+",
 * dial code, national number, digits only) plus the country list the picker in
 * components/ui/PhoneInput renders.
 *
 * Why a picker at all: this product sells in Georgia, Italy and the rest of
 * Europe, so "3312345678" is a real mobile number in several countries at once.
 * Asking for the country separately means nobody has to know how to type a "+",
 * and the number that reaches the API is unambiguous.
 */

// Italy and Georgia lead the list — the two home markets — and everywhere else
// follows alphabetically. `code` is ISO 3166-1 alpha-2 and is only ever used as
// a key; the dial code is what gets stored.
export const COUNTRIES = [
  { code: "IT", dialCode: "+39", name: "Italy", flag: "🇮🇹" },
  { code: "GE", dialCode: "+995", name: "Georgia", flag: "🇬🇪" },
  { code: "AL", dialCode: "+355", name: "Albania", flag: "🇦🇱" },
  { code: "AD", dialCode: "+376", name: "Andorra", flag: "🇦🇩" },
  { code: "AM", dialCode: "+374", name: "Armenia", flag: "🇦🇲" },
  { code: "AT", dialCode: "+43", name: "Austria", flag: "🇦🇹" },
  { code: "AZ", dialCode: "+994", name: "Azerbaijan", flag: "🇦🇿" },
  { code: "BY", dialCode: "+375", name: "Belarus", flag: "🇧🇾" },
  { code: "BE", dialCode: "+32", name: "Belgium", flag: "🇧🇪" },
  { code: "BA", dialCode: "+387", name: "Bosnia and Herzegovina", flag: "🇧🇦" },
  { code: "BG", dialCode: "+359", name: "Bulgaria", flag: "🇧🇬" },
  { code: "HR", dialCode: "+385", name: "Croatia", flag: "🇭🇷" },
  { code: "CY", dialCode: "+357", name: "Cyprus", flag: "🇨🇾" },
  { code: "CZ", dialCode: "+420", name: "Czechia", flag: "🇨🇿" },
  { code: "DK", dialCode: "+45", name: "Denmark", flag: "🇩🇰" },
  { code: "EE", dialCode: "+372", name: "Estonia", flag: "🇪🇪" },
  { code: "FI", dialCode: "+358", name: "Finland", flag: "🇫🇮" },
  { code: "FR", dialCode: "+33", name: "France", flag: "🇫🇷" },
  { code: "DE", dialCode: "+49", name: "Germany", flag: "🇩🇪" },
  { code: "GR", dialCode: "+30", name: "Greece", flag: "🇬🇷" },
  { code: "HU", dialCode: "+36", name: "Hungary", flag: "🇭🇺" },
  { code: "IS", dialCode: "+354", name: "Iceland", flag: "🇮🇸" },
  { code: "IE", dialCode: "+353", name: "Ireland", flag: "🇮🇪" },
  { code: "XK", dialCode: "+383", name: "Kosovo", flag: "🇽🇰" },
  { code: "LV", dialCode: "+371", name: "Latvia", flag: "🇱🇻" },
  { code: "LI", dialCode: "+423", name: "Liechtenstein", flag: "🇱🇮" },
  { code: "LT", dialCode: "+370", name: "Lithuania", flag: "🇱🇹" },
  { code: "LU", dialCode: "+352", name: "Luxembourg", flag: "🇱🇺" },
  { code: "MT", dialCode: "+356", name: "Malta", flag: "🇲🇹" },
  { code: "MD", dialCode: "+373", name: "Moldova", flag: "🇲🇩" },
  { code: "MC", dialCode: "+377", name: "Monaco", flag: "🇲🇨" },
  { code: "ME", dialCode: "+382", name: "Montenegro", flag: "🇲🇪" },
  { code: "NL", dialCode: "+31", name: "Netherlands", flag: "🇳🇱" },
  { code: "MK", dialCode: "+389", name: "North Macedonia", flag: "🇲🇰" },
  { code: "NO", dialCode: "+47", name: "Norway", flag: "🇳🇴" },
  { code: "PL", dialCode: "+48", name: "Poland", flag: "🇵🇱" },
  { code: "PT", dialCode: "+351", name: "Portugal", flag: "🇵🇹" },
  { code: "RO", dialCode: "+40", name: "Romania", flag: "🇷🇴" },
  { code: "RU", dialCode: "+7", name: "Russia", flag: "🇷🇺" },
  { code: "SM", dialCode: "+378", name: "San Marino", flag: "🇸🇲" },
  { code: "RS", dialCode: "+381", name: "Serbia", flag: "🇷🇸" },
  { code: "SK", dialCode: "+421", name: "Slovakia", flag: "🇸🇰" },
  { code: "SI", dialCode: "+386", name: "Slovenia", flag: "🇸🇮" },
  { code: "ES", dialCode: "+34", name: "Spain", flag: "🇪🇸" },
  { code: "SE", dialCode: "+46", name: "Sweden", flag: "🇸🇪" },
  { code: "CH", dialCode: "+41", name: "Switzerland", flag: "🇨🇭" },
  { code: "TR", dialCode: "+90", name: "Turkey", flag: "🇹🇷" },
  { code: "UA", dialCode: "+380", name: "Ukraine", flag: "🇺🇦" },
  { code: "GB", dialCode: "+44", name: "United Kingdom", flag: "🇬🇧" },
  // The escape hatch, and the reason the picker can never mangle a number it
  // doesn't recognise: "+" plus whatever the customer types. A number from
  // outside the list round-trips through the field unchanged instead of being
  // re-read as a local one.
  { code: "OTHER", dialCode: "+", name: "Other", flag: "🌍" },
];

export const DEFAULT_COUNTRY_CODE = "IT";

// Longest dial code first, so "+389…" is read as North Macedonia and not as
// Italy (+39) with a stray leading 9.
const BY_LONGEST_DIAL = [...COUNTRIES]
  .filter((country) => country.dialCode !== "+")
  .sort((a, b) => b.dialCode.length - a.dialCode.length);

const countryByCode = (code) => COUNTRIES.find((country) => country.code === code);

/** Dial code for an ISO country code, falling back to the bare "+". */
export const dialCodeOf = (code) => countryByCode(code)?.dialCode ?? "+";

/**
 * Reduce a typed number to the canonical stored form — mirrors normalizePhone
 * in server/utils/phone.util.js, including the "00" → "+" rewrite.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function normalizePhone(value) {
  if (typeof value !== "string") return "";

  const compact = value.replace(/[\s().‐-―−-]/g, "");

  return compact.startsWith("00") ? `+${compact.slice(2)}` : compact;
}

/** The server's rule, so the form rejects what the API would reject. */
export function isValidPhone(value) {
  return /^\+[1-9]\d{6,14}$/.test(normalizePhone(value));
}

/**
 * Split a stored number into the two things the field edits.
 *
 * A number saved before the picker existed (or typed without a prefix) has no
 * country in it to read, so `fallbackCountry` decides which one the picker
 * shows — the number itself is left alone until the customer saves.
 *
 * @param {string} value a full number, in any spacing
 * @param {string} [fallbackCountry] ISO code to assume when the value carries no prefix
 * @returns {{ country: string, dialCode: string, national: string }}
 */
export function splitPhone(value, fallbackCountry = DEFAULT_COUNTRY_CODE) {
  const normalized = normalizePhone(value);
  const fallback = countryByCode(fallbackCountry) ?? COUNTRIES[0];

  if (!normalized.startsWith("+")) {
    return {
      country: fallback.code,
      dialCode: fallback.dialCode,
      national: normalized.replace(/\D/g, ""),
    };
  }

  const match = BY_LONGEST_DIAL.find((country) => normalized.startsWith(country.dialCode));

  if (!match) {
    // A country we don't list: keep every digit, and let "Other" carry the "+".
    return { country: "OTHER", dialCode: "+", national: normalized.slice(1) };
  }

  return {
    country: match.code,
    dialCode: match.dialCode,
    national: normalized.slice(match.dialCode.length),
  };
}

/**
 * Put the two halves back together.
 *
 * An empty national part yields an empty string rather than a lone "+39", so an
 * optional field stays genuinely empty when the customer only opened the picker.
 *
 * @param {string} dialCode
 * @param {string} national
 * @returns {string}
 */
export function joinPhone(dialCode, national) {
  const digits = String(national ?? "").replace(/\D/g, "");

  return digits ? normalizePhone(`${dialCode}${digits}`) : "";
}
