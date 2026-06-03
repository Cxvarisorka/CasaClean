import { SITE } from "@/constants/metadata";

/*
 * SEO helpers
 * -----------
 * Small pure helpers for composing SEO values consistently. The heavier
 * structured-data builders live in src/seo; these handle title/URL formatting.
 */

/** Appends the brand name to a page title unless it's already present. */
export function buildTitle(title) {
  if (!title) return SITE.name;
  return title.includes(SITE.name) ? title : `${title} · ${SITE.name}`;
}

/** Builds an absolute canonical URL from a path. */
export function canonicalUrl(path = "/") {
  if (path.startsWith("http")) return path;
  return `${SITE.url}${path === "/" ? "" : path}`;
}

/** Clamps a description to a search-friendly length without cutting words. */
export function truncateDescription(text = "", max = 160) {
  if (text.length <= max) return text;
  return `${text.slice(0, text.lastIndexOf(" ", max))}…`;
}
