/*
 * prerender-seo.mjs
 * -----------------
 * Post-build step. Gives every marketing route its own static <head>.
 *
 * The problem it solves: this is a client-rendered SPA behind a catch-all
 * rewrite, so every URL is served the same `index.html`. React and Helmet then
 * fill the head in — which is fine for Google (it renders JavaScript) and
 * useless for everyone else. Facebook, LinkedIn, WhatsApp, Slack, Telegram,
 * iMessage, Discord and X all build their link preview from the HTML exactly as
 * delivered. Paste a link to /about into any of them and, without this step,
 * they read the home page's title and description — or, before there was a
 * share image on disk at all, showed a bare blue link.
 *
 * The fix is not to render the app, only its head: for each route this writes
 * `dist/<route>/index.html`, a byte-identical copy of the built page with the
 * block between the `seo:start` / `seo:end` markers swapped for that route's
 * tags. Static files are matched before rewrites on Vercel (and on Netlify, and
 * by nginx's `try_files`), so /about is served the prerendered copy while
 * everything unrecognised still falls through to the SPA. The app boots
 * identically either way and Helmet takes over on mount.
 *
 * Runs from `npm run build`; `node scripts/prerender-seo.mjs` re-runs it against
 * an existing `dist/`.
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { PAGE_META, SITE } from "../src/constants/metadata.js";
import { LANGUAGES } from "../src/i18n/config.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");

const START = "<!-- seo:start -->";
const END = "<!-- seo:end -->";

/*
 * Which routes get their own document. Only pages worth landing on from a
 * search result or a shared link: the booking wizard and the account area are
 * behind a sign-in and `robots.txt` already keeps crawlers out of them, so a
 * prerendered head for those would be a file nobody ever requests.
 */
const ROUTES = ["home", "services", "about", "contact", "faq", "careers", "privacy", "terms"];

/** HTML-escape a text value destined for an attribute. */
const esc = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const meta = (kind, key, content) =>
  `    <meta ${kind}="${key}" content="${esc(content)}" />`;

/**
 * The head block for one route. Mirrors src/seo/MetaTags.jsx tag for tag —
 * they describe the same page to the same crawlers, and the moment they
 * disagree one of them is lying. A test pins them together.
 */
function headFor(page) {
  const title = page.title.includes(SITE.name)
    ? page.title
    : `${page.title} · ${SITE.name}`;
  // Same form as src/seo/MetaTags.jsx — the root keeps its trailing slash.
  const canonical = `${SITE.url}${page.path}`;
  const image = `${SITE.url}${page.image || SITE.ogImage}`;
  const imageAlt = page.imageAlt || SITE.ogImageAlt;
  const ogLocale = SITE.ogLocales.en;
  const alternates = LANGUAGES.map((l) => SITE.ogLocales[l.code]).filter(
    (l) => l && l !== ogLocale
  );

  return [
    `    <title>${esc(title)}</title>`,
    meta("name", "description", page.description),
    `    <link rel="canonical" href="${esc(canonical)}" />`,
    meta(
      "name",
      "robots",
      "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"
    ),
    ...(page.keywords?.length
      ? [meta("name", "keywords", page.keywords.join(", "))]
      : []),
    meta("property", "og:type", "website"),
    meta("property", "og:site_name", SITE.name),
    meta("property", "og:title", title),
    meta("property", "og:description", page.description),
    meta("property", "og:url", canonical),
    meta("property", "og:image", image),
    meta("property", "og:image:secure_url", image),
    meta("property", "og:image:type", SITE.ogImageType),
    meta("property", "og:image:width", SITE.ogImageWidth),
    meta("property", "og:image:height", SITE.ogImageHeight),
    meta("property", "og:image:alt", imageAlt),
    meta("property", "og:locale", ogLocale),
    ...alternates.map((alt) => meta("property", "og:locale:alternate", alt)),
    meta("name", "twitter:card", "summary_large_image"),
    meta("name", "twitter:title", title),
    meta("name", "twitter:description", page.description),
    meta("name", "twitter:image", image),
    meta("name", "twitter:image:alt", imageAlt),
  ].join("\n");
}

/** Swap the marked block in `html` for this route's tags. */
export function applyHead(html, page) {
  const from = html.indexOf(START);
  const to = html.indexOf(END);
  if (from === -1 || to === -1) {
    throw new Error(
      "index.html is missing the seo:start/seo:end markers — prerendering cannot place the tags."
    );
  }
  return (
    html.slice(0, from + START.length) +
    "\n" +
    headFor(page) +
    "\n    " +
    html.slice(to)
  );
}

function main() {
  const indexPath = join(DIST, "index.html");
  if (!existsSync(indexPath)) {
    console.error("dist/index.html not found — run `npm run build` first.");
    process.exit(1);
  }

  const built = readFileSync(indexPath, "utf8");

  for (const key of ROUTES) {
    const page = PAGE_META[key];
    if (!page) {
      console.warn(`  ! no PAGE_META.${key} — skipped`);
      continue;
    }

    const html = applyHead(built, page);
    // The home page IS dist/index.html; every other route becomes a directory
    // index, which is the shape static hosts resolve a clean URL to.
    const out =
      page.path === "/" ? indexPath : join(DIST, page.path, "index.html");

    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, html, "utf8");
    console.log(`  ✓ ${page.path}`);
  }
}

// Importable for tests; only writes files when run as a script.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log("Prerendering SEO heads");
  main();
  console.log("Done.");
}

export { headFor, ROUTES };
