/**
 * Converts an arbitrary string into a URL-safe slug.
 * Normalizes accents, strips punctuation and collapses whitespace.
 *
 * @param {string} input
 * @returns {string}
 */
export function generateSlug(input = "") {
  return String(input)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip combining diacritic marks
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
