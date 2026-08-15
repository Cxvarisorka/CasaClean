/*
 * SocialIcon
 * ----------
 * Inline brand glyphs for social platforms. lucide-react no longer ships brand
 * marks, so we render minimal, self-contained SVG paths keyed by platform.
 * Zero extra dependency and fully tree-shakeable.
 *
 * Only the platforms the business is actually on are drawn — the set is driven
 * by `SITE.social`, so a new network means a new glyph here alongside it.
 */

const PATHS = {
  instagram: (
    <>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </>
  ),
  facebook: (
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  ),
};

export function SocialIcon({ platform, className = "size-4.5" }) {
  const isFilled = platform === "facebook";
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill={isFilled ? "currentColor" : "none"}
      stroke={isFilled ? "none" : "currentColor"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[platform] || null}
    </svg>
  );
}

export default SocialIcon;
