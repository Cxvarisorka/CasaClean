/*
 * SocialIcon
 * ----------
 * Inline brand glyphs for social platforms. lucide-react no longer ships brand
 * marks, so we render minimal, self-contained SVG paths keyed by platform.
 * Zero extra dependency and fully tree-shakeable.
 */

const PATHS = {
  instagram: (
    <>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </>
  ),
  linkedin: (
    <>
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </>
  ),
  facebook: (
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  ),
  twitter: <path d="M18.244 2H21.5l-7.5 8.57L23 22h-6.844l-5.36-7.01L4.66 22H1.4l8.02-9.17L1 2h7.02l4.85 6.41L18.244 2zm-1.2 18h1.9L7.04 4h-2.03l12.034 16z" />,
};

export function SocialIcon({ platform, className = "size-4.5" }) {
  const isFilled = platform === "twitter" || platform === "facebook";
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
